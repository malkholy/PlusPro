import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import JournalModelDrawer from './JournalModelDrawer.jsx';
import DataGrid from '../shared/DataGrid.jsx';

export default function JournalModel({ user, def }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drawerRow, setDrawerRow] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const columns = [
    {
      key: 'ModelID',
      label: 'Model ID',
      type: 'number',
      sortable: true,
      filterable: true,
      width: 100
    },
    {
      key: 'ModelName',
      label: 'Name',
      type: 'string',
      sortable: true,
      filterable: true,
      width: 250
    },
    {
      key: 'ModelDescription',
      label: 'Description',
      type: 'string',
      sortable: true,
      filterable: true,
      width: 350
    },
    {
      key: 'JournalPrefix',
      label: 'Prefix',
      type: 'string',
      sortable: true,
      filterable: true,
      width: 100
    },
    {
      key: 'ModelCreatedDate',
      label: 'Created Date',
      type: 'date',
      sortable: true,
      filterable: true,
      width: 150,
      render: (val) => val ? val.split('T')[0] : '—'
    },
    {
      key: 'ModelInUse',
      label: 'Status',
      type: 'string',
      sortable: true,
      width: 120,
      render: (val, row) => {
        if (Number(val) === 1) {
          return (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: '#FFF6EC', color: '#B5651D'
            }}>
              In Use ({row.ModelInUseBy})
            </span>
          );
        }
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: '#E7F7EF', color: '#1B8F5A'
          }}>
            Available
          </span>
        );
      }
    }
  ];

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('Get Journal Model List', null, { User: user?.Username }, 'journal');
      if (res.State === 0) {
        setData(res.List0 || []);
      } else {
        setError(res.Message || 'Failed to fetch models.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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
          title="Journal Models"
          columns={columns}
          rows={data}
          loading={loading}
          onAdd={handleAddNew}
          onEdit={openDrawer}
          onRefresh={loadData}
        />
      </div>

      {drawerOpen && (
        <JournalModelDrawer
          row={drawerRow}
          user={user}
          onClose={() => { setDrawerRow(null); setDrawerOpen(false); }}
          onSaveSuccess={loadData}
        />
      )}
    </div>
  );
}
