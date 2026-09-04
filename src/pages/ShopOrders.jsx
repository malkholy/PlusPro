import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import ShopOrderFormDrawer from './ShopOrderFormDrawer.jsx';
import ShopOrderViewDrawer from './ShopOrderViewDrawer.jsx';
import ShopOrderProductionDrawer from './ShopOrderProductionDrawer.jsx';

export default function ShopOrders({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewRow, setViewRow] = useState(null);
  const [formRow, setFormRow] = useState(null);
  const [productionRow, setProductionRow] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('GetGridData', { PageGroupID: 'shop_orders' }, { User: user?.Username }, 'plus');
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
    { key: 'ShopOrderNumber', label: 'Order #', width: 110, align: 'right' },
    { key: 'ParentItemCode', label: 'Item Code', width: 150 },
    { key: 'ItemDescription', label: 'Description', flex: 1 },
    { key: 'OrderState', label: 'State', width: 90, align: 'right' },
    { key: 'ShopOrderDate', label: 'Date', width: 110, render: (val) => val ? val.split('T')[0] : '—' },
    { key: 'ShopOrderWarehouse', label: 'Warehouse', width: 110, render: (val) => val || '—' },
    { key: 'QuantityRequired', label: 'Qty Required', width: 120, align: 'right', render: (val) => Number(val || 0).toLocaleString(undefined, { maximumFractionDigits: 5 }) },
    { key: 'QuantiftyIssued', label: 'Qty Issued', width: 120, align: 'right', render: (val) => Number(val || 0).toLocaleString(undefined, { maximumFractionDigits: 5 }) },
    { key: 'NumberOfReleases', label: 'Releases', width: 90, align: 'right' },
    { key: 'MachineCode', label: 'Machine', width: 130, render: (val) => val || '—' },
    { key: 'FormulaCode', label: 'Formula', width: 130, render: (val) => val || '—' },
    { key: 'ShiftID', label: 'Shift', width: 80, align: 'right' },
    { key: 'OrderCreatedBy', label: 'Created By', width: 130 },
    { key: 'OrderCreatedDate', label: 'Created Date', width: 150, render: (val) => val ? val.split('T')[0] : '—' }
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
          title="Shop Orders"
          subtitle="Shop floor production orders"
          columns={columns}
          rows={data}
          loading={loading}
          onAdd={() => setFormRow({ isNew: true })}
          onEdit={(row) => setViewRow(row)}
          onRefresh={loadData}
        />
      </div>

      {viewRow && (
        <ShopOrderViewDrawer
          user={user}
          row={viewRow}
          onClose={() => setViewRow(null)}
          onEdit={(row) => { setViewRow(null); setFormRow(row); }}
          onProduce={(row) => { setViewRow(null); setProductionRow(row); }}
        />
      )}

      {formRow && (
        <ShopOrderFormDrawer
          user={user}
          editRow={formRow.isNew ? null : formRow}
          onClose={() => setFormRow(null)}
          onSaveSuccess={() => { setFormRow(null); loadData(); }}
        />
      )}

      {productionRow && (
        <ShopOrderProductionDrawer
          user={user}
          row={productionRow}
          onClose={() => setProductionRow(null)}
          onSaveSuccess={() => { setProductionRow(null); loadData(); }}
        />
      )}
    </div>
  );
}
