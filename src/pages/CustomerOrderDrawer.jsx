import { useState, useEffect, useMemo } from 'react';
import { apiCall } from '../shared/api.js';
import { hasOperation } from '../shared/permissions.js';

// Read-only Customer Service view of an order's header + lines. No
// New/Edit/Delete/state-transition actions yet -- those are deferred
// ("operations will discuss it later"); this is purely a browse/drill-down
// page onto the same COR.CustomerOrderHeader/CustomerOrderLine data the
// Loading module's Orders page already writes to.
function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime()) || d.getFullYear() < 1901) return '';
  return d.toLocaleDateString('en-GB');
}

function fmtMoney(v) {
  if (v == null || v === '') return '';
  const n = Number(v) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CustomerOrderDrawer({ user, order, onClose, onEdit }) {
  const [lines, setLines] = useState([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (order?.OrderNumber) fetchLines(order.OrderNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchLines(orderNumber) {
    setLoadingLines(true);
    setError(null);
    try {
      const res = await apiCall('GetGridData', { PageGroupID: 'customer_order_lines', orderNumber }, {}, 'plus');
      if (res.State === 0) {
        const sorted = [...(res.List0 || [])].sort((a, b) => (Number(a.LineNumber) || 0) - (Number(b.LineNumber) || 0));
        setLines(sorted);
      } else {
        setError(res.Message || 'Failed to load order lines.');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setLoadingLines(false);
  }

  const linesTotal = useMemo(() => lines.reduce((sum, l) => sum + (Number(l.LineFinalAmountTransaction) || 0), 0), [lines]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: 1100, maxWidth: '96vw', background: 'var(--bg)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '20px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>🧾 Order {order.OrderNumber}</h2>
            {order.StateDescription && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999,
                background: 'var(--orange-soft)', color: 'var(--orange)'
              }}>
                {order.StateDescription}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {onEdit && hasOperation(user, 'customer_order.edit_order') && (
              <button
                onClick={() => onEdit(order)}
                style={{
                  height: 36, padding: '0 20px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px var(--orange-glow)'
                }}
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              style={{ height: 36, padding: '0 16px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
            >
              Close
            </button>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: 'var(--soft)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 24, gap: 16, overflow: 'hidden' }}>
          {error && (
            <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
              ⚠ {error}
            </div>
          )}

          {/* Hero summary: customer + every headline number (incl. financials), all in one glance */}
          <div style={{
            background: 'linear-gradient(135deg, var(--orange), var(--orange2))', borderRadius: 14, padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
            color: '#fff', boxShadow: '0 4px 16px var(--orange-glow)'
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.85 }}>Customer</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{order.CustomerName || '—'}</div>
              {order.CustomerExtraName && <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 2 }}>{order.CustomerExtraName}</div>}
            </div>
            {(order.ShipToName || order.ShipToAddress) && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.85 }}>Ship To</div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{order.ShipToName || '—'}</div>
                {order.ShipToAddress && <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 2, maxWidth: 240 }}>{order.ShipToAddress}</div>}
              </div>
            )}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.85 }}>Total Amount</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{fmtMoney(order.TotalFinalAmount)} <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>{order.Currency}</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.85 }}>Discount</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{fmtMoney(order.TotalDiscount)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.85 }}>Tax</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{fmtMoney(order.TaxAmount)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.85 }}>Weight</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{order.TotalWeight ?? '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.85 }}>Lines</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{order.TotalLines ?? lines.length}</div>
              </div>
            </div>
          </div>

          {order.RejectReason && (
            <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>⚠</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Reject Reason</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--red)' }}>{order.RejectReason}</div>
              </div>
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13 }}>📦</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Lines</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', background: 'var(--soft)', padding: '2px 8px', borderRadius: 999 }}>
                {lines.length}
              </span>
            </div>

            {loadingLines ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 18px', color: 'var(--muted)', fontSize: 12.5 }}>
                <div className="spinner"></div>
                Loading lines...
              </div>
            ) : lines.length === 0 ? (
              <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>
                No lines found for this order.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--soft)' }}>
                      {['Line', 'Item Code', 'Description', 'Qty Ordered', 'Unit Price', 'Line Amount', 'Discount', 'Discount %', 'Final Amount'].map((h, i) => (
                        <th key={h} style={{
                          textAlign: i >= 3 ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                          textTransform: 'uppercase', letterSpacing: 0.3, padding: '9px 12px', borderBottom: '1px solid var(--border)',
                          whiteSpace: 'nowrap'
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => {
                      const lineAmount = Number(l.LineAmountTransaction) || 0;
                      const discount = Number(l.LineDiscountTransaction) || 0;
                      const discountPct = lineAmount ? (discount / lineAmount) * 100 : 0;
                      return (
                        <tr key={l.GUID} style={{ background: i % 2 === 1 ? 'var(--soft)' : 'transparent' }}>
                          <td style={{ padding: '9px 12px', fontSize: 12.5, borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--muted)' }}>{l.LineNumber}</td>
                          <td style={{ padding: '9px 12px', fontSize: 12.5, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{l.ItemCode}</td>
                          <td style={{ padding: '9px 12px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{l.ItemDescription}</td>
                          <td style={{ padding: '9px 12px', fontSize: 12.5, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{l.OriginalOrderedQuantity}</td>
                          <td style={{ padding: '9px 12px', fontSize: 12.5, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmtMoney(l.ListPriceTransSelling)}</td>
                          <td style={{ padding: '9px 12px', fontSize: 12.5, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmtMoney(lineAmount)}</td>
                          <td style={{ padding: '9px 12px', fontSize: 12.5, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmtMoney(discount)}</td>
                          <td style={{ padding: '9px 12px', fontSize: 12.5, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{discountPct.toFixed(1)}%</td>
                          <td style={{ padding: '9px 12px', fontSize: 12.5, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 700 }}>{fmtMoney(l.LineFinalAmountTransaction)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={8} style={{ padding: '10px 12px', fontSize: 11.5, fontWeight: 800, textAlign: 'right', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Total</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 800, textAlign: 'right', color: 'var(--orange)' }}>{fmtMoney(linesTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
