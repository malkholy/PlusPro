import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import AccountingMacroDrawer from './AccountingMacroDrawer.jsx';

export default function AccountingMacros({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [drawerRow, setDrawerRow] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('Get Macros List', null, { User: user?.Username }, 'journal');
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
    { key: 'MacroID', label: 'ID', width: 80 },
    { key: 'MacroName', label: 'Name', width: 200 },
    { key: 'MacroDescription', label: 'Description', flex: 1 },
    { key: 'MacroTable', label: 'Table', width: 150 },
    { key: 'MacroPrefix', label: 'Prefix', width: 120 },
    { key: 'MacroDocumnet', label: 'Document', width: 120 },
    { key: 'ReturnedValueType', label: 'Value Type', width: 150, render: (row) => row?.ReturnedValueType === 1 ? 'Single Value' : 'Conditional Lines' }
  ];

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          title="Accounting Macros"
          subtitle="Manage configurations for dynamic macros and variable substitutions"
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
        <AccountingMacroDrawer
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
