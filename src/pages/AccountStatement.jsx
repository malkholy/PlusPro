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

export default function AccountStatement({ user, def }) {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayMode, setDisplayMode] = useState('compact');
  const [viewMode, setViewMode] = useState('statement');
  const [showBorders, setShowBorders] = useState(true);

  // Instead of managing all state, we just keep track of the latest filters used for printing
  const [activeFilters, setActiveFilters] = useState({});

  const fetchAccountStatement = async (filters) => {
    setLoading(true);
    setError('');
    setHasSearched(true);
    setActiveFilters(filters);

    try {
      const d = await apiCall('Account Statement Lines', {
        param1: filters.account || '',
        currency: filters.currency || '',
        journalNo: filters.journalNo || '',
        param2: '',
        param3: filters.endDate || '',
        fromCustomer: filters.fromCustomer || '',
        toCustomer: filters.toCustomer || '',
        fromVendor: filters.fromVendor || '',
        toVendor: filters.toVendor || '',
        fromBank: filters.fromBank || '',
        toBank: filters.toBank || '',
        fromAsset: filters.fromAsset || '',
        toAsset: filters.toAsset || '',
        fromEmployee: filters.fromEmployee || '',
        toEmployee: filters.toEmployee || '',
        fromExpense: filters.fromExpense || '',
        toExpense: filters.toExpense || '',
        fromDebtor: filters.fromDebtor || '',
        toDebtor: filters.toDebtor || ''
      }, {
        User: user?.Username
      });

      if (d.State !== 0) {
        setError(d.Message || 'Failed to fetch statement records');
      } else {
        setRawData(d.List0 || []);
      }
    } catch (e) {
      setError('An error occurred while fetching statement. ' + e.message);
    } finally {
      setLoading(false);
    }
  };


  // Calculate opening balance, filter, and append running balances per active grouping entity
  const statementData = useMemo(() => {
    if (!rawData.length) {
      return { 
        transactions: [], 
        entityOpenings: {}, 
        entityClosingBalances: {}, 
        summary: { openingBalance: 0, totalDebit: 0, totalCredit: 0, totalDebitTransaction: 0, totalCreditTransaction: 0, netChange: 0, closingBalance: 0 }
      };
    }

    // Sort chronologically
    const sorted = [...rawData].sort((a, b) => {
      const dDiff = new Date(a.JournalDate) - new Date(b.JournalDate);
      if (dDiff !== 0) return dDiff;
      const jDiff = (a.JournalNo || '').localeCompare(b.JournalNo || '');
      if (jDiff !== 0) return jDiff;
      return (a.Line || 0) - (b.Line || 0);
    });

    const start = activeFilters.startDate ? new Date(activeFilters.startDate) : null;

    // Track running balance and opening balance per Customer/Vendor/General
    const entityBalances = {};
    const entityOpenings = {};
    const entityDebits = {};
    const entityCredits = {};

    let accountOpeningBalance = 0;
    let accountTotalDebit = 0;
    let accountTotalCredit = 0;
    let accountTotalDebitTransaction = 0;
    let accountTotalCreditTransaction = 0;

    const processedTransactions = [];

    sorted.forEach(row => {
      const debit = Number(row.DebitBook || 0);
      const credit = Number(row.CreditBook || 0);
      const net = debit - credit;

      const {
        fromCustomer: selectedFromCust, toCustomer: selectedToCust,
        fromVendor: selectedFromVendor, toVendor: selectedToVendor,
        fromBank: selectedFromBank, toBank: selectedToBank,
        fromAsset: selectedFromAsset, toAsset: selectedToAsset,
        fromEmployee: selectedFromEmployee, toEmployee: selectedToEmployee,
        fromExpense: selectedFromExpense, toExpense: selectedToExpense,
        fromDebtor: selectedFromDebtor, toDebtor: selectedToDebtor
      } = activeFilters;

      let keyParts = [];
      let codeParts = [];

      if (selectedFromCust || selectedToCust) {
        const val = row.Customer || 'General';
        const name = row.CustomerName ? ` - ${row.CustomerName}` : '';
        keyParts.push(`🏢 Customer: ${val}${name}`);
        codeParts.push(`CUST_${val}`);
      }
      if (selectedFromVendor || selectedToVendor) {
        const val = row.Vendor || 'General';
        const name = row.VendorName ? ` - ${row.VendorName}` : '';
        keyParts.push(`🏭 Vendor: ${val}${name}`);
        codeParts.push(`VEND_${val}`);
      }
      if (selectedFromBank || selectedToBank) {
        const val = row.Bank || 'General';
        keyParts.push(`🏦 Bank: ${val}`);
        codeParts.push(`BANK_${val}`);
      }
      if (selectedFromAsset || selectedToAsset) {
        const val = row.Asset || 'General';
        keyParts.push(`📦 Asset: ${val}`);
        codeParts.push(`AST_${val}`);
      }
      if (selectedFromEmployee || selectedToEmployee) {
        const val = row.Employee || 'General';
        keyParts.push(`👥 Employee: ${val}`);
        codeParts.push(`EMP_${val}`);
      }
      if (selectedFromExpense || selectedToExpense) {
        const val = row.Expense || 'General';
        keyParts.push(`💸 Expense: ${val}`);
        codeParts.push(`EXP_${val}`);
      }
      if (selectedFromDebtor || selectedToDebtor) {
        const val = row.DebitorCreditor || 'General';
        keyParts.push(`👥 Debtor: ${val}`);
        codeParts.push(`DR_${val}`);
      }

      if (keyParts.length === 0) {
        keyParts.push('General / Uncategorized');
        codeParts.push('General');
      }

      const entKey = codeParts.join('|');
      const sectionKey = keyParts.join(' | ');

      if (entityBalances[entKey] === undefined) {
        entityBalances[entKey] = 0;
        entityOpenings[entKey] = 0;
        entityDebits[entKey] = 0;
        entityCredits[entKey] = 0;
      }

      entityBalances[entKey] += net;

      const isBeforeStart = start && new Date(row.JournalDate) < start;

      if (isBeforeStart) {
        entityOpenings[entKey] += net;
        accountOpeningBalance += net;
      } else {
        accountTotalDebit += debit;
        accountTotalCredit += credit;
        accountTotalDebitTransaction += Number(row.DebitTransaction || 0);
        accountTotalCreditTransaction += Number(row.CreditTransaction || 0);
        entityDebits[entKey] += debit;
        entityCredits[entKey] += credit;
        processedTransactions.push({
          ...row,
          runningBalance: entityBalances[entKey],
          entKey,
          sectionKey
        });
      }
    });

    // Apply inline text search filtering if user types in search feed filter
    const finalTransactions = processedTransactions.filter(tx => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (tx.LineDescription || '').toLowerCase().includes(term) ||
             (tx.Reference1 || '').toLowerCase().includes(term) ||
             (tx.Reference2 || '').toLowerCase().includes(term) ||
             (tx.JournalNo || '').toLowerCase().includes(term) ||
             (tx.EventNo || '').toString().includes(term);
    });

    return {
      transactions: finalTransactions,
      entityOpenings,
      entityDebits,
      entityCredits,
      entityClosingBalances: entityBalances,
      summary: {
        openingBalance: accountOpeningBalance,
        totalDebit: accountTotalDebit,
        totalCredit: accountTotalCredit,
        totalDebitTransaction: accountTotalDebitTransaction,
        totalCreditTransaction: accountTotalCreditTransaction,
        netChange: accountTotalDebit - accountTotalCredit,
        closingBalance: accountOpeningBalance + accountTotalDebit - accountTotalCredit
      }
    };
  }, [rawData, activeFilters, searchTerm]);

  const summary = statementData.summary;
  const transactions = statementData.transactions;

  const groupedSections = useMemo(() => {
    const groups = {};
    transactions.forEach(item => {
      const key = item.sectionKey;
      if (!groups[key]) {
        groups[key] = {
          sectionKey: key,
          entityCode: item.entKey,
          items: []
        };
      }
      groups[key].items.push(item);
    });
    return Object.values(groups);
  }, [transactions]);


  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    exportStatementToExcel(
      { AccountNumber: activeFilters.account, AccountDescription: '' },
      activeFilters.startDate,
      activeFilters.endDate,
      summary,
      transactions
    );
  };

  return (
    <div className="flex-row-layout" style={{ height: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)', color: 'var(--text)' }}>
      <FilterPanel 
        filters={['account', 'date', 'currency', 'journalNo', 'customer', 'vendor', 'bank', 'asset', 'employee', 'expense', 'debtor']}
        pageGroupId="account_statement"
        onSearch={fetchAccountStatement}
        loading={loading}
        user={user}
        defaultFilters={{}}
      />
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
          {/* Summary KPIs Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {/* Opening Balance */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase' }}>Opening Balance</div>
              <div style={{ fontSize: '20px', fontWeight: '800', marginTop: 4, color: 'var(--text)' }}>
                {fmtAmt(statementData.summary.openingBalance)}
              </div>
            </div>

            {/* Inflow/Debit */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase' }}>Total Inflows (Debit)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--green)' }}>
                  +{fmtAmt(statementData.summary.totalDebit)} <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>Book</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--muted)' }}>
                  +{fmtAmt(statementData.summary.totalDebitTransaction)} <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>Trans</span>
                </div>
              </div>
            </div>

            {/* Outflow/Credit */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase' }}>Total Outflows (Credit)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--red)' }}>
                  -{fmtAmt(statementData.summary.totalCredit)} <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>Book</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--muted)' }}>
                  -{fmtAmt(statementData.summary.totalCreditTransaction)} <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>Trans</span>
                </div>
              </div>
            </div>

            {/* Net Change */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase' }}>Net Change</div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '800', 
                marginTop: 4, 
                color: statementData.summary.netChange >= 0 ? 'var(--green)' : 'var(--red)' 
              }}>
                {statementData.summary.netChange >= 0 ? '+' : ''}{fmtAmt(statementData.summary.netChange)}
              </div>
            </div>

            {/* Closing Balance */}
            <div style={{
              background: 'linear-gradient(135deg, var(--orange-glow), rgba(249,115,22,0.05))',
              border: '1.5px solid var(--orange)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 2px 4px rgba(249,115,22,0.05)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--orange2)', textTransform: 'uppercase' }}>Closing Balance</div>
              <div style={{ fontSize: '22px', fontWeight: '900', marginTop: 4, color: 'var(--text)' }}>
                {fmtAmt(statementData.summary.closingBalance)}
              </div>
            </div>
          </div>

          {/* Statement Feed Container */}
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
            {/* Toolbar: Search Filter & Display Mode Toggles */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* View Toggle Buttons */}
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: 'var(--soft)', padding: 4, borderRadius: '12px' }}>
                <button
                  onClick={() => setViewMode('statement')}
                  style={{
                    height: '32px',
                    padding: '0 16px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: viewMode === 'statement' ? 'var(--surface)' : 'transparent',
                    color: viewMode === 'statement' ? 'var(--orange2)' : 'var(--muted)',
                    boxShadow: viewMode === 'statement' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Statement
                </button>
                <button
                  onClick={() => setViewMode('trial_balance')}
                  style={{
                    height: '32px',
                    padding: '0 16px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: viewMode === 'trial_balance' ? 'var(--surface)' : 'transparent',
                    color: viewMode === 'trial_balance' ? 'var(--orange2)' : 'var(--muted)',
                    boxShadow: viewMode === 'trial_balance' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Trial Balance
                </button>
              </div>

              {/* Filter Input */}
              <div style={{ flex: 1, minWidth: '240px' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Filter statement lines by description, reference, journal no, etc..."
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

              {/* View Toggle Buttons */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {displayMode === 'compact' && (
                  <button
                    onClick={() => setShowBorders(prev => !prev)}
                    style={{
                      height: '38px',
                      padding: '0 16px',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      background: showBorders ? 'rgba(249,115,22,0.08)' : 'var(--surface)',
                      color: showBorders ? 'var(--orange-dark)' : 'var(--text)',
                      borderColor: showBorders ? 'var(--orange)' : 'var(--border)',
                      transition: 'all 0.15s ease',
                      fontFamily: 'var(--font)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {showBorders ? '🌐 Grid borders: ON' : '⚪ Grid borders: OFF'}
                  </button>
                )}

                <div style={{ display: 'flex', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px', gap: '3px' }}>
                  {[
                    { id: 'compact', label: '📊 Compact List' },
                    { id: 'feed', label: '📋 Timeline Feed' }
                  ].map(opt => {
                    const isActive = displayMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setDisplayMode(opt.id)}
                        style={{
                          height: '32px',
                          padding: '0 16px',
                          border: 'none',
                          borderRadius: '7px',
                          fontSize: '12px',
                          fontWeight: isActive ? '700' : '600',
                          cursor: 'pointer',
                          background: isActive ? 'linear-gradient(135deg, var(--orange), var(--orange-dark))' : 'var(--surface)',
                          color: isActive ? '#fff' : 'var(--text)',
                          boxShadow: isActive ? '0 2px 4px rgba(249,115,22,0.2)' : 'none',
                          transition: 'all 0.15s ease',
                          fontFamily: 'var(--font)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
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
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--muted)', letterSpacing: '0.5px' }}>Fetching statement transactions...</div>
                </div>
              ) : viewMode === 'trial_balance' ? (
                <div style={{ 
                  background: 'var(--surface)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '16px', 
                  overflow: 'hidden' 
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--soft)', color: 'var(--muted)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                        <th style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>Entity</th>
                        <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Opening</th>
                        <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Debit</th>
                        <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Credit</th>
                        <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Closing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedSections.map((group, idx) => {
                        const openBal = statementData.entityOpenings[group.entityCode] || 0;
                        const deb = statementData.entityDebits[group.entityCode] || 0;
                        const cred = statementData.entityCredits[group.entityCode] || 0;
                        const closeBal = statementData.entityClosingBalances[group.entityCode] || 0;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '16px', fontWeight: '700', color: 'var(--text)' }}>{group.sectionKey}</td>
                            <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600' }}>{fmtAmt(openBal)}</td>
                            <td style={{ padding: '16px', textAlign: 'right', color: 'var(--green)', fontWeight: '600' }}>{fmtAmt(deb)}</td>
                            <td style={{ padding: '16px', textAlign: 'right', color: 'var(--red)', fontWeight: '600' }}>{fmtAmt(cred)}</td>
                            <td style={{ padding: '16px', textAlign: 'right', fontWeight: '800' }}>{fmtAmt(closeBal)}</td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: 'var(--soft)' }}>
                        <td style={{ padding: '16px', fontWeight: '900', color: 'var(--text)', textTransform: 'uppercase' }}>Total</td>
                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: '800' }}>{fmtAmt(statementData.summary.openingBalance)}</td>
                        <td style={{ padding: '16px', textAlign: 'right', color: 'var(--green)', fontWeight: '800' }}>{fmtAmt(statementData.summary.totalDebit)}</td>
                        <td style={{ padding: '16px', textAlign: 'right', color: 'var(--red)', fontWeight: '800' }}>{fmtAmt(statementData.summary.totalCredit)}</td>
                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: '900', color: 'var(--orange2)' }}>{fmtAmt(statementData.summary.closingBalance)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : groupedSections.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                  No transactions found matching the filter criteria.
                </div>
              ) : displayMode === 'compact' ? (
                /* 📊 COMPACT HIGH-DENSITY LEDGER SHEET VIEW */
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  width: '100%',
                  border: showBorders ? '1px solid var(--border)' : 'none',
                  borderRadius: showBorders ? '12px' : '0',
                  overflow: 'hidden'
                }}>
                  {/* Dense Sticky Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'var(--soft)',
                    borderBottom: '2px solid var(--border)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    fontWeight: '800',
                    fontSize: '12px',
                    color: 'var(--muted)',
                    textTransform: 'uppercase'
                  }}>
                    <div style={{ width: '90px', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>Date</div>
                    <div style={{ width: '190px', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingLeft: showBorders ? '8px' : '0', paddingRight: showBorders ? '8px' : '0' }}>Ref / Journal</div>
                    <div style={{ flex: 1, textAlign: 'center', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingLeft: showBorders ? '8px' : '0', paddingRight: showBorders ? '8px' : '0' }}>Description</div>
                    <div style={{ width: '110px', textAlign: 'right', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>Debit Trans</div>
                    <div style={{ width: '110px', textAlign: 'right', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>Credit Trans</div>
                    <div style={{ width: '70px', textAlign: 'center', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingLeft: showBorders ? '8px' : '0', paddingRight: showBorders ? '8px' : '0' }}>Currency</div>
                    <div style={{ width: '80px', textAlign: 'right', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>Rate</div>
                    <div style={{ width: '110px', textAlign: 'right', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>Debit Book</div>
                    <div style={{ width: '110px', textAlign: 'right', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>Credit Book</div>
                    <div style={{ width: '120px', textAlign: 'right', paddingLeft: showBorders ? '8px' : '0' }}>Balance</div>
                  </div>

                  {/* 2. Grouped Sections */}
                  {groupedSections.map((group, gIdx) => {
                    const groupDebit = group.items.reduce((sum, item) => sum + Number(item.DebitBook || 0), 0);
                    const groupCredit = group.items.reduce((sum, item) => sum + Number(item.CreditBook || 0), 0);

                    return (
                      <React.Fragment key={group.sectionKey}>
                        {/* Group Header Row */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'var(--soft)',
                          borderBottom: '1px solid var(--border)',
                          fontWeight: '800',
                          fontSize: '13px',
                          color: 'var(--orange-dark)',
                          letterSpacing: '0.5px'
                        }}>
                          <span style={{ marginRight: 8 }}></span>
                          {group.sectionKey} 
                          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600', marginLeft: 8 }}>
                            ({group.items.length} {group.items.length === 1 ? 'record' : 'records'})
                          </span>
                        </div>

                        {/* Group Opening Balance Row */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '6px 12px',
                          borderBottom: '1px solid var(--border)',
                          background: 'rgba(249,115,22,0.02)',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: 'var(--text)'
                        }}>
                          <div style={{ width: '90px', color: 'var(--muted)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>—</div>
                          <div style={{ width: '190px', color: 'var(--muted)', fontFamily: 'var(--mono)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingLeft: showBorders ? '8px' : '0', paddingRight: showBorders ? '8px' : '0' }}>OPENING</div>
                          <div style={{ flex: 1, textAlign: 'center', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingLeft: showBorders ? '8px' : '0', paddingRight: showBorders ? '8px' : '0' }}>
                            Opening Balance for this section
                          </div>
                          <div style={{ width: '110px', borderRight: showBorders ? '1px solid var(--border)' : 'none' }}></div>
                          <div style={{ width: '110px', borderRight: showBorders ? '1px solid var(--border)' : 'none' }}></div>
                          <div style={{ width: '70px', borderRight: showBorders ? '1px solid var(--border)' : 'none' }}></div>
                          <div style={{ width: '80px', borderRight: showBorders ? '1px solid var(--border)' : 'none' }}></div>
                          <div style={{ width: '110px', borderRight: showBorders ? '1px solid var(--border)' : 'none' }}></div>
                          <div style={{ width: '110px', borderRight: showBorders ? '1px solid var(--border)' : 'none' }}></div>
                          <div style={{ width: '120px', textAlign: 'right', fontFamily: 'var(--mono)', paddingLeft: showBorders ? '8px' : '0' }}>
                            {fmtAmt(statementData.entityOpenings[group.entityCode] || 0)}
                          </div>
                        </div>

                        {/* Group Items */}
                        {group.items.map((item, idx) => {
                          const isDebit = Number(item.DebitBook || 0) > 0;
                          const amount = isDebit ? Number(item.DebitBook || 0) : Number(item.CreditBook || 0);

                          return (
                            <div 
                              key={`${item.JournalNo}_${item.Line}_${idx}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '6px 12px',
                                borderBottom: '1px solid var(--border)',
                                background: idx % 2 === 0 ? 'transparent' : 'var(--soft)',
                                fontSize: '12.5px',
                                color: 'var(--text)',
                                transition: 'background 0.1s ease'
                              }}
                              className="ledger-row-compact"
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--orange-glow)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'var(--soft)'}
                            >
                              {/* Date */}
                              <div style={{ width: '90px', fontSize: '12px', color: 'var(--muted)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>
                                {item.JournalDate ? item.JournalDate.split('T')[0] : '—'}
                              </div>
                              
                              {/* Ref / Journal */}
                              <div style={{ 
                                width: '190px', 
                                fontSize: '11.5px', 
                                color: 'var(--muted)', 
                                fontFamily: 'var(--mono)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                borderRight: showBorders ? '1px solid var(--border)' : 'none',
                                paddingLeft: showBorders ? '8px' : '0',
                                paddingRight: showBorders ? '8px' : '0'
                              }}>
                                EV-{item.EventNo}/JN-{item.JournalNo}
                              </div>
                              
                              {/* Description */}
                              <div style={{ 
                                flex: 1, 
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                borderRight: showBorders ? '1px solid var(--border)' : 'none',
                                paddingLeft: showBorders ? '8px' : '0',
                                paddingRight: showBorders ? '8px' : '0'
                              }}>
                                {item.LineDescription || 'No description'}
                                {item.CustomerName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.CustomerName})</span>}
                                {item.VendorName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.VendorName})</span>}
                                {item.EmployeeName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.EmployeeName})</span>}
                                {item.AssetName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.AssetName})</span>}
                                {item.ExpenseName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.ExpenseName})</span>}
                                {item.Reference1 && <span style={{ color: 'var(--muted)', fontSize: '11px', marginLeft: 8 }}>(Ref: {item.Reference1})</span>}
                              </div>
                              
                              {/* Debit Trans (transaction currency) */}
                              <div style={{
                                width: '110px',
                                textAlign: 'right',
                                fontWeight: '600',
                                color: 'var(--green)',
                                fontFamily: 'var(--mono)',
                                borderRight: showBorders ? '1px solid var(--border)' : 'none',
                                paddingRight: showBorders ? '8px' : '0'
                              }}>
                                {Number(item.DebitTransaction || 0) > 0 ? fmtAmt(item.DebitTransaction) : ''}
                              </div>

                              {/* Credit Trans (transaction currency) */}
                              <div style={{
                                width: '110px',
                                textAlign: 'right',
                                fontWeight: '600',
                                color: 'var(--red)',
                                fontFamily: 'var(--mono)',
                                borderRight: showBorders ? '1px solid var(--border)' : 'none',
                                paddingRight: showBorders ? '8px' : '0'
                              }}>
                                {Number(item.CreditTransaction || 0) > 0 ? fmtAmt(item.CreditTransaction) : ''}
                              </div>

                              {/* Currency */}
                              <div style={{
                                width: '70px',
                                textAlign: 'center',
                                fontSize: '11.5px',
                                color: 'var(--muted)',
                                fontFamily: 'var(--mono)',
                                borderRight: showBorders ? '1px solid var(--border)' : 'none',
                                paddingLeft: showBorders ? '8px' : '0',
                                paddingRight: showBorders ? '8px' : '0'
                              }}>
                                {item.LineCurrency || '—'}
                              </div>

                              {/* Exchange Rate */}
                              <div style={{
                                width: '80px',
                                textAlign: 'right',
                                fontSize: '11.5px',
                                color: 'var(--muted)',
                                fontFamily: 'var(--mono)',
                                borderRight: showBorders ? '1px solid var(--border)' : 'none',
                                paddingRight: showBorders ? '8px' : '0'
                              }}>
                                {item.LineExchangeRate != null ? item.LineExchangeRate : '—'}
                              </div>

                              {/* Debit Book */}
                              <div style={{
                                width: '110px',
                                textAlign: 'right',
                                fontWeight: '700',
                                color: 'var(--green)',
                                fontFamily: 'var(--mono)',
                                borderRight: showBorders ? '1px solid var(--border)' : 'none',
                                paddingRight: showBorders ? '8px' : '0'
                              }}>
                                {isDebit ? fmtAmt(amount) : ''}
                              </div>

                              {/* Credit Book */}
                              <div style={{
                                width: '110px',
                                textAlign: 'right',
                                fontWeight: '700',
                                color: 'var(--red)',
                                fontFamily: 'var(--mono)',
                                borderRight: showBorders ? '1px solid var(--border)' : 'none',
                                paddingRight: showBorders ? '8px' : '0'
                              }}>
                                {!isDebit ? fmtAmt(amount) : ''}
                              </div>

                              {/* Running Balance */}
                              <div style={{ 
                                width: '120px', 
                                textAlign: 'right', 
                                fontWeight: '700',
                                fontFamily: 'var(--mono)',
                                color: 'var(--text)',
                                paddingLeft: showBorders ? '8px' : '0'
                              }}>
                                {fmtAmt(item.runningBalance)}
                              </div>
                            </div>
                          );
                        })}

                        {/* Group Subtotal Row */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '6px 12px',
                          borderBottom: '1.5px solid var(--border)',
                          background: 'rgba(0,0,0,0.01)',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: 'var(--muted)'
                        }}>
                          <div style={{ width: '90px', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>—</div>
                          <div style={{ width: '190px', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingLeft: showBorders ? '8px' : '0', paddingRight: showBorders ? '8px' : '0' }}></div>
                          <div style={{ flex: 1, textAlign: 'right', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: '12px', textTransform: 'uppercase' }}>Subtotal:</div>
                          <div style={{ width: '110px', borderRight: showBorders ? '1px solid var(--border)' : 'none' }}></div>
                          <div style={{ width: '110px', borderRight: showBorders ? '1px solid var(--border)' : 'none' }}></div>
                          <div style={{ width: '70px', borderRight: showBorders ? '1px solid var(--border)' : 'none' }}></div>
                          <div style={{ width: '80px', borderRight: showBorders ? '1px solid var(--border)' : 'none' }}></div>
                          <div style={{ width: '110px', textAlign: 'right', color: 'var(--green)', fontFamily: 'var(--mono)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>
                            {groupDebit > 0 ? `+${fmtAmt(groupDebit)}` : ''}
                          </div>
                          <div style={{ width: '110px', textAlign: 'right', color: 'var(--red)', fontFamily: 'var(--mono)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>
                            {groupCredit > 0 ? `-${fmtAmt(groupCredit)}` : ''}
                          </div>
                          <div style={{ width: '120px', textAlign: 'right', fontFamily: 'var(--mono)', paddingLeft: showBorders ? '8px' : '0', color: 'var(--orange-dark)', fontWeight: '800' }}>
                            Closing: {fmtAmt(statementData.entityClosingBalances[group.entityCode] || 0)}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {/* 3. Closing Balance Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderTop: '2px solid var(--border)',
                    background: 'var(--orange-soft)',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    color: 'var(--text)'
                  }}>
                    <div style={{ width: '90px', color: 'var(--muted)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>—</div>
                    <div style={{ width: '190px', color: 'var(--muted)', fontFamily: 'var(--mono)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingLeft: showBorders ? '8px' : '0', paddingRight: showBorders ? '8px' : '0' }}>CLOSING</div>
                    <div style={{ flex: 1, textAlign: 'center', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingLeft: showBorders ? '8px' : '0', paddingRight: showBorders ? '8px' : '0' }}>Closing Balance period summary</div>
                    <div style={{ width: '110px', borderRight: showBorders ? '1px solid var(--border)' : 'none' }}></div>
                    <div style={{ width: '110px', borderRight: showBorders ? '1px solid var(--border)' : 'none' }}></div>
                    <div style={{ width: '70px', borderRight: showBorders ? '1px solid var(--border)' : 'none' }}></div>
                    <div style={{ width: '80px', borderRight: showBorders ? '1px solid var(--border)' : 'none' }}></div>
                    <div style={{ width: '110px', textAlign: 'right', color: 'var(--green)', fontFamily: 'var(--mono)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>
                      +{fmtAmt(statementData.summary.totalDebit)}
                    </div>
                    <div style={{ width: '110px', textAlign: 'right', color: 'var(--red)', fontFamily: 'var(--mono)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>
                      -{fmtAmt(statementData.summary.totalCredit)}
                    </div>
                    <div style={{ width: '120px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--orange-dark)', fontSize: '13.5px', paddingLeft: showBorders ? '8px' : '0' }}>
                      {fmtAmt(statementData.summary.closingBalance)}
                    </div>
                  </div>
                </div>
              ) : (
                /* 📋 TIMELINE FEED VIEW (ORIGINAL LAYOUT) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Opening balance indicator at start of timeline */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    background: 'var(--soft)',
                    borderRadius: '12px',
                    borderLeft: '4px solid var(--orange)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '16px' }}>🏁</span>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text)' }}>Opening Balance</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Starting checkpoint balance for the statement period</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)' }}>
                      {fmtAmt(statementData.summary.openingBalance)}
                    </div>
                  </div>

                  {/* Section groups in Feed view */}
                  {groupedSections.map(group => (
                    <div key={group.sectionKey} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Heading Header */}
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '800',
                        color: 'var(--orange2)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '2px solid var(--border)',
                        paddingBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <span>🏷️</span>
                        <span>{group.sectionKey}</span>
                      </div>

                      {/* Items loop */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {group.items.map((item, i) => {
                          const isDebit = Number(item.DebitBook || 0) > 0;
                          const amount = isDebit ? Number(item.DebitBook || 0) : Number(item.CreditBook || 0);

                          return (
                            <div 
                              key={`${item.JournalNo}_${item.Line}_${i}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                padding: '12px 16px',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                background: 'var(--surface)',
                                transition: 'all 0.15s ease',
                                cursor: 'default'
                              }}
                              className="statement-item-card"
                            >
                              {/* Left Arrow Icon */}
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isDebit ? 'var(--green-soft)' : 'var(--red-soft)',
                                color: isDebit ? 'var(--green)' : 'var(--red)',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                flexShrink: 0
                              }}>
                                <span style={{ margin: 'auto' }}>{isDebit ? '↓' : '↑'}</span>
                              </div>

                              {/* Center Meta Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ 
                                  fontSize: '13.5px', 
                                  fontWeight: '700', 
                                  color: 'var(--text)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis' 
                                }}>
                                  {item.LineDescription || 'No description provided'}
                                  {item.CustomerName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.CustomerName})</span>}
                                  {item.VendorName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.VendorName})</span>}
                                  {item.EmployeeName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.EmployeeName})</span>}
                                  {item.AssetName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.AssetName})</span>}
                                  {item.ExpenseName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.ExpenseName})</span>}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4, alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--soft)', padding: '2px 6px', borderRadius: '4px' }}>
                                    EV-{item.EventNo} / JN-{item.JournalNo}
                                  </span>
                                  {item.Reference1 && (
                                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                      Ref: <strong>{item.Reference1}</strong>
                                    </span>
                                  )}
                                  {item.LineCreatedBy && (
                                    <span style={{ fontSize: '11px', color: 'var(--hint)' }}>
                                      By: {item.LineCreatedBy}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Exchange details (if foreign currency) */}
                              {item.LineCurrency !== 'SYP' && (
                                <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>
                                  {item.LineCurrency} @ {item.LineExchangeRate}
                                  {/* Contextual Sub-labels */}
                                  {item.CustomerName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.CustomerName})</span>}
                                  {item.VendorName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.VendorName})</span>}
                                  {item.EmployeeName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.EmployeeName})</span>}
                                  {item.AssetName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.AssetName})</span>}
                                  {item.ExpenseName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.ExpenseName})</span>}
                                </div>
                              )}

                              {/* Right side amounts */}
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ 
                                  fontSize: '15px', 
                                  fontWeight: '800', 
                                  color: isDebit ? 'var(--green)' : 'var(--red)' 
                                }}>
                                  {isDebit ? '+' : '-'}{fmtAmt(amount)}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: 2 }}>
                                  Bal: <strong>{fmtAmt(item.runningBalance)}</strong>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Closing balance checkpoint at end of timeline */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, var(--orange-glow), rgba(249,115,22,0.03))',
                    borderRadius: '12px',
                    borderLeft: '4px solid var(--orange)',
                    marginTop: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '16px' }}>🏁</span>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text)' }}>Closing Balance</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Final checkpoint balance for the statement period</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text)' }}>
                      {fmtAmt(statementData.summary.closingBalance)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
