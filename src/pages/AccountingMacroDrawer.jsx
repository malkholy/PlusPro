import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import ConditionBuilderModal from '../shared/ConditionBuilderModal.jsx';
import SearchableSelect from '../shared/SearchableSelect.jsx';


export default function AccountingMacroDrawer({ user, editRow, onClose, onSaveSuccess }) {
  const isEditMode = !!editRow;

  const [macName, setMacName] = useState('');
  const [macDesc, setMacDesc] = useState('');
  const [dbTables, setDbTables] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [macTable, setMacTable] = useState('');
  const [macPrefix, setMacPrefix] = useState('');
  const [macDoc, setMacDoc] = useState('');
  const [macDynamic1, setMacDynamic1] = useState('');
  const [retType, setRetType] = useState(1);
  const [singleRet, setSingleRet] = useState('');

  const [lines, setLines] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Condition Builder State
  const [condModalOpen, setCondModalOpen] = useState(false);
  const [condModalLineIndex, setCondModalLineIndex] = useState(null);
  const [condModalField, setCondModalField] = useState('LineCondtion');
  const [condModalInitialValue, setCondModalInitialValue] = useState('');


  useEffect(() => {
    async function loadTables() {
      try {
        const res = await apiCall('Get Database Tables', null, { User: user?.Username }, 'journal');
        if (res.State === 0) {
          setDbTables(res.List0 || []);
        }
      } catch(e) {}
    }
    loadTables();
  }, [user]);


  useEffect(() => {
    async function loadColumns() {
      if (!macTable) {
        setTableColumns([]);
        return;
      }
      try {
        const res = await apiCall('Get Table Columns', { TableName: macTable }, { User: user?.Username }, 'journal');
        if (res.State === 0) {
          setTableColumns(res.List0 || []);
        }
      } catch(e) {}
    }
    loadColumns();
  }, [macTable, user]);

  useEffect(() => {
    if (isEditMode && editRow) {
      loadFullMacro(editRow.MacroID);
    }
  }, [isEditMode, editRow]);

  const loadFullMacro = async (id) => {
    setLoading(true);
    try {
      const res = await apiCall('Get Macro For Edit', { MacroID: id }, { User: user?.Username }, 'journal');
      if (res.State === 0) {
        const h = (res.List0 || [])[0] || {};
        setMacName(h.MacroName || '');
        setMacDesc(h.MacroDescription || '');
        setMacTable(h.MacroTable || '');
        setMacPrefix(h.MacroPrefix || '');
        setMacDoc(h.MacroDocumnet || '');
        setMacDynamic1(h.MacroDynamicKey1 || '');
        setRetType(Number(h.ReturnedValueType) || 0);
        setSingleRet(h.SingleReturnedValue || '');

        setLines(res.List1 || []);
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
    setError('');
    setSuccess('');
    setSaving(true);

    const payload = {
      MacroID: isEditMode ? editRow.MacroID : 0,
      MacroName: macName,
      MacroDescription: macDesc,
      MacroTable: macTable,
      MacroPrefix: macPrefix,
      MacroDocumnet: macDoc,
      MacroDynamicKey1: macDynamic1,
      ReturnedValueType: Number(retType),
      SingleReturnedValue: singleRet,
      IsNew: isEditMode ? 0 : 1
    };

    // Make sure each line has a Line number
    const finalLines = lines.map((l, i) => ({
      ...l,
      Line: i + 1
    }));

    try {
      const res = await apiCall(
        'Save Macro', 
        payload, 
        { User: user?.Username, LineMember: JSON.stringify(finalLines) }, 
        'journal'
      );
      if (res.State === 0) {
        setSuccess('Macro saved successfully!');
        setTimeout(() => {
          onSaveSuccess();
          onClose();
        }, 1000);
      } else {
        setError(res.Message);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // --- Lines Grid Handlers ---
  const handleAddLine = () => {
    setLines([...lines, { LineCondtion: '', LineReturnedValue: '' }]);
  };

  const handleRemoveLine = (idx) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx, field, val) => {
    setLines(prev => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [field]: val };
      return arr;
    });
  };

  const openConditionBuilder = (idx, field = 'LineCondtion') => {
    setCondModalLineIndex(idx);
    setCondModalField(field);
    setCondModalInitialValue(lines[idx][field] || '');
    setCondModalOpen(true);
  };

  const saveCondition = (condStr) => {
    if (condModalLineIndex !== null) {
      updateLine(condModalLineIndex, condModalField, condStr);
      setCondModalOpen(false);
    }
  };

  const lineCols = [
    { key: '_actions', label: '', width: 50, render: (row, fullRow, idx) => (
      <button onClick={() => handleRemoveLine(idx)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
    )},
    { key: 'Line', label: 'No.', width: 45, render: (r, full, idx) => idx + 1 },
    { key: 'LineCondtion', label: 'Condition', flex: 1, render: (row, fullRow, idx) => (
      <div style={{ display: 'flex', gap: 8 }}>
        <input 
          value={fullRow.LineCondtion || ''} 
          onChange={e => updateLine(idx, 'LineCondtion', e.target.value)}
          style={{ flex: 1, padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: 4 }}
        />
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openConditionBuilder(idx);
          }} 
          style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer', fontSize: 12 }}
        >
          Builder
        </button>
      </div>
    )},
    { key: 'LineReturnedValue', label: 'Returned Value', flex: 1, render: (row, fullRow, idx) => (
      <div style={{ display: 'flex', gap: 8 }}>
        <input 
          value={fullRow.LineReturnedValue || ''} 
          onChange={e => updateLine(idx, 'LineReturnedValue', e.target.value)}
          style={{ flex: 1, padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: 4 }}
        />
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openConditionBuilder(idx, 'LineReturnedValue');
          }} 
          style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer', fontSize: 12 }}
        >
          Builder
        </button>
      </div>
    )}
  ];

  return (
    <>
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '800px', backgroundColor: '#fff', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>
              {isEditMode ? `Edit Macro: ${editRow.MacroID}` : 'New Macro'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748B' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, backgroundColor: '#F8FAFC' }}>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {error && <div style={{ padding: 12, backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 6, fontSize: 14 }}>{error}</div>}
              {success && <div style={{ padding: 12, backgroundColor: '#DCFCE7', color: '#15803D', borderRadius: 6, fontSize: 14 }}>{success}</div>}

              {/* Header Info */}
              <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#334155' }}>Macro Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Name</label>
                    <input value={macName} onChange={e => setMacName(e.target.value)} maxLength={255} style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Description</label>
                    <input value={macDesc} onChange={e => setMacDesc(e.target.value)} maxLength={500} style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Table</label>
                    <SearchableSelect 
                      value={macTable}
                      onChange={setMacTable}
                      options={dbTables.map(t => ({ label: t.TableName, value: t.TableName }))}
                      placeholder="Search tables..."
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Prefix</label>
                    <SearchableSelect value={macPrefix} onChange={setMacPrefix} options={tableColumns.map(c => ({ label: c.Name || c.ColumnName, value: c.ColumnName || c.Name }))} placeholder="Select column..." />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Document</label>
                    <SearchableSelect value={macDoc} onChange={setMacDoc} options={tableColumns.map(c => ({ label: c.Name || c.ColumnName, value: c.ColumnName || c.Name }))} placeholder="Select column..." />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Dynamic Key 1</label>
                    <SearchableSelect value={macDynamic1} onChange={setMacDynamic1} options={tableColumns.map(c => ({ label: c.Name || c.ColumnName, value: c.ColumnName || c.Name }))} placeholder="Select column..." />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Returned Value Type</label>
                    <select value={retType} onChange={e => setRetType(Number(e.target.value))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, backgroundColor: '#fff' }}>
                      <option value={1}>Single Value</option>
                      <option value={2}>Conditional Lines</option>
                    </select>
                  </div>
                  {retType === 1 && (
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Single Returned Value</label>
                      <input value={singleRet} onChange={e => setSingleRet(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6 }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Conditional Lines Grid */}
              {retType === 2 && (
                <div style={{ flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 16, color: '#334155' }}>Macro Lines</h3>
                    <button 
                      onClick={handleAddLine}
                      style={{ padding: '6px 12px', backgroundColor: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
                    >
                      + Add Line
                    </button>
                  </div>
                  <div style={{ height: 300 }}>
                    <DataGrid
                      columns={lineCols}
                      rows={lines}
                      hideHeader={true}
                      hideFooter={true}
                      hidePaging={true}
                      hideSearch={true}
                    />
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', backgroundColor: '#fff', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#fff', color: '#475569', fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving || loading}
            style={{ padding: '8px 24px', borderRadius: 6, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 600, cursor: (saving || loading) ? 'not-allowed' : 'pointer', opacity: (saving || loading) ? 0.7 : 1 }}
          >
            {saving ? 'Saving...' : 'Save Macro'}
          </button>
        </div>
      </div>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }} onClick={onClose} />

      {condModalOpen && (
        <ConditionBuilderModal
          user={user}
          tableName={macTable}
          initialCondition={condModalInitialValue}
          title={condModalField === 'LineCondtion' ? 'Condition Builder' : 'Returned Value Builder'}
          label={condModalField === 'LineCondtion' ? 'Condition' : 'Returned Value'}
          onSave={saveCondition}
          onClose={() => setCondModalOpen(false)}
        />
      )}
    </>
  );
}
