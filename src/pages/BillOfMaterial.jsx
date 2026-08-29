import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import BillOfMaterialDrawer from './BillOfMaterialDrawer.jsx';
import BillOfMaterialFormDrawer from './BillOfMaterialFormDrawer.jsx';

export default function BillOfMaterial({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewRow, setViewRow] = useState(null);
  const [formRow, setFormRow] = useState(null);
  // Custom in-app confirm dialog -- native window.confirm() can silently
  // no-op inside some embedded/webview hosts (returns immediately without
  // blocking), which would skip straight past the delete every time.
  const [confirmDialog, setConfirmDialog] = useState(null);

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

  const handleDelete = (rows) => {
    const row = rows[0];
    if (!row) return;
    setConfirmDialog({
      title: 'Delete Bill Of Material',
      message: `Delete the formula for "${row.ParentItemCode}" (Formula ID ${row.FormulaID})? This also removes all its BOM lines.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        setError('');
        try {
          const res = await apiCall('Delete BOM', row.FormulaID, { User: user?.Username }, 'bom');
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
          onAdd={() => setFormRow({ isNew: true })}
          onEdit={(row) => setViewRow(row)}
          onDelete={handleDelete}
          onRefresh={loadData}
        />
      </div>

      {viewRow && (
        <BillOfMaterialDrawer
          user={user}
          row={viewRow}
          onClose={() => setViewRow(null)}
          onEdit={(row) => { setViewRow(null); setFormRow(row); }}
        />
      )}

      {formRow && (
        <BillOfMaterialFormDrawer
          user={user}
          editRow={formRow.isNew ? null : formRow}
          onClose={() => setFormRow(null)}
          onSaveSuccess={() => { setFormRow(null); loadData(); }}
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
