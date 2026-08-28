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

const inputStyle = { padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 };

export default function PlanningShowPlan({ user, onClose }) {
  const [startDate, setStartDate] = useState(() => toLocalDateStr(new Date()));
  const [endDate, setEndDate] = useState(() => addDays(toLocalDateStr(new Date()), 6));
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
        map[key].push({ itemCode: r.ItemCode, qty: Number(r.PlannedQty || 0) });
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

  return (
    <>
      <div style={{
        position: 'fixed', top: '3vh', left: '3vw', right: '3vw', bottom: '3vh',
        backgroundColor: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', borderRadius: 12,
        zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>📅 Show Plan</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748B' }}>×</button>
        </div>

        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
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
            style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Loading...' : 'Generate'}
          </button>
          {error && <div style={{ color: '#B91C1C', fontSize: 13 }}>{error}</div>}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 16, backgroundColor: '#F8FAFC' }}>
          {!generated ? (
            <div style={{ fontSize: 13, color: '#94A3B8', padding: 20 }}>Pick a date range and click Generate.</div>
          ) : machines.length === 0 ? (
            <div style={{ fontSize: 13, color: '#94A3B8', padding: 20 }}>No machines found.</div>
          ) : (
            <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>
              <thead>
                <tr>
                  <th style={{
                    position: 'sticky', left: 0, top: 0, zIndex: 3, background: '#fff',
                    textAlign: 'left', padding: '10px 12px', fontSize: 11.5, fontWeight: 700, color: '#64748B',
                    textTransform: 'uppercase', borderBottom: '2px solid #E2E8F0', borderRight: '2px solid #E2E8F0', minWidth: 160
                  }}>
                    Machine
                  </th>
                  {days.map(d => (
                    <th key={d} colSpan={2} style={{
                      position: 'sticky', top: 0, zIndex: 2, background: '#F1F5F9',
                      textAlign: 'center', padding: '8px 6px', fontSize: 12, fontWeight: 700, color: '#334155',
                      borderBottom: '1px solid #E2E8F0', borderLeft: '1px solid #E2E8F0'
                    }}>
                      {formatDateLabel(d)}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th style={{
                    position: 'sticky', left: 0, top: 33, zIndex: 3, background: '#fff',
                    borderBottom: '2px solid #E2E8F0', borderRight: '2px solid #E2E8F0'
                  }}></th>
                  {days.map(d => (
                    <React.Fragment key={d}>
                      <th style={{
                        position: 'sticky', top: 33, zIndex: 2, background: '#F8FAFC',
                        padding: '4px 8px', fontSize: 10.5, fontWeight: 700, color: '#94A3B8',
                        borderBottom: '2px solid #E2E8F0', borderLeft: '1px solid #E2E8F0', minWidth: 110
                      }}>Shift 1</th>
                      <th style={{
                        position: 'sticky', top: 33, zIndex: 2, background: '#F8FAFC',
                        padding: '4px 8px', fontSize: 10.5, fontWeight: 700, color: '#94A3B8',
                        borderBottom: '2px solid #E2E8F0', minWidth: 110
                      }}>Shift 2</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {machines.map((m, mi) => (
                  <tr key={m.MachineID} style={{ background: mi % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                    <td style={{
                      position: 'sticky', left: 0, zIndex: 1, background: mi % 2 === 0 ? '#fff' : '#FAFBFC',
                      padding: '10px 12px', fontSize: 12.5, fontWeight: 700, color: '#334155',
                      borderBottom: '1px solid #F1F5F9', borderRight: '2px solid #E2E8F0', whiteSpace: 'nowrap'
                    }}>
                      {m.MachineCode}
                    </td>
                    {days.map(d => {
                      const cell1 = cellMap[`${m.MachineID}|${d}|1`] || [];
                      const cell2 = cellMap[`${m.MachineID}|${d}|2`] || [];
                      return (
                        <React.Fragment key={d}>
                          <td style={{ padding: '6px 8px', fontSize: 11.5, borderBottom: '1px solid #F1F5F9', borderLeft: '1px solid #E2E8F0', verticalAlign: 'top' }}>
                            {cell1.map((c, i) => (
                              <div key={i} style={{ marginBottom: 2 }}>
                                <div style={{ fontWeight: 700, color: '#1E293B' }}>{c.itemCode}</div>
                                <div style={{ color: '#64748B' }}>{c.qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                              </div>
                            ))}
                          </td>
                          <td style={{ padding: '6px 8px', fontSize: 11.5, borderBottom: '1px solid #F1F5F9', verticalAlign: 'top' }}>
                            {cell2.map((c, i) => (
                              <div key={i} style={{ marginBottom: 2 }}>
                                <div style={{ fontWeight: 700, color: '#1E293B' }}>{c.itemCode}</div>
                                <div style={{ color: '#64748B' }}>{c.qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                              </div>
                            ))}
                          </td>
                        </React.Fragment>
                      );
                    })}
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
