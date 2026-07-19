import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import CashReceiveDrawer from './CashReceiveDrawer.jsx';
import DataGrid from '../shared/DataGrid.jsx';

export default function CashReceive({ user, def }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drawerRow, setDrawerRow] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const columns = [
    { key: 'InternalID', label: 'ID', type: 'number', sortable: true, filterable: true, width: 80 },
    { key: 'RequestDate', label: 'Request Date', type: 'date', sortable: true, filterable: true, width: 120, render: (val) => val ? val.split('T')[0] : '—' },
    { key: 'RecievedDate', label: 'Received Date', type: 'date', sortable: true, filterable: true, width: 120, render: (val) => val ? val.split('T')[0] : '—' },
    { key: 'Contact', label: 'Contact', type: 'string', sortable: true, filterable: true, width: 200 },
    { key: 'Note', label: 'Note', type: 'string', sortable: true, filterable: true, width: 200 },
    { key: 'ReceievedAmountTransaction', label: 'Amount', type: 'number', sortable: true, width: 120 },
    { key: 'Currency', label: 'Currency', type: 'string', sortable: true, filterable: true, width: 100 },
    { key: 'DoucmentState', label: 'State', type: 'number', sortable: true, width: 100,
      render: (val) => {
        if (Number(val) === 0) return <span style={{ color: '#64748b', fontWeight: 600 }}>Draft</span>;
        if (Number(val) === 10) return <span style={{ color: '#0ea5e9', fontWeight: 600 }}>Received</span>;
        if (Number(val) === 20) return <span style={{ color: '#10b981', fontWeight: 600 }}>Posted</span>;
        if (Number(val) === 90) return <span style={{ color: '#ef4444', fontWeight: 600 }}>Reversed</span>;
        return val;
      }
    },
    { key: 'JournalNumber', label: 'Journal #', type: 'string', sortable: true, filterable: true, width: 120 }
  ];

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('Get Cash Receives List', null, { User: user?.Username }, 'journal');
      if (res.State === 0) {
        setData(res.List0 || []);
      } else {
        setError(res.Message || 'Failed to fetch data.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete/reverse this cash receive (ID ${row.InternalID})?`)) return;
    try {
      const res = await apiCall('Delete Cash Receive', { InternalID: row.InternalID }, { User: user?.Username }, 'journal');
      if (res.State === 0) {
        loadData();
      } else {
        alert(res.Message || 'Delete failed.');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openDrawer = (row) => {
    setDrawerRow(row);
    setDrawerOpen(true);
  };

  const handleAddNew = () => {
    setDrawerRow(null);
    setDrawerOpen(true);
  };

  return (
    <div className="flex-row-layout" style={{ flex: 1, minHeight: 0, minWidth: 0, height: '100%', gap: 16 }}>
      {error && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, background: 'var(--red)', color: 'white', padding: '10px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, padding: 16 }}>
        <DataGrid
          title="Cash Receive"
          columns={columns}
          rows={data}
          loading={loading}
          onAdd={handleAddNew}
          onEdit={openDrawer}
          onDelete={handleDelete}
          onRefresh={loadData}
        />
      </div>

      {drawerOpen && (
        <CashReceiveDrawer
          row={drawerRow}
          user={user}
          onClose={() => { setDrawerRow(null); setDrawerOpen(false); }}
          onSaveSuccess={loadData}
        />
      )}
    </div>
  );
}
