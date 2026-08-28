import React, { useState } from 'react';
import { apiCall } from '../shared/api.js';

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

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDayName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short' });
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
        map[key].push({ itemCode: r.ItemCode, itemDescription: r.ItemDescription || '', qty: Number(r.PlannedQty || 0) });
      });

      const dayList = [];
      for (let i = 0; i < dayCount; i++) {
        dayList.push(addDays(startDate, i));
      }

      setMachines(machinesRes.List0 || []);
      setCellMap(map);
      setDays(dayList);
      setGenerated(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderCell = (m, d, shiftNo) => {
    const items = cellMap[`${m.MachineID}|${d}|${shiftNo}`] || [];
    const accent = SHIFT_ACCENT[shiftNo];
    const isToday = d === todayStr;
    return (
      <td
        key={shiftNo}
        style={{
          padding: '6px 8px', fontSize: 11.5, verticalAlign: 'top',
          borderBottom: '1px solid var(--border)',
          borderLeft: shiftNo === 1 ? '1px solid var(--border)' : '1px solid var(--soft)',
          background: isToday ? 'var(--orange-glow)' : 'transparent'
        }}
      >
        {items.map((c, i) => (
          <div
            key={i}
            style={{
              marginBottom: 4, padding: '4px 6px 4px 8px', borderRadius: 'var(--radius-xs)',
              borderLeft: `3px solid ${accent.bar}`, background: accent.soft
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
      </div>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }} onClick={onClose} />
    </>
  );
}
