import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';

// Local (not UTC) date/time helpers -- toISOString() would shift the
// calendar date backward for any timezone ahead of UTC (Egypt, UTC+2).
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toLocalDateTimeStr(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${toLocalDateStr(date)}T${h}:${mi}:${s}`;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDayName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

// Shift 1: 07:00-19:00. Shift 2: 19:00-07:00 (next day).
const SHIFT_SECONDS = 12 * 3600;
function shiftStartHour(shiftNo) {
  return Number(shiftNo) === 2 ? 19 : 7;
}

const inputStyle = {
  padding: '8px 12px', border: '1px solid var(--border2)', borderRadius: 'var(--radius-xs)',
  boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 13
};
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: 0.4
};

const SHIFT_ACCENT = {
  1: { fg: 'var(--orange2)', soft: 'var(--orange-soft)', bar: 'var(--orange)' },
  2: { fg: 'var(--blue)', soft: 'var(--blue-soft)', bar: 'var(--blue)' }
};

export default function PlanningShowPlan({ user, onClose }) {
  const todayStr = toLocalDateStr(new Date());
  const [startDate, setStartDate] = useState(() => todayStr);
  const [endDate, setEndDate] = useState(() => addDays(todayStr, 6));
  const [machines, setMachines] = useState([]);
  const [cellMap, setCellMap] = useState({});
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState(false);

  // Manual "select empty slots, then assign an item" flow.
  const [selectedSlots, setSelectedSlots] = useState({});
  const [itemOptions, setItemOptions] = useState([]);
  const [formulaOptions, setFormulaOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignItemID, setAssignItemID] = useState('');
  const [assignItemCode, setAssignItemCode] = useState('');
  const [assignItemDescription, setAssignItemDescription] = useState('');
  const [assignFormulaID, setAssignFormulaID] = useState('');
  const [assignWarehouse, setAssignWarehouse] = useState('');
  const [assignQty, setAssignQty] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Right-click on an assigned slot -> "Show Formula".
  const [contextMenu, setContextMenu] = useState(null);
  const [formulaModal, setFormulaModal] = useState(null);

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
    apiCall('xx', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setWarehouseOptions((d.List0 || []).map(w => ({ label: `${w.Warehouse} - ${w.WarhouseDescription}`, value: w.Warehouse })));
      }
    });
  }, [user]);

  const handleGenerate = async () => {
    setError('');
    if (!startDate || !endDate) {
      setError('Please select both Start Date and End Date.');
      return;
    }
    if (startDate > endDate) {
      setError('Start Date must be before End Date.');
      return;
    }

    const dayCount = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
    if (dayCount > 62) {
      setError('Range too large -- please pick 62 days or fewer.');
      return;
    }

    setLoading(true);
    try {
      const [machinesRes, planRes] = await Promise.all([
        apiCall('Machine Master All', null, { User: user?.Username }, 'lookup'),
        apiCall('Get Planning Shift Calendar', { FromDate: startDate, ToDate: endDate }, { User: user?.Username }, 'planning')
      ]);

      if (machinesRes.State !== 0) {
        setError(machinesRes.Message || 'Failed to load machines.');
        setLoading(false);
        return;
      }
      if (planRes.State !== 0) {
        setError(planRes.Message || 'Failed to load plan.');
        setLoading(false);
        return;
      }

      const rows = planRes.List0 || [];
      const map = {};
      rows.forEach(r => {
        const dateStr = r.ShiftDate ? r.ShiftDate.split('T')[0] : '';
        const key = `${r.MachineID}|${dateStr}|${r.ShiftNo}`;
        if (!map[key]) map[key] = [];
        map[key].push({
          itemCode: r.ItemCode, itemDescription: r.ItemDescription || '', qty: Number(r.PlannedQty || 0),
          formulaID: r.FormulaID || null, formulaCode: r.FormulaCode || ''
        });
      });

      const dayList = [];
      for (let i = 0; i < dayCount; i++) {
        dayList.push(addDays(startDate, i));
      }

      setMachines(machinesRes.List0 || []);
      setCellMap(map);
      setDays(dayList);
      setGenerated(true);
      setSelectedSlots({});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSlot = (machine, date, shiftNo) => {
    const key = `${machine.MachineID}|${date}|${shiftNo}`;
    if ((cellMap[key] || []).length > 0) return;
    setSelectedSlots(prev => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { machineID: machine.MachineID, machineCode: machine.MachineCode, date, shiftNo };
      }
      return next;
    });
  };

  const selectedList = Object.entries(selectedSlots);
  const selectedCount = selectedList.length;
  const selectedMachineCount = new Set(selectedList.map(([, s]) => s.machineID)).size;

  const handleAssignItemChange = (id) => {
    setAssignItemID(id);
    const opt = itemOptions.find(o => String(o.value) === String(id));
    setAssignItemCode(opt?.itemCode || '');
    setAssignItemDescription(opt?.itemName || '');
    setAssignFormulaID('');
  };

  const assignItemFormulaOptions = formulaOptions.filter(f => String(f.parentItemID) === String(assignItemID));
  const selectedAssignFormula = formulaOptions.find(f => String(f.value) === String(assignFormulaID));
  const qtyPerSlot = selectedCount > 0 && Number(assignQty) > 0 ? Number(assignQty) / selectedCount : 0;

  const handleAssignSave = async () => {
    setAssignError('');
    if (!assignItemID) { setAssignError('Please select an item.'); return; }
    if (!assignFormulaID) { setAssignError('Please select a formula.'); return; }
    if (!assignWarehouse) { setAssignError('Please select a warehouse.'); return; }
    const totalQty = Number(assignQty);
    if (!totalQty || totalQty <= 0) { setAssignError('Enter a Planned Qty greater than 0.'); return; }
    if (selectedCount === 0) { setAssignError('No slots selected.'); return; }

    setAssignSaving(true);
    try {
      const byMachine = {};
      selectedList.forEach(([, s]) => {
        if (!byMachine[s.machineID]) byMachine[s.machineID] = [];
        byMachine[s.machineID].push(s);
      });

      for (const machineID of Object.keys(byMachine)) {
        const slots = byMachine[machineID].slice().sort((a, b) => {
          if (a.date !== b.date) return a.date < b.date ? -1 : 1;
          return Number(a.shiftNo) - Number(b.shiftNo);
        });

        let cumulative = 0;
        const lines = slots.map((s, idx) => {
          const shiftStart = new Date(s.date + 'T00:00:00');
          shiftStart.setHours(shiftStartHour(s.shiftNo), 0, 0, 0);
          const shiftEnd = new Date(shiftStart.getTime() + SHIFT_SECONDS * 1000);
          cumulative += qtyPerSlot;
          return {
            ShiftIndex: idx + 1,
            ShiftDate: s.date,
            ShiftNo: Number(s.shiftNo),
            StartTime: toLocalDateTimeStr(shiftStart),
            EndTime: toLocalDateTimeStr(shiftEnd),
            PlannedQty: qtyPerSlot,
            CumulativeQty: cumulative
          };
        });

        const dates = slots.map(s => s.date);
        const machineStartDate = dates.reduce((a, b) => (a < b ? a : b));
        const machineEndDate = dates.reduce((a, b) => (a > b ? a : b));

        const payload = {
          ItemID: Number(assignItemID),
          ItemCode: assignItemCode,
          StartDate: machineStartDate,
          EndDate: machineEndDate,
          PlannedQty: qtyPerSlot * slots.length,
          FormulaID: Number(assignFormulaID),
          MachineID: Number(machineID),
          FormulaBatch: selectedAssignFormula?.batchQuantity ?? 0,
          ProductionTime: 0,
          Warehouse: assignWarehouse
        };

        const res = await apiCall('New Planning History', payload, { User: user?.Username, LineMember: JSON.stringify(lines) }, 'planning');
        if (res.State !== 0) throw new Error(res.Message || 'Failed to assign.');
      }

      setAssignModalOpen(false);
      setAssignItemID(''); setAssignItemCode(''); setAssignItemDescription('');
      setAssignFormulaID(''); setAssignWarehouse(''); setAssignQty('');
      setSelectedSlots({});
      await handleGenerate();
    } catch (e) {
      setAssignError(e.message);
    } finally {
      setAssignSaving(false);
    }
  };

  const handleShowFormula = async (item) => {
    setContextMenu(null);
    if (!item.formulaID) {
      setFormulaModal({ item, lines: [], loading: false, error: 'No formula linked to this slot.' });
      return;
    }
    setFormulaModal({ item, lines: [], loading: true, error: '' });
    try {
      const d = await apiCall('BOM L1 Formula', { ParentItemCode: item.itemCode }, { User: user?.Username }, 'plus');
      if (d.State === 0) {
        const lines = (d.List0 || []).filter(l => String(l.LineFormulaID) === String(item.formulaID));
        setFormulaModal({ item, lines, loading: false, error: '' });
      } else {
        setFormulaModal({ item, lines: [], loading: false, error: d.Message || 'Failed to load formula.' });
      }
    } catch (e) {
      setFormulaModal({ item, lines: [], loading: false, error: e.message });
    }
  };

  const renderCell = (m, d, shiftNo) => {
    const key = `${m.MachineID}|${d}|${shiftNo}`;
    const items = cellMap[key] || [];
    const accent = SHIFT_ACCENT[shiftNo];
    const isToday = d === todayStr;
    const isEmpty = items.length === 0;
    const isSelected = !!selectedSlots[key];

    const baseBg = isSelected ? 'var(--orange-glow)' : (isToday ? 'var(--orange-glow)' : 'transparent');

    return (
      <td
        key={shiftNo}
        onClick={isEmpty ? () => toggleSlot(m, d, shiftNo) : undefined}
        onMouseEnter={isEmpty ? (e) => { if (!isSelected) e.currentTarget.style.background = 'var(--soft)'; } : undefined}
        onMouseLeave={isEmpty ? (e) => { if (!isSelected) e.currentTarget.style.background = baseBg; } : undefined}
        style={{
          padding: '6px 8px', fontSize: 11.5, verticalAlign: 'top', minHeight: 34,
          borderBottom: '1px solid var(--border)',
          borderLeft: shiftNo === 1 ? '1px solid var(--border)' : '1px solid var(--soft)',
          background: baseBg,
          boxShadow: isSelected ? 'inset 0 0 0 2px var(--orange)' : 'none',
          cursor: isEmpty ? 'pointer' : 'default'
        }}
      >
        {items.map((c, i) => (
          <div
            key={i}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, item: c }); }}
            style={{
              marginBottom: 4, padding: '4px 6px 4px 8px', borderRadius: 'var(--radius-xs)',
              borderLeft: `3px solid ${accent.bar}`, background: accent.soft, cursor: 'context-menu'
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{c.itemCode}</div>
            {c.itemDescription && (
              <div style={{
                color: 'var(--hint)', fontSize: 10.5, whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110
              }}>
                {c.itemDescription}
              </div>
            )}
            <div style={{ color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              {c.qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        ))}
        {isEmpty && isSelected && (
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--orange2)', textAlign: 'center' }}>✓ selected</div>
        )}
      </td>
    );
  };

  return (
    <>
      <div style={{
        position: 'fixed', top: '3vh', left: '3vw', right: '3vw', bottom: '3vh',
        background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius)',
        zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: '1px solid var(--border)', fontFamily: 'var(--font)'
      }}>
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)'
        }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 'var(--radius-xs)', background: 'var(--orange-soft)', fontSize: 16
            }}>📅</span>
            Show Plan
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: 22, lineHeight: 1, cursor: 'pointer',
              color: 'var(--muted)', width: 32, height: 32, borderRadius: '999px', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--red)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)'; }}
          >×</button>
        </div>

        <div style={{
          padding: '14px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', background: 'var(--soft)'
        }}>
          <div>
            <label style={labelStyle}>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              padding: '9px 22px', borderRadius: 'var(--radius-xs)', border: 'none',
              background: loading ? 'var(--hint)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 14px var(--orange-glow)'
            }}
          >
            {loading ? 'Loading...' : 'Generate'}
          </button>
          {error && (
            <div style={{
              color: 'var(--red)', background: 'var(--red-soft)', fontSize: 12.5, fontWeight: 600,
              padding: '7px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(220,38,38,0.15)'
            }}>
              {error}
            </div>
          )}
          {generated && (
            <div style={{ fontSize: 11.5, color: 'var(--hint)', maxWidth: 260 }}>
              Click empty slots to select them, then assign an item to fill them.
            </div>
          )}
          <div style={{ display: 'flex', gap: 14, marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--orange)', display: 'inline-block' }} />
              Shift 1
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--blue)', display: 'inline-block' }} />
              Shift 2
            </span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 16, background: 'var(--bg)' }}>
          {!generated ? (
            <div style={{ fontSize: 13, color: 'var(--hint)', padding: 20, textAlign: 'center' }}>Pick a date range and click Generate.</div>
          ) : machines.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--hint)', padding: 20, textAlign: 'center' }}>No machines found.</div>
          ) : (
            <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>
              <thead>
                <tr>
                  <th style={{
                    position: 'sticky', left: 0, top: 0, zIndex: 3, background: 'var(--surface)',
                    textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--muted)',
                    textTransform: 'uppercase', letterSpacing: 0.4,
                    borderBottom: '2px solid var(--border)', borderRight: '2px solid var(--border)', minWidth: 160
                  }}>
                    Machine
                  </th>
                  {days.map(d => {
                    const isToday = d === todayStr;
                    return (
                      <th key={d} colSpan={2} style={{
                        position: 'sticky', top: 0, zIndex: 2,
                        background: isToday ? 'var(--orange-soft)' : 'var(--soft)',
                        textAlign: 'center', padding: '8px 6px', fontSize: 12, fontWeight: 700,
                        color: isToday ? 'var(--orange2)' : 'var(--text)',
                        borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)'
                      }}>
                        {formatDateLabel(d)}
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: isToday ? 'var(--orange2)' : 'var(--hint)',
                          textTransform: 'uppercase', marginTop: 1
                        }}>
                          {formatDayName(d)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  <th style={{
                    position: 'sticky', left: 0, top: 46, zIndex: 3, background: 'var(--surface)',
                    borderBottom: '2px solid var(--border)', borderRight: '2px solid var(--border)'
                  }}></th>
                  {days.map(d => (
                    <React.Fragment key={d}>
                      <th style={{
                        position: 'sticky', top: 46, zIndex: 2, background: 'var(--bg)',
                        padding: '4px 8px', fontSize: 10, fontWeight: 700, color: 'var(--orange2)',
                        borderBottom: '2px solid var(--border)', borderLeft: '1px solid var(--border)', minWidth: 110
                      }}>Shift 1</th>
                      <th style={{
                        position: 'sticky', top: 46, zIndex: 2, background: 'var(--bg)',
                        padding: '4px 8px', fontSize: 10, fontWeight: 700, color: 'var(--blue)',
                        borderBottom: '2px solid var(--border)', minWidth: 110
                      }}>Shift 2</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {machines.map((m, mi) => (
                  <tr key={m.MachineID} style={{ background: mi % 2 === 0 ? 'var(--surface)' : 'var(--soft)' }}>
                    <td style={{
                      position: 'sticky', left: 0, zIndex: 1, background: mi % 2 === 0 ? 'var(--surface)' : 'var(--soft)',
                      padding: '10px 12px', fontSize: 12.5, fontWeight: 700, color: 'var(--text)',
                      borderBottom: '1px solid var(--border)', borderRight: '2px solid var(--border)', whiteSpace: 'nowrap'
                    }}>
                      {m.MachineCode}
                    </td>
                    {days.map(d => (
                      <React.Fragment key={d}>
                        {renderCell(m, d, 1)}
                        {renderCell(m, d, 2)}
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedCount > 0 && (
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 60
          }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
              {selectedCount} slot{selectedCount > 1 ? 's' : ''} selected
              {selectedMachineCount > 1 ? ` · ${selectedMachineCount} machines` : ''}
            </span>
            <button
              onClick={() => setSelectedSlots({})}
              style={{
                padding: '7px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)',
                background: 'var(--surface)', color: 'var(--muted)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer'
              }}
            >
              Clear
            </button>
            <button
              onClick={() => { setAssignError(''); setAssignModalOpen(true); }}
              style={{
                padding: '7px 16px', borderRadius: 'var(--radius-xs)', border: 'none',
                background: 'linear-gradient(135deg, var(--orange), var(--orange2))', color: '#fff',
                fontWeight: 700, fontSize: 12.5, cursor: 'pointer', boxShadow: '0 4px 14px var(--orange-glow)'
              }}
            >
              Assign Item
            </button>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }} onClick={onClose} />

      {assignModalOpen && (
        <>
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 460, maxWidth: '92vw', background: 'var(--surface)', borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', zIndex: 1200,
            fontFamily: 'var(--font)', overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Assign Item to Selected Slots</h3>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {selectedCount} slot{selectedCount > 1 ? 's' : ''} selected across {selectedMachineCount} machine{selectedMachineCount > 1 ? 's' : ''}
              </div>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {assignError && (
                <div style={{
                  color: 'var(--red)', background: 'var(--red-soft)', fontSize: 12.5, fontWeight: 600,
                  padding: '8px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(220,38,38,0.15)'
                }}>
                  {assignError}
                </div>
              )}

              <div>
                <label style={labelStyle}>Item</label>
                <SearchableSelect
                  value={assignItemID}
                  onChange={handleAssignItemChange}
                  options={itemOptions}
                  placeholder="Search item code / description..."
                />
                {assignItemDescription && (
                  <div style={{ fontSize: 11.5, color: 'var(--hint)', marginTop: 4 }}>{assignItemDescription}</div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Formula</label>
                <SearchableSelect
                  value={assignFormulaID}
                  onChange={setAssignFormulaID}
                  options={assignItemFormulaOptions}
                  placeholder={assignItemID ? 'Search formula...' : 'Select an item first'}
                  disabled={!assignItemID}
                />
                {assignItemID && assignItemFormulaOptions.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--hint)', marginTop: 4 }}>No BOM formula found for this item.</div>
                )}
                {selectedAssignFormula && (
                  <div style={{ fontSize: 11.5, color: 'var(--hint)', marginTop: 4 }}>
                    Batch Qty: {Number(selectedAssignFormula.batchQuantity || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Warehouse</label>
                <SearchableSelect
                  value={assignWarehouse}
                  onChange={setAssignWarehouse}
                  options={warehouseOptions}
                  placeholder="Search warehouse..."
                />
              </div>

              <div>
                <label style={labelStyle}>Total Planned Qty</label>
                <input
                  type="number" step="0.00001" value={assignQty}
                  onChange={e => setAssignQty(e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                />
                {qtyPerSlot > 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--hint)', marginTop: 4 }}>
                    = {qtyPerSlot.toLocaleString(undefined, { maximumFractionDigits: 3 })} per slot, split evenly across {selectedCount} slot{selectedCount > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--soft)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setAssignModalOpen(false)}
                disabled={assignSaving}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)',
                  background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSave}
                disabled={assignSaving}
                style={{
                  padding: '8px 20px', borderRadius: 'var(--radius-xs)', border: 'none',
                  background: assignSaving ? 'var(--hint)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', fontWeight: 700, fontSize: 13, cursor: assignSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {assignSaving ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1150 }} onClick={() => !assignSaving && setAssignModalOpen(false)} />
        </>
      )}

      {contextMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 1250 }}
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div style={{
            position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 1260,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
            boxShadow: 'var(--shadow-lg)', minWidth: 170, overflow: 'hidden', fontFamily: 'var(--font)'
          }}>
            <button
              onClick={() => handleShowFormula(contextMenu.item)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none',
                background: 'none', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', cursor: 'pointer'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--orange2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text)'; }}
            >
              Show Formula
            </button>
          </div>
        </>
      )}

      {formulaModal && (() => {
        const batchQty = Number(formulaOptions.find(f => String(f.value) === String(formulaModal.item.formulaID))?.batchQuantity || 0);
        const totalBatches = batchQty > 0 ? formulaModal.item.qty / batchQty : 0;
        return (
          <>
            <div style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 560, maxWidth: '92vw', maxHeight: '80vh', background: 'var(--surface)', borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', zIndex: 1300,
              fontFamily: 'var(--font)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                    Formula for {formulaModal.item.itemCode}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {formulaModal.item.formulaCode ? `${formulaModal.item.formulaCode} · ` : ''}
                    Batch Qty {batchQty ? batchQty.toLocaleString(undefined, { maximumFractionDigits: 5 }) : '—'}
                    {totalBatches > 0 ? ` · ${totalBatches.toLocaleString(undefined, { maximumFractionDigits: 3 })} batches for this shift` : ''}
                  </div>
                </div>
                <button
                  onClick={() => setFormulaModal(null)}
                  style={{
                    background: 'none', border: 'none', fontSize: 20, lineHeight: 1, cursor: 'pointer',
                    color: 'var(--muted)', width: 28, height: 28, borderRadius: '999px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--red)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)'; }}
                >×</button>
              </div>

              <div style={{ padding: 20, overflowY: 'auto' }}>
                {formulaModal.error ? (
                  <div style={{
                    color: 'var(--red)', background: 'var(--red-soft)', fontSize: 12.5, fontWeight: 600,
                    padding: '8px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(220,38,38,0.15)'
                  }}>
                    {formulaModal.error}
                  </div>
                ) : formulaModal.loading ? (
                  <div style={{ fontSize: 13, color: 'var(--hint)' }}>Loading...</div>
                ) : formulaModal.lines.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--hint)' }}>No BOM lines found for this formula.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>#</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Item Code</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Description</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Qty / Batch</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Total Required</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formulaModal.lines.map(l => (
                        <tr key={l.BLID || l.Line}>
                          <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{l.Line}</td>
                          <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{l.ChildItemCode}</td>
                          <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{l.ChildItemDescription}</td>
                          <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--mono)', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
                            {Number(l.Quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })}
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--mono)', fontWeight: 700, textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
                            {(Number(l.Quantity || 0) * totalBatches).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1290 }} onClick={() => setFormulaModal(null)} />
          </>
        );
      })()}
    </>
  );
}
