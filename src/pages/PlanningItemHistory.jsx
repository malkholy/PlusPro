import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import PlanningItemHistoryDrawer from './PlanningItemHistoryDrawer.jsx';

export default function PlanningItemHistory({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    { key: 'PlannedQty', label: 'Planned Qty', width: 130, align: 'right', render: (row) => Number(row?.PlannedQty || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 }) },
    { key: 'MachineCode', label: 'Machine', width: 130, render: (row) => row?.MachineCode || '—' },
    { key: 'FormulaCode', label: 'Formula', width: 130, render: (row) => row?.FormulaCode || '—' },
    { key: 'FormulaBatch', label: 'Batch Qty', width: 110, align: 'right', render: (row) => Number(row?.FormulaBatch || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 }) },
    { key: 'ProductionTime', label: 'Production Time (sec)', width: 170, align: 'right' },
    { key: 'ShiftNo', label: 'Shift No', width: 90, align: 'right' },
    { key: 'StartDate', label: 'Start Date', width: 110, render: (row) => row?.StartDate ? row.StartDate.split('T')[0] : '—' },
    { key: 'EndDate', label: 'End Date', width: 110, render: (row) => row?.EndDate ? row.EndDate.split('T')[0] : '—' },
    { key: 'CreatedBy', label: 'Created By', width: 130 },
    { key: 'CreatedDate', label: 'Created Date', width: 150, render: (row) => row?.CreatedDate ? row.CreatedDate.split('T')[0] : '—' }
  ];

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid rgba(220,38,38,0.2)', color: '#B91C1C', padding: 10, borderRadius: 8, fontSize: 12.5, marginBottom: 16 }}>
          {error}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          title="Production Planning History"
          subtitle="History of production planning runs per item"
          columns={columns}
          rows={data}
          loading={loading}
          onAdd={() => setDrawerOpen(true)}
          onRefresh={loadData}
        />
      </div>

      {drawerOpen && (
        <PlanningItemHistoryDrawer
          user={user}
          onClose={() => setDrawerOpen(false)}
          onSaveSuccess={() => { setDrawerOpen(false); loadData(); }}
        />
      )}
    </div>
  );
}
