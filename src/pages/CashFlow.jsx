import React, { useState } from 'react';
import FilterPanel from '../shared/FilterPanel';
import { apiCall } from '../shared/api.js';

function fmtMoney(v) {
  const n = Number(v) || 0;
  const color = n < 0 ? 'var(--red)' : 'var(--text)';
  return <span style={{ color }}>{n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
}

function fmtPct(v) {
  const n = Number(v) || 0;
  const color = n > 0 ? 'var(--green, #16a34a)' : n < 0 ? 'var(--red)' : 'var(--text)';
  const sign = n > 0 ? '+' : '';
  return <span style={{ color, fontWeight: 700 }}>{sign}{n.toFixed(2)}%</span>;
}

function fmtRatio(v) {
  return (Number(v) || 0).toFixed(2);
}

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

// Headline KPIs shown large, up top, per month.
const HERO_METRICS = [
  ['CashState', 'Cash State', '💰'],
  ['TotalCollection', 'Total Collection', '📥'],
  ['TotalCustomerSales', 'Customer Sales', '📈'],
  ['Expenses', 'Expenses', '📉'],
  ['TotalVendorsPayment', 'Vendors Payment', '📤']
];

// Metric groups shown as data panels (not a grid table) -- each entry is
// [column key, label, formatter]. Key can also be a function(row) for
// computed values (e.g. summing two columns). formatter defaults to
// fmtMoney. Each group gets a left accent stripe color, matching the
// sidebar's group-accent style.
const PANEL_GROUPS = [
  { title: 'Cash Position', icon: '🏦', accent: '#ff650f', items: [
    ['TreasuryCashEGP', 'Treasury Cash'], ['BankCashEGP', 'Bank Cash'],
    ['TreasuryCashEGP_Open', 'Treasury Cash (Open)'], ['BankCashEGP_Open', 'Bank Cash (Open)'],
    ['CashState', 'Cash State']
  ]},
  { title: 'Payables & Receivables', icon: '⚖️', accent: '#34d399', items: [
    [row => (Number(row.TotalCashPayable) || 0) + (Number(row.TotalTransferPayable) || 0), 'Total Payable'],
    [row => (Number(row.TotalCashReceivable) || 0) + (Number(row.TotalTransferReceivable) || 0), 'Total Receivable'],
    ['VendorBalance', 'Vendor Balance'], ['VendorOpenBalance', 'Vendor Open Balance'],
    ['CustomerBalance', 'Customer Balance'], ['CustomerOpenBalance', 'Customer Open Balance'],
    ['TotalDueVendorInvoices', 'Due Vendor Invoices'], ['TotalDueCustomerInvoices', 'Due Customer Invoices']
  ]},
  { title: 'Payments & Collections', icon: '💳', accent: '#a78bfa', items: [
    ['TotalVendorsPayment', 'Vendors Payment'], ['TotalCustomerPayment', 'Customer Payment'],
    ['TotalCollection', 'Total Collection'], ['TotalCheckCollection', 'Check Collection'],
    ['TotalCheckPaid', 'Check Paid'], ['TotalDueCheck', 'Due Check'],
    ['CustomerPaymentYearly', 'Customer Payment (Yearly)']
  ]},
  { title: 'Sales', icon: '📈', accent: '#38bdf8', items: [
    ['TotalCustomerSales', 'Customer Sales'], ['WholeSales', 'Whole Sales'],
    ['CustomerModernSales', 'Customer Modern Sales'], ['YTDSales2025', 'YTD Sales 2025'],
    ['YTDSales2026', 'YTD Sales 2026'], ['YTDSalesGrowthPct', 'YTD Sales Growth', fmtPct],
    ['TotalItemAmount', 'Item Amount'], ['TotalInvoiceDiscount', 'Invoice Discount'],
    ['TotalCustomerExtraDiscount', 'Customer Extra Discount']
  ]},
  { title: 'Expenses & Ratios', icon: '📊', accent: '#f472b6', items: [
    ['Expenses', 'Expenses'], ['TotalYearExpenses', 'Year Expenses'],
    ['ExpensesRatio', 'Expenses Ratio', fmtPct], ['VendorPaymentRatio', 'Vendor Payment Ratio', fmtRatio],
    ['CustomerBalanceGrowth', 'Customer Balance Growth', fmtPct], ['VendorBalanceGrowth', 'Vendor Balance Growth', fmtPct]
  ]},
  { title: 'Invoices', icon: '🧾', accent: '#94a3b8', items: [
    ['TotalVendorsInvoices', 'Vendors Invoices']
  ]}
];

function MonthSection({ row, open, onToggle }) {
  const label = `${MONTHS.find(m => m.value === Number(row.Month))?.label || row.Month} ${row.Year}`;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
      <div
        onClick={onToggle}
        style={{
          padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', userSelect: 'none',
          background: open ? 'linear-gradient(135deg, var(--orange), var(--orange2))' : 'var(--soft)',
          color: open ? '#fff' : 'var(--text)'
        }}
      >
        <span style={{ fontSize: 14.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          📅 {label}
        </span>
        <span style={{ fontSize: 12, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>▾</span>
      </div>

      {open && (
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Headline KPI strip */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {HERO_METRICS.map(([key, label, icon]) => (
              <div key={key} style={{
                flex: '1 1 160px', minWidth: 160, background: 'var(--soft)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 16px'
              }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                  {icon} {label}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{fmtMoney(row[key])}</div>
              </div>
            ))}
          </div>

          {/* Detail panels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {PANEL_GROUPS.map(group => (
              <div key={group.title} style={{
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14,
                borderLeft: `4px solid ${group.accent}`, overflow: 'hidden', transition: 'box-shadow 0.15s ease, transform 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
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
  );
}

export default function CashFlow({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [month, setMonth] = useState('');
  const [openSet, setOpenSet] = useState(new Set());

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiCall('GetGridData', { PageGroupID: 'cash_flow', month }, {}, 'plus');
      if (res.State === 0) {
        const rows = [...(res.List0 || [])].sort((a, b) => (b.YearMonth || 0) - (a.YearMonth || 0));
        setData(rows);
        // Most recent month open by default, rest collapsed.
        setOpenSet(new Set(rows.length ? [rows[0].YearMonth] : []));
      } else {
        setError(res.Message || 'Failed to load Cash Flow data.');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  function toggle(yearMonth) {
    setOpenSet(prev => {
      const next = new Set(prev);
      next.has(yearMonth) ? next.delete(yearMonth) : next.add(yearMonth);
      return next;
    });
  }

  return (
    <div className="flex-row-layout" style={{ height: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)', color: 'var(--text)' }}>
      <FilterPanel
        pageGroupId="cash_flow"
        user={user}
        loading={loading}
        onSearch={() => { setHasSearched(true); loadData(); }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '24px' }}>💵 Cash Flow</h2>

          <div style={{ display: 'flex', gap: 10 }}>
            {data.length > 1 && (
              <button
                onClick={() => setOpenSet(new Set(openSet.size === data.length ? [] : data.map(r => r.YearMonth)))}
                style={{
                  height: 38, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
                }}
              >
                {openSet.size === data.length ? 'Collapse All' : 'Expand All'}
              </button>
            )}
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              style={{
                height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none'
              }}
            >
              <option value="">All Months</option>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div style={{ background: 'var(--error-bg, #ff4c4c22)', color: 'var(--error, #ff4c4c)', padding: '12px', borderRadius: '8px', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {!hasSearched ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            flex: 1, color: 'var(--muted)', textAlign: 'center', padding: '64px 0',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px'
          }}>
            <span style={{ fontSize: '48px', marginBottom: 16 }}>💵</span>
            <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '16px', fontWeight: '700' }}>No Data Loaded Yet</h3>
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', maxWidth: '320px' }}>Click "Generate" to load the cash flow summary.</p>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>
            <div className="spinner"></div>
            Loading...
          </div>
        ) : data.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No cash flow data found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.map(row => (
              <MonthSection key={row.YearMonth} row={row} open={openSet.has(row.YearMonth)} onToggle={() => toggle(row.YearMonth)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
