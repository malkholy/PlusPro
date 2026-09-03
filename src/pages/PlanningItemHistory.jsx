import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import PlanningShowPlan from './PlanningShowPlan.jsx';
import FGInquiryModal from './FGInquiryModal.jsx';
import PrintPlanModal from './PrintPlanModal.jsx';

// Production planning is now driven entirely off PRO.PrdItemPlanningShiftPlan
// -- the old "Planning History" list + New/Edit drawer (backed by the
// now-dropped PrdItemPlanningHistory table) is gone. The grid below reads
// ShiftPlan rows directly; the toolbar launches the three tools that operate
// on the shift plan.
export default function PlanningItemHistory({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPlanOpen, setShowPlanOpen] = useState(false);
  const [fgInquiryOpen, setFgInquiryOpen] = useState(false);
  const [printPlanOpen, setPrintPlanOpen] = useState(false);

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
    { key: 'ShiftDate', label: 'Shift Date', width: 110, render: (val) => val ? val.split('T')[0] : '—' },
    { key: 'ShiftNo', label: 'Shift', width: 70, align: 'right' },
    { key: 'MachineCode', label: 'Machine', width: 130, render: (val) => val || '—' },
    { key: 'ItemCode', label: 'Item Code', width: 150 },
    { key: 'ItemDescription', label: 'Description', flex: 1 },
    { key: 'FormulaCode', label: 'Formula', width: 130, render: (val) => val || '—' },
    { key: 'PlannedQty', label: 'Planned Qty', width: 130, align: 'right', render: (val) => Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 }) },
    { key: 'StockUM', label: 'UOM', width: 80, render: (val) => val || '—' },
    { key: 'ProductionTime', label: 'Prod. Time (sec)', width: 140, align: 'right' },
    { key: 'Warehouse', label: 'Warehouse', width: 110, render: (val) => val || '—' },
    { key: 'ShopOrderNo', label: 'Shop Order', width: 110, render: (val) => val || '—' },
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
          title="Production Planning"
          subtitle="Shift plan rows -- the source of truth for production planning"
          columns={columns}
          rows={data}
          loading={loading}
          onRefresh={loadData}
        />
      </div>

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
    </div>
  );
}
