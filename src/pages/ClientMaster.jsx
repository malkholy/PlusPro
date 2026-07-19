import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiCall } from '../shared/api.js';
import ClientDrawer from './ClientDrawer.jsx';

function fmtQty(val) {
  if (val == null || val === '') return '0.00';
  const n = Number(val);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function formatMobile(val) {
  if (!val) return '';
  let s = val.toString().trim();
  if (s.startsWith('963')) {
    return '0' + s.slice(3);
  }
  return s;
}

function exportToExcel(data, fileName = 'Client_Master.xls') {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Clients</x:Name>
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
        .center { text-align: center; }
        .number { mso-number-format: "#,##0.00"; text-align: right; }
        .date { mso-number-format: "YYYY\\-MM\\-DD"; text-align: center; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>GLC ID</th>
            <th>Name</th>
            <th>Job</th>
            <th>Mobile</th>
            <th>Address</th>
            <th>Arabic Name (Gov)</th>
            <th>Balance</th>
            <th>Created Date</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach(item => {
    const balance = Number(item.Balance || 0);
    const dateStr = item.CreatedDate 
      ? new Date(item.CreatedDate).toISOString().split('T')[0]
      : '';

    html += `
      <tr>
        <td class="text">${item.GLCID || ''}</td>
        <td>${item.Name || ''}</td>
        <td>${item.Job || ''}</td>
        <td class="text">${formatMobile(item.Mobile)}</td>
        <td>${item.Address || ''}</td>
        <td>${item.ArabicName || ''}</td>
        <td class="number">${balance}</td>
        <td class="date">${dateStr}</td>
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

export default function ClientMaster({ user, def }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('GLCID');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedClientID, setSelectedClientID] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, client }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const d = await apiCall('GetClientMaster', null, { User: user?.Username });
      if (d.State !== 0) {
        setError(d.Message || 'Failed to fetch clients data');
        setClients([]);
      } else {
        setClients(d.List0 || []);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [user]);

  useEffect(() => {
    function closeMenu() {
      setContextMenu(null);
    }
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const filteredClients = clients.filter(item => {
    const glcid = (item.GLCID != null ? item.GLCID : '').toString().toLowerCase();
    const name = (item.Name != null ? item.Name : '').toString().toLowerCase();
    const job = (item.Job != null ? item.Job : '').toString().toLowerCase();
    const mobile = (item.Mobile != null ? item.Mobile : '').toString().toLowerCase();
    const address = (item.Address != null ? item.Address : '').toString().toLowerCase();
    const govId = (item.GovermentID != null ? item.GovermentID : '').toString().toLowerCase();
    const arabicName = (item.ArabicName != null ? item.ArabicName : '').toString().toLowerCase();

    return (
      glcid.includes(search.toLowerCase()) ||
      name.includes(search.toLowerCase()) ||
      job.includes(search.toLowerCase()) ||
      mobile.includes(search.toLowerCase()) ||
      address.includes(search.toLowerCase()) ||
      govId.includes(search.toLowerCase()) ||
      arabicName.includes(search.toLowerCase())
    );
  });

  function handleSort(field) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  const sortedClients = [...filteredClients].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'Balance') {
      valA = Number(valA || 0);
      valB = Number(valB || 0);
    } else {
      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const totalClients = clients.length;
  const totalBalance = clients.reduce((acc, curr) => acc + Number(curr.Balance || 0), 0);
  const avgBalance = totalClients > 0 ? (totalBalance / totalClients) : 0;
  const clientsWithBalance = clients.filter(c => Number(c.Balance || 0) > 0).length;

  const todayStr = new Date().toDateString();
  const todayClients = clients.filter(c => {
    if (!c.CreatedDate) return false;
    return new Date(c.CreatedDate).toDateString() === todayStr;
  }).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{def?.icon || '👥'} {def?.label || 'Client Master'}</div>
          <div className="page-sub">{def?.desc || 'Manage and view client master database and balances'}</div>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : '🔄 Refresh'}
          </button>
          <button className="btn-primary" onClick={() => exportToExcel(sortedClients)} disabled={!sortedClients.length}>
            📤 Export Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Clients</div>
          <div className="kpi-value">{totalClients.toLocaleString()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Today Clients</div>
          <div className="kpi-value">{todayClients.toLocaleString()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Average Balance</div>
          <div className="kpi-value" style={{ color: avgBalance < 0 ? 'var(--red)' : 'var(--green)', fontSize: '22px' }}>
            {fmtQty(avgBalance)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Clients with Balance</div>
          <div className="kpi-value">{clientsWithBalance.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <input
          type="text"
          placeholder="🔍 Search clients by name, mobile, address, ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            height: 40,
            padding: '0 14px',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            background: 'var(--surface)',
            color: 'var(--text)',
            outline: 'none',
            fontSize: 14,
            transition: 'border-color 0.2s'
          }}
          onFocus={e => e.target.style.borderColor = 'var(--orange)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {error && (
        <div className="err-page">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="loading-wrap">
          <div className="spinner"></div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading clients data...</div>
        </div>
      ) : (
        <div className="table-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="table-wrap" style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('GLCID')}>
                    GLC ID {sortField === 'GLCID' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('Name')}>
                    Name {sortField === 'Name' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('Job')}>
                    Job {sortField === 'Job' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('Mobile')}>
                    Mobile {sortField === 'Mobile' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('Address')}>
                    Address {sortField === 'Address' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('ArabicName')}>
                    Government Name {sortField === 'ArabicName' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('Balance')}>
                    Balance {sortField === 'Balance' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('CreatedDate')}>
                    Created Date {sortField === 'CreatedDate' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedClients.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0' }}>
                      No clients found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  sortedClients.map(client => (
                    <tr
                      key={client.GLCID}
                      onClick={() => setSelectedClientID(client.GLCID)}
                      onContextMenu={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({ x: e.clientX, y: e.clientY, client });
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{client.GLCID}</td>
                      <td style={{ fontWeight: 500, color: 'var(--orange)' }}>{client.Name}</td>
                      <td>{client.Job || '—'}</td>
                      <td>{formatMobile(client.Mobile) || '—'}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={client.Address}>
                        {client.Address || '—'}
                      </td>
                      <td>{client.ArabicName || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: Number(client.Balance || 0) < 0 ? 'var(--red)' : 'var(--green)' }}>
                        {fmtQty(client.Balance)}
                      </td>
                      <td>{fmtDate(client.CreatedDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedClientID && (
        <ClientDrawer clientID={selectedClientID} onClose={() => setSelectedClientID(null)} onSaved={load} />
      )}

      {/* Custom Context Menu */}
      {contextMenu && createPortal(
        <div
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: '14px',
            boxShadow: 'var(--shadow)',
            padding: '8px',
            minWidth: '220px',
            zIndex: 100000,
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            fontFamily: 'var(--font)'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ padding: '6px 10px 4px', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', marginBottom: '6px' }}>
            Client Options: ID #{contextMenu.client.GLCID}
          </div>
          
          <div
            onClick={() => {
              setSelectedClientID(contextMenu.client.GLCID);
              setContextMenu(null);
            }}
            style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', transition: 'all 0.15s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--orange)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text)'; }}
          >
            💬 Open Client Drawer
          </div>

          <div style={{ height: '1.5px', background: 'var(--border)', margin: '4px 0' }} />

          <div
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.client.Name);
              setContextMenu(null);
            }}
            style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', transition: 'all 0.15s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--orange)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text)'; }}
          >
            📋 Copy Client Name
          </div>

          <div
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.client.GLCID);
              setContextMenu(null);
            }}
            style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', transition: 'all 0.15s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--orange)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text)'; }}
          >
            📋 Copy GLC ID
          </div>

          {contextMenu.client.Mobile && (
            <div
              onClick={() => {
                navigator.clipboard.writeText(formatMobile(contextMenu.client.Mobile));
                setContextMenu(null);
              }}
              style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', transition: 'all 0.15s ease' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--orange)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text)'; }}
            >
              📋 Copy Mobile Number
            </div>
          )}

          <div style={{ height: '1.5px', background: 'var(--border)', margin: '6px 0' }} />

          <div
            onClick={() => {
              exportToExcel(sortedClients);
              setContextMenu(null);
            }}
            style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', transition: 'all 0.15s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--orange)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text)'; }}
          >
            📤 Export List to Excel
          </div>

          <div
            onClick={() => {
              load();
              setContextMenu(null);
            }}
            style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', transition: 'all 0.15s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--orange)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text)'; }}
          >
            🔄 Refresh List
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
