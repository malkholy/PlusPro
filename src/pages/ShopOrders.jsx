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
  // Custom in-app confirm dialog -- native window.confirm() can silently
  // no-op inside some embedded/webview hosts.
  const [confirmDialog, setConfirmDialog] = useState(null);

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

  const handleDelete = (rows) => {
    const row = rows[0];
    if (!row) return;
    if (Number(row.OrderState) !== 0) {
      setError('Only draft (State 0) Shop Orders can be deleted.');
      return;
    }
    setConfirmDialog({
      title: 'Delete Shop Order',
      message: `Delete Shop Order ${row.ShopOrderNumber} (${row.ParentItemCode})? This also unlinks it from any Planning shift-plan slot.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        setError('');
        try {
          const res = await apiCall('Delete Shop Order', row.ShopOrderNumber, { User: user?.Username }, 'shop_order');
          if (res.State === 0) {
            await loadData();
          } else {
            setError(res.Message || 'Failed to delete.');
          }
        } catch (e) {
          setError('Delete connection error: ' + e.message);
        }
      }
    });
  };

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
          onDelete={handleDelete}
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
          onDelete={(row) => { setViewRow(null); handleDelete([row]); }}
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

      {confirmDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 420, maxWidth: '90vw', background: 'var(--bg)', borderRadius: 14, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '20px 22px' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{confirmDialog.title}</h3>
              <p style={{ margin: '10px 0 0 0', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{confirmDialog.message}</p>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setConfirmDialog(null)}
                style={{ height: 36, padding: '0 20px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                style={{
                  height: 36, padding: '0 24px',
                  background: confirmDialog.danger ? 'var(--red)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
                }}
              >
                {confirmDialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
