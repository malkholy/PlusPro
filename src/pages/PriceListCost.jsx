import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import BOMDrawer from './BOMDrawer.jsx';

function fmtQty(val) {
  if (val == null || val === '') return '0.00';
  const n = Number(val);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function exportToExcel(data, prodRate, discount, fileName = 'Price_List_Cost_Analysis.xls') {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Price List Cost</x:Name>
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
            <th>Price List</th>
            <th>Selling UM</th>
            <th>Selling Price</th>
            <th>Selling Conversion</th>
            <th>Unit Price</th>
            <th>Raw Cost</th>
            <th>Final Cost (${prodRate}%)</th>
            <th>Net Price (${discount}%)</th>
            <th>Profit</th>
            <th>Profit Margin</th>
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
        <td>${item.PriceTypeDescription || ''}</td>
        <td>${item.SellingUM || ''}</td>
        <td class="number">${Number(item.PriceSellingUnit || 0)}</td>
        <td class="number">${Number(item.SellingConversion || 1)}</td>
        <td class="number">${Number(item.UnitPrice || 0)}</td>
        <td class="number">${Number(item.RawCost || 0)}</td>
        <td class="number">${Number(item.FinalCost || 0)}</td>
        <td class="number">${Number(item.NetPrice || 0)}</td>
        <td class="number">${Number(item.Profit || 0)}</td>
        <td class="number">${Number(item.Margin || 0)}%</td>
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

export default function PriceListCost({ user, def }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prodRate, setProdRate] = useState(35); // Default production rate 35%
  const [discount, setDiscount] = useState(25); // Default discount 25%
  const [priceTypeFilter, setPriceTypeFilter] = useState('All'); // Price List filter state
  const [costStatusFilter, setCostStatusFilter] = useState('All'); // 'All' or 'Errors'
  const [selectedParentCode, setSelectedParentCode] = useState(null);
  const [selectedParentDesc, setSelectedParentDesc] = useState(null);
  const [selectedParentUnitCost, setSelectedParentUnitCost] = useState(0);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const d = await apiCall('BOM L1 Price Lists All', null, { User: user?.Username });
      if (d.State !== 0) {
        setError(d.Message || 'Failed to fetch price list costs');
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
    {
      key: 'ItemCode',
      label: 'Item Code',
      type: 'string',
      sortable: true,
      filterable: true,
      width: 160,
      render: (val, row) => {
        const hasErr = row.HasMissingCost === 1 || Number(row.RawCost || 0) === 0;
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
    { key: 'ItemType', label: 'Type', type: 'string', sortable: true, filterable: true, width: 90 },
    { key: 'PriceTypeDescription', label: 'Price List', type: 'string', sortable: true, filterable: true, width: 180 },
    { key: 'SellingUM', label: 'UM', type: 'string', sortable: true, filterable: true, width: 90 },
    { key: 'PriceSellingUnit', label: 'Selling Price', type: 'number', sortable: true, filterable: true, align: 'right', width: 130, render: (val) => fmtQty(val) },
    { key: 'SellingConversion', label: 'Selling Conversion', type: 'number', sortable: true, filterable: true, align: 'right', width: 140, render: (val) => fmtQty(val) },
    { key: 'UnitPrice', label: 'Unit Price', type: 'number', sortable: true, filterable: true, align: 'right', width: 120, render: (val) => fmtQty(val) },
    {
      key: 'RawCost',
      label: 'Raw Cost',
      type: 'number',
      sortable: true,
      filterable: true,
      align: 'right',
      width: 120,
      render: (val, row) => {
        const hasErr = row.HasMissingCost === 1 || Number(row.RawCost || 0) === 0;
        const msg = row.HasMissingCost === 1 ? "Warning: Component(s) inside this BOM have 0 or missing costs" : "Warning: Cost is 0";
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {fmtQty(val)}
            {hasErr && <span title={msg} style={{ cursor: 'help' }}>⚠️</span>}
          </span>
        );
      }
    },
    {
      key: 'FinalCost',
      label: 'Final Cost',
      type: 'number',
      sortable: true,
      filterable: true,
      align: 'right',
      width: 130,
      render: (val, row) => {
        const hasErr = row.HasMissingCost === 1 || Number(row.RawCost || 0) === 0;
        const msg = row.HasMissingCost === 1 ? "Warning: Component(s) inside this BOM have 0 or missing costs" : "Warning: Cost is 0";
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--orange-dark)', fontWeight: '700' }}>
            {fmtQty(val)}
            {hasErr && <span title={msg} style={{ cursor: 'help' }}>⚠️</span>}
          </span>
        );
      }
    },
    { key: 'NetPrice', label: 'Net Price', type: 'number', sortable: true, filterable: true, align: 'right', width: 130, render: (val) => <span style={{ color: 'var(--orange)', fontWeight: '700' }}>{fmtQty(val)}</span> },
    {
      key: 'Profit',
      label: 'Profit',
      type: 'number',
      sortable: true,
      filterable: true,
      align: 'right',
      width: 120,
      render: (val) => {
        const isPos = Number(val) >= 0;
        return (
          <span style={{ color: isPos ? 'var(--green)' : 'var(--red)', fontWeight: '800' }}>
            {fmtQty(val)}
          </span>
        );
      }
    },
    {
      key: 'Margin',
      label: 'Margin',
      type: 'number',
      sortable: true,
      filterable: true,
      align: 'right',
      width: 120,
      render: (val) => {
        const isPos = Number(val) >= 0;
        return (
          <span style={{ color: isPos ? 'var(--green)' : 'var(--red)', fontWeight: '800' }}>
            {Number(val).toFixed(1)}%
          </span>
        );
      }
    }
  ];

  // Dynamically map and filter table rows with real-time calculations
  const rowsWithCalculations = data
    .filter(item => {
      // 1. Price List filter
      if (priceTypeFilter !== 'All' && item.PriceTypeDescription !== priceTypeFilter) return false;
      
      // 2. Costing Errors filter
      if (costStatusFilter === 'Errors') {
        const hasErr = item.HasMissingCost === 1 || Number(item.RawCost || 0) === 0;
        if (!hasErr) return false;
      }
      
      return true;
    })
    .map(item => {
      const rawCost = Number(item.RawCost || 0);
      const unitPrice = Number(item.UnitPrice || 0);
      const finalCost = rawCost * (1 + prodRate / 100);
      const netPrice = unitPrice * (1 - discount / 100);
      const profit = netPrice - finalCost;
      const margin = netPrice > 0 ? (profit / netPrice) * 100 : 0;
      return {
        ...item,
        FinalCost: finalCost,
        NetPrice: netPrice,
        Profit: profit,
        Margin: margin
      };
    });

  // Extract unique price lists from data for filter buttons
  const priceTypes = ['All', ...new Set(data.map(item => item.PriceTypeDescription).filter(Boolean))];

  const totalRecords = rowsWithCalculations.length;
  const profitableCount = rowsWithCalculations.filter(r => r.Profit >= 0).length;
  const lossCount = rowsWithCalculations.filter(r => r.Profit < 0).length;
  const avgMargin = totalRecords > 0 
    ? rowsWithCalculations.reduce((acc, curr) => acc + curr.Margin, 0) / totalRecords
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="page-header">
        <div>
          <div className="page-title">{def?.icon || '📊'} {def?.label || 'Price List Cost'}</div>
          <div className="page-sub">{def?.desc || 'Compare selling price lists, production costs, and profit margins'}</div>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : '🔄 Refresh'}
          </button>
          <button className="btn-primary" onClick={() => exportToExcel(rowsWithCalculations, prodRate, discount)} disabled={!rowsWithCalculations.length}>
            📤 Export Excel
          </button>
        </div>
      </div>


      {error && (
        <div className="err-page">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Control panel (PriceType filter, Production Rate & Discount inputs) */}
      {data.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filter Bar: Price List & Costing Status Side by Side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
            {/* Price List Filter Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Price List:</span>
              <div style={{ display: 'flex', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px', gap: '3px', flexWrap: 'wrap' }}>
                {priceTypes.map(type => {
                  const isActive = priceTypeFilter === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setPriceTypeFilter(type)}
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

            {/* Costing Status Filter Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Costing Status:</span>
              <div style={{ display: 'flex', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px', gap: '3px' }}>
                {[
                  { id: 'All', label: 'All Items' },
                  { id: 'Errors', label: '⚠️ Costing Errors' }
                ].map(opt => {
                  const isActive = costStatusFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setCostStatusFilter(opt.id)}
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
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
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

            {/* Discount Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Discount:</span>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px' }}>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  style={{
                    width: '60px',
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
                <span style={{ fontSize: '13px', fontWeight: '700', padding: '0 8px', color: 'var(--muted)' }}>%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, marginTop: 16 }}>
        <DataGrid
          title="All Price List Costs"
          columns={columns}
          rows={rowsWithCalculations}
          loading={loading}
          onRefresh={load}
          onRowClick={(row) => {
            if (row) {
              setSelectedParentCode(row.ItemCode);
              setSelectedParentDesc(row.ItemDescription);
              setSelectedParentUnitCost(row.RawCost || 0);
            }
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
