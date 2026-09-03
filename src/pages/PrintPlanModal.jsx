import React, { useState } from 'react';
import { apiCall } from '../shared/api.js';

// Local (not UTC) date helper -- toISOString() would shift the calendar
// date backward for any timezone ahead of UTC (Egypt, UTC+2).
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: 0.4
};
const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid var(--border2)', borderRadius: 'var(--radius-xs)',
  boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 13
};
const thStyle = { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '8px 10px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)' };

export default function PrintPlanModal({ user, onClose }) {
  const [date, setDate] = useState(toLocalDateStr(new Date()));
  const [shiftNo, setShiftNo] = useState('');
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoad = async () => {
    if (!date) { setError('Please select a date.'); return; }
    if (!shiftNo) { setError('Please select a shift.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await apiCall('Get Planning Shift Calendar', { FromDate: date, ToDate: date }, { User: user?.Username }, 'planning');
      if (res.State === 0) {
        const filtered = (res.List0 || []).filter(r => Number(r.ShiftNo) === Number(shiftNo));
        const sorted = filtered.sort((a, b) => String(a.MachineCode || '').localeCompare(String(b.MachineCode || '')));
        setRows(sorted);
        setLoaded(true);
      } else {
        setError(res.Message || 'Failed to load shift plan.');
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const shiftLabel = shiftNo === '1' ? 'Shift 1 (07:00 AM - 07:00 PM)' : shiftNo === '2' ? 'Shift 2 (07:00 PM - 07:00 AM)' : '';

  const handlePrint = () => {
    if (!window.jspdf) { setError('jsPDF not loaded'); return; }
    const doc = new window.jspdf.jsPDF({ orientation: 'landscape' });
    doc.text(`Shift Plan - ${date} - ${shiftLabel}`, 14, 14);
    doc.autoTable({
      head: [['Machine', 'Item Code', 'Description', 'Formula', 'Batch Qty', 'Prod. Time (s)', 'Warehouse', 'Planned Qty', 'Shop Order']],
      body: rows.map(r => [
        r.MachineCode || '—',
        r.ItemCode || '—',
        r.ItemDescription || '—',
        r.FormulaCode || '—',
        Number(r.FormulaBatch || 0).toLocaleString(undefined, { maximumFractionDigits: 5 }),
        r.ProductionTime ?? '—',
        r.Warehouse || '—',
        Number(r.PlannedQty || 0).toLocaleString(undefined, { maximumFractionDigits: 5 }),
        r.ShopOrderNo || '—'
      ]),
      startY: 22
    });
    doc.save(`Shift Plan - ${date} - Shift ${shiftNo}.pdf`);
  };

  return (
    <>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 920, maxWidth: '95vw', maxHeight: '90vh', background: 'var(--surface)', borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', zIndex: 1200,
        fontFamily: 'var(--font)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 'var(--radius-xs)', background: 'var(--orange-soft)', fontSize: 16
            }}>🖨️</span>
            Print Plan
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
          <div style={{ width: 200 }}>
            <label style={labelStyle}>Date</label>
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setLoaded(false); }} style={inputStyle} />
          </div>
          <div style={{ width: 220 }}>
            <label style={labelStyle}>Shift</label>
            <select value={shiftNo} onChange={e => { setShiftNo(e.target.value); setLoaded(false); }} style={inputStyle}>
              <option value="">Select shift...</option>
              <option value="1">Shift 1 (07:00 AM - 07:00 PM)</option>
              <option value="2">Shift 2 (07:00 PM - 07:00 AM)</option>
            </select>
          </div>
          <button
            onClick={handleLoad}
            disabled={loading}
            style={{
              padding: '9px 22px', borderRadius: 'var(--radius-xs)', border: 'none',
              background: loading ? 'var(--hint)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
          {loaded && rows.length > 0 && (
            <button
              onClick={handlePrint}
              style={{
                padding: '9px 22px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)',
                background: 'var(--surface)', color: 'var(--text)', fontWeight: 700, fontSize: 13, cursor: 'pointer'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.color = 'var(--orange2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)'; }}
            >
              🖨️ Print PDF
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: 'var(--bg)' }}>
          {error && (
            <div style={{
              color: 'var(--red)', background: 'var(--red-soft)', fontSize: 12.5, fontWeight: 600,
              padding: '8px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(220,38,38,0.15)', marginBottom: 16
            }}>
              {error}
            </div>
          )}

          {!loaded ? (
            <div style={{ fontSize: 13, color: 'var(--hint)', padding: 20, textAlign: 'center' }}>
              Select a date and shift, then click Load to preview that shift's plan.
            </div>
          ) : rows.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--hint)', padding: 20, textAlign: 'center' }}>
              No shift plan scheduled for this date/shift.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                {date} · <strong style={{ color: 'var(--text)' }}>{shiftLabel}</strong>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'auto' }}>
              <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Machine</th>
                    <th style={thStyle}>Item Code</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Formula</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Batch Qty</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Prod. Time (s)</th>
                    <th style={thStyle}>Warehouse</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Planned Qty</th>
                    <th style={thStyle}>Shop Order</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.ShiftPlanID}>
                      <td style={tdStyle}>{r.MachineCode || '—'}</td>
                      <td style={tdStyle}>{r.ItemCode || '—'}</td>
                      <td style={tdStyle}>{r.ItemDescription || '—'}</td>
                      <td style={tdStyle}>{r.FormulaCode || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {Number(r.FormulaBatch || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{r.ProductionTime ?? '—'}</td>
                      <td style={tdStyle}>{r.Warehouse || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                        {Number(r.PlannedQty || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })}
                      </td>
                      <td style={tdStyle}>{r.ShopOrderNo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1150 }} onClick={onClose} />
    </>
  );
}
