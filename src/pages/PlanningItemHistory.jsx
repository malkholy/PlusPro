import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import PlanningItemHistoryDrawer from './PlanningItemHistoryDrawer.jsx';
import PlanningShowPlan from './PlanningShowPlan.jsx';
import FGInquiryModal from './FGInquiryModal.jsx';
import PrintPlanModal from './PrintPlanModal.jsx';

export default function PlanningItemHistory({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drawerRow, setDrawerRow] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showPlanOpen, setShowPlanOpen] = useState(false);
  const [fgInquiryOpen, setFgInquiryOpen] = useState(false);
  const [printPlanOpen, setPrintPlanOpen] = useState(false);
  // Custom in-app confirm dialog -- native window.confirm() can silently
  // no-op inside some embedded/webview hosts (returns immediately without
  // blocking), which would skip straight past the delete every time.
  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('GetGridData', { PageGroupID: 'planning_item_history' }, { User: user?.Username }, 'plus');
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
    if (Number(row.PlanningState) !== 0) {
      setError('Only draft plans (State 0) can be deleted.');
      return;
    }
    setConfirmDialog({
      title: 'Delete Planning History',
      message: `Delete the plan for "${row.ItemCode}" (${Number(row.PlannedQty || 0).toLocaleString()} planned)? This also removes its shift plan schedule.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        setError('');
        try {
          const res = await apiCall('Delete Planning History', row.PlanningID, { User: user?.Username }, 'planning');
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
    { key: 'ItemCode', label: 'Item Code', width: 130 },
    { key: 'ItemDescription', label: 'Description', flex: 1 },
    { key: 'PlanningState', label: 'State', width: 90, align: 'right' },
    { key: 'PlannedQty', label: 'Planned Qty', width: 130, align: 'right', render: (val) => Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 }) },
    { key: 'MachineCode', label: 'Machine', width: 130, render: (val) => val || '—' },
    { key: 'FormulaCode', label: 'Formula', width: 130, render: (val) => val || '—' },
    { key: 'Warehouse', label: 'Warehouse', width: 120, render: (val) => val || '—' },
    { key: 'FormulaBatch', label: 'Batch Qty', width: 110, align: 'right', render: (val) => Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 }) },
    { key: 'ProductionTime', label: 'Production Time (sec)', width: 170, align: 'right' },
    { key: 'StartDate', label: 'Start Date', width: 110, render: (val) => val ? val.split('T')[0] : '—' },
    { key: 'EndDate', label: 'End Date', width: 110, render: (val) => val ? val.split('T')[0] : '—' },
    { key: 'CreatedBy', label: 'Created By', width: 130 },
    { key: 'CreatedDate', label: 'Created Date', width: 150, render: (val) => val ? val.split('T')[0] : '—' }
  ];

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && (
        <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--red)', padding: 10, borderRadius: 'var(--radius-xs)', fontSize: 12.5, marginBottom: 16 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={() => setShowPlanOpen(true)}
          style={{ padding: '8px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.color = 'var(--orange2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)'; }}
        >
          📅 Show Plan
        </button>
        <button
          onClick={() => setFgInquiryOpen(true)}
          style={{ marginLeft: 10, padding: '8px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.color = 'var(--orange2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)'; }}
        >
          📦 FG Inquery
        </button>
        <button
          onClick={() => setPrintPlanOpen(true)}
          style={{ marginLeft: 10, padding: '8px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.color = 'var(--orange2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)'; }}
        >
          🖨️ Print Plan
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          title="Production Planning History"
          subtitle="History of production planning runs per item"
          columns={columns}
          rows={data}
          loading={loading}
          onAdd={() => { setDrawerRow({ isNew: true }); setDrawerOpen(true); }}
          onEdit={(row) => { setDrawerRow(row); setDrawerOpen(true); }}
          onDelete={handleDelete}
          onRefresh={loadData}
        />
      </div>

      {drawerOpen && (
        <PlanningItemHistoryDrawer
          user={user}
          editRow={drawerRow.isNew ? null : drawerRow}
          onClose={() => setDrawerOpen(false)}
          onSaveSuccess={() => { setDrawerOpen(false); loadData(); }}
        />
      )}

      {showPlanOpen && (
        <PlanningShowPlan
          user={user}
          onClose={() => setShowPlanOpen(false)}
        />
      )}

      {fgInquiryOpen && (
        <FGInquiryModal
          user={user}
          onClose={() => setFgInquiryOpen(false)}
        />
      )}

      {printPlanOpen && (
        <PrintPlanModal
          user={user}
          onClose={() => setPrintPlanOpen(false)}
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
