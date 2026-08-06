import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

const REPORT_API_BASE = 'https://sila.silasystem.com:7102/api/reports';
// PLS.ReportsMaster ReportID (seeded by RegisterCashFlowReport.sql).
const CASH_FLOW_REPORT_ID = 5;

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
    ['TotalDueVendorInvoices', 'Due Vendor Invoices'], ['TotalDueCustomerInvoices', 'Due Customer Invoices']
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

function MonthSection({ row, open, onToggle, onPrint }) {
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
  const [month, setMonth] = useState('');
  const [openSet, setOpenSet] = useState(new Set());
  const [reportPreviewUrl, setReportPreviewUrl] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [printRow, setPrintRow] = useState(null);

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

  function handlePrint(row) {
    setPrintRow(row);
    setReportLoading(true);
    setReportPreviewUrl(`${REPORT_API_BASE}/${CASH_FLOW_REPORT_ID}/${row.YearMonth}`);
  }

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
              <MonthSection key={row.YearMonth} row={row} open={openSet.has(row.YearMonth)} onToggle={() => toggle(row.YearMonth)} onPrint={handlePrint} />
            ))}
          </div>
        )}
      </div>

      {reportPreviewUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '90vw', height: '92vh', background: 'var(--bg)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '14px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                Cash Flow Report — {MONTHS.find(m => m.value === Number(printRow?.Month))?.label} {printRow?.Year}
              </h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <a
                  href={`${reportPreviewUrl}/download`}
                  download={`CashFlow_${printRow?.YearMonth}.pdf`}
                  style={{
                    height: 32, padding: '0 16px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                    color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', textDecoration: 'none'
                  }}
                >
                  ⬇ Download
                </a>
                <button
                  onClick={() => { setReportPreviewUrl(null); setReportLoading(false); setPrintRow(null); }}
                  style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: 'var(--soft)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              {reportLoading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#fff', zIndex: 1 }}>
                  <div className="spinner"></div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>Generating report…</div>
                </div>
              )}
              <iframe
                src={reportPreviewUrl}
                title="Cash Flow Report Preview"
                onLoad={() => setReportLoading(false)}
                style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
