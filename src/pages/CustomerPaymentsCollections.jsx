import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function CustomerPaymentsCollections({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('GetGridData', { PageGroupID: 'customer_payments_collections' }, { User: user?.Username }, 'plus');
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
    { key: 'Year', label: 'Year', width: 90, align: 'right' },
    { key: 'Month', label: 'Month', width: 90, render: (val) => MONTH_NAMES[Number(val)] || val },
    { key: 'CustomerNo', label: 'Customer No', width: 110, align: 'right' },
    { key: 'CustomerName', label: 'Customer Name', flex: 1 },
    { key: 'SalesName', label: 'Sales Person', width: 150, render: (val) => val || '—' },
    { key: 'TotalPayment', label: 'Total Payment', width: 140, align: 'right', render: (val) => Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { key: 'TotalSales', label: 'Total Sales', width: 140, align: 'right', render: (val) => Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { key: 'TotalDueAmount', label: 'Total Due', width: 140, align: 'right', render: (val) => {
      const n = Number(val || 0);
      return <span style={{ color: n > 0 ? 'var(--red)' : 'var(--text)' }}>{n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
    } }
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
          title="Customer Payments/Collections"
          subtitle="Monthly payments, sales, and total due per customer"
          columns={columns}
          rows={data}
          loading={loading}
          onRefresh={loadData}
        />
      </div>
    </div>
  );
}
