import React, { useState, useEffect } from 'react';
import DataGrid from '../shared/DataGrid';
import FilterPanel from '../shared/FilterPanel';
import { apiCall } from '../shared/api.js';

export default function ItemMaster({ user }) {
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

  const loadData = async (currentFilters, currentPage = 1, currentLimit = 25, currentSearch = '') => {
    try {
      setLoading(true);
      setError(null);

      const res = await apiCall('GetGridData', { PageGroupID: 'item_master', ...currentFilters }, {}, 'plus');
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
        setError(res.Message || 'Failed to load Item Master.');
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
    { key: 'ItemID', label: 'Item ID' },
    { key: 'ItemCode', label: 'Item Code' },
    { key: 'ItemDescription', label: 'Description' },
    { key: 'ItemType', label: 'Type' },
    { key: 'ItemClass', label: 'Class' },
    { key: 'DefaultWarehouse', label: 'Default Warehouse' },
    { key: 'Barcode', label: 'Barcode' },
    { key: 'StockUM', label: 'Stock UM' },
    { key: 'SellingUM', label: 'Selling UM' },
    { key: 'MinimumBalance', label: 'Min. Balance' },
    { key: 'IsNotActive', label: 'Inactive' }
  ];

  return (
    <div className="flex-row-layout" style={{ height: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)', color: 'var(--text)' }}>
      <FilterPanel
        pageGroupId="item_master"
        user={user}
        loading={loading}
        onSearch={(f) => {
          setFilters(f);
          setPage(1);
          setHasSearched(true);
        }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '24px' }}>🏷️ Item Master</h2>

          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="Search items..."
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
            <span style={{ fontSize: '48px', marginBottom: 16 }}>🏷️</span>
            <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '16px', fontWeight: '700' }}>No Data Loaded Yet</h3>
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', maxWidth: '320px' }}>Set your filters, then click "Generate" to load item master records.</p>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <DataGrid
                rows={data}
                columns={columns}
                loading={loading}
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
    </div>
  );
}
