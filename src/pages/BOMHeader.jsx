import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import BOMDrawer from './BOMDrawer.jsx';

function fmtQty(val) {
  if (val == null || val === '') return '0.00';
  const n = Number(val);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function exportToExcel(data, prodRate, fileName = 'BOM_Headers_L1.xls') {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>BOM L1 Headers</x:Name>
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
            <th>Parent Item ID</th>
            <th>Parent Item Code</th>
            <th>Item Type</th>
            <th>Item Description</th>
            <th>Batch Qty</th>
            <th>Total Cost</th>
            <th>Unit Cost</th>
            <th>Final Cost (${prodRate}%)</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach(item => {
    html += `
      <tr>
        <td class="text">${item.ParentItemID || ''}</td>
        <td class="text">${item.ParentItemCode || ''}</td>
        <td>${item.ItemType || ''}</td>
        <td>${item.ItemDescription || ''}</td>
        <td class="number">${Number(item.BatchQty || 0)}</td>
        <td class="number">${Number(item.TotalCost || 0)}</td>
        <td class="number">${Number(item.UnitCost || 0)}</td>
        <td class="number">${Number(item.FinalCost || 0)}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function BOMHeader({ user, def }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [prodRate, setProdRate] = useState(35); // Default value 35%
  const [selectedParentCode, setSelectedParentCode] = useState(null);
  const [selectedParentDesc, setSelectedParentDesc] = useState(null);
  const [selectedParentUnitCost, setSelectedParentUnitCost] = useState(0);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const d = await apiCall('BOM L1 Header', null, { User: user?.Username });
      if (d.State !== 0) {
        setError(d.Message || 'Failed to fetch BOM L1 headers');
        setData([]);
      } else {
        setData(d.List0 || []);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [user]);

  const columns = [
    { key: 'ParentItemID', label: 'Parent Item ID', type: 'number', sortable: true, filterable: true, width: 140 },
    { 
      key: 'ParentItemCode', 
      label: 'Parent Item Code', 
      type: 'string', 
      sortable: true, 
      filterable: true, 
      width: 180,
      render: (val, row) => (
        <span style={{ 
          color: row?.HasMissingCost === 1 ? '#ef4444' : 'var(--text)', 
          fontWeight: row?.HasMissingCost === 1 ? '700' : 'normal',
          fontFamily: 'var(--mono)'
        }}>
          {val}
        </span>
      )
    },
    { key: 'ItemType', label: 'Item Type', type: 'string', sortable: true, filterable: true, width: 140 },
    { key: 'ItemDescription', label: 'Item Description', type: 'string', sortable: true, filterable: true, width: 280 },
    { key: 'BatchQty', label: 'Batch Qty', type: 'number', sortable: true, filterable: true, align: 'right', width: 140, render: (val) => fmtQty(val) },
    {
      key: 'TotalCost',
      label: 'Total Cost',
      type: 'number',
      sortable: true,
      filterable: true,
      align: 'right',
      width: 155,
      render: (val, row) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', width: '100%' }}>
          {row?.HasMissingCost === 1 && (
            <span 
              title="Warning: Some component lines are missing cost values!" 
              style={{ color: '#ef4444', cursor: 'help', fontSize: '13px', display: 'inline-flex', alignItems: 'center' }}
            >
              ⚠️
            </span>
          )}
          <span>{fmtQty(val)}</span>
        </span>
      )
    },
    {
      key: 'UnitCost',
      label: 'Unit Cost',
      type: 'number',
      sortable: true,
      filterable: true,
      align: 'right',
      width: 140,
      render: (val, row) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', width: '100%' }}>
          {row?.HasMissingCost === 1 && (
            <span 
              title="Warning: Some component lines are missing cost values!" 
              style={{ color: '#ef4444', cursor: 'help', fontSize: '13px', display: 'inline-flex', alignItems: 'center' }}
            >
              ⚠️
            </span>
          )}
          <span>{fmtQty(val)}</span>
        </span>
      )
    },
    {
      key: 'FinalCost',
      label: 'Final Cost',
      type: 'number',
      sortable: true,
      filterable: true,
      align: 'right',
      width: 145,
      render: (val) => (
        <span style={{ fontWeight: '700', color: 'var(--orange)' }}>
          {fmtQty(val)}
        </span>
      )
    }
  ];

  const itemTypes = ['All', ...new Set(data.map(item => item.ItemType).filter(Boolean))];

  const filteredData = data.filter(item => {
    if (typeFilter !== 'All' && item.ItemType !== typeFilter) return false;
    return true;
  });

  // Calculate FinalCost dynamically per row based on current Production Rate
  const rowsWithFinalCost = filteredData.map(item => ({
    ...item,
    FinalCost: Number(item.UnitCost || 0) * (1 + prodRate / 100)
  }));

  const totalItems = filteredData.length;
  const totalBatchQty = filteredData.reduce((acc, curr) => acc + Number(curr.BatchQty || 0), 0);
  const grandTotalCost = filteredData.reduce((acc, curr) => acc + Number(curr.TotalCost || 0), 0);
  const grandFinalCost = rowsWithFinalCost.reduce((acc, curr) => acc + (Number(curr.FinalCost || 0) * Number(curr.BatchQty || 0)), 0);
  const uniqueTypes = new Set(data.map(item => item.ItemType).filter(Boolean)).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="page-header">
        <div>
          <div className="page-title">{def?.icon || '📄'} {def?.label || 'BOM Header'}</div>
          <div className="page-sub">{def?.desc || 'View level 1 Bill of Material Headers'}</div>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : '🔄 Refresh'}
          </button>
          <button className="btn-primary" onClick={() => exportToExcel(rowsWithFinalCost, prodRate)} disabled={!rowsWithFinalCost.length}>
            📤 Export Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Parents</div>
          <div className="kpi-value">{totalItems.toLocaleString()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Unique Item Types</div>
          <div className="kpi-value" style={{ color: 'var(--blue)' }}>{uniqueTypes.toLocaleString()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Batch Qty</div>
          <div className="kpi-value" style={{ color: 'var(--orange)' }}>{fmtQty(totalBatchQty)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Grand Total Cost</div>
          <div className="kpi-value" style={{ color: 'var(--hint)' }}>{fmtQty(grandTotalCost)}</div>
        </div>
        <div className="kpi-card" style={{ background: 'var(--orange-soft)', borderColor: 'rgba(249,115,22,0.2)' }}>
          <div className="kpi-label" style={{ color: 'var(--orange)' }}>Grand Final Cost</div>
          <div className="kpi-value" style={{ color: 'var(--orange-dark)' }}>{fmtQty(grandFinalCost)}</div>
        </div>
      </div>

      {error && (
        <div className="err-page">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Control panel (Filter by Type & Production Rate Input) */}
      {data.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {/* Item Type filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Item Type:</span>
            <div style={{ display: 'flex', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px', gap: '3px' }}>
              {itemTypes.map(type => {
                const isActive = typeFilter === type;
                return (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    style={{
                      height: '32px',
                      padding: '0 16px',
                      border: 'none',
                      borderRadius: '7px',
                      fontSize: '13px',
                      fontWeight: isActive ? '700' : '600',
                      cursor: 'pointer',
                      background: isActive ? 'linear-gradient(135deg, var(--orange), var(--orange-dark))' : 'var(--surface)',
                      color: isActive ? '#fff' : 'var(--text)',
                      boxShadow: isActive ? '0 2px 4px rgba(249,115,22,0.2)' : 'none',
                      transition: 'all 0.15s ease',
                      fontFamily: 'var(--font)'
                    }}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Production Rate Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Production Rate:</span>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px' }}>
              <input
                type="number"
                value={prodRate}
                onChange={(e) => setProdRate(Number(e.target.value))}
                style={{
                  width: '70px',
                  height: '32px',
                  border: 'none',
                  background: 'var(--surface)',
                  borderRadius: '7px',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: 'var(--text)',
                  outline: 'none',
                  fontFamily: 'var(--font)'
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: '700', padding: '0 10px', color: 'var(--muted)' }}>%</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, marginTop: 16 }}>
        <DataGrid
          title="BOM L1 Headers"
          columns={columns}
          rows={rowsWithFinalCost}
          loading={loading}
          onRefresh={load}
          onRowClick={(row) => {
            setSelectedParentCode(row.ParentItemCode);
            setSelectedParentDesc(row.ItemDescription);
            setSelectedParentUnitCost(row.UnitCost || 0);
          }}
        />
      </div>

      {selectedParentCode && (
        <BOMDrawer
          parentItemCode={selectedParentCode}
          parentItemDescription={selectedParentDesc}
          parentUnitCost={selectedParentUnitCost}
          prodRate={prodRate}
          onClose={() => {
            setSelectedParentCode(null);
            setSelectedParentDesc(null);
            setSelectedParentUnitCost(0);
          }}
        />
      )}
    </div>
  );
}
