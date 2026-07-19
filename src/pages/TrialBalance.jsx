import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiCall } from '../shared/api.js';
import FilterPanel from '../shared/FilterPanel.jsx';

function fmtAmt(val) {
  if (val == null || val === '') return '0.00';
  const n = Number(val);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return val;
  }
}

function fmtShortDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString();
  } catch (e) {
    return val;
  }
}

function exportStatementToExcel(account, startDate, endDate, summary, transactions) {
  const accountName = account ? `${account.AccountNumber} - ${account.AccountDescription}` : 'All Accounts';
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Account Statement</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; }
        .header-title { font-size: 16pt; font-weight: bold; color: #ea580c; font-family: sans-serif; }
        .meta-label { font-weight: bold; font-family: sans-serif; font-size: 10pt; background-color: #f3f4f6; }
        .meta-val { font-family: sans-serif; font-size: 10pt; }
        th { background-color: #ea580c; color: #ffffff; font-weight: bold; border: 1px solid #c2410c; padding: 10px 12px; font-family: sans-serif; font-size: 11pt; }
        td { border: 1px solid #e5e7eb; padding: 8px 10px; font-family: sans-serif; font-size: 10pt; }
        .text { mso-number-format: "\\@"; text-align: left; }
        .number { mso-number-format: "#,##0.00"; text-align: right; }
        .inflow { color: #16a34a; font-weight: bold; }
        .outflow { color: #dc2626; font-weight: bold; }
        .bold-row { font-weight: bold; background-color: #f9fafb; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="6" class="header-title">ACCOUNT STATEMENT</td></tr>
        <tr>
          <td class="meta-label">Account:</td>
          <td colspan="5" class="meta-val">${accountName}</td>
        </tr>
        <tr>
          <td class="meta-label">Date Range:</td>
          <td colspan="5" class="meta-val">${startDate || 'Beginning'} to ${endDate || 'Present'}</td>
        </tr>
        <tr><td colspan="6"></td></tr>
        <thead>
          <tr>
            <th>Date</th>
            <th>Reference / Details</th>
            <th>Event / Journal No</th>
            <th>Debit (Inflow)</th>
            <th>Credit (Outflow)</th>
            <th>Running Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr class="bold-row">
            <td></td>
            <td>Opening Balance</td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number">${Number(summary.openingBalance)}</td>
          </tr>
  `;

  transactions.forEach(tx => {
    const debit = Number(tx.DebitBook || 0);
    const credit = Number(tx.CreditBook || 0);
    html += `
      <tr>
        <td>${tx.JournalDate ? tx.JournalDate.split('T')[0] : ''}</td>
        <td class="text">${tx.LineDescription || ''} ${tx.Reference1 ? ' - Ref: ' + tx.Reference1 : ''}</td>
        <td class="text">EV-${tx.EventNo} / JN-${tx.JournalNo} (Line ${tx.Line})</td>
        <td class="number inflow">${debit > 0 ? debit : ''}</td>
        <td class="number outflow">${credit > 0 ? credit : ''}</td>
        <td class="number">${Number(tx.runningBalance)}</td>
      </tr>
    `;
  });

  html += `
          <tr class="bold-row">
            <td></td>
            <td>Closing Balance</td>
            <td></td>
            <td class="number inflow">${Number(summary.totalDebit)}</td>
            <td class="number outflow">${Number(summary.totalCredit)}</td>
            <td class="number">${Number(summary.closingBalance)}</td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Statement_${account?.AccountNumber || 'Account'}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportTrialBalanceToExcel(data, totals, startDate, endDate) {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <style>
        table { border-collapse: collapse; }
        .header-title { font-size: 16pt; font-weight: bold; color: #ea580c; font-family: sans-serif; }
        .meta-label { font-weight: bold; font-family: sans-serif; font-size: 10pt; background-color: #f3f4f6; }
        .meta-val { font-family: sans-serif; font-size: 10pt; }
        th { background-color: #ea580c; color: #ffffff; font-weight: bold; border: 1px solid #c2410c; padding: 10px 12px; font-family: sans-serif; font-size: 11pt; }
        td { border: 1px solid #e5e7eb; padding: 8px 10px; font-family: sans-serif; font-size: 10pt; }
        .text { mso-number-format: "\\@"; text-align: left; }
        .number { mso-number-format: "#,##0.00"; text-align: right; }
        .bold-row { font-weight: bold; background-color: #f9fafb; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="8" class="header-title">TRIAL BALANCE</td></tr>
        <tr>
          <td class="meta-label">Date Range:</td>
          <td colspan="7" class="meta-val">${startDate || 'Beginning'} to ${endDate || 'Present'}</td>
        </tr>
        <tr><td colspan="8"></td></tr>
        <thead>
          <tr>
            <th>Account No.</th>
            <th>Account Description</th>
            <th>Opening Debit</th>
            <th>Opening Credit</th>
            <th>Trx Debit</th>
            <th>Trx Credit</th>
            <th>Closing Debit</th>
            <th>Closing Credit</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach(r => {
    html += `
      <tr>
        <td class="text">${r.AccountNumber || ''}</td>
        <td class="text">${r.AccountDescription || ''}</td>
        <td class="number">${Number(r.OpeningDebitBook || 0)}</td>
        <td class="number">${Number(r.OpeningCreditBook || 0)}</td>
        <td class="number">${Number(r.DebitBook || 0)}</td>
        <td class="number">${Number(r.CreditBook || 0)}</td>
        <td class="number">${Number(r.DebitBalance || 0)}</td>
        <td class="number">${Number(r.CreditBalance || 0)}</td>
      </tr>
    `;
  });

  html += `
          <tr class="bold-row">
            <td colspan="2">TOTALS</td>
            <td class="number">${Number(totals.opDeb)}</td>
            <td class="number">${Number(totals.opCred)}</td>
            <td class="number">${Number(totals.txDeb)}</td>
            <td class="number">${Number(totals.txCred)}</td>
            <td class="number">${Number(totals.clDeb)}</td>
            <td class="number">${Number(totals.clCred)}</td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `TrialBalance_${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function TrialBalance({ user, def }) {
  const [activeFilters, setActiveFilters] = useState({
    account: '',
    startDate: (() => {
      const y = new Date().getFullYear();
      return `${y}-01-01`;
    })(),
    endDate: new Date().toISOString().split('T')[0],
    currency: '',
    fromCustomer: '', toCustomer: '',
    fromVendor: '', toVendor: '',
    fromBank: '', toBank: '',
    fromAsset: '', toAsset: '',
    fromEmployee: '', toEmployee: '',
    fromExpense: '', toExpense: ''
  });

  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayMode, setDisplayMode] = useState('compact');
  const [viewMode, setViewMode] = useState('statement');
  const [showBorders, setShowBorders] = useState(true);
  const [showExtraInfo, setShowExtraInfo] = useState(false);
  
  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerData, setDrawerData] = useState([]);
  const [drawerError, setDrawerError] = useState('');
  const [drawerTitle, setDrawerTitle] = useState('');
  
  const [activeDrawerTab, setActiveDrawerTab] = useState('journal_lines');
  const [drawerTbData, setDrawerTbData] = useState([]);
  const [drawerTbLoading, setDrawerTbLoading] = useState(false);
  const [drawerTbError, setDrawerTbError] = useState('');

  // Fetch statement data
  async function handleSearch(filterValues) {
    setActiveFilters(filterValues);
    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const d = await apiCall('Trial Balance', {
        param1: filterValues.account,
        currency: filterValues.currency,
        fromDate: filterValues.startDate,
        toDate: filterValues.endDate,
        fromCustomer: filterValues.fromCustomer,
        toCustomer: filterValues.toCustomer,
        fromVendor: filterValues.fromVendor,
        toVendor: filterValues.toVendor,
        fromBank: filterValues.fromBank,
        toBank: filterValues.toBank,
        fromAsset: filterValues.fromAsset,
        toAsset: filterValues.toAsset,
        fromEmployee: filterValues.fromEmployee,
        toEmployee: filterValues.toEmployee,
        fromExpense: filterValues.fromExpense,
        toExpense: filterValues.toExpense
      }, {
        User: user?.Username
      });

      if (d.State !== 0) {
        setError(d.Message || 'Failed to fetch statement records');
      } else {
        setRawData(d.List0 || []);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || 'Server connection error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRowClick(row) {
    setIsDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerError('');
    setDrawerData([]);
    setDrawerTbLoading(true);
    setDrawerTbError('');
    setDrawerTbData([]);
    setActiveDrawerTab('journal_lines');
    setDrawerTitle(`Details: ${row.AccountNumber} - ${row.AccountDescription} (${row.LineCurrency})`);

    try {
      const d = await apiCall('Account Statement Lines', {
        param1: row.AccountNumber,
        param2: activeFilters.startDate,
        param3: activeFilters.endDate,
        currency: row.LineCurrency,
        fromCustomer: row.Customer || '',
        toCustomer: '',
        fromVendor: row.Vendor || '',
        toVendor: '',
        fromBank: row.Bank || '',
        toBank: '',
        fromAsset: row.Asset || '',
        toAsset: '',
        fromEmployee: row.Employee || '',
        toEmployee: '',
        fromExpense: row.Expense || '',
        toExpense: ''
      }, { User: user?.Username });
      
      if (d.State !== 0) {
        setDrawerError(d.Message || 'Failed to fetch journal lines');
      } else {
        setDrawerData(d.List0 || []);
      }
    } catch (e) {
      console.error(e);
      setDrawerError(e.message || 'Server connection error');
    } finally {
      setDrawerLoading(false);
    }

    try {
      const dTb = await apiCall('Trial Balance', {
        param1: row.AccountNumber,
        currency: row.LineCurrency,
        fromDate: activeFilters.startDate,
        toDate: activeFilters.endDate,
        fromCustomer: row.Customer || '',
        toCustomer: '',
        fromVendor: row.Vendor || '',
        toVendor: '',
        fromBank: row.Bank || '',
        toBank: '',
        fromAsset: row.Asset || '',
        toAsset: '',
        fromEmployee: row.Employee || '',
        toEmployee: '',
        fromExpense: row.Expense || '',
        toExpense: ''
      }, { User: user?.Username });
      
      if (dTb.State !== 0) {
        setDrawerTbError(dTb.Message || 'Failed to fetch trial balance details');
      } else {
        setDrawerTbData(dTb.List0 || []);
      }
    } catch (e) {
      console.error(e);
      setDrawerTbError(e.message || 'Server connection error');
    } finally {
      setDrawerTbLoading(false);
    }
  }

  // Calculate opening balance, filter, and append running balances per active grouping entity
  // Calculate totals and apply inline text search
  const { filteredData, totals } = useMemo(() => {
    let filtered = rawData;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = rawData.filter(row => 
        String(row.AccountNumber || '').toLowerCase().includes(term) ||
        String(row.AccountDescription || '').toLowerCase().includes(term)
      );
    }

    const t = filtered.reduce((acc, row) => {
      acc.OpeningTransaction += Number(row.OpeningTransaction || 0);
      acc.DebitTransaction += Number(row.DebitTransaction || 0);
      acc.CreditTransaction += Number(row.CreditTransaction || 0);
      acc.ClosingTransaction += Number(row.ClosingTransaction || 0);
      acc.OpeningBook += Number(row.OpeningBook || 0);
      acc.DebitBook += Number(row.DebitBook || 0);
      acc.CreditBook += Number(row.CreditBook || 0);
      acc.ClosingBook += Number(row.ClosingBook || 0);
      return acc;
    }, { OpeningTransaction: 0, DebitTransaction: 0, CreditTransaction: 0, ClosingTransaction: 0, OpeningBook: 0, DebitBook: 0, CreditBook: 0, ClosingBook: 0 });

    return { filteredData: filtered, totals: t };
  }, [rawData, searchTerm]);

  return (
    <div className="flex-row-layout" style={{ flex: 1, minHeight: 0, minWidth: 0, height: '100%', gap: 16, position: 'relative' }}>
      {error && (
        <div className="err-page" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <FilterPanel
        filters={['account', 'date', 'currency', 'customer', 'vendor', 'bank', 'asset', 'employee', 'expense']}
        onSearch={handleSearch}
        loading={loading}
        user={user}
        defaultFilters={activeFilters}
      />

      {/* Right Side Data Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'auto' }}>
        {!hasSearched ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: 'var(--muted)',
            textAlign: 'center',
            padding: '64px 0',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px'
          }}>
            <span style={{ fontSize: '48px', marginBottom: 16 }}>📋</span>
            <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '16px', fontWeight: '700' }}>No Statement Generated Yet</h3>
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', maxWidth: '320px' }}>Select an account and date range, then click "Generate" to see details.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 16 }}>
          {/* Main Feed Container */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            boxShadow: 'var(--shadow)',
            padding: '24px',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}>
            {/* Toolbar: Search Filter */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Filter Input */}
              <div style={{ flex: 1, minWidth: '240px' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Filter trial balance by description or account no..."
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 16px',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    background: 'var(--soft)',
                    color: 'var(--text)',
                    outline: 'none',
                    fontFamily: 'var(--font)'
                  }}
                />
              </div>
              <button
                onClick={() => setShowExtraInfo(!showExtraInfo)}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  background: showExtraInfo ? 'var(--orange-dark)' : 'var(--surface)',
                  color: showExtraInfo ? '#fff' : 'var(--text)',
                  border: `1px solid ${showExtraInfo ? 'var(--orange-dark)' : 'var(--border)'}`,
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s'
                }}
              >
                {showExtraInfo ? 'Hide Extra Info' : 'Show Extra Info'}
              </button>
              
              <button
                onClick={() => exportTrialBalanceToExcel(filteredData, totals, activeFilters.startDate, activeFilters.endDate)}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  background: 'var(--success-bg, #ecfdf5)',
                  color: 'var(--success-text, #065f46)',
                  border: '1px solid var(--success-border, #a7f3d0)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s'
                }}
              >
                <span>📊</span> Export to Excel
              </button>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '8px' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
                  <svg width="38" height="38" viewBox="0 0 38 38" stroke="var(--orange)">
                    <g fill="none" fillRule="evenodd">
                      <g transform="translate(1 1)" strokeWidth="3">
                        <circle strokeOpacity=".2" cx="18" cy="18" r="18"/>
                        <path d="M36 18c0-9.94-8.06-18-18-18">
                          <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0 18 18"
                            to="360 18 18"
                            dur="1s"
                            repeatCount="indefinite"
                          />
                        </path>
                      </g>
                    </g>
                  </svg>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--muted)', letterSpacing: '0.5px' }}>Fetching trial balance...</div>
                </div>
              ) : filteredData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                  No accounts found matching the filter criteria.
                </div>
              ) : (
                <div style={{ 
                  background: 'var(--surface)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '16px', 
                  overflow: 'hidden' 
                }}>
                  {(() => {
                    const hasCustomer = activeFilters.fromCustomer || activeFilters.toCustomer;
                    const hasVendor = activeFilters.fromVendor || activeFilters.toVendor;
                    const hasBank = activeFilters.fromBank || activeFilters.toBank;
                    const hasAsset = activeFilters.fromAsset || activeFilters.toAsset;
                    const hasEmployee = activeFilters.fromEmployee || activeFilters.toEmployee;
                    const hasExpense = activeFilters.fromExpense || activeFilters.toExpense;
                    const hasCurrency = true;
                    
                    const colSpanBase = 2 + [hasCustomer, hasVendor, hasBank, hasAsset, hasEmployee, hasExpense, hasCurrency].filter(Boolean).length;

                    return (
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: 'var(--soft)', color: 'var(--muted)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                            <th style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>Account</th>
                            <th style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>Description</th>
                            {hasCustomer && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>Customer</th>}
                            {hasVendor && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>Vendor</th>}
                            {hasBank && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>Bank</th>}
                            {hasAsset && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>Asset</th>}
                            {hasEmployee && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>Employee</th>}
                            {hasExpense && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>Expense</th>}
                            {hasCurrency && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>Currency</th>}
                            {!showExtraInfo && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Opening</th>}
                            {!showExtraInfo && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Debit</th>}
                            {!showExtraInfo && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Credit</th>}
                            {!showExtraInfo && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Closing</th>}

                            {showExtraInfo && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--orange-dark)' }}>Opening Transaction</th>}
                            {showExtraInfo && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--orange-dark)' }}>Debit Transaction</th>}
                            {showExtraInfo && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--orange-dark)' }}>Credit Transaction</th>}
                            {showExtraInfo && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--orange-dark)' }}>Closing Transaction</th>}
                            
                            {/* Currency is rendered earlier if hasCurrency, but wait, Currency is usually among the groupers. If they want Currency right here, we should move it or just keep the grouping Currency. The user said: "Closing Transaction, Currency, Opening Book". Since Currency is already grouped, let's keep it in the grouping area but rename headers. Wait, I will just let the existing Currency column be, because it's already there before the balances. */}

                            {showExtraInfo && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--blue)' }}>Opening Book</th>}
                            {showExtraInfo && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--blue)' }}>Debit Book</th>}
                            {showExtraInfo && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--blue)' }}>Credit Book</th>}
                            {showExtraInfo && <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--blue)' }}>Closing Book</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredData.map((row, idx) => {
                            return (
                              <tr 
                                key={idx} 
                                onDoubleClick={() => handleRowClick(row)}
                                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s ease' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--soft)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <td style={{ padding: '16px', fontWeight: '700', color: 'var(--text)' }}>{row.AccountNumber}</td>
                                <td style={{ padding: '16px', color: 'var(--muted)' }}>{row.AccountDescription}</td>
                                {hasCustomer && <td style={{ padding: '16px', color: 'var(--text)' }}>{row.Customer} - {row.CustomerName}</td>}
                                {hasVendor && <td style={{ padding: '16px', color: 'var(--text)' }}>{row.Vendor} - {row.VendorName}</td>}
                                {hasBank && <td style={{ padding: '16px', color: 'var(--text)' }}>{row.Bank}</td>}
                                {hasAsset && <td style={{ padding: '16px', color: 'var(--text)' }}>{row.Asset} - {row.AssetName}</td>}
                                {hasEmployee && <td style={{ padding: '16px', color: 'var(--text)' }}>{row.Employee} - {row.EmployeeName}</td>}
                                {hasExpense && <td style={{ padding: '16px', color: 'var(--text)' }}>{row.Expense} - {row.ExpenseName}</td>}
                                {hasCurrency && <td style={{ padding: '16px', color: 'var(--text)' }}>{row.LineCurrency}</td>}
                                
                                {!showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600' }}>{fmtAmt(row.OpeningTransaction)}</td>}
                                {!showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--green)', fontWeight: '600' }}>{fmtAmt(row.DebitTransaction)}</td>}
                                {!showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--red)', fontWeight: '600' }}>{fmtAmt(row.CreditTransaction)}</td>}
                                {!showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', fontWeight: '800' }}>{fmtAmt(row.ClosingTransaction)}</td>}

                                {showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--orange-dark)', fontWeight: '600' }}>{fmtAmt(row.OpeningTransaction)}</td>}
                                {showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--orange-dark)', fontWeight: '600' }}>{fmtAmt(row.DebitTransaction)}</td>}
                                {showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--orange-dark)', fontWeight: '600' }}>{fmtAmt(row.CreditTransaction)}</td>}
                                {showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--orange-dark)', fontWeight: '600' }}>{fmtAmt(row.ClosingTransaction)}</td>}

                                {showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--blue)', fontWeight: '600' }}>{fmtAmt(row.OpeningBook)}</td>}
                                {showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--blue)', fontWeight: '600' }}>{fmtAmt(row.DebitBook)}</td>}
                                {showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--blue)', fontWeight: '600' }}>{fmtAmt(row.CreditBook)}</td>}
                                {showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--blue)', fontWeight: '600' }}>{fmtAmt(row.ClosingBook)}</td>}
                              </tr>
                            );
                          })}
                          <tr style={{ background: 'var(--soft)' }}>
                            <td colSpan={colSpanBase} style={{ padding: '16px', fontWeight: '900', color: 'var(--text)', textTransform: 'uppercase' }}>Total</td>
                            
                            {!showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', fontWeight: '800' }}>{fmtAmt(totals.OpeningTransaction)}</td>}
                            {!showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--green)', fontWeight: '800' }}>{fmtAmt(totals.DebitTransaction)}</td>}
                            {!showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--red)', fontWeight: '800' }}>{fmtAmt(totals.CreditTransaction)}</td>}
                            {!showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', fontWeight: '900', color: 'var(--text)' }}>{fmtAmt(totals.ClosingTransaction)}</td>}

                            {showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--orange-dark)', fontWeight: '800' }}>{fmtAmt(totals.OpeningTransaction)}</td>}
                            {showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--orange-dark)', fontWeight: '800' }}>{fmtAmt(totals.DebitTransaction)}</td>}
                            {showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--orange-dark)', fontWeight: '800' }}>{fmtAmt(totals.CreditTransaction)}</td>}
                            {showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--orange-dark)', fontWeight: '800' }}>{fmtAmt(totals.ClosingTransaction)}</td>}

                            {showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--blue)', fontWeight: '800' }}>{fmtAmt(totals.OpeningBook)}</td>}
                            {showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--blue)', fontWeight: '800' }}>{fmtAmt(totals.DebitBook)}</td>}
                            {showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--blue)', fontWeight: '800' }}>{fmtAmt(totals.CreditBook)}</td>}
                            {showExtraInfo && <td style={{ padding: '16px', textAlign: 'right', color: 'var(--blue)', fontWeight: '800' }}>{fmtAmt(totals.ClosingBook)}</td>}
                          </tr>
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>


        </div>
      )}
    </div>
    {/* Drawer for Journal Lines */}
    {isDrawerOpen && (
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '1200px',
        maxWidth: '100vw',
        background: 'var(--bg)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.3s ease'
      }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text)' }}>{drawerTitle}</h2>
          <button 
            onClick={() => setIsDrawerOpen(false)}
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--muted)' }}
          >×</button>
        </div>
        
        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)', padding: '0 24px' }}>
          <div
            onClick={() => setActiveDrawerTab('journal_lines')}
            style={{
              padding: '12px 24px',
              cursor: 'pointer',
              fontWeight: 'bold',
              color: activeDrawerTab === 'journal_lines' ? 'var(--orange-dark)' : 'var(--muted)',
              borderBottom: activeDrawerTab === 'journal_lines' ? '3px solid var(--orange)' : '3px solid transparent'
            }}
          >
            Journal Lines
          </div>
          <div
            onClick={() => setActiveDrawerTab('trial_balance_details')}
            style={{
              padding: '12px 24px',
              cursor: 'pointer',
              fontWeight: 'bold',
              color: activeDrawerTab === 'trial_balance_details' ? 'var(--orange-dark)' : 'var(--muted)',
              borderBottom: activeDrawerTab === 'trial_balance_details' ? '3px solid var(--orange)' : '3px solid transparent'
            }}
          >
            Trial Balance Details
          </div>
        </div>
        
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {activeDrawerTab === 'journal_lines' && (
            drawerLoading ? (
              <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>Loading journal lines...</div>
            ) : drawerError ? (
              <div style={{ color: 'var(--red)', textAlign: 'center', padding: '40px' }}>{drawerError}</div>
            ) : drawerData.length === 0 ? (
              <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>No journal lines found for this selection.</div>
            ) : (() => {
              const hasCustCol = drawerData.some(d => d.Customer);
              const hasVendCol = drawerData.some(d => d.Vendor);
              const hasBankCol = drawerData.some(d => d.Bank);
              const hasDrCrCol = drawerData.some(d => d.DebitorCreditor);
              const hasAssetCol = drawerData.some(d => d.Asset);
              const hasEmpCol = drawerData.some(d => d.Employee);
              const hasExpCol = drawerData.some(d => d.Expense);
              const totalDebit = drawerData.reduce((acc, row) => acc + (Number(row.DebitTransaction) || 0), 0);
              const totalCredit = drawerData.reduce((acc, row) => acc + (Number(row.CreditTransaction) || 0), 0);
              const balance = totalDebit - totalCredit;

              return (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>Total Debit</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--green)' }}>{fmtAmt(totalDebit)}</div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>Total Credit</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--red)' }}>{fmtAmt(totalCredit)}</div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>Net Balance</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)' }}>{fmtAmt(balance)}</div>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                  <tr style={{ color: 'var(--muted)', textTransform: 'uppercase', fontSize: '10px' }}>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Date</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Journal</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Description</th>
                    {hasCustCol && <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Customer</th>}
                    {hasVendCol && <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Vendor</th>}
                    {hasBankCol && <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Bank</th>}
                    {hasDrCrCol && <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Dr/Cr</th>}
                    {hasAssetCol && <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Asset</th>}
                    {hasEmpCol && <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Employee</th>}
                    {hasExpCol && <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Expense</th>}
                    <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Debit</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Credit</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Curr</th>
                  </tr>
                </thead>
                <tbody>
                  {drawerData.map((jd, jIdx) => (
                    <tr key={jIdx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{fmtShortDate(jd.JournalDate)}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{jd.JournalNo}</td>
                      <td style={{ padding: '12px', color: 'var(--muted)' }}>{jd.LineDescription}</td>
                      {hasCustCol && <td style={{ padding: '12px' }}>{jd.Customer ? `${jd.Customer} - ${jd.CustomerName}` : ''}</td>}
                      {hasVendCol && <td style={{ padding: '12px' }}>{jd.Vendor ? `${jd.Vendor} - ${jd.VendorName}` : ''}</td>}
                      {hasBankCol && <td style={{ padding: '12px' }}>{jd.Bank}</td>}
                      {hasDrCrCol && <td style={{ padding: '12px' }}>{jd.DebitorCreditor}</td>}
                      {hasAssetCol && <td style={{ padding: '12px' }}>{jd.Asset ? `${jd.Asset} - ${jd.AssetName}` : ''}</td>}
                      {hasEmpCol && <td style={{ padding: '12px' }}>{jd.Employee ? `${jd.Employee} - ${jd.EmployeeName}` : ''}</td>}
                      {hasExpCol && <td style={{ padding: '12px' }}>{jd.Expense ? `${jd.Expense} - ${jd.ExpenseName}` : ''}</td>}
                      <td style={{ padding: '12px', textAlign: 'right', color: 'var(--green)', fontWeight: '600' }}>{fmtAmt(jd.DebitTransaction)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: 'var(--red)', fontWeight: '600' }}>{fmtAmt(jd.CreditTransaction)}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{jd.LineCurrency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              );
            })()
          )}

          {activeDrawerTab === 'trial_balance_details' && (
            drawerTbLoading ? (
              <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>Loading trial balance details...</div>
            ) : drawerTbError ? (
              <div style={{ color: 'var(--red)', textAlign: 'center', padding: '40px' }}>{drawerTbError}</div>
            ) : drawerTbData.length === 0 ? (
              <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>No trial balance details found.</div>
            ) : (() => {
              const hasCustCol = drawerTbData.some(d => d.Customer);
              const hasVendCol = drawerTbData.some(d => d.Vendor);
              const hasBankCol = drawerTbData.some(d => d.Bank);
              const hasAssetCol = drawerTbData.some(d => d.Asset);
              const hasEmpCol = drawerTbData.some(d => d.Employee);
              const hasExpCol = drawerTbData.some(d => d.Expense);
              const totalOp = drawerTbData.reduce((acc, row) => acc + (Number(row.OpeningTransaction) || 0), 0);
              const totalDr = drawerTbData.reduce((acc, row) => acc + (Number(row.DebitTransaction) || 0), 0);
              const totalCr = drawerTbData.reduce((acc, row) => acc + (Number(row.CreditTransaction) || 0), 0);
              const totalCl = drawerTbData.reduce((acc, row) => acc + (Number(row.ClosingTransaction) || 0), 0);

              return (
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ color: 'var(--muted)', textTransform: 'uppercase', fontSize: '10px' }}>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Account</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Description</th>
                        {hasCustCol && <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Customer</th>}
                        {hasVendCol && <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Vendor</th>}
                        {hasBankCol && <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Bank</th>}
                        {hasAssetCol && <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Asset</th>}
                        {hasEmpCol && <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Employee</th>}
                        {hasExpCol && <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Expense</th>}
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Opening</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Debit</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Credit</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Closing</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--soft)', padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Curr</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drawerTbData.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{row.AccountNumber}</td>
                          <td style={{ padding: '12px', color: 'var(--muted)' }}>{row.AccountDescription}</td>
                          {hasCustCol && <td style={{ padding: '12px' }}>{row.Customer ? `${row.Customer} - ${row.CustomerName}` : ''}</td>}
                          {hasVendCol && <td style={{ padding: '12px' }}>{row.Vendor ? `${row.Vendor} - ${row.VendorName}` : ''}</td>}
                          {hasBankCol && <td style={{ padding: '12px' }}>{row.Bank}</td>}
                          {hasAssetCol && <td style={{ padding: '12px' }}>{row.Asset ? `${row.Asset} - ${row.AssetName}` : ''}</td>}
                          {hasEmpCol && <td style={{ padding: '12px' }}>{row.Employee ? `${row.Employee} - ${row.EmployeeName}` : ''}</td>}
                          {hasExpCol && <td style={{ padding: '12px' }}>{row.Expense ? `${row.Expense} - ${row.ExpenseName}` : ''}</td>}
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>{fmtAmt(row.OpeningTransaction)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: 'var(--green)', fontWeight: '600' }}>{fmtAmt(row.DebitTransaction)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: 'var(--red)', fontWeight: '600' }}>{fmtAmt(row.CreditTransaction)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800' }}>{fmtAmt(row.ClosingTransaction)}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>{row.LineCurrency}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'var(--soft)', fontWeight: 'bold' }}>
                        <td colSpan={2 + [hasCustCol, hasVendCol, hasBankCol, hasAssetCol, hasEmpCol, hasExpCol].filter(Boolean).length} style={{ padding: '12px', textAlign: 'right', textTransform: 'uppercase' }}>Total</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{fmtAmt(totalOp)}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: 'var(--green)' }}>{fmtAmt(totalDr)}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: 'var(--red)' }}>{fmtAmt(totalCr)}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{fmtAmt(totalCl)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()
          )}
        </div>
      </div>
    )}

  </div>
);
}
