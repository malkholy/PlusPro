import React, { useState, useEffect } from 'react';
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
    [row => (Number(row.TreasuryCashEGP_Open) || 0) + (Number(row.BankCashEGP_Open) || 0), 'Month Begin Cash'],
    ['CashState', 'Cash State']
  ]},
  { title: 'Payables & Receivables', icon: '⚖️', accent: '#34d399', items: [
    [row => (Number(row.TotalCashPayable) || 0) + (Number(row.TotalTransferPayable) || 0), 'Total Payable'],
    [row => (Number(row.TotalCashReceivable) || 0) + (Number(row.TotalTransferReceivable) || 0), 'Total Receivable'],
    ['TotalDueVendorInvoicesMonthEnding', 'Due Vendor Invoices'], ['TotalDueCustomerInvoicesMonthEnding', 'Due Customer Invoices']
  ]},
  { title: 'Vendor', icon: '🏭', accent: '#f59e0b', items: [
    ['VendorBalance', 'Current Vendor Balance'], ['VendorOpenBalance', 'Vendor Open Balance'],
    ['VendorBalanceGrowth', 'Vendor Balance Growth', fmtPct],
    ['TotalVendorsPayment', 'Vendors Payment'], ['TotalVendorsInvoices', 'Vendor Invoices'],
    ['VendorPaymentRatio', 'Vendor Payment Ratio', fmtRatio]
  ]},
  { title: 'Customer', icon: '🏢', accent: '#22d3ee', items: [
    ['CustomerBalance', 'Current Customer Balance'], ['CustomerOpenBalance', 'Customer Open Balance'],
    ['CustomerBalanceGrowth', 'Customer Balance Growth', fmtPct],
    ['TotalCustomerPayment', 'Customer Payment'], ['TotalCustomerSales', 'Customer Invoices'],
    [row => (Number(row.TotalCustomerSales) || 0) ? (Number(row.TotalCustomerPayment) || 0) / Number(row.TotalCustomerSales) : 0, 'Customer Payment Ratio', fmtRatio]
  ]},
  { title: 'Payments & Collections', icon: '💳', accent: '#a78bfa', items: [
    ['TotalCollection', 'Total Collection'], ['TotalCheckCollection', 'Check Collection'],
    ['TotalCheckPaid', 'Check Paid'], ['TotalDueCheck', 'Due Check'],
    ['CustomerPaymentYearly', 'Customer Payment (Yearly)']
  ]},
  { title: 'Sales', icon: '📈', accent: '#38bdf8', items: [
    ['TotalCustomerSales', 'Customer Sales'], ['YTDSales2025', 'YTD Sales 2025'],
    ['YTDSales2026', 'YTD Sales 2026'], ['YTDSalesGrowthPct', 'YTD Sales Growth', fmtPct],
    ['TotalItemAmount', 'Item Amount'], ['TotalInvoiceDiscount', 'Invoice Discount'],
    ['TotalCustomerExtraDiscount', 'Customer Extra Discount']
  ]},
  { title: 'Sales Details', icon: '🛒', accent: '#c084fc', items: [
    ['WholeSales', 'Whole Sales'], ['CustomerModernSales', 'Customer Modern Sales']
  ]},
  { title: 'Expenses & Ratios', icon: '📊', accent: '#f472b6', items: [
    ['Expenses', 'Expenses'], ['TotalYearExpenses', 'Year Expenses'],
    ['ExpensesRatio', 'Expenses Ratio', fmtPct]
  ]}
];

function MonthSection({ row, open, onToggle, onPrint, printing }) {
  const label = `${MONTHS.find(m => m.value === Number(row.Month))?.label || row.Month} ${row.Year}`;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
      <div
        style={{
          padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          userSelect: 'none',
          background: open ? 'linear-gradient(135deg, var(--orange), var(--orange2))' : 'var(--soft)',
          color: open ? '#fff' : 'var(--text)'
        }}
      >
        <span onClick={onToggle} style={{ cursor: 'pointer', fontSize: 14.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          📅 {label}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onPrint(row); }}
          style={{
            height: 30, padding: '0 14px', marginRight: 10, borderRadius: 8,
            border: open ? '1px solid rgba(255,255,255,0.4)' : '1px solid var(--border)',
            background: open ? 'rgba(255,255,255,0.15)' : 'var(--surface)', color: open ? '#fff' : 'var(--text)',
            fontSize: 12, fontWeight: 700, cursor: 'pointer'
          }}
        >
          🖨️ Print
        </button>
        <span onClick={onToggle} style={{ cursor: 'pointer', fontSize: 12, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>▾</span>
      </div>

      {open && (
        <div className={printing ? 'cf-print-target' : ''} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="cf-print-only" style={{ display: 'none' }}>
            <h1 style={{ margin: '0 0 2px 0', fontSize: 20, color: '#1b2a4a' }}>Cash Flow Report</h1>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 13, color: '#555', fontWeight: 'normal' }}>{label}</h2>
          </div>
          {/* Headline KPI strip */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {HERO_METRICS.map(([key, label, icon]) => (
              <div key={key} className="cf-kpi-card" style={{
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
          <div className="cf-panels-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {PANEL_GROUPS.map(group => (
              <div key={group.title} className="cf-panel-card" style={{
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
  const [month, setMonth] = useState('');
  const [openSet, setOpenSet] = useState(new Set());
  // YearMonth currently being printed -- drives the .cf-print-target CSS
  // (print current on-screen layout directly, no FastReport/report server).
  const [printingMonth, setPrintingMonth] = useState(null);

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

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(yearMonth) {
    setOpenSet(prev => {
      const next = new Set(prev);
      next.has(yearMonth) ? next.delete(yearMonth) : next.add(yearMonth);
      return next;
    });
  }

  // Prints the current on-screen panel layout for this month directly (no
  // FastReport/report server): expand the section if needed, mark it as the
  // print target, then trigger the browser print dialog once it's rendered.
  function handlePrint(row) {
    setOpenSet(prev => new Set(prev).add(row.YearMonth));
    setPrintingMonth(row.YearMonth);
  }

  useEffect(() => {
    if (printingMonth == null || !openSet.has(printingMonth)) return;
    const id = requestAnimationFrame(() => {
      window.print();
      setPrintingMonth(null);
    });
    return () => cancelAnimationFrame(id);
  }, [printingMonth, openSet]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', fontFamily: 'var(--font)', color: 'var(--text)' }}>
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
        ) : data.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No cash flow data found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.map(row => (
              <MonthSection
                key={row.YearMonth}
                row={row}
                open={openSet.has(row.YearMonth)}
                onToggle={() => toggle(row.YearMonth)}
                onPrint={handlePrint}
                printing={printingMonth === row.YearMonth}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body * { visibility: hidden; }
          .cf-print-target, .cf-print-target * { visibility: visible; }
          .cf-print-target {
            position: absolute; left: 0; top: 0; width: 100%;
            /* Redefine the theme's CSS vars to print-safe values -- fixes
               light-on-light / dark-on-dark text if printed from dark mode,
               since every color in this page is one of these vars, resolved
               fresh wherever var(...) is used, inline styles included. */
            --text: #111; --muted: #666; --border: #ddd;
            --bg: #fff; --surface: #fff; --soft: #f6f6f6;
            --red: #b91c1c; --green: #16a34a;
          }
          .cf-print-only { display: block !important; }
          .cf-panels-grid { gap: 10px !important; }
          .cf-panel-card, .cf-kpi-card { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
