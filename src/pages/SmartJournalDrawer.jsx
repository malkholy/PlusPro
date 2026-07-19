import React, { useState, useEffect, useRef } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';

// A dynamic input that handles a specific segment lookup based on model details
function ModelSegmentInput({ detail, value, onChange, user }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const isStatic = detail.IsStatic === 1;

  useEffect(() => {
    // If it's static, there's no need to lookup. We just use the Condition field as the literal value.
    if (isStatic) return;

    let active = true;
    async function loadLookup() {
      setLoading(true);
      try {
        const res = await apiCall('Get Model Segment Lookup', {
          TableName: detail.TableName,
          ValueField: detail.ValueField,
          DescriptionField: detail.DescriptionField,
          Condition: detail.Condtion
        }, { User: user?.Username }, 'journal');
        
        if (active && res.State === 0) {
          // ensure values are strings for SearchableSelect
          setOptions((res.List0 || []).map(x => ({ 
            value: String(x.value), 
            label: `${x.value} - ${x.label}` 
          })));
        }
      } catch (e) {
        console.error('Failed to load segment lookup', e);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadLookup();
    return () => { active = false; };
  }, [detail, isStatic, user]);

  useEffect(() => {
    // Automatically set static value on mount if not set
    if (isStatic && value !== detail.Condtion) {
      onChange(detail.Condtion);
    }
  }, [isStatic, detail.Condtion, value, onChange]);

  if (isStatic) {
    return (
      <input 
        type="text" 
        readOnly 
        value={value || detail.Condtion || ''} 
        style={{ width: '100%', border: '1px solid #DCE1EA', borderRadius: 3, padding: '6px 8px', background: '#F8F9FA', color: '#0F2038', fontSize: 13 }} 
        title="Static Value"
      />
    );
  }

  return (
    <SearchableSelect
      value={value || ''}
      options={options}
      onChange={onChange}
      placeholder={`Select... ${loading ? '(Loading)' : ''}`}
      disabled={loading}
    />
  );
}

export default function SmartJournalDrawer({ user, onClose, onSaveSuccess, onEditJournal, onPrintJournal, editRow }) {
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  
  const isEditMode = !!editRow;
  const [editLocked, setEditLocked] = useState(false);
  const savedEditLinesRef = useRef(null);
  
  const [savedJournal, setSavedJournal] = useState(null);
  const [loadingModels, setLoadingModels] = useState(true);

  const [modelDef, setModelDef] = useState(null);
  const [loadingDef, setLoadingDef] = useState(false);

  // Journal State
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalRemarks, setJournalRemarks] = useState('');
  const [journalCurrency, setJournalCurrency] = useState('USD');
  const [journalExchangeRate, setJournalExchangeRate] = useState(1);
  
  const [linesData, setLinesData] = useState([]);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [newLineType, setNewLineType] = useState('');

  // 1. Fetch available models on load
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await apiCall('Get Journal Model List', null, { User: user?.Username }, 'journal');
        if (res.State === 0) {
          setModels(res.List0 || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingModels(false);
      }
    }
    fetchModels();
  }, [user]);

  // 1.5 Fetch edit data if in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    async function fetchEditData() {
      try {
        const res = await apiCall('Open Journal', {
          JournalNo: editRow.JournalNumber,
          EventNo: editRow.EventNumber
        }, { User: user?.Username }, 'journal');
        
        if (res.State === 0) {
          const header = (res.List0 || [])[0];
          const lines = res.List1 || [];
          if (header) {
            setJournalDate(header.JournalDate ? header.JournalDate.split('T')[0] : '');
            setJournalRemarks(header.JournalDescription || '');
            setJournalCurrency(header.JournalCurrency || 'USD');
            setJournalExchangeRate(header.JournalExchangeRate || 1);
            
            savedEditLinesRef.current = lines;
            if (header.JournalModelID) setSelectedModelId(header.JournalModelID);
            setEditLocked(true);
          }
        } else {
          setError(res.Message);
        }
      } catch (e) {
        setError(e.message);
      }
    }
    fetchEditData();
  }, [isEditMode, editRow, user]);

  // 2. Fetch specific model definition when selected
  useEffect(() => {
    if (!selectedModelId) {
      setModelDef(null);
      setLinesData([]);
      return;
    }

    async function fetchDef() {
      setLoadingDef(true);
      setError('');
      try {
        const res = await apiCall('Get Journal Model For View', { ModelID: Number(selectedModelId) }, { User: user?.Username }, 'journal');
        if (res.State === 0) {
          const header = (res.List0 || [])[0];
          const lines = res.List1 || [];
          const details = res.List2 || [];
          
          setModelDef({ header, lines, details });

          // Initialize line data structure
          const initialLinesData = lines.map(l => {
            let pre = {
              Line: l.Line,
              LineType: l.LineType,
              Segments: {},
              LineCurrency: 'USD',
              LineExchangeRate: 1,
              DebitTransaction: '',
              CreditTransaction: '',
              DebitBook: '',
              CreditBook: '',
              Remarks: ''
            };
            
            // If in edit mode, map existing data
            if (savedEditLinesRef.current) {
              const match = savedEditLinesRef.current.find(el => el.Line === l.Line);
              if (match) {
                pre.LineCurrency = match.LineCurrency;
                pre.LineExchangeRate = match.LineExchangeRate;
                pre.DebitTransaction = match.DebitTransaction || '';
                pre.CreditTransaction = match.CreditTransaction || '';
                pre.DebitBook = match.DebitBook || '';
                pre.CreditBook = match.CreditBook || '';
                pre.Remarks = match.LineDescription || '';
                pre.Segments[1] = match.Account || '';
                pre.Segments[2] = match.DebitorCreditor || '';
                pre.Segments[3] = match.Customer || '';
                pre.Segments[4] = match.Vendor || '';
                pre.Segments[5] = match.Bank || '';
                pre.Segments[6] = match.Tax || '';
                for(let i=7; i<=16; i++) {
                   pre.Segments[i] = match[`Segment${i}`] || '';
                }
              }
            }
            return pre;
          });
          setLinesData(initialLinesData);
          setSavedJournal(null);
        } else {
          setError(res.Message);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingDef(false);
      }
    }
    fetchDef();
  }, [selectedModelId, user]);

  const updateLine = (idx, field, val) => {
    setLinesData(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const updateSegment = (lineIdx, segId, val) => {
    setLinesData(prev => {
      const copy = [...prev];
      copy[lineIdx] = { 
        ...copy[lineIdx], 
        Segments: { ...copy[lineIdx].Segments, [segId]: val } 
      };
      return copy;
    });
  };

  const handleAddLine = () => {
    if (!newLineType) return;
    const maxLine = linesData.length > 0 ? Math.max(...linesData.map(l => l.Line)) : 0;
    const newLine = {
      Line: maxLine + 1,
      LineType: newLineType,
      Segments: {},
      LineCurrency: journalCurrency || 'USD',
      LineExchangeRate: journalExchangeRate || 1,
      DebitTransaction: '',
      CreditTransaction: '',
      DebitBook: '',
      CreditBook: '',
      Remarks: ''
    };
    setLinesData(prev => [...prev, newLine]);
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    
    let valErrors = [];

    let totDebitBook = 0;
    let totCreditBook = 0;
    
    for (let i = 0; i < linesData.length; i++) {
      const l = linesData[i];
      const db = Number(l.DebitBook) || 0;
      const cb = Number(l.CreditBook) || 0;
      const dt = Number(l.DebitTransaction) || 0;
      const ct = Number(l.CreditTransaction) || 0;
      
      totDebitBook += db;
      totCreditBook += cb;

      if (dt === 0 && ct === 0) valErrors.push(`Line ${l.Line} must have a Transaction amount`);
      if (dt > 0 && ct > 0) valErrors.push(`Line ${l.Line} cannot have both Debit and Credit`);
      if (!l.Segments[1]) valErrors.push(`Line ${l.Line} must have an Account selected`);

      const lineDetails = modelDef.details.filter(d => d.Line === l.Line);
      for (const det of lineDetails) {
        if (det.IsMandatory === 1 && !l.Segments[det.SegmentID]) {
          valErrors.push(`Line ${l.Line}: Segment ${det.SegmentID} is mandatory.`);
        }
      }
    }

    if (Math.abs(totDebitBook - totCreditBook) >= 0.01) {
      valErrors.push(`Book amounts not balanced`);
    }

    const currTotals = {};
    linesData.forEach(l => {
      const cur = l.LineCurrency || journalCurrency || 'BASE';
      if (!currTotals[cur]) currTotals[cur] = { debit: 0, credit: 0 };
      currTotals[cur].debit  += Number(l.DebitTransaction  || 0);
      currTotals[cur].credit += Number(l.CreditTransaction || 0);
    });
    Object.entries(currTotals).forEach(([cur, { debit, credit }]) => {
      if (Math.abs(debit - credit) >= 0.01) {
        valErrors.push(`Tx not balanced for [${cur}]`);
      }
    });

    if (valErrors.length > 0) return setError(valErrors.join(' | '));

    setSaving(true);
    try {
      const headerPayload = {
        JournalPrefix: modelDef.header.JournalPrefix,
        JournalDate: journalDate,
        JournalDescription: journalRemarks,
        JournalCurrency: journalCurrency,
        JournalExchangeRate: Number(journalExchangeRate) || 1,
        OrginalDoucmentPrefix: '',
        OrginalDoucmentNumber: 0,
        JournalSource: '',
        JournalModelID: Number(modelDef.header.ModelID)
      };

      const rowsPayload = linesData.map(l => {
        const rowObj = {
          Line: l.Line,
          LineType: l.LineType,
          LineDescription: l.Remarks || '',
          Reference1: '',
          Reference2: '',
          Account: l.Segments[1] || '',
          DebitorCreditor: l.Segments[2] || '',
          Customer: l.Segments[3] || '',
          Vendor: l.Segments[4] || '',
          Bank: l.Segments[5] || '',
          Tax: l.Segments[6] || '',
          LineCurrency: l.LineCurrency || journalCurrency,
          LineExchangeRate: Number(l.LineExchangeRate) || 1,
          DebitTransaction: Number(l.DebitTransaction) || 0,
          CreditTransaction: Number(l.CreditTransaction) || 0,
          DebitBook: Number(l.DebitBook) || 0,
          CreditBook: Number(l.CreditBook) || 0,
          IsDoucmentRelated: 0,
          IsLocked: 0
        };
        for(let i=7; i<=16; i++) {
           rowObj[`Segment${i}`] = l.Segments[i] || '';
        }
        return rowObj;
      });

      let res;
      if (isEditMode) {
        headerPayload.EventNo = editRow.EventNumber;
        headerPayload.JournalNo = editRow.JournalNumber;
        res = await apiCall('Edit Journal Header', headerPayload, { User: user?.Username, LineData: JSON.stringify([headerPayload]), LineMember: JSON.stringify(rowsPayload) }, 'journal');
      } else {
        res = await apiCall('New Journal Header', headerPayload, { User: user?.Username, LineMember: JSON.stringify(rowsPayload) }, 'journal');
      }
      
      if (res.State === 0) {
        setSuccess(isEditMode ? 'Journal updated successfully!' : 'Journal Entry created successfully!');
        setSavedJournal((res.List0 || [])[0]);
        if (onSaveSuccess) onSaveSuccess();
      } else {
        setError(res.Message);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (isEditMode && editLocked && !savedJournal) {
      try {
        await apiCall('Close Journal', {
          JournalNo: editRow.JournalNumber,
          EventNo: editRow.EventNumber
        }, { User: user?.Username }, 'journal');
      } catch(e) {
        console.error(e);
      }
    }
    onClose();
  };

  const modelOptions = models.map(m => ({
    value: String(m.ModelID),
    label: `${m.ModelName} (${m.JournalPrefix})`
  }));

  return (
    <>
      <style>{`
        .no-spinners::-webkit-outer-spin-button,
        .no-spinners::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinners {
          -moz-appearance: textfield;
        }
      `}</style>
      <div 
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,32,56,0.3)', backdropFilter: 'blur(3px)',
          zIndex: 9999, transition: 'opacity 0.2s', opacity: 1
        }}
        onClick={onClose}
      />
      <div 
        style={{
          position: 'fixed', top: 10, right: 10, bottom: 10, width: '96%', maxWidth: 1600,
          background: '#F1F3F7', borderRadius: 12, boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
          zIndex: 10000, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#FFF', borderBottom: '1px solid #E9ECF2' }}>
          <div>
            <h1 style={{ fontSize: 20, color: '#0F2038', margin: '0 0 4px 0', fontWeight: 700 }}>Smart Journal</h1>
            <div style={{ color: '#4A5A72', fontSize: 13 }}>Generate precise journal entries using predefined models.</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {success && <div style={{ color: '#008A2E', background: '#E6F4EA', padding: '6px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600 }}>✓ {success}</div>}
            {error && <div style={{ color: 'var(--red)', background: '#FDECEA', padding: '6px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600 }}>✕ {error}</div>}
            {!savedJournal ? (
              <button 
                onClick={handleSave}
                disabled={saving || !modelDef || linesData.length === 0}
                style={{ 
                  background: '#1D4FB8', color: '#FFF', border: 'none', borderRadius: 6, 
                  padding: '8px 20px', fontWeight: 600, cursor: (saving || !modelDef) ? 'not-allowed' : 'pointer',
                  opacity: (saving || !modelDef) ? 0.6 : 1, transition: 'background 0.2s', fontSize: 14
                }}
              >
                {saving ? 'Saving...' : (isEditMode ? 'Update Journal' : 'Post Journal')}
              </button>
            ) : (
              <button 
                onClick={() => {
                  setSavedJournal(null);
                  if (onEditJournal) onEditJournal(savedJournal);
                }}
                style={{ 
                  background: '#1B8F5A', color: '#FFF', border: 'none', borderRadius: 6, 
                  padding: '8px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14
                }}
              >
                Edit Journal
              </button>
            )}
            
            {(isEditMode || savedJournal) && (
              <button 
                onClick={() => onPrintJournal && onPrintJournal(savedJournal || editRow)}
                style={{ 
                  background: '#F1F3F7', color: '#4A5A72', border: '1px solid #DCE1EA', borderRadius: 6, 
                  padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                🖨️ Print
              </button>
            )}

            <button 
              onClick={handleClose}
              style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: '#F1F3F7', color: '#4A5A72', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
            >
              ×
            </button>
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ background: '#FFF', border: '1px solid #DCE1EA', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        
        {/* Step 1: Model Selection & Header Setup */}
        <div style={{ padding: 20, borderBottom: '1px solid #E9ECF2', background: '#F8F9FA' }}>
          <h2 style={{ fontSize: 14, color: '#4A5A72', margin: '0 0 16px 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>1. Select Model & Header Info</h2>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5A72', marginBottom: 6 }}>Journal Model</label>
              <SearchableSelect 
                options={modelOptions} 
                value={selectedModelId} 
                onChange={setSelectedModelId} 
                placeholder={loadingModels ? "Loading models..." : "Select a model..."}
              />
              {modelDef && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#7A8C9E' }}>
                  <strong>Description:</strong> {modelDef.header.ModelDescription || 'None'}
                </div>
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5A72', marginBottom: 6 }}>Event Date <span style={{color: 'var(--red)'}}>*</span></label>
              <input 
                type="date" 
                value={journalDate} 
                onChange={e => setJournalDate(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #DCE1EA', borderRadius: 4, outline: 'none' }} 
              />
            </div>

            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5A72', marginBottom: 6 }}>Remarks</label>
              <input 
                type="text" 
                value={journalRemarks} 
                onChange={e => setJournalRemarks(e.target.value)}
                placeholder="Overall journal remarks..."
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #DCE1EA', borderRadius: 4, outline: 'none' }} 
              />
            </div>
          </div>
        </div>

        {/* Step 2: Lines Grid */}
        <div style={{ padding: 20 }}>
          <h2 style={{ fontSize: 14, color: '#4A5A72', margin: '0 0 16px 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>2. Data Entry</h2>
          
          {loadingDef ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#7A8C9E' }}>Loading Model Definition...</div>
          ) : !modelDef ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9AA5B4', border: '1px dashed #DCE1EA', borderRadius: 6 }}>
              Select a model above to begin data entry.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8F9FA', borderTop: '1px solid #E9ECF2', borderBottom: '1px solid #E9ECF2' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4A5A72', width: 60 }}>Line</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4A5A72', width: 100 }}>Type</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4A5A72' }}>Segments</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4A5A72', width: 250 }}>Line Description</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4A5A72', width: 80 }}>Curr.</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4A5A72', width: 80 }}>Rate</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#4A5A72', width: 100 }}>Debit (Tx)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#4A5A72', width: 100 }}>Credit (Tx)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#1D4FB8', width: 100 }}>Debit (Bk)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#1D4FB8', width: 100 }}>Credit (Bk)</th>
                  </tr>
                </thead>
                <tbody>
                  {linesData.map((ld, i) => {
                    const modelLineId = modelDef.lines.find(ml => ml.LineType === ld.LineType)?.Line || ld.Line;
                    const lDef = modelDef.lines.find(x => x.Line === modelLineId);
                    const lDetails = modelDef.details.filter(x => x.Line === modelLineId);
                    
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F3F7', background: i % 2 === 0 ? '#FFF' : '#FAFBFC' }}>
                        <td style={{ padding: '12px 12px', fontWeight: 600, color: '#0F2038' }}>{ld.Line}</td>
                        <td style={{ padding: '12px 12px', color: '#4A5A72' }}>
                          <span style={{ background: '#E8EFFE', color: '#1D4FB8', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                            {ld.LineType}
                          </span>
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          {lDetails.length === 0 ? (
                            <span style={{ color: '#9AA5B4', fontStyle: 'italic', fontSize: 12 }}>No segments required</span>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                              {lDetails.map((det, dIdx) => (
                                <div key={dIdx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <label style={{ fontSize: 11, fontWeight: 600, color: '#7A8C9E' }}>
                                    {det.SegmentDescription ? det.SegmentDescription : `Segment ${det.SegmentID}`} {det.IsMandatory === 1 && <span style={{color:'var(--red)'}}>*</span>}
                                  </label>
                                  <ModelSegmentInput 
                                    detail={det} 
                                    value={ld.Segments[det.SegmentID]} 
                                    onChange={(v) => updateSegment(i, det.SegmentID, v)}
                                    user={user}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          <input 
                            type="text" 
                            value={ld.Remarks}
                            onChange={e => updateLine(i, 'Remarks', e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', fontSize: 13, border: '1px solid #DCE1EA', borderRadius: 4, outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '12px 6px' }}>
                          <input 
                            value={ld.LineCurrency || ''}
                            onChange={e => updateLine(i, 'LineCurrency', e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', fontSize: 13, border: '1px solid #DCE1EA', borderRadius: 4, outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '12px 6px' }}>
                          <input 
                            className="no-spinners"
                            type="number" 
                            step="any"
                            value={ld.LineExchangeRate ?? ''}
                            onChange={e => {
                              const newRate = e.target.value === '' ? '' : Number(e.target.value);
                              updateLine(i, 'LineExchangeRate', newRate);
                              const rate = Number(newRate || journalExchangeRate || 1);
                              if (ld.DebitTransaction) updateLine(i, 'DebitBook', Number(ld.DebitTransaction) * rate);
                              if (ld.CreditTransaction) updateLine(i, 'CreditBook', Number(ld.CreditTransaction) * rate);
                            }}
                            style={{ width: '100%', padding: '6px 8px', fontSize: 13, border: '1px solid #DCE1EA', borderRadius: 4, outline: 'none', textAlign: 'right' }}
                          />
                        </td>
                        <td style={{ padding: '5px 8px', borderBottom: '1px solid #E9ECF2', background: '#FFFCF7', color: '#1D4FB8', textAlign: 'right', width: 110 }}>
                          <input 
                            className="no-spinners"
                            type="number" 
                            step="any"
                            value={ld.DebitTransaction ?? ''}
                            onChange={e => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              updateLine(i, 'DebitTransaction', val);
                              const rate = Number(ld.LineExchangeRate || journalExchangeRate || 1);
                              updateLine(i, 'DebitBook', val === '' ? '' : val * rate);
                            }}
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid #DCE1EA', borderRadius: 4, textAlign: 'right', fontFamily: "'Roboto Mono', monospace", fontSize: 12, outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '5px 8px', borderBottom: '1px solid #E9ECF2', background: '#FFFCF7', color: '#B5651D', textAlign: 'right', width: 110 }}>
                          <input 
                            className="no-spinners"
                            type="number" 
                            step="any"
                            value={ld.CreditTransaction ?? ''}
                            onChange={e => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              updateLine(i, 'CreditTransaction', val);
                              const rate = Number(ld.LineExchangeRate || journalExchangeRate || 1);
                              updateLine(i, 'CreditBook', val === '' ? '' : val * rate);
                            }}
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid #DCE1EA', borderRadius: 4, textAlign: 'right', fontFamily: "'Roboto Mono', monospace", fontSize: 12, outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '5px 8px', borderBottom: '1px solid #E9ECF2', background: '#EFF5FF', color: '#1D4FB8', textAlign: 'right', width: 110 }}>
                          <input 
                            className="no-spinners"
                            type="number" 
                            step="any"
                            value={ld.DebitBook ?? ''}
                            onChange={e => updateLine(i, 'DebitBook', e.target.value === '' ? '' : Number(e.target.value))}
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid #DCE1EA', borderRadius: 4, textAlign: 'right', fontFamily: "'Roboto Mono', monospace", fontSize: 12, outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '5px 8px', borderBottom: '1px solid #E9ECF2', background: '#FFF6EC', color: '#B5651D', textAlign: 'right', width: 110 }}>
                          <input 
                            className="no-spinners"
                            type="number" 
                            step="any"
                            value={ld.CreditBook ?? ''}
                            onChange={e => updateLine(i, 'CreditBook', e.target.value === '' ? '' : Number(e.target.value))}
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid #DCE1EA', borderRadius: 4, textAlign: 'right', fontFamily: "'Roboto Mono', monospace", fontSize: 12, outline: 'none' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Add Line Row */}
              <div style={{ display: 'flex', gap: 10, padding: '12px', background: '#FFF', borderTop: '1px solid #E9ECF2', alignItems: 'center' }}>
                <select 
                  value={newLineType} 
                  onChange={e => setNewLineType(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #DCE1EA', borderRadius: 4, outline: 'none', background: '#F8F9FA', minWidth: 150 }}
                >
                  <option value="" disabled>Select Line Type...</option>
                  {modelDef && Array.from(new Set(modelDef.lines.map(l => l.LineType))).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <button 
                  onClick={handleAddLine}
                  disabled={!newLineType}
                  style={{ 
                    background: newLineType ? '#1D4FB8' : '#DCE1EA', color: newLineType ? '#FFF' : '#7A8C9E', 
                    border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 12, fontWeight: 600, 
                    cursor: newLineType ? 'pointer' : 'not-allowed', transition: 'background 0.2s' 
                  }}
                >
                  + Add Line
                </button>
              </div>

              {/* Totals Row */}
              {linesData.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 12px', background: '#F8F9FA', borderTop: '1px solid #DCE1EA', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
                  <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#7A8C9E', fontWeight: 600, textTransform: 'uppercase' }}>Total Debit Book</div>
                        <div style={{ fontSize: 16, color: '#0F2038', fontWeight: 700 }}>
                          {linesData.reduce((sum, l) => sum + (Number(l.DebitBook) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#7A8C9E', fontWeight: 600, textTransform: 'uppercase' }}>Total Credit Book</div>
                        <div style={{ fontSize: 16, color: '#0F2038', fontWeight: 700 }}>
                          {linesData.reduce((sum, l) => sum + (Number(l.CreditBook) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
        </div>
      </div>
    </>
  );
}
