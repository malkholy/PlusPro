import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';
import ConditionBuilderModal from '../shared/ConditionBuilderModal.jsx';

export default function AccountingFunctionDrawer({ user, editRow, onClose, onSaveSuccess }) {
  const isEditMode = !!editRow;
  
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('docs');

  // Header State
  const [funcPrefix, setFuncPrefix] = useState('');
  const [funcDesc, setFuncDesc] = useState('');
  const [funcType, setFuncType] = useState('');
  const [docPrefix, setDocPrefix] = useState('');
  const [eventID, setEventID] = useState(0);
  const [hasDocType, setHasDocType] = useState(0);
  const [quickFlag, setQuickFlag] = useState(0);

  // Document Types State (List of objects: { DocumentType, DocumentDescription, Tax, details: [ {Line, SegmentID, SegmentCondition} ] })
  const [docTypes, setDocTypes] = useState([]);
  const [expandedDocType, setExpandedDocType] = useState(null);

  // Sequences State (List of objects: { DoucmentYear, DoucmentSequence, DoucmentPrefix })
  const [sequences, setSequences] = useState([]);
  
  const [eventsList, setEventsList] = useState([]);
  const [optSegments, setOptSegments] = useState([]);
  
  const [activeConditionCell, setActiveConditionCell] = useState(null);

  useEffect(() => {
    async function loadEventsAndSegments() {
      try {
        const evRes = await apiCall('Get Events List', null, { User: user?.Username }, 'journal');
        if (evRes.State === 0) {
          setEventsList((evRes.List0 || []).map(e => ({
            id: e.EventID,
            label: `${e.EventID} - ${e.EventName}`
          })));
        }

        const segRes = await apiCall('Get Active Segment Definitions', null, { User: user?.Username }, 'journal');
        if (segRes.State === 0) {
          setOptSegments((segRes.List0 || []).map(x => ({
            value: x.SegmentID,
            label: `${x.SegmentID} - ${x.SegmentDescription}`,
            description: x.SegmentDescription,
            data: x
          })));
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadEventsAndSegments();
    
    if (isEditMode) {
      loadFullFunction(editRow.FunctionPrefix);
    } else {
      setLoading(false);
    }
  }, [isEditMode, editRow]);

  const loadFullFunction = async (prefix) => {
    setLoading(true);
    try {
      const res = await apiCall('Get Accounting Function For Edit', { FunctionPrefix: prefix }, { User: user?.Username }, 'journal');
      if (res.State === 0) {
        const h = (res.List0 || [])[0] || {};
        setFuncPrefix(h.FunctionPrefix || '');
        setFuncDesc(h.FunctionDescription || '');
        setFuncType(h.FuctionType || '');
        setDocPrefix(h.DoucmentPrefix || '');
        setEventID(h.EventID || 0);
        setHasDocType(h.HasDocumentType || 0);
        setQuickFlag(h.QuickFlag || 0);

        const typesRaw = res.List1 || [];
        const detailsRaw = res.List2 || [];
        
        const mappedTypes = typesRaw.map(t => {
          const lines = detailsRaw.filter(d => d.DocumentType === t.DocumentType).map(d => ({
            Line: d.Line, SegmentID: d.SegmentID, SegmentCondition: d.SegmentCondition, SegmentDescription: d.SegmentDescription || ''
          }));
          return {
            DocumentType: t.DocumentType,
            DocumentDescription: t.DocumentDescription,
            Tax: t.Tax,
            details: lines
          };
        });
        setDocTypes(mappedTypes);
        setSequences(res.List3 || []);
      } else {
        setError(res.Message);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!funcPrefix) {
      setError('Function Prefix is required');
      return;
    }
    setSaving(true);
    setError('');

    // Flatten Document Details for API
    const flatDetails = [];
    docTypes.forEach(dt => {
      (dt.details || []).forEach(d => {
        flatDetails.push({
          DocumentType: dt.DocumentType,
          Line: d.Line,
          SegmentID: d.SegmentID,
          SegmentCondition: d.SegmentCondition
        });
      });
    });

    const payload = {
      FunctionPrefix: funcPrefix,
      FunctionDescription: funcDesc,
      FuctionType: funcType,
      DoucmentPrefix: docPrefix,
      EventID: Number(eventID) || 0,
      HasDocumentType: Number(hasDocType) || 0,
      QuickFlag: Number(quickFlag) || 0,
      IsNew: isEditMode ? 0 : 1
    };

    const members = {
      DocumentTypes: docTypes.map(d => ({ DocumentType: Number(d.DocumentType) || 0, DocumentDescription: d.DocumentDescription, Tax: Number(d.Tax) || 0 })),
      DocumentDetails: flatDetails.map(d => ({ DocumentType: Number(d.DocumentType) || 0, Line: Number(d.Line) || 0, SegmentID: Number(d.SegmentID) || 0, SegmentCondition: d.SegmentCondition || '' })),
      Sequences: sequences.map(s => ({ DoucmentYear: Number(s.DoucmentYear) || 0, DoucmentSequence: Number(s.DoucmentSequence) || 0, DoucmentPrefix: s.DoucmentPrefix || '' }))
    };

    try {
      const res = await apiCall('Save Accounting Function', payload, { User: user?.Username, LineMember: JSON.stringify(members) }, 'journal');
      if (res.State === 0) {
        onSaveSuccess();
      } else {
        setError(res.Message);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // UI Helpers
  const addDocType = () => {
    setDocTypes([...docTypes, { DocumentType: '', DocumentDescription: '', Tax: 0, details: [] }]);
  };
  const updateDocType = (idx, field, val) => {
    const next = [...docTypes];
    next[idx][field] = val;
    setDocTypes(next);
  };
  const removeDocType = (idx) => {
    const next = [...docTypes];
    next.splice(idx, 1);
    setDocTypes(next);
  };

  const addDocDetail = (dtIdx) => {
    const next = [...docTypes];
    const lines = next[dtIdx].details || [];
    const maxLine = lines.length ? Math.max(...lines.map(l => l.Line || 0)) : 0;
    lines.push({ Line: maxLine + 1, SegmentID: 1, SegmentCondition: '' });
    next[dtIdx].details = lines;
    setDocTypes(next);
  };
  const updateDocDetail = (dtIdx, detailIdx, field, val) => {
    const next = [...docTypes];
    next[dtIdx].details[detailIdx][field] = val;
    
    // Automatically set description if SegmentID is changed
    if (field === 'SegmentID') {
      const selected = optSegments.find(o => o.value == val);
      if (selected) {
        next[dtIdx].details[detailIdx].SegmentDescription = selected.description;
      } else {
        next[dtIdx].details[detailIdx].SegmentDescription = '';
      }
    }
    
    setDocTypes(next);
  };
  const removeDocDetail = (dtIdx, detailIdx) => {
    const next = [...docTypes];
    next[dtIdx].details.splice(detailIdx, 1);
    setDocTypes(next);
  };

  const addSequence = () => {
    setSequences([...sequences, { DoucmentYear: new Date().getFullYear(), DoucmentSequence: 1, DoucmentPrefix: docPrefix }]);
  };
  const updateSequence = (idx, field, val) => {
    const next = [...sequences];
    next[idx][field] = val;
    setSequences(next);
  };
  const removeSequence = (idx) => {
    const next = [...sequences];
    next.splice(idx, 1);
    setSequences(next);
  };

  if (loading) {
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ padding: '24px 48px', background: '#FFF', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: 1000, background: '#F8F9FA', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.15)' }}>
        
        <div style={{ padding: '20px 24px', background: '#FFF', borderBottom: '1px solid #DCE1EA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: '#1A2332' }}>{isEditMode ? 'Edit Accounting Function' : 'New Accounting Function'}</h2>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Configure function master, types, and sequence settings</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {error && <div style={{ color: '#DC2626', background: '#FEF2F2', padding: '6px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600 }}>{error}</div>}
            <button onClick={handleSave} disabled={saving} style={{ background: '#2563EB', color: '#FFF', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : 'Save Function'}
            </button>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: '#F1F3F7', color: '#4A5A72', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Header Info */}
          <div style={{ background: '#FFF', padding: 24, borderRadius: 8, border: '1px solid #DCE1EA', marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#1A2332' }}>Header Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Function Prefix</label>
                <input value={funcPrefix} onChange={e => setFuncPrefix(e.target.value)} disabled={isEditMode} maxLength={50} style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6 }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Description</label>
                <input value={funcDesc} onChange={e => setFuncDesc(e.target.value)} maxLength={255} style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Function Type</label>
                <input value={funcType} onChange={e => setFuncType(e.target.value)} maxLength={50} style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Document Prefix</label>
                <input value={docPrefix} onChange={e => setDocPrefix(e.target.value)} maxLength={50} style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6 }} />
              </div>
              <div style={{ zIndex: 10 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Event ID</label>
                <SearchableSelect 
                  value={eventID} 
                  onChange={setEventID} 
                  options={eventsList} 
                  placeholder="Select Event"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
                  <input type="checkbox" checked={hasDocType === 1} onChange={e => setHasDocType(e.target.checked ? 1 : 0)} id="hdt" />
                  <label htmlFor="hdt" style={{ fontSize: 13, fontWeight: 600, color: '#1A2332', cursor: 'pointer' }}>Has Doc Type</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
                  <input type="checkbox" checked={quickFlag === 1} onChange={e => setQuickFlag(e.target.checked ? 1 : 0)} id="qf" />
                  <label htmlFor="qf" style={{ fontSize: 13, fontWeight: 600, color: '#1A2332', cursor: 'pointer' }}>Quick Flag</label>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid #DCE1EA', marginBottom: 20 }}>
            <div onClick={() => setActiveTab('docs')} style={{ paddingBottom: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', borderBottom: activeTab === 'docs' ? '2px solid #2563EB' : '2px solid transparent', color: activeTab === 'docs' ? '#2563EB' : '#64748B' }}>Document Types & Details</div>
            <div onClick={() => setActiveTab('seq')} style={{ paddingBottom: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', borderBottom: activeTab === 'seq' ? '2px solid #2563EB' : '2px solid transparent', color: activeTab === 'seq' ? '#2563EB' : '#64748B' }}>Sequences</div>
          </div>

          {activeTab === 'docs' && (
            <div style={{ background: '#FFF', borderRadius: 8, border: '1px solid #DCE1EA', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: '#F8F9FA', borderBottom: '1px solid #DCE1EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Document Types</span>
                <button onClick={addDocType} style={{ background: '#E2E8F0', border: 'none', padding: '4px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+ Add Type</button>
              </div>
              {docTypes.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No Document Types added.</div>}
              {docTypes.map((dt, idx) => (
                <div key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', padding: 12, gap: 12, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <input placeholder="Doc Type ID (e.g. 1)" value={dt.DocumentType} onChange={e => updateDocType(idx, 'DocumentType', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #E2E8F0', borderRadius: 4 }} />
                    </div>
                    <div style={{ flex: 2 }}>
                      <input placeholder="Description" value={dt.DocumentDescription} onChange={e => updateDocType(idx, 'DocumentDescription', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #E2E8F0', borderRadius: 4 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <input placeholder="Tax %" type="number" value={dt.Tax} onChange={e => updateDocType(idx, 'Tax', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #E2E8F0', borderRadius: 4 }} />
                    </div>
                    <button onClick={() => setExpandedDocType(expandedDocType === idx ? null : idx)} style={{ background: 'transparent', border: '1px solid #CBD5E1', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                      {expandedDocType === idx ? 'Hide Segments' : `Segments (${dt.details?.length || 0})`}
                    </button>
                    <button onClick={() => removeDocType(idx)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0 8px', fontSize: 16 }}>×</button>
                  </div>

                  {expandedDocType === idx && (
                    <div style={{ background: '#F8FAFC', padding: '16px 24px 24px', borderTop: '1px dashed #CBD5E1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Segment Details for Document Type {dt.DocumentType || '-'}</span>
                        <button onClick={() => addDocDetail(idx)} style={{ background: '#CBD5E1', border: 'none', padding: '4px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600, color: '#1E293B' }}>+ Add Segment</button>
                      </div>
                      
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, border: '1px solid #DCE1EA', background: '#FFF' }}>
                        <thead>
                          <tr style={{ background: '#F1F5F9', color: '#64748B', textAlign: 'left' }}>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE1EA', borderRight: '1px solid #DCE1EA', width: 60 }}>Line</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE1EA', borderRight: '1px solid #DCE1EA', width: 100 }}>Segment ID</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE1EA', borderRight: '1px solid #DCE1EA' }}>Segment Description</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE1EA', borderRight: '1px solid #DCE1EA' }}>Segment Condition</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid #DCE1EA', width: 40 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(dt.details || []).map((d, didx) => (
                            <tr key={didx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '6px', borderRight: '1px solid #E2E8F0', textAlign: 'center' }}>
                                <input type="number" value={d.Line} onChange={e => updateDocDetail(idx, didx, 'Line', e.target.value)} style={{ width: '100%', padding: 6, border: '1px solid transparent', borderRadius: 4, background: 'transparent', textAlign: 'center' }} />
                              </td>
                              <td style={{ padding: '6px', borderRight: '1px solid #E2E8F0', width: 250 }}>
                                <SearchableSelect 
                                  value={d.SegmentID || ''}
                                  options={optSegments}
                                  onChange={val => updateDocDetail(idx, didx, 'SegmentID', val)}
                                  placeholder="Select Segment"
                                  style={{ width: '100%' }}
                                />
                              </td>
                              <td style={{ padding: '8px 12px', borderRight: '1px solid #E2E8F0', color: '#4A5A72' }}>
                                {d.SegmentDescription || '-'}
                              </td>
                              <td style={{ padding: '6px', borderRight: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <input value={d.SegmentCondition} onChange={e => updateDocDetail(idx, didx, 'SegmentCondition', e.target.value)} style={{ width: '100%', padding: 6, border: '1px solid transparent', borderRadius: 4, background: 'transparent' }} />
                                  <button 
                                    onClick={() => {
                                      const segDef = optSegments.find(o => o.value == d.SegmentID)?.data;
                                      setActiveConditionCell({ dtIdx: idx, detailIdx: didx, tableName: segDef?.SourceFile || '', initialCondition: d.SegmentCondition || '' });
                                    }}
                                    style={{ padding: '4px 8px', background: '#E8EFFE', border: '1px solid #1D4FB8', borderRadius: 4, color: '#1D4FB8', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                                    title="Open Condition Builder"
                                  >
                                    {'{ }'}
                                  </button>
                                </div>
                              </td>
                              <td style={{ padding: '6px', textAlign: 'center' }}>
                                <button onClick={() => removeDocDetail(idx, didx)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16 }}>×</button>
                              </td>
                            </tr>
                          ))}
                          {(!dt.details || dt.details.length === 0) && (
                            <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#94A3B8' }}>No segments configured for this document type.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'seq' && (
            <div style={{ background: '#FFF', borderRadius: 8, border: '1px solid #DCE1EA', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: '#F8F9FA', borderBottom: '1px solid #DCE1EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Sequences</span>
                <button onClick={addSequence} style={{ background: '#E2E8F0', border: 'none', padding: '4px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+ Add Sequence</button>
              </div>
              <div style={{ padding: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: '#64748B', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '0 8px 8px' }}>Year</th>
                      <th style={{ padding: '0 8px 8px' }}>Current Sequence</th>
                      <th style={{ padding: '0 8px 8px' }}>Doc Prefix</th>
                      <th style={{ padding: '0 8px 8px', width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sequences.length === 0 && <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>No Sequences defined.</td></tr>}
                    {sequences.map((s, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '8px' }}>
                          <input type="number" value={s.DoucmentYear} onChange={e => updateSequence(idx, 'DoucmentYear', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #E2E8F0', borderRadius: 4 }} />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input type="number" value={s.DoucmentSequence} onChange={e => updateSequence(idx, 'DoucmentSequence', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #E2E8F0', borderRadius: 4 }} />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input value={s.DoucmentPrefix} onChange={e => updateSequence(idx, 'DoucmentPrefix', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #E2E8F0', borderRadius: 4 }} />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button onClick={() => removeSequence(idx)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 18 }}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
            updateDocDetail(activeConditionCell.dtIdx, activeConditionCell.detailIdx, 'SegmentCondition', newCondition);
            setActiveConditionCell(null);
          }}
        />
      )}
    </div>
  );
}
