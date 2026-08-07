import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

function fmtMoney(v) {
  const n = Number(v) || 0;
  const color = n < 0 ? 'var(--red)' : 'var(--text)';
  return <span style={{ color }}>{n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
}

// [column key, label, icon]
const FIELDS = [
  ['CustomerBalance', 'Customer Balance', '🏢'],
  ['VendorBalance', 'Vendor Balance', '🏭'],
  ['BankCashEGP', 'Bank Cash', '🏦'],
  ['TreasuryCashEGP', 'Treasury Cash', '💰'],
  ['NoteReceivable', 'Note Receivable', '📥'],
  ['NotePayable', 'Note Payable', '📤'],
  ['Loans', 'Loans', '💳'],
  ['Custody', 'Custody', '🔒'],
  ['Debtors', 'Debtors', '📈'],
  ['Creditors', 'Creditors', '📉'],
  ['Due', 'Due', '⚖️'],
  ['WorkingCapitalFunds', 'Working Capital Funds', '💵']
];

export default function CustomerStatus({ user }) {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiCall('GetGridData', { PageGroupID: 'customer_status' }, {}, 'plus');
      if (res.State === 0) {
        setRow((res.List0 || [])[0] || null);
      } else {
        setError(res.Message || 'Failed to load Company Status data.');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', fontFamily: 'var(--font)', color: 'var(--text)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '24px' }}>📋 Company Status</h2>

          <button
            onClick={loadData}
            disabled={loading}
            style={{
              height: 38, padding: '0 18px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 12px var(--orange-glow)'
            }}
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--error-bg, #ff4c4c22)', color: 'var(--error, #ff4c4c)', padding: '12px', borderRadius: '8px', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>
            <div className="spinner"></div>
            Loading...
          </div>
        ) : !row ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No data found.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {FIELDS.map(([key, label, icon]) => (
              <div key={key} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
                boxShadow: 'var(--shadow)', padding: '16px 18px'
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                  {icon} {label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{fmtMoney(row[key])}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
