import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

const summaryLabelStyle = { fontSize: 10, fontWeight: 700, color: 'var(--hint)', textTransform: 'uppercase', letterSpacing: 0.3 };
const summaryValueStyle = { fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const thStyle = { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '8px 10px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)' };

export default function BillOfMaterialDrawer({ user, row, onClose }) {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiCall('BOM L1 Formula', { ParentItemCode: row.ParentItemCode }, { User: user?.Username }, 'plus')
      .then(d => {
        if (cancelled) return;
        if (d.State === 0) {
          setLines((d.List0 || []).filter(l => String(l.LineFormulaID) === String(row.FormulaID)));
        } else {
          setError(d.Message || 'Failed to load BOM lines.');
        }
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [row.FormulaID, row.ParentItemCode, user]);

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 640, maxWidth: '95vw',
        background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', zIndex: 1000,
        display: 'flex', flexDirection: 'column', fontFamily: 'var(--font)'
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Bill Of Material Lines</h2>
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
            display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: 16,
            background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px'
          }}>
            <div>
              <div style={summaryLabelStyle}>Item Code</div>
              <div style={summaryValueStyle}>{row.ParentItemCode || '—'}</div>
            </div>
            <div>
              <div style={summaryLabelStyle}>Description</div>
              <div style={summaryValueStyle}>{row.ItemDescription || '—'}</div>
            </div>
            <div>
              <div style={summaryLabelStyle}>Batch Qty</div>
              <div style={summaryValueStyle}>{row.BatchQuantity ?? '—'}</div>
            </div>
            <div>
              <div style={summaryLabelStyle}>Machine</div>
              <div style={summaryValueStyle}>{row.MachineCode || '—'}</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: 'var(--bg)' }}>
          {error ? (
            <div style={{
              color: 'var(--red)', background: 'var(--red-soft)', fontSize: 12.5, fontWeight: 600,
              padding: '8px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(220,38,38,0.15)'
            }}>
              {error}
            </div>
          ) : loading ? (
            <div style={{ fontSize: 13, color: 'var(--hint)' }}>Loading...</div>
          ) : lines.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--hint)' }}>No BOM lines found for this formula.</div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Item Code</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Type</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Qty / Batch</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map(l => (
                    <tr key={l.BLID || l.Line}>
                      <td style={tdStyle}>{l.Line}</td>
                      <td style={tdStyle}>{l.ChildItemCode}</td>
                      <td style={tdStyle}>{l.ChildItemDescription}</td>
                      <td style={tdStyle}>{l.ChildItemType || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {Number(l.Quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 20px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }} onClick={onClose} />
    </>
  );
}
