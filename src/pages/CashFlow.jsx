import React, { useState } from 'react';
import FilterPanel from '../shared/FilterPanel';
import { apiCall } from '../shared/api.js';

function fmtMoney(v) {
  const n = Number(v) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(v) {
  const n = Number(v) || 0;
  const color = n > 0 ? 'var(--green, #16a34a)' : n < 0 ? 'var(--red)' : 'var(--text)';
  const sign = n > 0 ? '+' : '';
  return <span style={{ color }}>{sign}{n.toFixed(2)}%</span>;
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

// Metric groups shown as data panels (not a grid table) -- each entry is
// [column key, label, formatter]. formatter defaults to fmtMoney.
const PANEL_GROUPS = [
  { title: 'Cash Position', icon: '🏦', items: [
    ['TreasuryCashEGP', 'Treasury Cash'], ['BankCashEGP', 'Bank Cash'],
    ['TreasuryCashEGP_Open', 'Treasury Cash (Open)'], ['BankCashEGP_Open', 'Bank Cash (Open)'],
    ['TreasuryCashOpenYear', 'Treasury Cash (Open Year)'], ['BankCashOpenYear', 'Bank Cash (Open Year)'],
    ['CashState', 'Cash State']
  ]},
  { title: 'Payables & Receivables', icon: '⚖️', items: [
    ['TotalCashPayable', 'Cash Payable'], ['TotalTransferPayable', 'Transfer Payable'],
    ['TotalCashReceivable', 'Cash Receivable'], ['TotalTransferReceivable', 'Transfer Receivable'],
    ['VendorBalance', 'Vendor Balance'], ['VendorOpenBalance', 'Vendor Open Balance'],
    ['CustomerBalance', 'Customer Balance'], ['CustomerOpenBalance', 'Customer Open Balance'],
    ['TotalDueVendorInvoices', 'Due Vendor Invoices'], ['TotalDueCustomerInvoices', 'Due Customer Invoices']
  ]},
  { title: 'Payments & Collections', icon: '💳', items: [
    ['TotalVendorsPayment', 'Vendors Payment'], ['TotalCustomerPayment', 'Customer Payment'],
    ['TotalCollection', 'Total Collection'], ['TotalCheckCollection', 'Check Collection'],
    ['TotalCheckPaid', 'Check Paid'], ['TotalDueCheck', 'Due Check'],
    ['CustomerPaymentYearly', 'Customer Payment (Yearly)']
  ]},
  { title: 'Sales', icon: '📈', items: [
    ['TotalCustomerSales', 'Customer Sales'], ['WholeSales', 'Whole Sales'],
    ['CustomerModernSales', 'Customer Modern Sales'], ['YTDSales2025', 'YTD Sales 2025'],
    ['YTDSales2026', 'YTD Sales 2026'], ['YTDSalesGrowthPct', 'YTD Sales Growth', fmtPct],
    ['TotalItemAmount', 'Item Amount'], ['TotalInvoiceDiscount', 'Invoice Discount'],
    ['TotalCustomerExtraDiscount', 'Customer Extra Discount']
  ]},
  { title: 'Expenses & Ratios', icon: '📊', items: [
    ['Expenses', 'Expenses'], ['TotalYearExpenses', 'Year Expenses'],
    ['ExpensesRatio', 'Expenses Ratio', fmtPct], ['VendorPaymentRatio', 'Vendor Payment Ratio', fmtRatio],
    ['CustomerBalanceGrowth', 'Customer Balance Growth', fmtPct], ['VendorBalanceGrowth', 'Vendor Balance Growth', fmtPct]
  ]},
  { title: 'Invoices', icon: '🧾', items: [
    ['TotalVendorsInvoices', 'Vendors Invoices']
  ]}
];

export default function CashFlow({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [month, setMonth] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiCall('GetGridData', { PageGroupID: 'cash_flow', month }, {}, 'plus');
      if (res.State === 0) {
        setData(res.List0 || []);
      } else {
        setError(res.Message || 'Failed to load Cash Flow data.');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {data.map(row => (
              <div key={row.YearMonth}>
                <h3 style={{
                  margin: '0 0 12px 0', fontSize: 15, fontWeight: 800, color: 'var(--text)',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  📅 {MONTHS.find(m => m.value === Number(row.Month))?.label || row.Month} {row.Year}
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {PANEL_GROUPS.map(group => (
                    <div key={group.title} style={{
                      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
                      boxShadow: 'var(--shadow)', overflow: 'hidden'
                    }}>
                      <div style={{
                        padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--soft)',
                        fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4,
                        display: 'flex', alignItems: 'center', gap: 6
                      }}>
                        <span>{group.icon}</span> {group.title}
                      </div>
                      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {group.items.map(([key, label, formatter]) => (
                          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{label}</span>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                              {(formatter || fmtMoney)(row[key])}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
