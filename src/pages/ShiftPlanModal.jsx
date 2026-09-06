import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';

// Local (not UTC) date/time helpers -- same convention as
// PlanningShowPlan.jsx (toISOString() would shift the calendar date
// backward for any timezone ahead of UTC).
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
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

const SHIFT_SECONDS = 12 * 3600;
function shiftStartHour(shiftNo) { return Number(shiftNo) === 2 ? 19 : 7; }
function shiftTimes(dateStr, shiftNo) {
  const start = new Date(dateStr + 'T00:00:00');
  start.setHours(shiftStartHour(shiftNo), 0, 0, 0);
  const end = new Date(start.getTime() + SHIFT_SECONDS * 1000);
  return { start: toLocalDateTimeStr(start), end: toLocalDateTimeStr(end) };
}

// Steps a (date, shiftNo) position forward/backward by wholeShifts (each
// step is exactly one 12h shift -- 1 Day is just 2 of these in one call).
function stepPosition(dateStr, shiftNo, wholeShifts) {
  let sn = Number(shiftNo);
  let d = dateStr;
  const step = wholeShifts > 0 ? 1 : -1;
  for (let i = 0; i < Math.abs(wholeShifts); i++) {
    if (step > 0) {
      if (sn === 1) sn = 2;
      else { sn = 1; d = addDays(d, 1); }
    } else {
      if (sn === 2) sn = 1;
      else { sn = 2; d = addDays(d, -1); }
    }
  }
  return { date: d, shiftNo: sn };
}

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: 0.4
};
const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid var(--border2)', borderRadius: 'var(--radius-xs)',
  boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 13
};
const thStyle = { textAlign: 'left', padding: '7px 8px', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '7px 8px', fontSize: 12.5, color: 'var(--text)', borderBottom: '1px solid var(--border)' };

export default function ShiftPlanModal({ user, onClose, onShifted }) {
  const [machines, setMachines] = useState([]);
  const [machineID, setMachineID] = useState('');
  const [machineRows, setMachineRows] = useState([]); // that machine's whole plan, chronological
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [startSlotID, setStartSlotID] = useState('');
  const [direction, setDirection] = useState('forward');
  const [unit, setUnit] = useState('shift'); // 'shift' (12h) or 'day' (24h = 2 shifts)

  const [previewRows, setPreviewRows] = useState(null); // null = not yet previewed
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiCall('Machine Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) setMachines(d.List0 || []);
    }).catch(() => {});
  }, [user]);

  // Load the whole machine's plan as soon as it's picked, so the Starting
  // Slot dropdown can be populated -- everything before that slot stays
  // untouched, only it and everything chronologically after it shifts.
  useEffect(() => {
    if (!machineID) { setMachineRows([]); setStartSlotID(''); setPreviewRows(null); return; }
    let cancelled = false;
    setLoadingSlots(true);
    setError('');
    setStartSlotID('');
    setPreviewRows(null);
    Promise.all([
      apiCall('Get Planning Shift Calendar', {}, { User: user?.Username }, 'planning'),
      apiCall('GetGridData', { PageGroupID: 'shop_orders' }, { User: user?.Username }, 'plus')
    ]).then(([calRes, hdrRes]) => {
      if (cancelled) return;
      if (calRes.State !== 0) { setError(calRes.Message || 'Failed to load the plan.'); return; }
      if (hdrRes.State !== 0) { setError(hdrRes.Message || 'Failed to load Shop Orders.'); return; }

      const headerByNumber = {};
      (hdrRes.List0 || []).forEach(h => { headerByNumber[h.ShopOrderNumber] = h; });

      const rows = (calRes.List0 || [])
        .filter(r => String(r.MachineID) === String(machineID))
        .map(r => ({ ...r, ShiftDate: r.ShiftDate.split('T')[0], header: headerByNumber[r.ShopOrderNo] || null }))
        .sort((a, b) => (a.ShiftDate !== b.ShiftDate ? (a.ShiftDate < b.ShiftDate ? -1 : 1) : a.ShiftNo - b.ShiftNo));
      setMachineRows(rows);
    }).catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [machineID, user]);

  const wholeShifts = (unit === 'day' ? 2 : 1) * (direction === 'forward' ? 1 : -1);

  const handlePreview = () => {
    if (!machineID) { setError('Please select a machine.'); return; }
    if (!startSlotID) { setError('Please select a starting slot.'); return; }
    setError('');
    setSuccess('');
    setPreviewRows(null);

    const startIdx = machineRows.findIndex(r => String(r.ShiftPlanID) === String(startSlotID));
    if (startIdx === -1) { setError('Starting slot not found -- try reselecting the machine.'); return; }

    // Everything before the starting slot is untouched and, along with any
    // blocked (non-New Shop Order) slot at/after it, occupies its ORIGINAL
    // position for collision-checking purposes.
    const beforeStart = machineRows.slice(0, startIdx);
    const inScope = machineRows.slice(startIdx);

    const blockedInScope = inScope.filter(r => r.ShopOrderNo && Number(r.header?.OrderState) !== 0);
    const stationaryPositions = new Set(
      [...beforeStart, ...blockedInScope].map(r => `${r.ShiftDate}|${r.ShiftNo}`)
    );

    const computed = inScope.map(r => {
      if (r.ShopOrderNo) {
        if (!r.header) return { ...r, inScope: true, blocked: true, reason: `Shop Order ${r.ShopOrderNo} not found` };
        if (Number(r.header.OrderState) !== 0) {
          return { ...r, inScope: true, blocked: true, reason: `Shop Order ${r.ShopOrderNo} is ${r.header.StateDescription || 'not New'} -- only New orders can move` };
        }
      }
      const { date: newDate, shiftNo: newShiftNo } = stepPosition(r.ShiftDate, r.ShiftNo, wholeShifts);
      if (stationaryPositions.has(`${newDate}|${newShiftNo}`)) {
        return { ...r, inScope: true, blocked: true, reason: `Would land on ${newDate} Shift ${newShiftNo}, which is occupied by a slot that can't move` };
      }
      const { start, end } = shiftTimes(newDate, newShiftNo);
      return { ...r, inScope: true, blocked: false, newDate, newShiftNo, newStart: start, newEnd: end };
    });

    const beforeRows = beforeStart.map(r => ({ ...r, inScope: false, blocked: false }));
    setPreviewRows([...beforeRows, ...computed]);
  };

  const eligibleRows = (previewRows || []).filter(r => r.inScope && !r.blocked);
  const blockedRows = (previewRows || []).filter(r => r.inScope && r.blocked);

  const handleApply = async () => {
    if (eligibleRows.length === 0) return;
    setError('');
    setSuccess('');
    setApplying(true);
    try {
      const lineMember = eligibleRows.map(r => ({
        ShiftPlanID: r.ShiftPlanID,
        NewShiftDate: r.newDate,
        NewShiftNo: r.newShiftNo,
        NewStartTime: r.newStart,
        NewEndTime: r.newEnd
      }));
      const res = await apiCall('Shift Machine Plan', { MachineID: Number(machineID) }, {
        User: user?.Username, LineMember: JSON.stringify(lineMember)
      }, 'planning');
      if (res.State !== 0) throw new Error(res.Message || 'Failed to shift the plan.');
      setSuccess(`Shifted ${eligibleRows.length} slot${eligibleRows.length > 1 ? 's' : ''}${blockedRows.length > 0 ? ` (${blockedRows.length} left in place)` : ''}.`);
      setPreviewRows(null);
      onShifted?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setApplying(false);
    }
  };

  const unitLabel = unit === 'day' ? '1 Day (24h / 2 shifts)' : '1 Shift (12h)';
  const directionLabel = direction === 'forward' ? 'Forward' : 'Backward';

  return (
    <>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 820, maxWidth: '95vw', maxHeight: '88vh', background: 'var(--surface)', borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', zIndex: 1200,
        fontFamily: 'var(--font)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 'var(--radius-xs)', background: 'var(--orange-soft)', fontSize: 16
            }}>↔️</span>
            Shift Plan
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

        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--soft)', display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 220 }}>
            <label style={labelStyle}>Machine</label>
            <SearchableSelect
              value={machineID}
              onChange={id => setMachineID(id)}
              options={machines.map(m => ({ label: `${m.MachineCode} - ${m.MachineDescription || ''}`, value: m.MachineID }))}
              placeholder="Search machine..."
            />
          </div>
          <div style={{ width: 260 }}>
            <label style={labelStyle}>Starting Slot</label>
            <SearchableSelect
              value={startSlotID}
              onChange={id => { setStartSlotID(id); setPreviewRows(null); }}
              options={machineRows.map(r => ({
                label: `${r.ShiftDate} Shift ${r.ShiftNo} -- ${r.ItemCode}${r.ShopOrderNo ? ` (SO ${r.ShopOrderNo})` : ''}`,
                value: r.ShiftPlanID
              }))}
              placeholder={loadingSlots ? 'Loading...' : (machineID ? 'Search slot...' : 'Pick a machine first')}
              disabled={!machineID || loadingSlots}
            />
          </div>
          <div style={{ width: 160 }}>
            <label style={labelStyle}>Direction</label>
            <select value={direction} onChange={e => { setDirection(e.target.value); setPreviewRows(null); }} style={inputStyle}>
              <option value="forward">Forward</option>
              <option value="backward">Backward</option>
            </select>
          </div>
          <div style={{ width: 200 }}>
            <label style={labelStyle}>Amount</label>
            <select value={unit} onChange={e => { setUnit(e.target.value); setPreviewRows(null); }} style={inputStyle}>
              <option value="shift">1 Shift (12h)</option>
              <option value="day">1 Day (24h)</option>
            </select>
          </div>
          <button
            onClick={handlePreview}
            disabled={loadingSlots || !startSlotID}
            style={{
              padding: '9px 22px', borderRadius: 'var(--radius-xs)', border: 'none',
              background: (loadingSlots || !startSlotID) ? 'var(--hint)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: (loadingSlots || !startSlotID) ? 'not-allowed' : 'pointer'
            }}
          >
            Preview
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20, background: 'var(--bg)' }}>
          {error && (
            <div style={{ padding: 12, background: 'var(--red-soft)', color: 'var(--red)', borderRadius: 'var(--radius-xs)', fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>{error}</div>
          )}
          {success && (
            <div style={{ padding: 12, background: 'var(--green-soft)', color: 'var(--green)', borderRadius: 'var(--radius-xs)', fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>{success}</div>
          )}

          {previewRows === null ? (
            <div style={{ fontSize: 13, color: 'var(--hint)', padding: 20, textAlign: 'center' }}>
              Select a machine, a starting slot, direction, and amount, then click Preview. Everything from the starting slot onward shifts {directionLabel.toLowerCase()} by {unitLabel.toLowerCase()} -- everything before it stays put.
            </div>
          ) : previewRows.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--hint)', padding: 20, textAlign: 'center' }}>
              This machine has no plan to shift.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12.5, marginBottom: 12, color: 'var(--text)' }}>
                <strong style={{ color: 'var(--green)' }}>{eligibleRows.length}</strong> slot{eligibleRows.length !== 1 ? 's' : ''} will move
                {blockedRows.length > 0 && <> · <strong style={{ color: 'var(--red)' }}>{blockedRows.length}</strong> will stay in place</>}
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Item</th>
                      <th style={thStyle}>Old</th>
                      <th style={thStyle}>New</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map(r => (
                      <tr key={r.ShiftPlanID} style={{ opacity: r.inScope ? 1 : 0.45, background: r.inScope && r.blocked ? 'var(--red-soft)' : 'transparent' }}>
                        <td style={tdStyle}>{r.ItemCode}</td>
                        <td style={{ ...tdStyle, fontFamily: 'var(--mono)' }}>{r.ShiftDate} S{r.ShiftNo}</td>
                        <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontWeight: 700, color: (r.inScope && !r.blocked) ? 'var(--green)' : 'var(--hint)' }}>
                          {r.inScope && !r.blocked ? `${r.newDate} S${r.newShiftNo}` : '—'}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 11 }}>
                          {!r.inScope
                            ? <span style={{ color: 'var(--muted)' }}>Before starting slot -- unaffected</span>
                            : r.blocked
                            ? <span style={{ color: 'var(--red)', fontWeight: 700 }} title={r.reason}>{r.reason}</span>
                            : <span style={{ color: 'var(--green)' }}>Ready</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--soft)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Close
          </button>
          {previewRows !== null && eligibleRows.length > 0 && (
            <button
              onClick={handleApply}
              disabled={applying}
              style={{
                padding: '8px 24px', borderRadius: 'var(--radius-xs)', border: 'none',
                background: applying ? 'var(--hint)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
                color: '#fff', fontWeight: 700, fontSize: 13, cursor: applying ? 'not-allowed' : 'pointer'
              }}
            >
              {applying ? 'Shifting...' : `↔️ Shift ${eligibleRows.length} Slot${eligibleRows.length > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1150 }} onClick={() => !applying && onClose()} />
    </>
  );
}
