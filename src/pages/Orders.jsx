import React, { useState, useEffect } from 'react';
import DataGrid from '../shared/DataGrid';
import FilterPanel from '../shared/FilterPanel';
import { apiCall } from '../shared/api.js';
import OrderDetailsDrawer from './OrderDetailsDrawer.jsx';

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

export default function Orders({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  // Filters from FilterPanel
  const [filters, setFilters] = useState({});
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadData = async (currentFilters, currentPage = 1, currentLimit = 25, currentSearch = '') => {
    try {
      setLoading(true);
      setError(null);

      const res = await apiCall('GetGridData', { PageGroupID: 'orders', ...currentFilters }, {}, 'plus');
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

        const totalItems = items.length;
        setTotalPages(Math.ceil(totalItems / currentLimit));

        const startIndex = (currentPage - 1) * currentLimit;
        const endIndex = startIndex + currentLimit;
        setData(items.slice(startIndex, endIndex));
      } else {
        setError(res.Message || 'Failed to load Orders.');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasSearched) return;
    loadData(filters, page, limit, searchTerm);
  }, [hasSearched, filters, page, limit, searchTerm]);

  const columns = [
    { key: 'OrderNumber', label: 'Order Number', width: 130 },
    { key: 'OrderStateDescription', label: 'Status', width: 130 },
    { key: 'LoadingOrderStateDescription', label: 'Loading Status', width: 140 },
    { key: 'LoadingType', label: 'Request Type', width: 140, render: v => (v || '').trim() },
    { key: 'CustomerNumber', label: 'Customer Number', width: 130 },
    { key: 'CustomerName', label: 'Customer Name', width: 220 },
    { key: 'ShipToName', label: 'Ship To', width: 160 },
    { key: 'Salesperson', label: 'Salesperson', width: 110 },
    { key: 'Warehouse', label: 'Warehouse', width: 100 },
    { key: 'DateOrderEntered', label: 'Date Entered', width: 120, render: fmtDate },
    { key: 'RequestShipDate', label: 'Request Ship Date', width: 140, render: fmtDate },
    { key: 'ScheduledShipDate', label: 'Scheduled Ship Date', width: 150, render: fmtDate },
    { key: 'TruckNumber', label: 'Truck Number', width: 120 },
    { key: 'TruckTypeDesc', label: 'Truck Type', width: 120 },
    { key: 'DriverName', label: 'Driver Name', width: 140 },
    { key: 'LoadNumber', label: 'Load Number', width: 110 },
    { key: 'TotalLines', label: 'Lines', width: 80, numeric: true },
    { key: 'TotalWeight', label: 'Total Weight', width: 130, render: (v, row) => v == null ? '' : `${Number(v).toLocaleString()} ${row.WeightUnitOfMessure || ''}`.trim() },
    { key: 'OrderCarrier', label: 'Carrier', width: 100 },
    { key: 'CustomerPurchaseOrder', label: 'Customer PO', width: 130 },
    { key: 'BackOrderCode', label: 'Back Order', width: 100, render: v => (v ? 'Yes' : 'No') }
  ];

  return (
    <div className="flex-row-layout" style={{ height: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)', color: 'var(--text)' }}>
      <FilterPanel
        pageGroupId="orders"
        user={user}
        loading={loading}
        filters={['date']}
        defaultFilters={{ startDate: monthStart, endDate: today }}
        onSearch={(f) => {
          setFilters(f);
          setPage(1);
          setHasSearched(true);
        }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '24px' }}>📦 Orders</h2>

          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                width: '250px'
              }}
            />
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
            <span style={{ fontSize: '48px', marginBottom: 16 }}>📦</span>
            <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '16px', fontWeight: '700' }}>No Data Loaded Yet</h3>
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', maxWidth: '320px' }}>Set your filters, then click "Generate" to load orders.</p>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <DataGrid
                rows={data}
                columns={columns}
                loading={loading}
                onEdit={(row) => setSelectedOrder(row)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '12px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
                Page {page} of {totalPages || 1}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: page === 1 ? 'transparent' : 'var(--surface-hover)', color: page === 1 ? 'var(--muted)' : 'var(--text)', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: page >= totalPages ? 'transparent' : 'var(--surface-hover)', color: page >= totalPages ? 'var(--muted)' : 'var(--text)', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailsDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}
