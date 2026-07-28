import React, { useState, useEffect } from 'react';
import DataGrid from '../shared/DataGrid';
import FilterPanel from '../shared/FilterPanel';
import { apiCall } from '../shared/api.js';
import CustomerOrderDrawer from './CustomerOrderDrawer.jsx';
import NewCustomerOrderDrawer from './NewCustomerOrderDrawer.jsx';
import { hasOperation } from '../shared/permissions.js';

const monthStart = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
})();
const today = new Date().toISOString().split('T')[0];

function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime()) || d.getFullYear() < 1901) return '';
  return d.toLocaleDateString('en-GB');
}

function fmtMoney(v) {
  const n = Number(v) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CustomerOrder({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');

  const [filters, setFilters] = useState({});
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [editOrderNumber, setEditOrderNumber] = useState(null);

  const loadData = async (currentFilters, currentSearch = '') => {
    try {
      setLoading(true);
      setError(null);

      const res = await apiCall('GetGridData', { PageGroupID: 'customer_order', ...currentFilters }, {}, 'plus');
      if (res.State === 0) {
        let items = res.List0 || [];

        if (currentSearch) {
          const lower = currentSearch.toLowerCase();
          items = items.filter(row =>
            Object.values(row).some(val =>
              String(val).toLowerCase().includes(lower)
            )
          );
        }

        setData(items);
      } else {
        setError(res.Message || 'Failed to load Customer Orders.');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasSearched) return;
    loadData(filters, searchTerm);
  }, [hasSearched, filters, searchTerm]);

  const columns = [
    { key: 'OrderNumber', label: 'Order No', width: 110, numeric: true, render: v => String(Number(v) || 0) },
    { key: 'DateOrderEntered', label: 'Order Date', width: 120, render: fmtDate },
    { key: 'CustomerName', label: 'Customer', width: 200 },
    { key: 'StateDescription', label: 'Status', width: 110 },
    { key: 'SalesName', label: 'Salesperson', width: 140 },
    { key: 'Warehouse', label: 'Warehouse', width: 100 },
    { key: 'RequestShipDate', label: 'Request Ship Date', width: 130, render: fmtDate },
    { key: 'ScheduledShipDate', label: 'Scheduled Ship Date', width: 140, render: fmtDate },
    { key: 'TotalFinalAmount', label: 'Total Amount', width: 130, numeric: true, render: fmtMoney },
    { key: 'TotalLines', label: 'Lines', width: 80, numeric: true },
    { key: 'GovernorateArabicName', label: 'Governorate', width: 130 },
    { key: 'CityArabicName', label: 'City', width: 130 },
    { key: 'CreatedByUser', label: 'Created By', width: 120 }
  ];

  return (
    <div className="flex-row-layout" style={{ height: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)', color: 'var(--text)' }}>
      <FilterPanel
        pageGroupId="customer_order"
        user={user}
        loading={loading}
        filters={['date']}
        defaultFilters={{ startDate: monthStart, endDate: today }}
        onSearch={(f) => {
          setFilters(f);
          setHasSearched(true);
        }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '24px' }}>🧾 Customer Order</h2>

          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                width: '250px'
              }}
            />
            {hasOperation(user, 'customer_order.new_order') && (
              <button
                onClick={() => setShowNewOrder(true)}
                style={{
                  height: 38, padding: '0 20px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px var(--orange-glow)'
                }}
              >
                + New Order
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: 'var(--error-bg, #ff4c4c22)', color: 'var(--error, #ff4c4c)', padding: '12px', borderRadius: '8px', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {!hasSearched ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            flex: 1, color: 'var(--muted)', textAlign: 'center', padding: '64px 0',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px'
          }}>
            <span style={{ fontSize: '48px', marginBottom: 16 }}>🧾</span>
            <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '16px', fontWeight: '700' }}>No Data Loaded Yet</h3>
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', maxWidth: '320px' }}>Set your filters, then click "Generate" to load customer orders.</p>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <DataGrid
              rows={data}
              columns={columns}
              loading={loading}
              hideSearch
              onEdit={(row) => setSelectedOrder(row)}
            />
          </div>
        )}
      </div>

      {selectedOrder && (
        <CustomerOrderDrawer
          user={user}
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onEdit={(row) => { setSelectedOrder(null); setEditOrderNumber(row.OrderNumber); }}
        />
      )}

      {(showNewOrder || editOrderNumber) && (
        <NewCustomerOrderDrawer
          user={user}
          editOrderNumber={editOrderNumber}
          onClose={() => { setShowNewOrder(false); setEditOrderNumber(null); }}
          onSaved={() => { setHasSearched(true); loadData(filters, searchTerm); }}
        />
      )}
    </div>
  );
}
