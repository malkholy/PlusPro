import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    if (isNaN(d.getTime())) return '—';
    if (d.getFullYear() <= 1900) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '—';
  }
}

function fmtDateOnly(val) {
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


function exportToExcel(data, fileName = 'Client_Requests.xls') {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Requests</x:Name>
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
        .number { mso-number-format: "#,##0"; text-align: right; }
        .date { mso-number-format: "YYYY\\-MM\\-DD\\ HH\\:MM"; text-align: center; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Request No</th>
            <th>Request State</th>
            <th>State Description</th>
            <th>Request Date</th>
            <th>ClientID</th>
            <th>Sham Cash Code</th>
            <th>Mobile No</th>
            <th>Gift ID</th>
            <th>Gift Name</th>
            <th>Gift Value</th>
            <th>Gift Point</th>
            <th>Redemption Date</th>
            <th>Rejected Date</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach(item => {
    const giftPoint = Number(item.GiftPoint || 0);
    const amount = Number(item.GiftAmount || 0);
    const totalPoints = giftPoint * amount;
    const reqDate = item.RequestDate ? new Date(item.RequestDate).toISOString().replace('T', ' ').slice(0, 16) : '';
    const redDate = item.RedemptionDate ? new Date(item.RedemptionDate).toISOString().replace('T', ' ').slice(0, 16) : '';
    const rejDate = item.RejectedDate ? new Date(item.RejectedDate).toISOString().replace('T', ' ').slice(0, 16) : '';

    html += `
      <tr>
        <td class="text">${item.RequestNo || ''}</td>
        <td class="text">${item.RequestState || ''}</td>
        <td>${item.stateDescription || ''}</td>
        <td class="date">${reqDate}</td>
        <td class="text">${item.ClientID || ''}</td>
        <td class="text">${item.ShamCashCode || ''}</td>
        <td class="text">${formatMobile(item.ClientMobile)}</td>
        <td class="text">${item.GiftID || ''}</td>
        <td>${item.GiftName || ''}</td>
        <td class="number">${item.GiftMasterAmount || 0}</td>
        <td class="number">${giftPoint}</td>
        <td class="date">${redDate}</td>
        <td class="date">${rejDate}</td>
        <td>${item.Note || ''}</td>
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

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy to Clipboard"
      style={{
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: '2px 4px',
        fontSize: '12px',
        color: copied ? 'var(--green)' : 'var(--muted)',
        transition: 'all 0.2s',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        verticalAlign: 'middle',
        outline: 'none',
        borderRadius: '4px'
      }}
      onMouseEnter={e => { if(!copied) e.currentTarget.style.color = 'var(--orange)'; }}
      onMouseLeave={e => { if(!copied) e.currentTarget.style.color = 'var(--muted)'; }}
    >
      {copied ? '✓' : '📋'}
    </button>
  );
}

export default function ClientRequest({ user, def }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'New', 'Transfered'
  const [toast, setToast] = useState('');
  const [assignModal, setAssignModal] = useState(null); // { clientID, code: '' }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const d = await apiCall('GetClientRequest', null, { User: user?.Username });
      if (d.State !== 0) {
        setError(d.Message || 'Failed to fetch client requests data');
        setRequests([]);
      } else {
        setRequests(d.List0 || []);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  const handleAssignShamCash = (clientID, currentCode) => {
    setAssignModal({ clientID, code: currentCode || '' });
  };

  const submitAssign = async () => {
    if (!assignModal) return;
    const trimmed = assignModal.code.trim();
    if (!trimmed) {
      alert('Sham Cash Code cannot be empty');
      return;
    }
    try {
      const res = await apiCall('AssignShamCash', { ClientID: assignModal.clientID, ShamCashCode: trimmed }, { User: user?.Username });
      if (res.State !== 0) {
        alert(res.Message || 'Failed to assign Sham Cash Code');
      } else {
        showToast('Sham Cash Code assigned successfully!');
        setAssignModal(null);
        load();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const columns = [
    { key: "RequestNo", label: "Request No", numeric: true, render: (val) => val },
    {
      key: "stateDescription",
      label: "Status",
      render: (val, row) => {
        const statusStr = (val || `State #${row.RequestState}`).toLowerCase();
        let badgeClass = 'badge-purple';
        if (statusStr.includes('pending') || statusStr.includes('wait') || statusStr.includes('new')) {
          badgeClass = 'badge-amber';
        } else if (statusStr.includes('completed') || statusStr.includes('delivered') || statusStr.includes('approve') || statusStr.includes('success') || statusStr.includes('transfered')) {
          badgeClass = 'badge-green';
        } else if (statusStr.includes('reject') || statusStr.includes('cancel') || statusStr.includes('fail')) {
          badgeClass = 'badge-red';
        }
        return (
          <span className={`badge ${badgeClass}`}>
            {val || `State #${row.RequestState}`}
          </span>
        );
      }
    },
    { key: "RequestDate", label: "Request Date", render: (val) => fmtDate(val) },
    { key: "ClientID", label: "Client ID", numeric: true, render: (val) => val },
    {
      key: "ShamCashCode",
      label: "Sham Cash",
      render: (val) => (
        val ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{val}</span>
            <CopyButton text={val} />
          </div>
        ) : '—'
      )
    },
    {
      key: "ClientMobile",
      label: "Mobile No",
      render: (val) => (
        val ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{formatMobile(val)}</span>
            <CopyButton text={formatMobile(val)} />
          </div>
        ) : '—'
      )
    },
    {
      key: "GiftName",
      label: "Gift Name",
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{val}</div>
          {row.GiftID && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>ID: #{row.GiftID}</div>}
        </div>
      )
    },
    {
      key: "GiftMasterAmount",
      label: "Gift Value",
      numeric: true,
      render: (val) => (
        val != null ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', width: '100%' }}>
            <span>{fmtQty(val)}</span>
            <CopyButton text={val.toString()} />
          </div>
        ) : '—'
      )
    },
    { key: "GiftPoint", label: "Gift Point", numeric: true, render: (val) => Number(val || 0).toLocaleString() },
    { key: "RedemptionDate", label: "Redemption Date", render: (val) => fmtDateOnly(val) }
  ];

  const customActions = [
    {
      label: '🚀 Transfer Redemption',
      onClick: async (row) => {
        if (window.confirm(`Are you sure you want to Transfer request #${row.RequestNo}?`)) {
          try {
            const res = await apiCall('Transfer', row.RequestNo, { User: user?.Username });
            if (res.State !== 0) {
              alert(res.Message || 'Transfer failed');
            } else {
              showToast(`Request #${row.RequestNo} transferred successfully!`);
              load();
              setTimeout(load, 800); // Repeat load after short delay to handle any database transaction latency
            }
          } catch (err) {
            alert(err.message);
          }
        }
      },
      show: (row) => row.RequestState === 10
    },
    {
      label: '🔑 Assign Sham Code',
      onClick: (row) => {
        handleAssignShamCash(row.ClientID, row.ShamCashCode);
      },
      show: (row) => true
    }
  ];

  // Sorting is handled internally by DataGrid component

  const filteredRequests = requests.filter(item => {
    // 1. Status filter
    if (statusFilter !== 'All') {
      const s = (item.stateDescription || '').toLowerCase();
      if (statusFilter === 'New' && !s.includes('new') && !s.includes('pending')) return false;
      if (statusFilter === 'Transfered' && !s.includes('transfered') && !s.includes('complete')) return false;
    }

    // 2. Text search filter
    const reqNo = (item.RequestNo != null ? item.RequestNo : '').toString().toLowerCase();
    const clientId = (item.ClientID != null ? item.ClientID : '').toString().toLowerCase();
    const shamCash = (item.ShamCashCode != null ? item.ShamCashCode : '').toString().toLowerCase();
    const mobile = (item.ClientMobile != null ? formatMobile(item.ClientMobile) : '').toLowerCase();
    const giftName = (item.GiftName != null ? item.GiftName : '').toString().toLowerCase();
    const giftVal = (item.GiftMasterAmount != null ? item.GiftMasterAmount : '').toString().toLowerCase();
    const stateDesc = (item.stateDescription != null ? item.stateDescription : '').toString().toLowerCase();

    return (
      reqNo.includes(search.toLowerCase()) ||
      clientId.includes(search.toLowerCase()) ||
      shamCash.includes(search.toLowerCase()) ||
      mobile.includes(search.toLowerCase()) ||
      giftName.includes(search.toLowerCase()) ||
      giftVal.includes(search.toLowerCase()) ||
      stateDesc.includes(search.toLowerCase())
    );
  });

  // DataGrid handles internal sorting, so we pass filteredRequests directly

  // Calculate KPIs
  // Calculate KPIs based on filtered list (so it adjusts to searches and filters)
  const totalRequests = filteredRequests.length;
  const pendingRequests = filteredRequests.filter(r => {
    const s = (r.stateDescription || '').toLowerCase();
    return s.includes('pending') || s.includes('new') || r.RequestState === 1 || r.RequestState === 0;
  }).length;
  const completedRequests = filteredRequests.filter(r => {
    const s = (r.stateDescription || '').toLowerCase();
    return s.includes('complete') || s.includes('delivered') || s.includes('approve') || s.includes('transfered') || r.RequestState === 2;
  }).length;
  const totalValue = filteredRequests.reduce((acc, curr) => acc + Number(curr.GiftMasterAmount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="page-header">
        <div>
          <div className="page-title">{def?.icon || '🎁'} {def?.label || 'Client Requests'}</div>
          <div className="page-sub">{def?.desc || 'Manage and view client point redemption history'}</div>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : '🔄 Refresh'}
          </button>
          <button className="btn-primary" onClick={() => exportToExcel(filteredRequests)} disabled={!filteredRequests.length}>
            📤 Export Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Requests</div>
          <div className="kpi-value">{totalRequests.toLocaleString()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pending Requests</div>
          <div className="kpi-value" style={{ color: 'var(--amber)' }}>{pendingRequests.toLocaleString()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Completed Requests</div>
          <div className="kpi-value" style={{ color: 'var(--green)' }}>{completedRequests.toLocaleString()}</div>
        </div>
        <div className="kpi-card" style={{ background: 'var(--orange-soft)', borderColor: 'rgba(249,115,22,0.2)' }}>
          <div className="kpi-label" style={{ color: 'var(--orange)' }}>Total Value</div>
          <div className="kpi-value" style={{ color: 'var(--orange)', fontSize: '20px' }}>
            {fmtQty(totalValue)}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Search requests by number, client ID, gift, code..."
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
          onFocus={e => { e.target.style.borderColor = 'var(--orange)'; e.target.select(); }}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />

        {/* Filter buttons group */}
        <div style={{ display: 'flex', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px', gap: '3px' }}>
          {['All', 'New', 'Transfered'].map(status => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  height: '32px',
                  padding: '0 16px',
                  border: 'none',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: isActive ? '700' : '600',
                  cursor: 'pointer',
                  background: isActive ? 'linear-gradient(135deg, var(--orange), var(--orange2))' : 'var(--surface)',
                  color: isActive ? '#fff' : 'var(--text)',
                  boxShadow: isActive ? '0 2px 4px rgba(249,115,22,0.2)' : 'none',
                  transition: 'all 0.15s ease',
                  fontFamily: 'var(--font)'
                }}
              >
                {status}
              </button>
            );
          })}
        </div>

        {/* Refresh button */}
        <button
          onClick={load}
          disabled={loading}
          style={{
            height: '40px',
            padding: '0 14px',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            background: 'var(--surface)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
            fontFamily: 'var(--font)'
          }}
          onMouseEnter={e => {
            if (!loading) {
              e.currentTarget.style.borderColor = 'var(--orange)';
              e.currentTarget.style.background = 'var(--orange-soft)';
            }
          }}
          onMouseLeave={e => {
            if (!loading) {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--surface)';
            }
          }}
        >
          {loading ? (
            <div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid var(--border)', borderTop: '2px solid var(--orange)' }}></div>
          ) : '🔄'}
          Refresh
        </button>
      </div>

      {error && (
        <div className="err-page">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, marginTop: 16 }}>
        <DataGrid
          title="Client Requests"
          columns={columns}
          rows={filteredRequests}
          loading={loading}
          onRefresh={load}
          customActions={customActions}
          hideSearch={true}
          hideRefresh={true}
          hideHeader={true}
        />
      </div>

      {/* Context menu is managed natively inside the DataGrid component */}

      {/* Floating feedback toast */}
      {toast && createPortal(
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--text)',
          color: 'var(--surface)',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: 'var(--shadow)',
          zIndex: 1000000,
          fontWeight: 700,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxSizing: 'border-box'
        }}>
          ✨ {toast}
        </div>,
        document.body
      )}

      {/* Premium Custom Modal for Assigning Sham Cash Code */}
      {assignModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000000
        }} onClick={() => setAssignModal(null)}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            boxShadow: '0 24px 64px rgba(15, 23, 42, 0.15)',
            width: '90%',
            maxWidth: '400px',
            padding: '24px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }} onClick={e => e.stopPropagation()}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>Assign Sham Cash Code</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Client ID: #{assignModal.clientID}</p>
            </div>
            
            <input
              type="text"
              placeholder="Enter Code..."
              value={assignModal.code}
              onChange={e => setAssignModal({ ...assignModal, code: e.target.value })}
              autoFocus
              style={{
                height: '42px',
                border: '1.5px solid var(--border)',
                borderRadius: '10px',
                padding: '0 12px',
                fontSize: '14px',
                fontWeight: 600,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
                width: '100%'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--orange)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
              onKeyDown={async e => {
                if (e.key === 'Enter') {
                  await submitAssign();
                }
              }}
            />
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                onClick={() => setAssignModal(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={submitAssign}
                className="btn-primary"
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
