import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import PlanningItemMasterDrawer from './PlanningItemMasterDrawer.jsx';

export default function PlanningItemMaster({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [drawerRow, setDrawerRow] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('GetGridData', { PageGroupID: 'planning_item_master' }, { User: user?.Username }, 'plus');
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

  async function handleDelete(rows) {
    const row = rows[0];
    if (!row) return;
    if (!window.confirm(`Delete planning defaults for item "${row.ItemCode}"?`)) return;
    setError('');
    try {
      const res = await apiCall('Delete Item Planning', row.ID, { User: user?.Username }, 'planning');
      if (res.State === 0) {
        await loadData();
      } else {
        setError(res.Message || 'Failed to delete.');
      }
    } catch (e) {
      setError('Delete connection error: ' + e.message);
    }
  }

  const columns = [
    { key: 'ItemCode', label: 'Item Code', width: 130 },
    { key: 'ItemDescription', label: 'Description', flex: 1 },
    { key: 'ItemType', label: 'Type', width: 90 },
    { key: 'DefaultMachineCode', label: 'Default Machine', width: 150, render: (row) => row?.DefaultMachineCode || '—' },
    { key: 'DefaultFormulaCode', label: 'Default Formula', width: 150, render: (row) => row?.DefaultFormulaCode || '—' },
    { key: 'SaftyStock', label: 'Safety Stock', width: 110, align: 'right' },
    { key: 'LeadTime', label: 'Lead Time', width: 100, align: 'right' },
    { key: 'NetWeight', label: 'Net Weight (Kg)', width: 130, align: 'right', render: (row) => Number(row?.NetWeight || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 }) },
    { key: 'ColorName', label: 'Color', width: 130 },
    { key: 'ColorPriority', label: 'Color Priority', width: 110, align: 'right' },
    { key: 'ProducationTime', label: 'Production Time (sec)', width: 150, align: 'right' }
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
          title="Planning Item Master"
          subtitle="Per-item planning defaults: machine, formula, safety stock, lead time"
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
        <PlanningItemMasterDrawer
          user={user}
          editRow={drawerRow.isNew ? null : drawerRow}
          onClose={() => setDrawerOpen(false)}
          onSaveSuccess={() => { setDrawerOpen(false); loadData(); }}
        />
      )}
    </div>
  );
}
