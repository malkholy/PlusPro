import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

const summaryLabelStyle = { fontSize: 10, fontWeight: 700, color: 'var(--hint)', textTransform: 'uppercase', letterSpacing: 0.3 };
const summaryValueStyle = { fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const thStyle = { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '8px 10px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)' };

function StateBadge({ state, description }) {
  const n = Number(state);
  const isDraft = n === 0;
  const isIssued = n === 10;
  const label = description || (isDraft ? 'New' : isIssued ? 'Issued' : `State ${n}`);
  const color = isDraft ? 'var(--muted)' : isIssued ? 'var(--green, #16a34a)' : 'var(--orange2)';
  const bg = isDraft ? 'var(--soft)' : isIssued ? 'var(--green-soft, rgba(22,163,74,0.12))' : 'var(--orange-soft)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999,
      background: bg, color, fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}

export default function ShopOrderViewDrawer({ user, row, onClose, onEdit, onProduce, onDelete }) {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiCall('Shop Order Lines', { param1: row.ShopOrderNumber }, { User: user?.Username }, 'lookup')
      .then(d => {
        if (cancelled) return;
        if (d.State === 0) {
          setLines(d.List0 || []);
        } else {
          setError(d.Message || 'Failed to load shop order lines.');
        }
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [row.ShopOrderNumber, user]);

  const isDraft = Number(row.OrderState) === 0;
  const required = Number(row.QuantityRequired || 0);
  const issued = Number(row.QuantiftyIssued || 0);
  const pct = required > 0 ? Math.min(100, (issued / required) * 100) : 0;

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 720, maxWidth: '95vw',
        background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', zIndex: 1000,
        display: 'flex', flexDirection: 'column', fontFamily: 'var(--font)'
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 'var(--radius-xs)', background: 'var(--orange-soft)', fontSize: 16
              }}>🧾</span>
              Shop Order {row.ShopOrderNumber}
              <StateBadge state={row.OrderState} description={row.StateDescription} />
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
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
            background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px'
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
              <div style={summaryLabelStyle}>Date</div>
              <div style={summaryValueStyle}>{row.ShopOrderDate ? row.ShopOrderDate.split('T')[0] : '—'}</div>
            </div>
            <div>
              <div style={summaryLabelStyle}>Warehouse</div>
              <div style={summaryValueStyle}>{row.ShopOrderWarehouse || '—'}</div>
            </div>
            <div>
              <div style={summaryLabelStyle}>Machine</div>
              <div style={summaryValueStyle}>{row.MachineCode || '—'}</div>
            </div>
            <div>
              <div style={summaryLabelStyle}>Formula</div>
              <div style={summaryValueStyle}>{row.FormulaCode || '—'}</div>
            </div>
            <div>
              <div style={summaryLabelStyle}>Shift</div>
              <div style={summaryValueStyle}>{row.ShiftID ?? '—'}</div>
            </div>
            <div>
              <div style={summaryLabelStyle}>Releases</div>
              <div style={summaryValueStyle}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 999,
                  background: Number(row.NumberOfReleases || 0) > 0 ? 'var(--orange-soft)' : 'var(--border)',
                  color: Number(row.NumberOfReleases || 0) > 0 ? 'var(--orange2)' : 'var(--muted)', fontSize: 12, fontWeight: 800
                }}>
                  {Number(row.NumberOfReleases || 0)}
                </span>
              </div>
            </div>
            <div>
              <div style={summaryLabelStyle}>Created By</div>
              <div style={summaryValueStyle}>{row.OrderCreatedBy || '—'}</div>
            </div>
            <div>
              <div style={summaryLabelStyle}>Created Date</div>
              <div style={summaryValueStyle}>{row.OrderCreatedDate ? row.OrderCreatedDate.split('T')[0] : '—'}</div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={summaryLabelStyle}>Qty Issued / Required</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: pct >= 100 ? 'var(--green, #16a34a)' : 'var(--muted)' }}>
                  {pct.toFixed(0)}%
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2, marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{issued.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
                <span style={{ fontSize: 11, color: 'var(--hint)' }}>/ {required.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`, borderRadius: 999, transition: 'width 0.2s ease',
                  background: pct >= 100 ? 'var(--green, #16a34a)' : 'linear-gradient(135deg, var(--orange), var(--orange2))'
                }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: 'var(--bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>📦 Lines</h3>
            {lines.length > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 999,
                background: 'var(--soft)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 11, fontWeight: 700
              }}>
                {lines.length}
              </span>
            )}
          </div>
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
            <div style={{ fontSize: 13, color: 'var(--hint)' }}>No lines found for this shop order.</div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Item Code</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Type</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Qty Required</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Qty Issued</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={l.ID || l.Line} style={{ background: idx % 2 === 1 ? 'var(--soft)' : 'transparent' }}>
                      <td style={tdStyle}>{l.Line}</td>
                      <td style={tdStyle}>{l.ChildItemCode}</td>
                      <td style={tdStyle}>{l.ItemDescription || '—'}</td>
                      <td style={tdStyle}>{l.ChildItemType || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {Number(l.ChildQuantityRequired || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: Number(l.ChildQuantityIssued || 0) > 0 ? 700 : 400, color: Number(l.ChildQuantityIssued || 0) > 0 ? 'var(--green, #16a34a)' : 'var(--text)' }}>
                        {Number(l.ChildQuantityIssued || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 20px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Close
          </button>
          <button
            onClick={() => onProduce(row)}
            style={{
              padding: '8px 22px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)',
              background: 'var(--surface)', color: 'var(--orange2)', fontWeight: 700, fontSize: 13, cursor: 'pointer'
            }}
          >
            🏭 Producation
          </button>
          {isDraft && (
            <button
              onClick={() => onDelete(row)}
              style={{
                padding: '8px 22px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)',
                background: 'var(--surface)', color: 'var(--red)', fontWeight: 700, fontSize: 13, cursor: 'pointer'
              }}
            >
              🗑 Delete
            </button>
          )}
          {isDraft && (
            <button
              onClick={() => onEdit(row)}
              style={{
                padding: '8px 22px', borderRadius: 'var(--radius-xs)', border: 'none',
                background: 'linear-gradient(135deg, var(--orange), var(--orange2))', color: '#fff',
                fontWeight: 700, fontSize: 13, cursor: 'pointer'
              }}
            >
              ✏ Edit
            </button>
          )}
        </div>
      </div>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }} onClick={onClose} />
    </>
  );
}
