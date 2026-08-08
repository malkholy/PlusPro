import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

function fmtMoney(v) {
  const n = Number(v) || 0;
  const color = n < 0 ? 'var(--red)' : 'var(--text)';
  return <span style={{ color }}>{n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
}

// Total rows use inverted coloring vs. fmtMoney: negative = green, positive = red.
function fmtTotal(v) {
  const n = Number(v) || 0;
  const color = n < 0 ? 'var(--green, #16a34a)' : n > 0 ? 'var(--red)' : 'var(--text)';
  return <span style={{ color, fontWeight: 800 }}>{n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
}

// Grouped panels -- each entry is [column key, label]. Each group gets a
// left accent stripe color, matching Cash Flow's panel style.
const PANEL_GROUPS = [
  { title: 'Customer & Vendor', icon: '🏢', accent: '#ff650f', items: [
    ['CustomerBalance', 'Customer Balance'], ['VendorBalance', 'Vendor Balance'],
    [row => (Number(row.CustomerBalance) || 0) + (Number(row.VendorBalance) || 0), 'Total', fmtTotal]
  ]},
  { title: 'Notes', icon: '📝', accent: '#34d399', items: [
    ['NoteReceivable', 'Note Receivable'], ['NotePayable', 'Note Payable'],
    [row => (Number(row.NoteReceivable) || 0) + (Number(row.NotePayable) || 0), 'Total', fmtTotal]
  ]},
  { title: 'Cash', icon: '💰', accent: '#38bdf8', items: [
    ['BankCashEGP', 'Bank Cash'], ['TreasuryCashEGP', 'Treasury Cash'],
    [row => (Number(row.BankCashEGP) || 0) + (Number(row.TreasuryCashEGP) || 0), 'Total', fmtTotal]
  ]},
  { title: 'Debtors & Creditors', icon: '👥', accent: '#f472b6', items: [
    ['Debtors', 'Debtors'], ['Creditors', 'Creditors'],
    [row => (Number(row.Debtors) || 0) + (Number(row.Creditors) || 0), 'Total', fmtTotal]
  ]},
  { title: 'Other', icon: '📊', accent: '#a78bfa', items: [
    ['Loans', 'Loans'], ['Custody', 'Custody'],
    ['Due', 'Due'], ['WorkingCapitalFunds', 'Working Capital Funds'],
    [row => (Number(row.Loans) || 0) + (Number(row.Custody) || 0) + (Number(row.Due) || 0) + (Number(row.WorkingCapitalFunds) || 0), 'Total', fmtTotal]
  ]}
];

// Grand total across every field on the page, for the "Company Status" panel.
const ALL_FIELDS = [
  'CustomerBalance', 'VendorBalance', 'BankCashEGP', 'TreasuryCashEGP',
  'NoteReceivable', 'NotePayable', 'Loans', 'Custody',
  'Debtors', 'Creditors', 'Due', 'WorkingCapitalFunds'
];
function grandTotal(row) {
  return ALL_FIELDS.reduce((sum, key) => sum + (Number(row[key]) || 0), 0);
}

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--orange), var(--orange2))', borderRadius: 14, padding: '18px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', boxShadow: '0 4px 16px var(--orange-glow)'
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🏛️</span> Company Status
              </div>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{fmtMoney(grandTotal(row))}</div>
            </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {PANEL_GROUPS.map(group => (
              <div key={group.title} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
                borderLeft: `4px solid ${group.accent}`, boxShadow: 'var(--shadow)', overflow: 'hidden'
              }}>
                <div style={{
                  padding: '10px 16px', borderBottom: '1px solid var(--border)',
                  fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4,
                  display: 'flex', alignItems: 'center', gap: 6
                }}>
                  <span>{group.icon}</span> {group.title}
                </div>
                <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.items.map(([key, label, formatter]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{label}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {(formatter || fmtMoney)(typeof key === 'function' ? key(row) : row[key])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
