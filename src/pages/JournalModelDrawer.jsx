import React, { useState, useEffect, useRef } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';
import ConditionBuilderModal from '../shared/ConditionBuilderModal.jsx';

// Reusable custom input style to match Plus Pro UI
const Input = ({ label, value, onChange, disabled, type = 'text', width = '100%', required }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width }}>
    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#4A5A72', textTransform: 'uppercase', letterSpacing: 0.3 }}>
      {label} {required && <span style={{ color: 'var(--red)' }}>*</span>}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{
        padding: '7px 10px', fontSize: 13, border: '1px solid #DCE1EA',
        borderRadius: 5, background: disabled ? '#F8F9FA' : '#FFF',
        color: disabled ? '#7A8C9E' : '#0F2038', outline: 'none', transition: 'border-color 0.15s'
      }}
      onFocus={e => !disabled && (e.target.style.borderColor = '#1D4FB8')}
      onBlur={e => !disabled && (e.target.style.borderColor = '#DCE1EA')}
    />
  </div>
);

export default function JournalModelDrawer({ row, user, onClose, onSaveSuccess }) {
  const [mode, setMode] = useState('view'); // view | edit | new
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [header, setHeader] = useState(null);
  const [lines, setLines] = useState([]);
  
  // Drawer states
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  const savingRef = useRef(false);

  const [expandedLines, setExpandedLines] = useState({});
  const [optPrefixes, setOptPrefixes] = useState([]);
  const [optSegments, setOptSegments] = useState([]);

  const [activeConditionCell, setActiveConditionCell] = useState(null);

  useEffect(() => {
    async function fetchPrefixes() {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await apiCall('Get Journal Prefixes', { Date: todayStr });
        setOptPrefixes((res.List0 || []).map(x => ({ value: x.JournalPrefix, label: x.JournalPrefix })));
      } catch (e) {
        console.error('Failed to load prefixes:', e);
      }
    }
    async function fetchSegments() {
      try {
        const res = await apiCall('Get Active Segment Definitions', null, { User: user?.Username }, 'journal');
        if (res.State !== 0) {
          console.error('Backend returned error for segments:', res.Message);
        }
        setOptSegments((res.List0 || []).map(x => ({ 
          value: x.SegmentID, 
          label: `${x.SegmentID} - ${x.SegmentDescription}`,
          data: x 
        })));
      } catch (e) {
        console.error('Failed to load segments:', e);
      }
    }
    fetchPrefixes();
    fetchSegments();
  }, []);

  useEffect(() => {
    if (!row) {
      setMode('new');
      setHeader({ ModelName: '', ModelDescription: '', JournalPrefix: '' });
      setLines([]);
    } else {
      loadRow();
    }
  }, [row]);

  const loadRow = async () => {
    setLoading(true);
    setError('');
    setLines([]);
    setMode('view');
    try {
      const currentModelID = row?.ModelID || header?.ModelID;
      if (!currentModelID) return;
      const d = await apiCall('Get Journal Model For View', { ModelID: currentModelID }, { User: user?.Username }, 'journal');
      if (d.State !== 0) {
        setError(d.Message || 'Failed to load model.');
      } else {
        setHeader((d.List0 || [])[0] || null);
        const rawLines = d.List1 || [];
        const rawDetails = d.List2 || [];
        
        const mergedLines = rawLines.map(l => ({
          ...l,
          Details: rawDetails.filter(dt => dt.Line === l.Line)
        }));
        setLines(mergedLines);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const doEdit = async (forceReset = false) => {
    if (editingRef.current) return;
    editingRef.current = true;
    setEditing(true);
    setError('');
    const currentModelID = row?.ModelID || header?.ModelID;
    if (!currentModelID) return;

    try {
      if (forceReset) {
        await apiCall('Close Journal Model', { ModelID: currentModelID }, { User: user?.Username }, 'journal');
      }
      const d = await apiCall('Open Journal Model', { ModelID: currentModelID }, { User: user?.Username }, 'journal');

      if (d.State !== 0) {
        const inUseBySelf = d.Message && user?.Username && d.Message.toLowerCase().includes(user.Username.toLowerCase());
        if (!forceReset && inUseBySelf) {
          doEdit(true);
          return;
        }
        setError(d.Message || 'Failed to open model for edit.');
      } else {
        setHeader((d.List0 || [])[0] || null);
        const rawLines = d.List1 || [];
        const rawDetails = d.List2 || [];
        
        const mergedLines = rawLines.map(l => ({
          ...l,
          Details: rawDetails.filter(dt => dt.Line === l.Line)
        }));
        setLines(mergedLines);
        setMode('edit');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      editingRef.current = false;
      setEditing(false);
    }
  };

  const doSave = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');

    try {
      if (!header.ModelName) throw new Error('Model Name is required.');
      if (lines.length === 0) throw new Error('At least one line is required.');

      const headerData = mode === 'edit'
        ? { ModelID: header.ModelID, ModelName: header.ModelName, ModelDescription: header.ModelDescription, JournalPrefix: header.JournalPrefix }
        : { ModelName: header.ModelName, ModelDescription: header.ModelDescription, JournalPrefix: header.JournalPrefix };

      const op = mode === 'edit' ? 'Edit Journal Model Header' : 'New Journal Model Header';
      const d = await apiCall(op, headerData, {
        LineMember: JSON.stringify(lines),
        User: user?.Username
      }, 'journal');

      if (d.State !== 0) {
        setError(d.Message || 'Failed to save model.');
      } else {
        setHeader((d.List0 || [])[0] || null);
        const rawLines = d.List1 || [];
        const rawDetails = d.List2 || [];
        
        const mergedLines = rawLines.map(l => ({
          ...l,
          Details: rawDetails.filter(dt => dt.Line === l.Line)
        }));
        setLines(mergedLines);
        setMode('view');
        if (onSaveSuccess) onSaveSuccess();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleClose = async () => {
    const currentModelID = row?.ModelID || header?.ModelID;
    if (!currentModelID) { onClose(); return; }
    if (mode === 'edit') {
      setClosing(true);
      try {
        await apiCall('Close Journal Model', { ModelID: currentModelID }, { User: user?.Username }, 'journal');
      } catch (_) { } finally {
        setClosing(false);
      }
    }
    onClose();
  };

  const addLine = () => {
    setLines(prev => [...prev, { Line: prev.length + 1, LineType: '', Details: [] }]);
  };

  const deleteLine = (idx) => {
    setLines(prev => {
      const copy = prev.filter((_, i) => i !== idx);
      return copy.map((line, i) => ({ ...line, Line: i + 1 }));
    });
  };

  const updateLine = (idx, field, val) => {
    setLines(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const toggleLine = (idx) => {
    setExpandedLines(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const addDetail = (lineIdx) => {
    setLines(prev => {
      const copy = [...prev];
      copy[lineIdx].Details = [...(copy[lineIdx].Details || []), {
        SegmentID: 0, IsStatic: 0, TableName: '', ValueField: '', DescriptionField: '', Condtion: '', IsMandatory: 0
      }];
      return copy;
    });
  };

  const updateDetail = (lineIdx, detailIdx, field, val) => {
    setLines(prev => {
      const copy = [...prev];
      const detailsCopy = [...copy[lineIdx].Details];
      detailsCopy[detailIdx] = { ...detailsCopy[detailIdx], [field]: val };
      copy[lineIdx].Details = detailsCopy;
      return copy;
    });
  };

  const handleSegmentChange = (lineIdx, detailIdx, val) => {
    setLines(prev => {
      const copy = [...prev];
      const detailsCopy = [...copy[lineIdx].Details];
      let newDetail = { ...detailsCopy[detailIdx], SegmentID: val };
      
      const selectedOpt = optSegments.find(o => o.value === val);
      if (selectedOpt && selectedOpt.data) {
        const d = selectedOpt.data;
        if (d.SourceType === 'M') {
          newDetail.TableName = 'ACC.SegmentsMaster';
          newDetail.ValueField = d.KeyField || 'SegmentValue';
          newDetail.DescriptionField = d.DisplayField || 'ValueDescription';
        } else {
          newDetail.TableName = d.SourceFile || '';
          newDetail.ValueField = d.KeyField || '';
          newDetail.DescriptionField = d.DisplayField || '';
        }
      }
      
      detailsCopy[detailIdx] = newDetail;
      copy[lineIdx].Details = detailsCopy;
      return copy;
    });
  };

  const deleteDetail = (lineIdx, detailIdx) => {
    setLines(prev => {
      const copy = [...prev];
      copy[lineIdx].Details = copy[lineIdx].Details.filter((_, i) => i !== detailIdx);
      return copy;
    });
  };

  const isRO = mode === 'view' || loading;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,32,56,0.3)', backdropFilter: 'blur(3px)',
          zIndex: 9999, transition: 'opacity 0.2s', opacity: 1
        }}
        onClick={handleClose}
      />

      {/* Drawer Container */}
      <div 
        style={{
          position: 'fixed', top: 10, right: 10, bottom: 10, width: '90%', maxWidth: 1000,
          background: '#fff', borderRadius: 12, boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
          zIndex: 10000, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
      >
        {/* Header Bar */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #E9ECF2',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#F8F9FA'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: '#1D4FB8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 18
            }}>
              📑
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: '#0F2038', fontWeight: 600 }}>
                {mode === 'new' ? 'New Journal Model' : (mode === 'edit' ? `Edit Model ${header?.ModelID || ''}` : `Model ${header?.ModelID || ''}`)}
              </h2>
              {header?.ModelID && (
                <div style={{ fontSize: 12, color: '#7A8C9E', marginTop: 2 }}>
                  Created by {header.ModelCreatedBy} on {header.ModelCreatedDate?.split('T')[0] || '—'}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {error && <div style={{ color: 'var(--red)', fontSize: 12, fontWeight: 500, background: '#FEECEE', padding: '6px 12px', borderRadius: 4 }}>{error}</div>}
            
            {mode === 'view' && !loading && (
              <button
                onClick={() => doEdit()}
                disabled={editing}
                style={{
                  background: editing ? '#E8EFFE' : '#1D4FB8', border: 'none', borderRadius: 7,
                  padding: '7px 16px', cursor: editing ? 'default' : 'pointer', fontSize: 12.5, fontWeight: 600,
                  color: editing ? '#7A9AE0' : '#fff', display: 'inline-flex', alignItems: 'center', gap: 6
                }}
              >
                {editing ? 'Opening...' : '✏️ Edit'}
              </button>
            )}
            
            {(mode === 'edit' || mode === 'new') && !loading && (
              <button
                onClick={doSave}
                disabled={saving}
                style={{
                  background: saving ? '#E8F5E9' : '#1B8F5A', border: 'none', borderRadius: 7,
                  padding: '7px 16px', cursor: saving ? 'default' : 'pointer', fontSize: 12.5, fontWeight: 600,
                  color: saving ? '#84C9A1' : '#fff', display: 'inline-flex', alignItems: 'center', gap: 6
                }}
              >
                {saving ? 'Saving...' : '💾 Save'}
              </button>
            )}
            
            <button
              onClick={handleClose}
              disabled={closing || saving}
              style={{
                background: 'transparent', border: '1px solid #DCE1EA', borderRadius: 7,
                padding: '7px 14px', cursor: (closing || saving) ? 'default' : 'pointer', fontSize: 12.5, fontWeight: 600,
                color: (closing || saving) ? '#9AA5B4' : '#4A5A72', display: 'inline-flex', alignItems: 'center', gap: 6
              }}
            >
              {closing ? 'Closing...' : '✕ Close'}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#fff' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#7A8C9E' }}>Loading Model...</div>
          ) : (
            <>
              {/* Header Fields */}
              <div style={{
                background: '#F8F9FA', border: '1px solid #E9ECF2', borderRadius: 8, padding: 20,
                display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24
              }}>
                <h3 style={{ margin: 0, fontSize: 14, color: '#0F2038', borderBottom: '1px solid #E9ECF2', paddingBottom: 10 }}>Model Details</h3>
                <div style={{ display: 'flex', gap: 16 }}>
                  <Input label="Model Name" required value={header?.ModelName} onChange={v => setHeader(h => ({ ...h, ModelName: v }))} disabled={isRO} />
                  <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#4A5A72', textTransform: 'uppercase', letterSpacing: 0.3 }}>Journal Prefix</label>
                    <SearchableSelect
                      value={header?.JournalPrefix || ''}
                      options={optPrefixes}
                      onChange={val => setHeader(h => ({ ...h, JournalPrefix: val }))}
                      disabled={isRO}
                      placeholder="Select Prefix"
                    />
                  </div>
                </div>
                <Input label="Description" value={header?.ModelDescription} onChange={v => setHeader(h => ({ ...h, ModelDescription: v }))} disabled={isRO} />
              </div>

              {/* Lines Table */}
              <div style={{ border: '1px solid #E9ECF2', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ background: '#F8F9FA', padding: '12px 16px', borderBottom: '1px solid #E9ECF2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 14, color: '#0F2038' }}>Model Lines</h3>
                  {!isRO && (
                    <button onClick={addLine} style={{ background: '#E8EFFE', border: 'none', padding: '4px 10px', borderRadius: 5, color: '#1D4FB8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      + Add Line
                    </button>
                  )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#FFF', borderBottom: '1px solid #E9ECF2' }}>
                        <th style={{ padding: '10px 16px', color: '#4A5A72', fontWeight: 600, width: 40 }}>#</th>
                        <th style={{ padding: '10px 16px', color: '#4A5A72', fontWeight: 600 }}>Line Type</th>
                        <th style={{ padding: '10px 16px', color: '#4A5A72', fontWeight: 600, width: 100, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, i) => (
                        <React.Fragment key={i}>
                          <tr style={{ borderBottom: '1px solid #E9ECF2' }}>
                            <td style={{ padding: '10px 16px' }}>{line.Line}</td>
                            <td style={{ padding: '10px 16px' }}>
                              <input
                                type="text"
                                value={line.LineType || ''}
                                onChange={e => updateLine(i, 'LineType', e.target.value)}
                                disabled={isRO}
                                style={{
                                  width: '100%', padding: '6px 8px', border: '1px solid transparent', borderRadius: 4,
                                  background: 'transparent', outline: 'none', transition: 'border 0.2s', color: isRO ? '#7A8C9E' : '#0F2038'
                                }}
                                onFocus={e => !isRO && (e.target.style.border = '1px solid #1D4FB8')}
                                onBlur={e => !isRO && (e.target.style.border = '1px solid transparent')}
                                placeholder={isRO ? "" : "e.g., GL, AP, AR"}
                              />
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                              <button onClick={() => toggleLine(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: '#4A5A72', marginRight: 8 }}>
                                {expandedLines[i] ? '▲' : '▼'}
                              </button>
                              {!isRO && (
                                <button onClick={() => deleteLine(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--red)' }}>
                                  🗑
                                </button>
                              )}
                            </td>
                          </tr>
                          
                          {/* Expanded Details Section */}
                          {expandedLines[i] && (
                            <tr style={{ background: '#FAFAFA', borderBottom: '2px solid #DCE1EA' }}>
                              <td colSpan={3} style={{ padding: '16px 32px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                  <h4 style={{ margin: 0, fontSize: 13, color: '#4A5A72' }}>Line Details</h4>
                                  {!isRO && (
                                    <button onClick={() => addDetail(i)} style={{ background: '#fff', border: '1px solid #DCE1EA', padding: '3px 8px', borderRadius: 4, color: '#4A5A72', fontSize: 11, cursor: 'pointer' }}>
                                      + Add Detail
                                    </button>
                                  )}
                                </div>
                                {(!line.Details || line.Details.length === 0) ? (
                                  <div style={{ color: '#9AA5B4', fontSize: 12, fontStyle: 'italic' }}>No details defined for this line.</div>
                                ) : (
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid #E9ECF2' }}>
                                        <th style={{ padding: '6px 8px', color: '#7A8C9E', fontWeight: 600 }}>SegmentID</th>
                                        <th style={{ padding: '6px 8px', color: '#7A8C9E', fontWeight: 600 }}>IsStatic</th>
                                        <th style={{ padding: '6px 8px', color: '#7A8C9E', fontWeight: 600 }}>TableName</th>
                                        <th style={{ padding: '6px 8px', color: '#7A8C9E', fontWeight: 600 }}>ValueField</th>
                                        <th style={{ padding: '6px 8px', color: '#7A8C9E', fontWeight: 600 }}>DescField</th>
                                        <th style={{ padding: '6px 8px', color: '#7A8C9E', fontWeight: 600 }}>Condition</th>
                                        <th style={{ padding: '6px 8px', color: '#7A8C9E', fontWeight: 600 }}>IsMandatory</th>
                                        <th style={{ padding: '6px 8px', width: 30 }}></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {line.Details.map((dt, dIdx) => {
                                        const segDef = optSegments.find(o => o.value === dt.SegmentID)?.data;
                                        const isSysSeg = segDef?.SourceType === 'S';
                                        const isFieldsRO = isRO || isSysSeg;
                                        return (
                                        <tr key={dIdx} style={{ borderBottom: '1px dashed #E9ECF2' }}>
                                          <td style={{ padding: '6px 8px', minWidth: 150 }}>
                                            <SearchableSelect
                                              value={dt.SegmentID || ''}
                                              options={optSegments}
                                              onChange={val => handleSegmentChange(i, dIdx, val)}
                                              disabled={isRO}
                                              placeholder="Select Segment"
                                            />
                                          </td>
                                          <td style={{ padding: '6px 8px' }}>
                                            <input type="checkbox" disabled={isRO} checked={dt.IsStatic === 1} onChange={e => updateDetail(i, dIdx, 'IsStatic', e.target.checked ? 1 : 0)} />
                                          </td>
                                          <td style={{ padding: '6px 8px' }}>
                                            <input type="text" disabled={isFieldsRO} value={dt.TableName || ''} onChange={e => updateDetail(i, dIdx, 'TableName', e.target.value)} style={{ width: '100%', border: '1px solid #DCE1EA', borderRadius: 3, padding: '2px 4px', background: isFieldsRO ? '#F8F9FA' : '#FFF', color: isFieldsRO ? '#7A8C9E' : '#0F2038' }} />
                                          </td>
                                          <td style={{ padding: '6px 8px' }}>
                                            <input type="text" disabled={isFieldsRO} value={dt.ValueField || ''} onChange={e => updateDetail(i, dIdx, 'ValueField', e.target.value)} style={{ width: '100%', border: '1px solid #DCE1EA', borderRadius: 3, padding: '2px 4px', background: isFieldsRO ? '#F8F9FA' : '#FFF', color: isFieldsRO ? '#7A8C9E' : '#0F2038' }} />
                                          </td>
                                          <td style={{ padding: '6px 8px' }}>
                                            <input type="text" disabled={isFieldsRO} value={dt.DescriptionField || ''} onChange={e => updateDetail(i, dIdx, 'DescriptionField', e.target.value)} style={{ width: '100%', border: '1px solid #DCE1EA', borderRadius: 3, padding: '2px 4px', background: isFieldsRO ? '#F8F9FA' : '#FFF', color: isFieldsRO ? '#7A8C9E' : '#0F2038' }} />
                                          </td>
                                          <td style={{ padding: '6px 8px' }}>
                                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                              <input 
                                                type="text" 
                                                disabled={isRO} 
                                                value={dt.Condtion || ''} 
                                                onChange={e => updateDetail(i, dIdx, 'Condtion', e.target.value)} 
                                                style={{ width: '100%', border: '1px solid #DCE1EA', borderRadius: 3, padding: '2px 4px' }} 
                                                placeholder={dt.IsStatic === 1 ? "Value" : "Condition"}
                                              />
                                              {!isRO && dt.IsStatic !== 1 && (
                                                <button 
                                                  onClick={() => setActiveConditionCell({ lineIdx: i, detailIdx: dIdx, tableName: dt.TableName || '', initialCondition: dt.Condtion || '' })}
                                                  style={{ padding: '2px 6px', background: '#E8EFFE', border: '1px solid #1D4FB8', borderRadius: 3, color: '#1D4FB8', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}
                                                  title="Open Condition Builder"
                                                >
                                                  {'{ }'}
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                          <td style={{ padding: '6px 8px' }}>
                                            <input type="checkbox" disabled={isRO} checked={dt.IsMandatory === 1} onChange={e => updateDetail(i, dIdx, 'IsMandatory', e.target.checked ? 1 : 0)} />
                                          </td>
                                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                            {!isRO && (
                                              <button onClick={() => deleteDetail(i, dIdx)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 14 }}>✕</button>
                                            )}
                                          </td>
                                        </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                      {lines.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#9AA5B4', fontStyle: 'italic' }}>
                            No lines added yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {activeConditionCell && (
        <ConditionBuilderModal
          tableName={activeConditionCell.tableName}
          initialCondition={activeConditionCell.initialCondition}
          user={user}
          onClose={() => setActiveConditionCell(null)}
          onSave={(newCondition) => {
            updateDetail(activeConditionCell.lineIdx, activeConditionCell.detailIdx, 'Condtion', newCondition);
            setActiveConditionCell(null);
          }}
        />
      )}
    </>
  );
}
