import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

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

export default function ShopOrderProductionDrawer({ user, row, onClose, onSaveSuccess }) {
  const [issuedQty, setIssuedQty] = useState(row.QuantiftyIssued ?? '');
  const [lines, setLines] = useState([]);
  const [linesLoading, setLinesLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLinesLoading(true);
    apiCall('Shop Order Lines', { param1: row.ShopOrderNumber }, { User: user?.Username }, 'lookup')
      .then(d => {
        if (cancelled) return;
        if (d.State === 0) {
          setLines((d.List0 || []).map(l => ({
            line: l.Line, childItemCode: l.ChildItemCode, childItemDescription: l.ItemDescription,
            quantityRequired: l.ChildQuantityRequired, quantityIssued: l.ChildQuantityIssued
          })));
        } else {
          setError(d.Message || 'Failed to load lines.');
        }
      })
      .catch(e => { if (!cancelled) setError('Failed to load lines: ' + e.message); })
      .finally(() => { if (!cancelled) setLinesLoading(false); });
    return () => { cancelled = true; };
  }, [row.ShopOrderNumber, user]);

  const updateLineIssued = (idx, val) => setLines(prev => prev.map((l, i) => i === idx ? { ...l, quantityIssued: val } : l));

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (issuedQty === '' || Number(issuedQty) < 0) { setError('Please enter a valid Issued Qty.'); return; }
    if (lines.some(l => l.quantityIssued !== '' && l.quantityIssued != null && Number(l.quantityIssued) < 0)) {
      setError('Line issued quantities cannot be negative.');
      return;
    }

    setSaving(true);
    try {
      const lineMember = lines.map(l => ({
        Line: l.line,
        ChildIssued: Number(l.quantityIssued || 0)
      }));

      const res = await apiCall('Issue Shop Order', {
        ShopOrderNo: row.ShopOrderNumber,
        IssuedQty: Number(issuedQty)
      }, {
        User: user?.Username,
        LineMember: JSON.stringify(lineMember)
      }, 'shop_order');

      if (res.State === 0) {
        setSuccess('Production issue saved successfully!');
        setTimeout(() => { onSaveSuccess(); onClose(); }, 700);
      } else {
        setError(res.Message || 'Failed to save.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 680, maxWidth: '95vw',
        background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', zIndex: 1150,
        display: 'flex', flexDirection: 'column', fontFamily: 'var(--font)'
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            🏭 Production: Shop Order {row.ShopOrderNumber}
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

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ padding: 12, background: 'var(--red-soft)', color: 'var(--red)', borderRadius: 'var(--radius-xs)', fontSize: 13, fontWeight: 600 }}>{error}</div>
          )}
          {success && (
            <div style={{ padding: 12, background: 'var(--green-soft)', color: 'var(--green)', borderRadius: 'var(--radius-xs)', fontSize: 13, fontWeight: 600 }}>{success}</div>
          )}

          <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Item Code</label>
                <input value={row.ParentItemCode || '—'} readOnly style={{ ...inputStyle, background: 'var(--soft)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label style={labelStyle}>Qty Required</label>
                <input value={Number(row.QuantityRequired || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })} readOnly style={{ ...inputStyle, background: 'var(--soft)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label style={labelStyle}>Issued Qty</label>
                <input type="number" step="0.00001" value={issuedQty} onChange={e => setIssuedQty(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Lines</h3>
            {linesLoading ? (
              <div style={{ fontSize: 13, color: 'var(--hint)' }}>Loading...</div>
            ) : lines.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--hint)' }}>No lines found for this shop order.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Item Code</th>
                    <th style={thStyle}>Description</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Qty Required</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Qty Issued</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={l.line}>
                      <td style={tdStyle}>{l.line}</td>
                      <td style={tdStyle}>{l.childItemCode}</td>
                      <td style={tdStyle}>{l.childItemDescription || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {Number(l.quantityRequired || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })}
                      </td>
                      <td style={{ ...tdStyle, width: 140 }}>
                        <input
                          type="number" step="0.00001" value={l.quantityIssued}
                          onChange={e => updateLineIssued(idx, e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 22px', borderRadius: 'var(--radius-xs)', border: 'none',
              background: saving ? 'var(--hint)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100 }} onClick={onClose} />
    </>
  );
}
