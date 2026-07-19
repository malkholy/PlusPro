import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import AccountingFunctionDrawer from './AccountingFunctionDrawer.jsx';

export default function AccountingFunctions({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [drawerRow, setDrawerRow] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('Get Accounting Functions List', null, { User: user?.Username }, 'journal');
      if (res.State === 0) {
        setData(res.List0 || []);
      } else {
        setError(res.Message);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);



  const columns = [
    { key: 'FunctionPrefix', label: 'Prefix', width: 150 },
    { key: 'FunctionDescription', label: 'Description', flex: 1 },
    { key: 'FuctionType', label: 'Type', width: 120 },
    { key: 'DoucmentPrefix', label: 'Doc Prefix', width: 120 },
    { key: 'EventID', label: 'Event ID', width: 100 },
    { key: 'HasDocumentType', label: 'Has Doc Type', width: 120, render: (row) => row?.HasDocumentType ? 'Yes' : 'No' },
    { key: 'QuickFlag', label: 'Quick Flag', width: 100, render: (row) => row?.QuickFlag ? 'Yes' : 'No' }
  ];

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          title="Accounting Functions"
          subtitle="Manage master configurations for accounting functions and document types"
          columns={columns}
          rows={data}
          loading={loading}
          onAdd={() => {
            setDrawerRow({ isNew: true });
            setDrawerOpen(true);
          }}
          onEdit={(row) => {
            setDrawerRow(row);
            setDrawerOpen(true);
          }}
          onRefresh={loadData}
        />
      </div>

      {drawerOpen && (
        <AccountingFunctionDrawer
          user={user}
          editRow={drawerRow.isNew ? null : drawerRow}
          onClose={() => setDrawerOpen(false)}
          onSaveSuccess={() => {
            setDrawerOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
