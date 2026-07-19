import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

function fmtQty(val) {
  if (val == null || val === '') return '—';
  const n = Number(val);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return sign + (abs / 1_000_000_000).toFixed(2).replace(/\.00$/, '') + 'B';
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(2).replace(/\.00$/, '') + 'K';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPrice(val, currency) {
  if (val == null || val === 0 || val === '') return '—';
  const n = Number(val);
  const formatted = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${formatted} ${currency}` : formatted;
}

function fmtDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    if (d.getFullYear() <= 1900) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (e) {
    return '—';
  }
}

function exportToExcel(data, fileName = 'RawPacking_Inventory.xls') {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Raw & Packing</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </WorksheetOptions>
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
        .center { text-align: center; }
        .number { mso-number-format: "#,##0.00"; text-align: right; }
        .date { mso-number-format: "YYYY\\-MM\\-DD"; text-align: center; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Item Code</th>
            <th>Type</th>
            <th>Item Extra Description</th>
            <th>Balance</th>
            <th>Last Price</th>
            <th>Last Invoice Date</th>
            <th>Amount</th>
            <th>Amount (EGP)</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach(item => {
    const balance = Number(item.ItemBalance || 0);
    const price = Number(item.LastPrice || 0);
    const amount = Number(item.ItemAmount || 0);
    const amountEGP = Number(item.ItemAmountEGP || 0);
    const dateStr = item.LastInvoiceDate 
      ? new Date(item.LastInvoiceDate).toISOString().split('T')[0]
      : '';

    html += `
      <tr>
        <td class="text">${item.ItemCode || ''}</td>
        <td class="center">${item.ItemType || ''}</td>
        <td>${item.ItemExtraDescription || ''}</td>
        <td class="number">${balance}</td>
        <td class="number">${price} ${item.LastCurrency || ''}</td>
        <td class="date">${dateStr}</td>
        <td class="number">${amount} ${item.LastCurrency || ''}</td>
        <td class="number">${amountEGP}</td>
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

function getItemTypeLabel(type) {
  if (type === 'ALL') return 'All Types';
  if (type === 'R') return 'Raw Materials (R)';
  if (type === 'P') return 'Packing (P)';
  if (type === 'N/A') return 'Not Assigned';
  return `Type ${type}`;
}

function TypeBadge({ type }) {
  const isRaw = type === 'R';
  const isPack = type === 'P';
  const bg = isRaw ? 'var(--blue-soft)' : isPack ? 'var(--amber-soft)' : 'var(--soft)';
  const color = isRaw ? 'var(--blue)' : isPack ? 'var(--amber)' : 'var(--muted)';
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: '6px',
      background: bg,
      color: color,
      border: `0.5px solid ${isRaw ? 'rgba(37,99,235,0.15)' : isPack ? 'rgba(217,119,6,0.15)' : 'var(--border)'}`
    }}>
      {type}
    </span>
  );
}

export default function RawPacking({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('ALL'); // 'ALL', 'R', 'P', 'OTHERS'
  const [sortField, setSortField] = useState('ItemCode'); // 'ItemCode', 'ItemType', 'ItemExtraDescription', 'ItemBalance', 'LastPrice', 'LastInvoiceDate', 'ItemAmount', 'ItemAmountEGP'
  const [sortAsc, setSortAsc] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const d = await apiCall('Get Raw and Packing Details', null, { User: user.Username });
      if (d.State !== 0) {
        setError(d.Message || 'Access Denied');
        setItems([]);
      } else {
        setItems(d.List0 || []);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [user]);

  // Filter items based on search query and item type
  const filteredItems = items.filter(item => {
    // 1. Search filter
    const code = (item.ItemCode || '').toLowerCase();
    const desc = (item.ItemExtraDescription || '').toLowerCase();
    const matchesSearch = code.includes(search.toLowerCase()) || desc.includes(search.toLowerCase());

    // 2. Type filter
    const matchesType = 
      activeType === 'ALL' ||
      (activeType === 'R' && item.ItemType === 'R') ||
      (activeType === 'P' && item.ItemType === 'P') ||
      (activeType === 'OTHERS' && item.ItemType !== 'R' && item.ItemType !== 'P');

    return matchesSearch && matchesType;
  });

  // Sort helper function
  function handleSort(field) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'ItemBalance' || sortField === 'LastPrice' || sortField === 'ItemAmount' || sortField === 'ItemAmountEGP') {
      valA = Number(valA || 0);
      valB = Number(valB || 0);
    } else if (sortField === 'LastInvoiceDate') {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    } else {
      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Calculate KPIs
  const totalUniqueItems = filteredItems.length;
  const positiveStockSum = filteredItems
    .filter(item => Number(item.ItemBalance || 0) > 0)
    .reduce((sum, item) => sum + Number(item.ItemBalance || 0), 0);
  const negativeStockSum = filteredItems
    .filter(item => Number(item.ItemBalance || 0) < 0)
    .reduce((sum, item) => sum + Number(item.ItemBalance || 0), 0);

  const rawCount = filteredItems.filter(item => item.ItemType === 'R').length;
  const packCount = filteredItems.filter(item => item.ItemType === 'P').length;
  const othersCount = filteredItems.filter(item => item.ItemType !== 'R' && item.ItemType !== 'P').length;

  const itemsWithoutPriceCount = filteredItems.filter(item => !item.LastPrice || Number(item.LastPrice) === 0).length;

  const rawValueEGP = filteredItems
    .filter(item => item.ItemType === 'R')
    .reduce((sum, item) => sum + Number(item.ItemAmountEGP || 0), 0);
  const packValueEGP = filteredItems
    .filter(item => item.ItemType === 'P')
    .reduce((sum, item) => sum + Number(item.ItemAmountEGP || 0), 0);
  const othersValueEGP = filteredItems
    .filter(item => item.ItemType !== 'R' && item.ItemType !== 'P')
    .reduce((sum, item) => sum + Number(item.ItemAmountEGP || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Raw & Packing Inventory</div>
          <div className="page-sub">Real-time stock balance tracking for raw materials and packaging</div>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <button 
            className="btn-primary" 
            onClick={() => exportToExcel(sortedItems)} 
            disabled={loading || sortedItems.length === 0}
            style={{
              background: '#16a34a',
              borderColor: '#16a34a',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 38,
              padding: '0 16px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              border: 'none',
              transition: 'background .15s'
            }}
          >
            📥 Export Excel
          </button>
        </div>
      </div>

      {error && <div className="err-page">{error}</div>}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Total Unique Items</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{totalUniqueItems}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>In current view</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>R / P / Others Counts</div>
          <div style={{ fontSize: 22, fontWeight: 800, display: 'flex', gap: 12, marginTop: 4 }}>
            <span style={{ color: 'var(--blue)' }}>{rawCount}<span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginLeft: 3 }}>R</span></span>
            <span style={{ color: 'var(--amber)' }}>{packCount}<span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginLeft: 3 }}>P</span></span>
            <span style={{ color: 'var(--muted)' }}>{othersCount}<span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginLeft: 3 }}>O</span></span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>Unique items breakdown</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Total Value (EGP)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--orange2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fmtQty(rawValueEGP + packValueEGP + othersValueEGP)} EGP
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--muted)', marginTop: 6, fontWeight: 600 }}>
            <span>R: <span style={{ color: 'var(--blue)' }}>{fmtQty(rawValueEGP)}</span></span>
            <span>P: <span style={{ color: 'var(--amber)' }}>{fmtQty(packValueEGP)}</span></span>
            <span>O: <span style={{ color: 'var(--text)' }}>{fmtQty(othersValueEGP)}</span></span>
          </div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: itemsWithoutPriceCount > 0 ? 'var(--orange2)' : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Items Without Price</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: itemsWithoutPriceCount > 0 ? 'var(--orange2)' : 'var(--text)' }}>{itemsWithoutPriceCount}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>No invoice unit price found</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Stock Balances (Qty)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Positive:</span>
              <span style={{ color: 'var(--green)', fontWeight: 700 }}>{fmtQty(positiveStockSum)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Negative:</span>
              <span style={{ color: 'var(--red)', fontWeight: 700 }}>{fmtQty(negativeStockSum)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search Panel */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: 'var(--shadow)'
      }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14 }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by code or description..."
              style={{
                width: '100%',
                height: 38,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0 12px 0 34px',
                background: 'var(--soft)',
                color: 'var(--text)',
                outline: 'none',
                fontFamily: 'var(--font)',
                fontSize: 13,
                transition: 'border-color .15s'
              }}
            />
          </div>

          {/* Category Filter Toggle Buttons */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: 38 }}>
            {[
              { id: 'ALL', label: 'All', count: items.length },
              { id: 'R', label: 'Raw Material (R)', count: items.filter(item => item.ItemType === 'R').length },
              { id: 'P', label: 'Packing (P)', count: items.filter(item => item.ItemType === 'P').length },
              { id: 'OTHERS', label: 'Others', count: items.filter(item => item.ItemType !== 'R' && item.ItemType !== 'P').length }
            ].map(btn => {
              const active = activeType === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => setActiveType(btn.id)}
                  style={{
                    padding: '0 16px',
                    border: 'none',
                    background: active ? 'var(--orange-soft)' : 'var(--surface)',
                    color: active ? 'var(--orange2)' : 'var(--text)',
                    fontSize: 12,
                    fontWeight: active ? 700 : 600,
                    cursor: 'pointer',
                    transition: 'all .15s',
                    borderRight: btn.id !== 'OTHERS' ? '1px solid var(--border)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>{btn.label}</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: active ? 'var(--orange)' : 'var(--soft)',
                    color: active ? '#fff' : 'var(--muted)'
                  }}>
                    {btn.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow)'
      }}>
        {loading ? (
          <div className="loading-wrap">
            <div className="spinner"></div>
            <div>Loading inventory items...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)', fontSize: 13 }}>
            No inventory items match the current search or filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--soft)', borderBottom: '1px solid var(--border)' }}>
                  {[
                    { key: 'ItemCode', label: 'Item Code' },
                    { key: 'ItemType', label: 'Type' },
                    { key: 'ItemExtraDescription', label: 'Item Extra Description' },
                    { key: 'ItemBalance', label: 'Balance' },
                    { key: 'LastPrice', label: 'Last Price' },
                    { key: 'LastInvoiceDate', label: 'Last Invoice Date' },
                    { key: 'ItemAmount', label: 'Amount' },
                    { key: 'ItemAmountEGP', label: 'Amount in EGP' }
                  ].map((col) => {
                    const isSorted = sortField === col.key;
                    const isNumeric = col.key === 'ItemBalance' || col.key === 'LastPrice' || col.key === 'ItemAmount' || col.key === 'ItemAmountEGP';
                    return (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        style={{
                          padding: '12px 18px',
                          color: isSorted ? 'var(--text)' : 'var(--muted)',
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '.05em',
                          textAlign: isNumeric ? 'right' : 'left',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'color .15s'
                        }}
                        title={`Sort by ${col.label}`}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, width: '100%', justifyContent: isNumeric ? 'flex-end' : 'flex-start' }}>
                          {col.label}
                          <span style={{ 
                            fontSize: 9, 
                            color: isSorted ? 'var(--orange2)' : 'var(--muted)',
                            opacity: isSorted ? 1 : 0.4
                          }}>
                            {isSorted ? (sortAsc ? '▲' : '▼') : '↕'}
                          </span>
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item, i) => {
                  const balance = Number(item.ItemBalance || 0);
                  const isPositive = balance > 0;
                  const isNegative = balance < 0;
                  const color = isPositive ? 'var(--green)' : isNegative ? 'var(--red)' : 'var(--text)';
                  const fontWeight = balance !== 0 ? 700 : 500;
                  
                  const amount = Number(item.ItemAmount || 0);
                  const amountColor = amount > 0 ? 'var(--green)' : amount < 0 ? 'var(--red)' : 'var(--text)';
                  const amountFontWeight = amount !== 0 ? 700 : 500;

                  const amountEGP = Number(item.ItemAmountEGP || 0);
                  const amountEGPColor = amountEGP > 0 ? 'var(--green)' : amountEGP < 0 ? 'var(--red)' : 'var(--text)';
                  const amountEGPFontWeight = amountEGP !== 0 ? 700 : 500;
                  
                  return (
                    <tr key={i} style={{
                      borderBottom: i < filteredItems.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background .15s'
                    }}>
                      <td style={{
                        padding: '12px 18px',
                        fontSize: 12,
                        fontFamily: 'var(--mono)',
                        color: 'var(--muted)',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.ItemCode}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <TypeBadge type={item.ItemType} />
                      </td>
                      <td style={{
                        padding: '12px 18px',
                        fontSize: 13,
                        fontWeight: 500,
                        maxWidth: 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }} title={item.ItemExtraDescription}>
                        {item.ItemExtraDescription || '—'}
                      </td>
                      <td style={{
                        padding: '12px 18px',
                        fontSize: 13,
                        textAlign: 'right',
                        fontWeight: fontWeight,
                        color: color,
                        whiteSpace: 'nowrap'
                      }}>
                        {fmtQty(balance)}
                      </td>
                      <td style={{
                        padding: '12px 18px',
                        fontSize: 13,
                        textAlign: 'right',
                        fontWeight: item.LastPrice ? 600 : 500,
                        color: item.LastPrice ? 'var(--text)' : 'var(--muted)',
                        whiteSpace: 'nowrap',
                        lineHeight: '1.2'
                      }}>
                        <div>{fmtPrice(item.LastPrice, item.LastCurrency)}</div>
                        {item.LastCurrency && item.LastCurrency !== 'EGP' && item.LastExchangeRate && (
                          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500, marginTop: 2 }}>
                            Ex: {Number(item.LastExchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </div>
                        )}
                      </td>
                      <td style={{
                        padding: '12px 18px',
                        fontSize: 13,
                        color: 'var(--muted)',
                        whiteSpace: 'nowrap'
                      }}>
                        {fmtDate(item.LastInvoiceDate)}
                      </td>
                      <td style={{
                        padding: '12px 18px',
                        fontSize: 13,
                        textAlign: 'right',
                        fontWeight: amountFontWeight,
                        color: amountColor,
                        whiteSpace: 'nowrap'
                      }}>
                        {fmtPrice(item.ItemAmount, item.LastCurrency)}
                      </td>
                      <td style={{
                        padding: '12px 18px',
                        fontSize: 13,
                        textAlign: 'right',
                        fontWeight: amountEGPFontWeight,
                        color: amountEGPColor,
                        whiteSpace: 'nowrap'
                      }}>
                        {fmtPrice(item.ItemAmountEGP, 'EGP')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
