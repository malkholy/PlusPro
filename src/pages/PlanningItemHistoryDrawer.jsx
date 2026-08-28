import React, { useState, useEffect, useMemo } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';

const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 };

// Both shifts run 12 hours (07:00-19:00 or 19:00-07:00). Production runs
// across BOTH shifts back to back (24h/day), alternating starting from
// whichever shift is active when the plan is created.
const SHIFT_SECONDS = 12 * 3600;

// Local (not UTC) YYYY-MM-DD -- toISOString() would shift the date for any
// timezone ahead of UTC (e.g. Egypt, UTC+2) once local midnight converts.
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

// Shift 1: 07:00-19:00. Shift 2: 19:00-07:00 (next day). Anything else
// (no shift picked yet) falls back to Shift 1's window.
function shiftStartHour(shift) {
  return String(shift) === '2' ? 19 : 7;
}

function formatTime(date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

// Local (not UTC) "YYYY-MM-DDTHH:mm:ss" for sending a datetime to the
// server as a literal wall-clock value -- toISOString() would convert to
// UTC and shift it for timezones ahead of UTC.
function toLocalDateTimeStr(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${toLocalDateStr(date)}T${h}:${mi}:${s}`;
}

// Whichever shift is active right now: Shift 1 (07:00-19:00) or Shift 2 (19:00-07:00).
function currentShift() {
  const h = new Date().getHours();
  return (h >= 7 && h < 19) ? '1' : '2';
}

export default function PlanningItemHistoryDrawer({ user, editRow, onClose, onSaveSuccess }) {
  const isEditMode = !!editRow;

  const [itemOptions, setItemOptions] = useState([]);
  const [machineOptions, setMachineOptions] = useState([]);
  const [formulaOptions, setFormulaOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [itemPlanningRows, setItemPlanningRows] = useState([]);

  const [itemID, setItemID] = useState(editRow?.ItemID || '');
  const [itemCode, setItemCode] = useState(editRow?.ItemCode || '');
  const [itemDescription, setItemDescription] = useState(editRow?.ItemDescription || '');
  const [startDate, setStartDate] = useState(editRow?.StartDate ? editRow.StartDate.split('T')[0] : '');
  const [plannedQty, setPlannedQty] = useState(editRow?.PlannedQty ?? '');
  const [formulaID, setFormulaID] = useState(editRow?.FormulaID || '');
  const [machineID, setMachineID] = useState(editRow?.MachineID || '');
  const [warehouse, setWarehouse] = useState(editRow?.Warehouse || '');
  // ShiftNo isn't persisted on the header row (only per-shift, on each
  // PrdItemPlanningShiftPlan row) -- always starts from whichever shift is
  // active right now, including when re-generating an edited plan's schedule.
  const [shiftNo] = useState(() => currentShift());
  const [productionTime, setProductionTime] = useState(editRow?.ProductionTime ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activeTab, setActiveTab] = useState('details');
  const [formulaLines, setFormulaLines] = useState([]);
  const [formulaLinesLoading, setFormulaLinesLoading] = useState(false);
  const [balanceRows, setBalanceRows] = useState([]);
  const [balanceLoading, setBalanceLoading] = useState(false);

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
    apiCall('xx', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setWarehouseOptions((d.List0 || []).map(w => ({ label: `${w.Warehouse} - ${w.WarhouseDescription}`, value: w.Warehouse })));
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

  useEffect(() => {
    if (!itemCode) {
      setBalanceRows([]);
      return;
    }
    setBalanceLoading(true);
    apiCall('GetGridData', { PageGroupID: 'item_balance', fromItem: itemCode, toItem: itemCode }, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) {
        setBalanceRows(d.List0 || []);
      }
      setBalanceLoading(false);
    }).catch(() => setBalanceLoading(false));
  }, [itemCode, user]);

  const itemFormulaOptions = formulaOptions.filter(f => String(f.parentItemID) === String(itemID));
  const selectedFormula = formulaOptions.find(f => String(f.value) === String(formulaID));

  // How many formula batches the whole planned run needs -- scales each BOM
  // line's per-batch quantity up to the total raw material required.
  const totalBatches = useMemo(() => {
    const batchQty = Number(selectedFormula?.batchQuantity || 0);
    const qty = Number(plannedQty || 0);
    return batchQty > 0 ? qty / batchQty : 0;
  }, [plannedQty, selectedFormula]);

  // PlannedQty is distributed across BOTH shifts back to back (24h/day
  // capacity), alternating starting from the calculated Shift No, until the
  // last (partial) shift finishes the run. End Date is the calendar date
  // that final shift actually completes on.
  const { endDate, shiftPlan, shiftsNeeded } = useMemo(() => {
    const batchQty = Number(selectedFormula?.batchQuantity || 0);
    const qty = Number(plannedQty || 0);
    const prodTime = Number(productionTime || 0);
    if (!startDate || batchQty <= 0 || qty <= 0 || prodTime <= 0) {
      return { endDate: '', shiftPlan: [], shiftsNeeded: 0 };
    }

    const unitsPerShift = (SHIFT_SECONDS / prodTime) * batchQty;
    const totalSeconds = (qty / batchQty) * prodTime;
    const shifts = Math.max(1, Math.ceil(totalSeconds / SHIFT_SECONDS));

    const anchor = new Date(startDate + 'T00:00:00');
    anchor.setHours(shiftStartHour(shiftNo), 0, 0, 0);

    let remaining = qty;
    let cumulative = 0;
    let lastEnd = anchor;
    const rows = [];
    for (let i = 0; i < shifts; i++) {
      const shiftStart = new Date(anchor.getTime() + i * SHIFT_SECONDS * 1000);
      const shiftQty = Math.min(remaining, unitsPerShift);
      cumulative += shiftQty;
      const fraction = unitsPerShift > 0 ? Math.min(1, shiftQty / unitsPerShift) : 0;
      const shiftEnd = new Date(shiftStart.getTime() + fraction * SHIFT_SECONDS * 1000);

      rows.push({
        index: i + 1,
        date: toLocalDateStr(shiftStart),
        shift: shiftStart.getHours() === 19 ? '2' : '1',
        qty: shiftQty,
        cumulative,
        startTime: formatTime(shiftStart),
        endTime: formatTime(shiftEnd),
        startTimeRaw: toLocalDateTimeStr(shiftStart),
        endTimeRaw: toLocalDateTimeStr(shiftEnd)
      });

      remaining -= shiftQty;
      lastEnd = shiftEnd;
    }
    return { endDate: toLocalDateStr(lastEnd), shiftPlan: rows, shiftsNeeded: shifts };
  }, [startDate, plannedQty, productionTime, selectedFormula, shiftNo]);

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
    if (!formulaID) {
      setError('Please select a formula.');
      return;
    }
    if (!machineID) {
      setError('Please select a machine.');
      return;
    }
    if (!warehouse) {
      setError('Please select a warehouse.');
      return;
    }
    if (!plannedQty || Number(plannedQty) <= 0) {
      setError('Please enter a Planned Qty greater than 0.');
      return;
    }
    if (!productionTime || Number(productionTime) <= 0) {
      setError('Please enter a Production Time greater than 0.');
      return;
    }
    if (!startDate) {
      setError('Please select a Start Date.');
      return;
    }

    setSaving(true);

    const payload = {
      ...(isEditMode ? { PlanningID: editRow.PlanningID } : {}),
      ItemID: Number(itemID),
      ItemCode: itemCode,
      StartDate: startDate || null,
      EndDate: endDate || null,
      PlannedQty: plannedQty === '' ? 0 : Number(plannedQty),
      FormulaID: formulaID === '' ? 0 : Number(formulaID),
      MachineID: machineID === '' ? 0 : Number(machineID),
      FormulaBatch: selectedFormula?.batchQuantity ?? 0,
      ProductionTime: productionTime === '' ? 0 : Number(productionTime),
      Warehouse: warehouse || ''
    };

    const shiftPlanLines = shiftPlan.map(r => ({
      ShiftIndex: r.index,
      ShiftDate: r.date,
      ShiftNo: Number(r.shift),
      StartTime: r.startTimeRaw,
      EndTime: r.endTimeRaw,
      PlannedQty: r.qty,
      CumulativeQty: r.cumulative
    }));

    try {
      const res = await apiCall(
        isEditMode ? 'Edit Planning History' : 'New Planning History',
        payload,
        { User: user?.Username, LineMember: JSON.stringify(shiftPlanLines) },
        'planning'
      );
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
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '960px', maxWidth: '95vw', backgroundColor: '#fff', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>{isEditMode ? `Edit Planning History: ${editRow.ItemCode}` : 'New Planning History'}</h2>
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
            <button style={tabBtnStyle(activeTab === 'balance')} onClick={() => setActiveTab('balance')}>Balance</button>
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
                    disabled={isEditMode}
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
                  <label style={labelStyle}>Warehouse</label>
                  <SearchableSelect
                    value={warehouse}
                    onChange={setWarehouse}
                    options={warehouseOptions}
                    placeholder="Search warehouse..."
                  />
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
                {shiftsNeeded > 0 ? (
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{shiftsNeeded} shift{shiftsNeeded > 1 ? 's' : ''} across both day/night shifts, 12h each</div>
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
                Planned Qty is distributed across both shifts back to back (24h/day), starting from the calculated Shift No, until production completes.
              </p>
              <div style={{ maxWidth: 280, marginBottom: 20 }}>
                <label style={labelStyle}>Starting Shift (calculated from current time)</label>
                <input
                  value={shiftNo === '2' ? '2 (07:00 PM - 07:00 AM)' : '1 (07:00 AM - 07:00 PM)'}
                  readOnly
                  style={{ ...inputStyle, background: '#F1F5F9', color: '#64748B' }}
                />
              </div>
              {shiftPlan.length === 0 ? (
                <div style={{ fontSize: 13, color: '#94A3B8' }}>Fill in Formula, Production Time, Planned Qty, and Start Date to see the shift plan.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Shift</th>
                      <th style={thStyle}>Start Time</th>
                      <th style={thStyle}>End Time</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Qty This Shift</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Cumulative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shiftPlan.map(r => (
                      <tr key={r.index}>
                        <td style={tdStyle}>{r.index}</td>
                        <td style={tdStyle}>{r.date}</td>
                        <td style={tdStyle}>{r.shift}</td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{r.startTime}</td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{r.endTime}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{r.qty.toLocaleString(undefined, { maximumFractionDigits: 3 })}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{r.cumulative.toLocaleString(undefined, { maximumFractionDigits: 3 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'balance' && (
            <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: 16, color: '#334155', fontWeight: 600 }}>Item Balance</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: 12.5, color: '#64748B' }}>
                Current on-hand stock for {itemCode || 'the selected item'}, by warehouse.
              </p>
              {!itemCode ? (
                <div style={{ fontSize: 13, color: '#94A3B8' }}>Select an item first.</div>
              ) : balanceLoading ? (
                <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading...</div>
              ) : balanceRows.length === 0 ? (
                <div style={{ fontSize: 13, color: '#94A3B8' }}>No balance found for this item.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 16px' }}>
                      <div style={summaryLabelStyle}>Total On-Hand</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#1D4ED8' }}>
                        {balanceRows.reduce((s, r) => s + Number(r.ItemBalance || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                      </div>
                    </div>
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 16px' }}>
                      <div style={summaryLabelStyle}>Planned Qty for This Run</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#334155' }}>
                        {plannedQty ? Number(plannedQty).toLocaleString(undefined, { maximumFractionDigits: 3 }) : '—'}
                      </div>
                    </div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Warehouse</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceRows.map((r, i) => (
                        <tr key={i}>
                          <td style={tdStyle}>{r.Warehouse}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{Number(r.ItemBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
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
