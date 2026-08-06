import React, { useState } from 'react';
import DataGrid from '../shared/DataGrid';
import FilterPanel from '../shared/FilterPanel';
import { apiCall } from '../shared/api.js';

function fmtMoney(v) {
  const n = Number(v) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(v) {
  const n = Number(v) || 0;
  return n.toFixed(2) + '%';
}

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
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

  const columns = [
    { key: 'Year', label: 'Year', width: 80, numeric: true, render: v => String(v) },
    { key: 'Month', label: 'Month', width: 80, numeric: true, render: v => String(v) },
    { key: 'TotalCashPayable', label: 'Cash Payable', width: 140, numeric: true, render: fmtMoney },
    { key: 'TotalTransferPayable', label: 'Transfer Payable', width: 150, numeric: true, render: fmtMoney },
    { key: 'TotalCashReceivable', label: 'Cash Receivable', width: 150, numeric: true, render: fmtMoney },
    { key: 'TotalTransferReceivable', label: 'Transfer Receivable', width: 160, numeric: true, render: fmtMoney },
    { key: 'TotalVendorsPayment', label: 'Vendors Payment', width: 150, numeric: true, render: fmtMoney },
    { key: 'TotalCustomerPayment', label: 'Customer Payment', width: 150, numeric: true, render: fmtMoney },
    { key: 'TotalCustomerSales', label: 'Customer Sales', width: 150, numeric: true, render: fmtMoney },
    { key: 'CashState', label: 'Cash State', width: 130, numeric: true, render: fmtMoney },
    { key: 'Expenses', label: 'Expenses', width: 130, numeric: true, render: fmtMoney },
    { key: 'TotalCollection', label: 'Total Collection', width: 140, numeric: true, render: fmtMoney },
    { key: 'ExpensesRatio', label: 'Expenses Ratio', width: 120, numeric: true, render: fmtPct },
    { key: 'TotalVendorsInvoices', label: 'Vendors Invoices', width: 150, numeric: true, render: fmtMoney },
    { key: 'TreasuryCashEGP_Open', label: 'Treasury Cash (Open)', width: 160, numeric: true, render: fmtMoney },
    { key: 'BankCashEGP_Open', label: 'Bank Cash (Open)', width: 150, numeric: true, render: fmtMoney },
    { key: 'VendorBalance', label: 'Vendor Balance', width: 140, numeric: true, render: fmtMoney },
    { key: 'VendorOpenBalance', label: 'Vendor Open Balance', width: 160, numeric: true, render: fmtMoney },
    { key: 'CustomerOpenBalance', label: 'Customer Open Balance', width: 170, numeric: true, render: fmtMoney },
    { key: 'CustomerBalance', label: 'Customer Balance', width: 150, numeric: true, render: fmtMoney },
    { key: 'BankCashEGP', label: 'Bank Cash', width: 130, numeric: true, render: fmtMoney },
    { key: 'TreasuryCashEGP', label: 'Treasury Cash', width: 140, numeric: true, render: fmtMoney },
    { key: 'BankCashOpenYear', label: 'Bank Cash (Open Year)', width: 170, numeric: true, render: fmtMoney },
    { key: 'TreasuryCashOpenYear', label: 'Treasury Cash (Open Year)', width: 180, numeric: true, render: fmtMoney },
    { key: 'TotalCheckCollection', label: 'Check Collection', width: 150, numeric: true, render: fmtMoney },
    { key: 'TotalCheckPaid', label: 'Check Paid', width: 130, numeric: true, render: fmtMoney },
    { key: 'TotalDueCheck', label: 'Due Check', width: 130, numeric: true, render: fmtMoney },
    { key: 'YTDSales2025', label: 'YTD Sales 2025', width: 140, numeric: true, render: fmtMoney },
    { key: 'YTDSales2026', label: 'YTD Sales 2026', width: 140, numeric: true, render: fmtMoney },
    { key: 'YTDSalesGrowthPct', label: 'YTD Sales Growth', width: 140, numeric: true, render: fmtPct },
    { key: 'VendorPaymentRatio', label: 'Vendor Payment Ratio', width: 160, numeric: true, render: v => (Number(v) || 0).toFixed(2) },
    { key: 'CustomerBalanceGrowth', label: 'Customer Balance Growth', width: 180, numeric: true, render: fmtPct },
    { key: 'VendorBalanceGrowth', label: 'Vendor Balance Growth', width: 170, numeric: true, render: fmtPct },
    { key: 'CustomerModernSales', label: 'Customer Modern Sales', width: 170, numeric: true, render: fmtMoney },
    { key: 'WholeSales', label: 'Whole Sales', width: 130, numeric: true, render: fmtMoney },
    { key: 'CustomerPaymentYearly', label: 'Customer Payment (Yearly)', width: 180, numeric: true, render: fmtMoney },
    { key: 'TotalYearExpenses', label: 'Year Expenses', width: 140, numeric: true, render: fmtMoney },
    { key: 'TotalCustomerExtraDiscount', label: 'Customer Extra Discount', width: 180, numeric: true, render: fmtMoney },
    { key: 'TotalItemAmount', label: 'Item Amount', width: 130, numeric: true, render: fmtMoney },
    { key: 'TotalInvoiceDiscount', label: 'Invoice Discount', width: 150, numeric: true, render: fmtMoney },
    { key: 'TotalDueCustomerInvoices', label: 'Due Customer Invoices', width: 170, numeric: true, render: fmtMoney },
    { key: 'TotalDueVendorInvoices', label: 'Due Vendor Invoices', width: 160, numeric: true, render: fmtMoney }
  ];

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
        ) : (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <DataGrid
              rows={data}
              columns={columns}
              loading={loading}
              hideSearch
              onRefresh={loadData}
            />
          </div>
        )}
      </div>
    </div>
  );
}
