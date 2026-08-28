import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';

const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 };

export default function PlanningItemHistoryDrawer({ user, onClose, onSaveSuccess }) {
  const [itemOptions, setItemOptions] = useState([]);
  const [machineOptions, setMachineOptions] = useState([]);
  const [formulaOptions, setFormulaOptions] = useState([]);
  const [itemPlanningRows, setItemPlanningRows] = useState([]);

  const [itemID, setItemID] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [plannedQty, setPlannedQty] = useState('');
  const [formulaID, setFormulaID] = useState('');
  const [machineID, setMachineID] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiCall('Item Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setItemOptions((d.List0 || []).map(i => ({
          label: `${i.ItemCode} - ${i.ItemName}`,
          value: i.ItemID,
          itemCode: i.ItemCode,
          itemName: i.ItemName
        })));
      }
    });
    apiCall('Machine Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setMachineOptions((d.List0 || []).map(m => ({
          label: `${m.MachineCode} - ${m.MachineDescription}`,
          value: m.MachineID
        })));
      }
    });
    apiCall('Formula Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setFormulaOptions((d.List0 || []).map(f => ({
          label: `${f.ParentItemCode} (Formula ${f.FormulaID})`,
          value: f.FormulaID,
          parentItemID: f.ParentItemID,
          batchQuantity: f.BatchQuantity
        })));
      }
    });
    apiCall('GetGridData', { PageGroupID: 'planning_item_master' }, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) {
        setItemPlanningRows(d.List0 || []);
      }
    });
  }, [user]);

  const itemFormulaOptions = formulaOptions.filter(f => String(f.parentItemID) === String(itemID));
  const selectedFormula = formulaOptions.find(f => String(f.value) === String(formulaID));
  const selectedItemPlanning = itemPlanningRows.find(r => String(r.ItemID) === String(itemID));

  const handleItemChange = (id) => {
    setItemID(id);
    const opt = itemOptions.find(o => String(o.value) === String(id));
    if (opt) {
      setItemCode(opt.itemCode || '');
      setItemDescription(opt.itemName || '');
    }
    setFormulaID('');
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!itemID) {
      setError('Please select an item.');
      return;
    }

    setSaving(true);

    const payload = {
      ItemID: Number(itemID),
      ItemCode: itemCode,
      StartDate: startDate || null,
      EndDate: endDate || null,
      PlannedQty: plannedQty === '' ? 0 : Number(plannedQty),
      FormulaID: formulaID === '' ? 0 : Number(formulaID),
      MachineID: machineID === '' ? 0 : Number(machineID)
    };

    try {
      const res = await apiCall('New Planning History', payload, { User: user?.Username }, 'planning');
      if (res.State === 0) {
        setSuccess('Saved successfully!');
        setTimeout(() => {
          onSaveSuccess();
          onClose();
        }, 700);
      } else {
        setError(res.Message || 'Failed to save.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '520px', backgroundColor: '#fff', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>New Planning History</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748B' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, backgroundColor: '#F8FAFC' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {error && <div style={{ padding: 12, backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 6, fontSize: 14 }}>{error}</div>}
            {success && <div style={{ padding: 12, backgroundColor: '#DCFCE7', color: '#15803D', borderRadius: 6, fontSize: 14 }}>{success}</div>}

            <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#334155' }}>Item</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Item</label>
                  <SearchableSelect
                    value={itemID}
                    onChange={handleItemChange}
                    options={itemOptions}
                    placeholder="Search item code / description..."
                  />
                </div>
                <div>
                  <label style={labelStyle}>Item Description</label>
                  <input value={itemDescription} readOnly style={{ ...inputStyle, background: '#F1F5F9', color: '#64748B' }} />
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#334155' }}>Planning</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>End Date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Planned Qty</label>
                  <input type="number" step="0.00001" value={plannedQty} onChange={e => setPlannedQty(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Machine</label>
                  <SearchableSelect
                    value={machineID}
                    onChange={setMachineID}
                    options={machineOptions}
                    placeholder="Search machine..."
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Formula</label>
                  <SearchableSelect
                    value={formulaID}
                    onChange={setFormulaID}
                    options={itemFormulaOptions}
                    placeholder={itemID ? 'Search formula...' : 'Select an item first'}
                    disabled={!itemID}
                  />
                  {itemID && itemFormulaOptions.length === 0 && (
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>No BOM formula found for this item.</div>
                  )}
                </div>
                {formulaID && (
                  <>
                    <div>
                      <label style={labelStyle}>Batch Qty</label>
                      <input value={selectedFormula?.batchQuantity ?? '—'} readOnly style={{ ...inputStyle, background: '#F1F5F9', color: '#64748B' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Production Time (seconds)</label>
                      <input value={selectedItemPlanning?.ProducationTime ?? '—'} readOnly style={{ ...inputStyle, background: '#F1F5F9', color: '#64748B' }} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', backgroundColor: '#fff', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#fff', color: '#475569', fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '8px 24px', borderRadius: 6, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }} onClick={onClose} />
    </>
  );
}
