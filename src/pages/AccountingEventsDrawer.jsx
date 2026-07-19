import React, { useState, useEffect, useRef } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';
import MacroInput from '../shared/MacroInput.jsx';

export default function AccountingEventsDrawer({ row, user, onClose, onSaveSuccess }) {
  const [header, setHeader] = useState(row || {
    EventID: 0,
    EventName: '',
    JournalDate: '',
    JournalState: '',
    JournalPrefix: '',
    JournalDescription: '',
    JournalCurrency: '',
    JournalExchangeRate: '',
    IsSummarized: 0
  });
  const [lines, setLines] = useState([]);
  const [editingLineIndex, setEditingLineIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [optPrefixes, setOptPrefixes] = useState([]);
  const [macros, setMacros] = useState([]);

  const [saving, setSaving] = useState(false);
  const isEditMode = !!row;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        if (isEditMode) {
          const res = await apiCall('Get Event For Edit', { EventID: row.EventID }, { User: user?.Username }, 'journal');
          if (res.State === 0) {
            if (res.List0 && res.List0.length > 0) setHeader(res.List0[0]);
            if (res.List1) setLines(res.List1);
          } else {
            setError(res.Message);
          }
        }
        
        // Fetch Macros
        try {
          const mRes = await apiCall('Get Macros List', null, { User: user?.Username }, 'journal');
          if (mRes.State === 0 || mRes.List0) {
            setMacros((mRes.List0 || []).map(m => m.MacroName));
          }
        } catch (e) {
          console.error('Failed to fetch macros', e);
        }
        
        // Fetch Journal Prefixes
        try {
          const todayStr = new Date().toISOString().split('T')[0];
          const prefRes = await apiCall('Get Journal Prefixes', { Date: todayStr });
          if (prefRes.State === 0 || prefRes.List0) {
            setOptPrefixes((prefRes.List0 || []).map(x => ({ label: x.JournalPrefix, value: x.JournalPrefix })));
          }
        } catch (e) {
          console.error('Failed to fetch prefixes', e);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [row, isEditMode, user]);

  const handleClose = () => {
    onClose();
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (!header.EventName) throw new Error('Event Name is required');

      const payload = {
        ...header,
        IsSummarized: header.IsSummarized ? 1 : 0,
        IsNew: isEditMode ? 0 : 1
      };

      const res = await apiCall('Save Event', payload, { User: user?.Username, LineMember: JSON.stringify(lines) }, 'journal');
      if (res.State === 0) {
        setSuccess('Event saved successfully!');
        if (onSaveSuccess) onSaveSuccess();
        setTimeout(handleClose, 1500);
      } else {
        setError(res.Message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addLine = () => {
    const newLine = {
      EventID: header.EventID || 0,
      Line: lines.length + 1,
      IsDynamicLine: 0,
      TotalDynamicLines: '',
      JournalLine: '',
      DebitTransaction: '',
      CreditTransaction: '',
      LineDescription: '',
      Reference1: '',
      Reference2: '',
      Account: '',
      DebitorCreditor: '',
      Customer: '',
      Vendor: '',
      Bank: '',
      Segment6: '',
      Segment7: '',
      Segment8: '',
      Segment9: '',
      Segment10: '',
      Segment11: '',
      Segment12: '',
      Segment13: '',
      Segment14: '',
      Segment15: '',
      Segment16: '',
      IsLocked: '0',
      IsDoucmentRelated: 0
    };
    setLines([...lines, newLine]);
    setEditingLineIndex(lines.length);
  };

  const updateLine = (idx, field, value) => {
    const copy = [...lines];
    copy[idx][field] = value;
    setLines(copy);
  };

  const removeLine = (idx) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  return (
    <>
      <div 
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,32,56,0.3)', backdropFilter: 'blur(3px)',
          zIndex: 9999
        }}
        onClick={handleClose}
      />
      <div 
        style={{
          position: 'fixed', top: 10, right: 10, bottom: 10, width: '90%', maxWidth: 1000,
          background: '#fff', borderRadius: 12, boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
          zIndex: 10000, display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E9ECF2', background: '#F8F9FA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0F2038' }}>{isEditMode ? `Edit Event - ${header.EventName}` : 'New Accounting Event'}</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{isEditMode ? `ID: ${header.EventID}` : 'Draft Event'}</div>
          </div>
          <button onClick={handleClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9AA5B4', fontSize: 24 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {error && <div style={{ padding: 12, background: '#FEF2F2', color: '#DC2626', borderRadius: 8, marginBottom: 16 }}>{error}</div>}
          {success && <div style={{ padding: 12, background: '#ECFDF5', color: '#059669', borderRadius: 8, marginBottom: 16 }}>{success}</div>}

          {/* Header Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Event Name</label>
              <input value={header.EventName} onChange={e => setHeader({...header, EventName: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Journal Prefix</label>
              <SearchableSelect 
                value={header.JournalPrefix} 
                onChange={val => setHeader({...header, JournalPrefix: val})} 
                options={optPrefixes} 
                placeholder="Select Prefix..." 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Description</label>
              <MacroInput macros={macros} value={header.JournalDescription} onChange={e => setHeader({...header, JournalDescription: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
              <input type="checkbox" checked={header.IsSummarized === 1} onChange={e => setHeader({...header, IsSummarized: e.target.checked ? 1 : 0})} id="isSumm" />
              <label htmlFor="isSumm" style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Is Summarized</label>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E9ECF2', margin: '24px 0' }} />

          {/* Lines Section */}
          {editingLineIndex === null ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: '#0F2038' }}>Event Lines</h3>
                <button onClick={addLine} style={{ padding: '6px 12px', background: '#3B82F6', color: 'white', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13 }}>+ Add Line</button>
              </div>

              <div style={{ border: '1px solid #E9ECF2', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead style={{ background: '#F8FAFC' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid #E9ECF2' }}>Line</th>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid #E9ECF2' }}>Account</th>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid #E9ECF2' }}>Debit Tran</th>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid #E9ECF2' }}>Credit Tran</th>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid #E9ECF2' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #E9ECF2' }}>
                        <td style={{ padding: '8px 12px' }}>{l.Line}</td>
                        <td style={{ padding: '8px 12px' }}>{l.Account}</td>
                        <td style={{ padding: '8px 12px' }}>{l.DebitTransaction}</td>
                        <td style={{ padding: '8px 12px' }}>{l.CreditTransaction}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <button onClick={() => setEditingLineIndex(idx)} style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', marginRight: 12, fontWeight: 600 }}>Edit</button>
                          <button onClick={() => removeLine(idx)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontWeight: 600 }}>✕</button>
                        </td>
                      </tr>
                    ))}
                    {lines.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>No lines added yet. Click "+ Add Line" to begin.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 8, border: '1px solid #E9ECF2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: '#0F2038' }}>Editing Line {lines[editingLineIndex].Line}</h3>
                <button onClick={() => setEditingLineIndex(null)} style={{ padding: '6px 12px', background: '#fff', color: '#475569', borderRadius: 6, border: '1px solid #CBD5E1', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Done Editing</button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                {/* General Details */}
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Journal Line</label><MacroInput macros={macros} value={lines[editingLineIndex].JournalLine || ''} onChange={e => updateLine(editingLineIndex, 'JournalLine', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }} /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Account</label><MacroInput macros={macros} value={lines[editingLineIndex].Account || ''} onChange={e => updateLine(editingLineIndex, 'Account', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }} /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Line Description</label><MacroInput macros={macros} value={lines[editingLineIndex].LineDescription || ''} onChange={e => updateLine(editingLineIndex, 'LineDescription', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }} /></div>
                
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Debit Transaction</label><MacroInput macros={macros} value={lines[editingLineIndex].DebitTransaction || ''} onChange={e => updateLine(editingLineIndex, 'DebitTransaction', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }} /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Credit Transaction</label><MacroInput macros={macros} value={lines[editingLineIndex].CreditTransaction || ''} onChange={e => updateLine(editingLineIndex, 'CreditTransaction', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }} /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Debitor/Creditor</label><MacroInput macros={macros} value={lines[editingLineIndex].DebitorCreditor || ''} onChange={e => updateLine(editingLineIndex, 'DebitorCreditor', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }} /></div>
                
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Customer</label><MacroInput macros={macros} value={lines[editingLineIndex].Customer || ''} onChange={e => updateLine(editingLineIndex, 'Customer', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }} /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Vendor</label><MacroInput macros={macros} value={lines[editingLineIndex].Vendor || ''} onChange={e => updateLine(editingLineIndex, 'Vendor', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }} /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Bank</label><MacroInput macros={macros} value={lines[editingLineIndex].Bank || ''} onChange={e => updateLine(editingLineIndex, 'Bank', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }} /></div>

                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Reference 1</label><MacroInput macros={macros} value={lines[editingLineIndex].Reference1 || ''} onChange={e => updateLine(editingLineIndex, 'Reference1', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }} /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Reference 2</label><MacroInput macros={macros} value={lines[editingLineIndex].Reference2 || ''} onChange={e => updateLine(editingLineIndex, 'Reference2', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }} /></div>
              </div>

              {/* Segments Section */}
              <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#0F2038', borderBottom: '1px solid #CBD5E1', paddingBottom: 6 }}>Segments</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[6,7,8,9,10,11,12,13,14,15,16].map(num => (
                  <div key={num}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Segment {num}</label>
                    <MacroInput macros={macros} value={lines[editingLineIndex][`Segment${num}`] || ''} onChange={e => updateLine(editingLineIndex, `Segment${num}`, e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 12 }} />
                  </div>
                ))}
              </div>

              {/* Settings Section */}
              <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#0F2038', borderBottom: '1px solid #CBD5E1', paddingBottom: 6 }}>Settings</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={lines[editingLineIndex].IsLocked === '1' || lines[editingLineIndex].IsLocked === 1} onChange={e => updateLine(editingLineIndex, 'IsLocked', e.target.checked ? '1' : '0')} id="isLockedLine" />
                  <label htmlFor="isLockedLine" style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Is Locked</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={lines[editingLineIndex].IsDynamicLine === 1} onChange={e => updateLine(editingLineIndex, 'IsDynamicLine', e.target.checked ? 1 : 0)} id="isDynLine" />
                  <label htmlFor="isDynLine" style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Is Dynamic Line</label>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Total Dynamic Lines</label>
                  <MacroInput macros={macros} value={lines[editingLineIndex].TotalDynamicLines || ''} onChange={e => updateLine(editingLineIndex, 'TotalDynamicLines', e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: 12 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={lines[editingLineIndex].IsDoucmentRelated === 1} onChange={e => updateLine(editingLineIndex, 'IsDoucmentRelated', e.target.checked ? 1 : 0)} id="isDocRel" />
                  <label htmlFor="isDocRel" style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Document Related</label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #E9ECF2', background: '#F8F9FA', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={handleClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#3B82F6', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>{saving ? 'Saving...' : 'Save Event'}</button>
        </div>
      </div>
    </>
  );
}
