import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

function fmtQty(val) {
  if (val == null || val === '') return '0.00';
  const n = Number(val);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return val;
  }
}

function exportToExcel(data, fileName = 'Item_Cost_Summary_Report.xls') {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Item Cost Summary</x:Name>
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
        th { background-color: #ea580c; color: #ffffff; font-weight: bold; border: 1px solid #c2410c; padding: 10px 12px; font-family: sans-serif; font-size: 11pt; }
        td { border: 1px solid #e5e7eb; padding: 8px 10px; font-family: sans-serif; font-size: 10pt; }
        .text { mso-number-format: "\\@"; text-align: left; }
        .number { mso-number-format: "#,##0.00"; text-align: right; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Item Code</th>
            <th>Item Description</th>
            <th>Item Type</th>
            <th>Max Cost</th>
            <th>Min Cost</th>
            <th>Last Cost</th>
            <th>Average Cost</th>
            <th>Total Qty</th>
            <th>Total Amount</th>
            <th>Calculation Date</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach(item => {
    html += `
      <tr>
        <td class="text">${item.ItemCode || ''}</td>
        <td>${item.ItemDescription || ''}</td>
        <td>${item.ItemType || ''}</td>
        <td class="number">${Number(item.MaxCost || 0)}</td>
        <td class="number">${Number(item.MinCost || 0)}</td>
        <td class="number">${Number(item.LastCost || 0)}</td>
        <td class="number">${Number(item.AverageCost || 0)}</td>
        <td class="number">${Number(item.TotalQty || 0)}</td>
        <td class="number">${Number(item.TotalAmount || 0)}</td>
        <td>${fmtDate(item.CalculationDate)}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function ItemCostSummary({ user, def }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const d = await apiCall('Item Cost Summary All', null, { User: user?.Username });
      if (d.State !== 0) {
        setError(d.Message || 'Failed to fetch item cost summary');
      } else {
        setData(d.List0 || []);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || 'Server connection error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user]);

  const columns = [
    {
      key: 'ItemCode',
      label: 'Item Code',
      type: 'string',
      sortable: true,
      filterable: true,
      width: 170,
      render: (val, row) => {
        const hasErr = Number(row.LastCost || 0) === 0;
        return (
          <span style={{ 
            fontFamily: 'var(--mono)', 
            fontWeight: 800, 
            color: hasErr ? 'var(--red)' : 'inherit' 
          }}>
            {val}
          </span>
        );
      }
    },
    { key: 'ItemDescription', label: 'Item Description', type: 'string', sortable: true, filterable: true, width: 240 },
    { key: 'ItemType', label: 'Item Type', type: 'string', sortable: true, filterable: true, width: 100 },
    { key: 'MaxCost', label: 'Max Cost', type: 'number', sortable: true, filterable: true, align: 'right', width: 120, render: (val) => fmtQty(val) },
    { key: 'MinCost', label: 'Min Cost', type: 'number', sortable: true, filterable: true, align: 'right', width: 120, render: (val) => fmtQty(val) },
    {
      key: 'LastCost',
      label: 'Last Cost',
      type: 'number',
      sortable: true,
      filterable: true,
      align: 'right',
      width: 120,
      render: (val, row) => {
        const hasErr = Number(val || 0) === 0;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: '700', color: hasErr ? 'var(--red)' : 'inherit' }}>
            {fmtQty(val)}
            {hasErr && <span title="Warning: Cost is 0" style={{ cursor: 'help' }}>⚠️</span>}
          </span>
        );
      }
    },
    { key: 'AverageCost', label: 'Average Cost', type: 'number', sortable: true, filterable: true, align: 'right', width: 130, render: (val) => fmtQty(val) },
    { key: 'TotalQty', label: 'Total Qty', type: 'number', sortable: true, filterable: true, align: 'right', width: 120, render: (val) => fmtQty(val) },
    { key: 'TotalAmount', label: 'Total Amount', type: 'number', sortable: true, filterable: true, align: 'right', width: 140, render: (val) => fmtQty(val) },
    { key: 'CalculationDate', label: 'Calculation Date', type: 'date', sortable: true, filterable: true, width: 150, render: (val) => fmtDate(val) }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="page-header">
        <div>
          <div className="page-title">{def?.icon || '💰'} {def?.label || 'Item Cost Summary'}</div>
          <div className="page-sub">{def?.desc || 'Manage and review detailed item costing metrics'}</div>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : '🔄 Refresh'}
          </button>
          <button className="btn-primary" onClick={() => exportToExcel(data)} disabled={!data.length}>
            📤 Export Excel
          </button>
        </div>
      </div>

      {error && (
        <div className="err-page">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, marginTop: 16 }}>
        <DataGrid
          title="Item Costs"
          columns={columns}
          rows={data}
          loading={loading}
          onRefresh={load}
        />
      </div>
    </div>
  );
}
