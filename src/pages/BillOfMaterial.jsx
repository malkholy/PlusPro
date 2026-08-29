import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import BillOfMaterialDrawer from './BillOfMaterialDrawer.jsx';

export default function BillOfMaterial({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewRow, setViewRow] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('GetGridData', { PageGroupID: 'bill_of_material' }, { User: user?.Username }, 'plus');
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
    { key: 'ParentItemCode', label: 'Item Code', width: 150 },
    { key: 'ItemDescription', label: 'Description', flex: 1 },
    { key: 'FormulaID', label: 'Formula ID', width: 100, align: 'right' },
    { key: 'BatchQuantity', label: 'Batch Qty', width: 110, align: 'right', render: (val) => Number(val || 0).toLocaleString(undefined, { maximumFractionDigits: 5 }) },
    { key: 'MachineCode', label: 'Machine', width: 130, render: (val) => val || '—' },
    { key: 'FormulaFacility', label: 'Facility', width: 100 },
    { key: 'ParentItemType', label: 'Item Type', width: 100 },
    { key: 'FormulaCreatedBy', label: 'Created By', width: 130 },
    { key: 'FormulaCreatedDate', label: 'Created Date', width: 150, render: (val) => val ? val.split('T')[0] : '—' }
  ];

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && (
        <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--red)', padding: 10, borderRadius: 'var(--radius-xs)', fontSize: 12.5, marginBottom: 16 }}>
          {error}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          title="Bill Of Material"
          subtitle="Formula headers per item, with batch quantity and machine"
          columns={columns}
          rows={data}
          loading={loading}
          onEdit={(row) => setViewRow(row)}
          onRefresh={loadData}
        />
      </div>

      {viewRow && (
        <BillOfMaterialDrawer
          user={user}
          row={viewRow}
          onClose={() => setViewRow(null)}
        />
      )}
    </div>
  );
}
