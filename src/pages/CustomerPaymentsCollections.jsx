import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const AMOUNT_RENDER = (val) => Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DUE_RENDER = (val) => {
  const n = Number(val || 0);
  return <span style={{ color: n > 0 ? 'var(--red)' : 'var(--text)' }}>{n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
};

const VIEWS = {
  customer: {
    pageGroupID: 'customer_payments_collections',
    label: 'By Customer',
    subtitle: 'Monthly payments, sales, and total due per customer',
    columns: [
      { key: 'Year', label: 'Year', width: 90, align: 'right' },
      { key: 'Month', label: 'Month', width: 90, render: (val) => MONTH_NAMES[Number(val)] || val },
      { key: 'CustomerNo', label: 'Customer No', width: 110, align: 'right' },
      { key: 'CustomerName', label: 'Customer Name', flex: 1 },
      { key: 'SalesName', label: 'Sales Person', width: 150, render: (val) => val || '—' },
      { key: 'TotalPayment', label: 'Total Payment', width: 140, align: 'right', render: AMOUNT_RENDER },
      { key: 'TotalSales', label: 'Total Sales', width: 140, align: 'right', render: AMOUNT_RENDER },
      { key: 'TotalDueAmount', label: 'Total Due', width: 140, align: 'right', render: DUE_RENDER }
    ]
  },
  sales: {
    pageGroupID: 'customer_payments_collections_by_sales',
    label: 'By Sales Person',
    subtitle: 'Monthly payments, sales, and total due aggregated per sales person',
    columns: [
      { key: 'Year', label: 'Year', width: 90, align: 'right' },
      { key: 'Month', label: 'Month', width: 90, render: (val) => MONTH_NAMES[Number(val)] || val },
      { key: 'SalesName', label: 'Sales Person', flex: 1, render: (val) => val || '—' },
      { key: 'TotalPayment', label: 'Total Payment', width: 140, align: 'right', render: AMOUNT_RENDER },
      { key: 'TotalSales', label: 'Total Sales', width: 140, align: 'right', render: AMOUNT_RENDER },
      { key: 'TotalDueAmount', label: 'Total Due', width: 140, align: 'right', render: DUE_RENDER }
    ]
  }
};

export default function CustomerPaymentsCollections({ user }) {
  const [view, setView] = useState('customer');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async (viewKey) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('GetGridData', { PageGroupID: VIEWS[viewKey].pageGroupID }, { User: user?.Username }, 'plus');
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
    loadData(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, view]);

  const current = VIEWS[view];

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && (
        <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--red)', padding: 10, borderRadius: 'var(--radius-xs)', fontSize: 12.5, marginBottom: 16 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {Object.entries(VIEWS).map(([key, v]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)',
              background: view === key ? 'linear-gradient(135deg, var(--orange), var(--orange2))' : 'var(--surface)',
              color: view === key ? '#fff' : 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer'
            }}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          title="Customer Payments/Collections"
          subtitle={current.subtitle}
          columns={current.columns}
          rows={data}
          loading={loading}
          onRefresh={() => loadData(view)}
        />
      </div>
    </div>
  );
}
