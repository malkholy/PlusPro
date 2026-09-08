import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import SafetyStockMonitorDrawer from './SafetyStockMonitorDrawer.jsx';

const stockStateColors = {
  OK: { bg: '#DCFCE7', border: '#86EFAC', text: '#15803D' },
  Reorder: { bg: '#FEF3C7', border: '#FCD34D', text: '#B45309' },
  Critical: { bg: '#FEE2E2', border: '#FCA5A5', text: '#B91C1C' }
};

// Last 12 calendar months ending with the current month.
function last12MonthYears() {
  const now = new Date();
  const years = new Set();
  for (let i = 11; i >= 0; i--) {
    years.add(new Date(now.getFullYear(), now.getMonth() - i, 1).getFullYear());
  }
  return [...years];
}

export default function SafetyStockMonitor({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drawerRow, setDrawerRow] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [kpiByItemID, setKpiByItemID] = useState({});
  const [kpiLoading, setKpiLoading] = useState(false);

  const loadData = async () => {
    setLoading(true); setError('');
    try {
      const res = await apiCall('GetGridData', { PageGroupID: 'safety_stock_monitor' }, { User: user?.Username }, 'plus');
      if (res.State === 0) {
        const rows = res.List0 || [];
        setData(rows);
        loadKPIs(rows);
      } else {
        setError(res.Message);
      }
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { loadData(); }, [user]);

  async function loadKPIs(rows) {
    if (rows.length === 0) { setKpiByItemID({}); return; }
    setKpiLoading(true);
    try {
      const years = last12MonthYears();

      const [itemMasterRes, balanceRes, ...salesResults] = await Promise.all([
        apiCall('Item Master All', null, { User: user?.Username }, 'lookup'),
        apiCall('GetGridData', { PageGroupID: 'item_balance' }, { User: user?.Username }, 'plus'),
        ...rows.flatMap(row => years.map(y => apiCall(
          'GetItemCustomerMonthlySales',
          { Period: 'yearly', Months: '', Quarter: 0, Year: y, Customer: '', ItemID: row.ItemID, SalesPerson: '' },
          { User: user?.Username },
          'plus'
        )))
      ]);

      const sellingUMByItemID = new Map((itemMasterRes.List0 || []).map(i => [String(i.ItemID), i.SellingUM]));

      const balanceByItemCode = new Map();
      for (const r of (balanceRes.List0 || [])) {
        if (r.Warehouse !== '2FG') continue;
        const boxQty = (Number(r.ItemBalance) || 0) / (Number(r.SellingConversion) || 1);
        balanceByItemCode.set(r.ItemCode, (balanceByItemCode.get(r.ItemCode) || 0) + boxQty);
      }

      const kpis = {};
      let resultIdx = 0;
      for (const row of rows) {
        let monthlyTotal = 0;
        for (let yi = 0; yi < years.length; yi++) {
          const res = salesResults[resultIdx++];
          if (res.State === 0) {
            for (const r of (res.List0 || [])) monthlyTotal += Number(r.QtyBox) || 0;
          }
        }
        const avgMonthlySales = monthlyTotal / 12;
        const totalBalance = balanceByItemCode.get(row.ItemCode) || 0;
        const avgDailyUsage = avgMonthlySales / 30;
        const leadTimeDays = Number(row.LeadTime) || 0;
        const safetyStockQty = avgDailyUsage * leadTimeDays;
        const reorderPoint = safetyStockQty + (avgDailyUsage * leadTimeDays);
        const stockState = totalBalance < safetyStockQty ? 'Critical' : totalBalance < reorderPoint ? 'Reorder' : 'OK';

        kpis[row.ItemID] = {
          avgMonthlySales, totalBalance, safetyStockQty, reorderPoint, stockState,
          sellingUM: sellingUMByItemID.get(String(row.ItemID)) || ''
        };
      }
      setKpiByItemID(kpis);
    } catch (e) {
      setError('Failed to load KPIs: ' + e.message);
    } finally {
      setKpiLoading(false);
    }
  }

  function handleDelete(rows) {
    const row = rows[0];
    if (!row) return;
    setConfirmDialog({
      title: 'Delete Safety Stock Entry',
      message: `Remove item "${row.ItemCode}" from the safety stock monitor?`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        setError('');
        try {
          const res = await apiCall('GenericRecordDelete', { PageGroupID: 'safety_stock_monitor', ItemID: row.ItemID }, { User: user?.Username }, 'plus');
          if (res.State === 0) await loadData(); else setError(res.Message || 'Failed to delete.');
        } catch (e) { setError('Delete connection error: ' + e.message); }
      }
    });
  }

  function fmtQty(row, n, digits = 1) {
    const um = kpiByItemID[row.ItemID]?.sellingUM;
    return `${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: digits })}${um ? ' ' + um : ''}`;
  }

  const columns = [
    { key: 'ItemCode', label: 'Item Code', width: 130 },
    { key: 'ItemDescription', label: 'Description', flex: 1 },
    { key: 'LeadTime', label: 'Lead Time (days)', width: 100, align: 'right', render: (val) => val === null || val === undefined ? '—' : val },
    {
      key: 'AvgMonthlySales', label: 'Avg / Month', width: 110, align: 'right',
      render: (_val, row) => kpiLoading && !kpiByItemID[row.ItemID] ? '…' : (kpiByItemID[row.ItemID] ? fmtQty(row, kpiByItemID[row.ItemID].avgMonthlySales) : '—')
    },
    {
      key: 'Balance', label: 'Balance', width: 110, align: 'right',
      render: (_val, row) => kpiLoading && !kpiByItemID[row.ItemID] ? '…' : (kpiByItemID[row.ItemID] ? fmtQty(row, kpiByItemID[row.ItemID].totalBalance) : '—')
    },
    {
      key: 'SafetyStockQty', label: 'Safety Stock', width: 110, align: 'right',
      render: (_val, row) => kpiLoading && !kpiByItemID[row.ItemID] ? '…' : (kpiByItemID[row.ItemID] ? fmtQty(row, kpiByItemID[row.ItemID].safetyStockQty) : '—')
    },
    {
      key: 'ReorderPoint', label: 'Re-Order Point', width: 120, align: 'right',
      render: (_val, row) => kpiLoading && !kpiByItemID[row.ItemID] ? '…' : (kpiByItemID[row.ItemID] ? fmtQty(row, kpiByItemID[row.ItemID].reorderPoint) : '—')
    },
    {
      key: 'StockState', label: 'Stock State', width: 110, align: 'center',
      render: (_val, row) => {
        const kpi = kpiByItemID[row.ItemID];
        if (kpiLoading && !kpi) return '…';
        if (!kpi) return '—';
        const c = stockStateColors[kpi.stockState];
        return (
          <span style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, borderRadius: 6, padding: '2px 10px', fontSize: 11.5, fontWeight: 700 }}>
            {kpi.stockState}
          </span>
        );
      }
    }
  ];

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && (<div style={{ background: '#FEE2E2', border: '1px solid rgba(220,38,38,0.2)', color: '#B91C1C', padding: 10, borderRadius: 8, fontSize: 12.5, marginBottom: 16 }}>{error}</div>)}
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          title="Safety Stock Monitor"
          subtitle="Per-item safety stock lead time monitoring"
          columns={columns} rows={data} loading={loading}
          onAdd={() => { setDrawerRow({ isNew: true }); setDrawerOpen(true); }}
          onEdit={(row) => { setDrawerRow(row); setDrawerOpen(true); }}
          onDelete={handleDelete}
          onRefresh={loadData}
        />
      </div>
      {drawerOpen && (
        <SafetyStockMonitorDrawer
          user={user}
          editRow={drawerRow.isNew ? null : drawerRow}
          onClose={() => setDrawerOpen(false)}
          onSaveSuccess={() => { setDrawerOpen(false); loadData(); }}
        />
      )}
      {confirmDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 420, maxWidth: '90vw', background: '#fff', borderRadius: 14, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '20px 22px' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1E293B' }}>{confirmDialog.title}</h3>
              <p style={{ margin: '10px 0 0 0', fontSize: 12.5, color: '#64748B', lineHeight: 1.5 }}>{confirmDialog.message}</p>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setConfirmDialog(null)} style={{ height: 36, padding: '0 20px', background: '#F1F5F9', color: '#1E293B', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDialog.onConfirm} style={{ height: 36, padding: '0 24px', background: confirmDialog.danger ? '#DC2626' : '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                {confirmDialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
