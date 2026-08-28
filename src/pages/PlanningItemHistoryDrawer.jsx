import React, { useState, useEffect, useMemo } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';

const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 };

// Both shifts run 12 hours (07:00-19:00 or 19:00-07:00), so the number of
// shift-days needed only depends on total seconds required, not which shift
// is picked -- shift choice only affects which half of the clock it runs in.
const SHIFT_SECONDS = 12 * 3600;

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function PlanningItemHistoryDrawer({ user, onClose, onSaveSuccess }) {
  const [itemOptions, setItemOptions] = useState([]);
  const [machineOptions, setMachineOptions] = useState([]);
  const [formulaOptions, setFormulaOptions] = useState([]);
  const [itemPlanningRows, setItemPlanningRows] = useState([]);

  const [itemID, setItemID] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [plannedQty, setPlannedQty] = useState('');
  const [formulaID, setFormulaID] = useState('');
  const [machineID, setMachineID] = useState('');
  const [shiftNo, setShiftNo] = useState('');
  const [productionTime, setProductionTime] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activeTab, setActiveTab] = useState('details');
  const [formulaLines, setFormulaLines] = useState([]);
  const [formulaLinesLoading, setFormulaLinesLoading] = useState(false);

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

  useEffect(() => {
    if (!formulaID || !itemCode) {
      setFormulaLines([]);
      return;
    }
    setFormulaLinesLoading(true);
    apiCall('BOM L1 Formula', { ParentItemCode: itemCode }, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) {
        setFormulaLines((d.List0 || []).filter(l => String(l.LineFormulaID) === String(formulaID)));
      }
      setFormulaLinesLoading(false);
    }).catch(() => setFormulaLinesLoading(false));
  }, [formulaID, itemCode, user]);

  const itemFormulaOptions = formulaOptions.filter(f => String(f.parentItemID) === String(itemID));
  const selectedFormula = formulaOptions.find(f => String(f.value) === String(formulaID));

  // End Date = Start Date + however many 12h shift-days it takes to produce
  // PlannedQty, given this formula's Batch Qty and Production Time per batch.
  const { endDate, daysNeeded } = useMemo(() => {
    const batchQty = Number(selectedFormula?.batchQuantity || 0);
    const qty = Number(plannedQty || 0);
    const prodTime = Number(productionTime || 0);
    if (!startDate || batchQty <= 0 || qty <= 0 || prodTime <= 0) {
      return { endDate: '', daysNeeded: 0 };
    }
    const totalSeconds = (qty / batchQty) * prodTime;
    const days = Math.max(1, Math.ceil(totalSeconds / SHIFT_SECONDS));
    return { endDate: addDays(startDate, days - 1), daysNeeded: days };
  }, [startDate, plannedQty, productionTime, selectedFormula]);

  // How many formula batches the whole planned run needs -- scales each BOM
  // line's per-batch quantity up to the total raw material required.
  const totalBatches = useMemo(() => {
    const batchQty = Number(selectedFormula?.batchQuantity || 0);
    const qty = Number(plannedQty || 0);
    return batchQty > 0 ? qty / batchQty : 0;
  }, [plannedQty, selectedFormula]);

  // Day-by-day shift schedule: same shift every day, running at capacity
  // until the last (partial) day.
  const shiftPlan = useMemo(() => {
    const batchQty = Number(selectedFormula?.batchQuantity || 0);
    const qty = Number(plannedQty || 0);
    const prodTime = Number(productionTime || 0);
    if (!startDate || batchQty <= 0 || qty <= 0 || prodTime <= 0 || daysNeeded <= 0) return [];

    const unitsPerShift = (SHIFT_SECONDS / prodTime) * batchQty;
    let remaining = qty;
    let cumulative = 0;
    const rows = [];
    for (let i = 0; i < daysNeeded; i++) {
      const dayQty = Math.min(remaining, unitsPerShift);
      cumulative += dayQty;
      rows.push({ day: i + 1, date: addDays(startDate, i), shift: shiftNo || '—', qty: dayQty, cumulative });
      remaining -= dayQty;
    }
    return rows;
  }, [startDate, plannedQty, productionTime, selectedFormula, shiftNo, daysNeeded]);

  const handleItemChange = (id) => {
    setItemID(id);
    const opt = itemOptions.find(o => String(o.value) === String(id));
    if (opt) {
      setItemCode(opt.itemCode || '');
      setItemDescription(opt.itemName || '');
    }
    setFormulaID('');
    setProductionTime('');
  };

  const handleFormulaChange = (id) => {
    setFormulaID(id);
    // Pre-fill from the item's planning default -- still editable afterward.
    const planning = itemPlanningRows.find(r => String(r.ItemID) === String(itemID));
    setProductionTime(planning?.ProducationTime ?? '');
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
      MachineID: machineID === '' ? 0 : Number(machineID),
      FormulaBatch: selectedFormula?.batchQuantity ?? 0,
      ProductionTime: productionTime === '' ? 0 : Number(productionTime),
      ShiftNo: shiftNo === '' ? 0 : Number(shiftNo)
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

  const stepHeaderStyle = { display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 16px 0' };
  const stepBadgeStyle = { width: 22, height: 22, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
  const stepTitleStyle = { fontSize: 16, color: '#334155', fontWeight: 600 };

  const tabBtnStyle = (isActive) => ({
    padding: '12px 16px',
    border: 'none',
    borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent',
    background: isActive ? '#EFF6FF' : 'none',
    color: isActive ? '#2563EB' : '#64748B',
    fontWeight: isActive ? 700 : 500,
    fontSize: 13.5,
    textAlign: 'left',
    cursor: 'pointer',
    width: '100%'
  });

  const summaryLabelStyle = { fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.3 };
  const summaryValueStyle = { fontSize: 13, fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

  const thStyle = { textAlign: 'left', padding: '8px 10px', fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0' };
  const tdStyle = { padding: '8px 10px', fontSize: 13, color: '#334155', borderBottom: '1px solid #F1F5F9' };

  return (
    <>
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '760px', backgroundColor: '#fff', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>New Planning History</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748B' }}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 16, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px' }}>
            <div>
              <div style={summaryLabelStyle}>Item Code</div>
              <div style={summaryValueStyle}>{itemCode || '—'}</div>
            </div>
            <div>
              <div style={summaryLabelStyle}>Item Description</div>
              <div style={summaryValueStyle}>{itemDescription || '—'}</div>
            </div>
            <div>
              <div style={summaryLabelStyle}>Planned Qty</div>
              <div style={summaryValueStyle}>{plannedQty || '—'}</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <div style={{ width: 160, flexShrink: 0, borderRight: '1px solid #E2E8F0', backgroundColor: '#fff', padding: '16px 0', display: 'flex', flexDirection: 'column' }}>
            <button style={tabBtnStyle(activeTab === 'details')} onClick={() => setActiveTab('details')}>Details</button>
            <button style={tabBtnStyle(activeTab === 'formula')} onClick={() => setActiveTab('formula')}>Formula</button>
            <button style={tabBtnStyle(activeTab === 'shift')} onClick={() => setActiveTab('shift')}>Shift Plan</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 24, backgroundColor: '#F8FAFC' }}>
          {error && <div style={{ padding: 12, backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 6, fontSize: 14, marginBottom: 16 }}>{error}</div>}
          {success && <div style={{ padding: 12, backgroundColor: '#DCFCE7', color: '#15803D', borderRadius: 6, fontSize: 14, marginBottom: 16 }}>{success}</div>}

          {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Step 1: Item */}
            <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={stepHeaderStyle}><span style={stepBadgeStyle}>1</span><span style={stepTitleStyle}>Item</span></h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

            {/* Step 2: Formula & Machine */}
            <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={stepHeaderStyle}><span style={stepBadgeStyle}>2</span><span style={stepTitleStyle}>Formula &amp; Machine</span></h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Formula</label>
                  <SearchableSelect
                    value={formulaID}
                    onChange={handleFormulaChange}
                    options={itemFormulaOptions}
                    placeholder={itemID ? 'Search formula...' : 'Select an item first'}
                    disabled={!itemID}
                  />
                  {itemID && itemFormulaOptions.length === 0 && (
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>No BOM formula found for this item.</div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Batch Qty</label>
                  <input value={selectedFormula?.batchQuantity ?? '—'} readOnly style={{ ...inputStyle, background: '#F1F5F9', color: '#64748B' }} />
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
                <div>
                  <label style={labelStyle}>Shift No</label>
                  <input type="number" value={shiftNo} onChange={e => setShiftNo(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Step 3: Production Time */}
            <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={stepHeaderStyle}><span style={stepBadgeStyle}>3</span><span style={stepTitleStyle}>Production Time</span></h3>
              <div>
                <label style={labelStyle}>Production Time (seconds)</label>
                <input type="number" value={productionTime} onChange={e => setProductionTime(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {/* Step 4: Planned Qty & Start Date */}
            <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={stepHeaderStyle}><span style={stepBadgeStyle}>4</span><span style={stepTitleStyle}>Planned Qty &amp; Start Date</span></h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Planned Qty</label>
                  <input type="number" step="0.00001" value={plannedQty} onChange={e => setPlannedQty(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Step 5: Calculated */}
            <div style={{ backgroundColor: '#EFF6FF', padding: 20, borderRadius: 8, border: '1px solid #BFDBFE' }}>
              <h3 style={stepHeaderStyle}><span style={{ ...stepBadgeStyle, background: '#1D4ED8' }}>✓</span><span style={stepTitleStyle}>Calculated</span></h3>
              <div>
                <label style={labelStyle}>End Date</label>
                <input value={endDate || '—'} readOnly style={{ ...inputStyle, background: '#fff', color: '#1E293B', fontWeight: 600 }} />
                {daysNeeded > 0 ? (
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{daysNeeded} shift-day{daysNeeded > 1 ? 's' : ''} @ 12h/day</div>
                ) : (
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Fill in Formula, Production Time, Planned Qty, and Start Date to calculate.</div>
                )}
              </div>
            </div>
          </div>
          )}

          {activeTab === 'formula' && (
            <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: 16, color: '#334155', fontWeight: 600 }}>Formula Components</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: 12.5, color: '#64748B' }}>
                Raw materials from the selected formula's BOM (prd.BillOfMaterialLine), scaled to this run's {totalBatches > 0 ? totalBatches.toLocaleString(undefined, { maximumFractionDigits: 3 }) : '—'} batches.
              </p>
              {!formulaID ? (
                <div style={{ fontSize: 13, color: '#94A3B8' }}>Select an item and formula first.</div>
              ) : formulaLinesLoading ? (
                <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading...</div>
              ) : formulaLines.length === 0 ? (
                <div style={{ fontSize: 13, color: '#94A3B8' }}>No BOM lines found for this formula.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Item Code</th>
                      <th style={thStyle}>Description</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Qty / Batch</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Total Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formulaLines.map(l => (
                      <tr key={l.BLID || l.Line}>
                        <td style={tdStyle}>{l.Line}</td>
                        <td style={tdStyle}>{l.ChildItemCode}</td>
                        <td style={tdStyle}>{l.ChildItemDescription}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{Number(l.Quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                          {(Number(l.Quantity || 0) * totalBatches).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'shift' && (
            <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: 16, color: '#334155', fontWeight: 600 }}>Shift Plan</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: 12.5, color: '#64748B' }}>
                Day-by-day breakdown across 12-hour shifts (Shift {shiftNo || '—'}), from Start Date to the calculated End Date.
              </p>
              {shiftPlan.length === 0 ? (
                <div style={{ fontSize: 13, color: '#94A3B8' }}>Fill in Formula, Machine/Shift No, Production Time, Planned Qty, and Start Date to see the shift plan.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Day</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Shift</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Qty This Shift</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Cumulative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shiftPlan.map(r => (
                      <tr key={r.day}>
                        <td style={tdStyle}>{r.day}</td>
                        <td style={tdStyle}>{r.date}</td>
                        <td style={tdStyle}>{r.shift}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{r.qty.toLocaleString(undefined, { maximumFractionDigits: 3 })}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{r.cumulative.toLocaleString(undefined, { maximumFractionDigits: 3 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
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
