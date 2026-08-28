import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import PlanningItemHistoryDrawer from './PlanningItemHistoryDrawer.jsx';
import PlanningShowPlan from './PlanningShowPlan.jsx';

export default function PlanningItemHistory({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drawerRow, setDrawerRow] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showPlanOpen, setShowPlanOpen] = useState(false);

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
    </div>
  );
}
