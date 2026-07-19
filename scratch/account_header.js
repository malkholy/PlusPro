import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiCall } from '../shared/api.js';

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

