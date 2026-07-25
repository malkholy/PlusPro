import React, { useState, useEffect } from 'react';
import DataGrid from '../shared/DataGrid';
import FilterPanel from '../shared/FilterPanel';
import { apiCall } from '../shared/api.js';
import RMADrawer from './RMADrawer.jsx';

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

export default function RMA({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');

  const [filters, setFilters] = useState({});
  const [hasSearched, setHasSearched] = useState(false);

  const [showNewRMA, setShowNewRMA] = useState(false);
  const [selectedRMA, setSelectedRMA] = useState(null);

  const loadData = async (currentFilters, currentSearch = '') => {
    try {
      setLoading(true);
      setError(null);

      const res = await apiCall('GetGridData', { PageGroupID: 'rma', ...currentFilters }, {}, 'plus');
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
        setError(res.Message || 'Failed to load RMAs.');
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
    { key: 'RMANumber', label: 'RMA Number', width: 120, numeric: true, render: v => String(Number(v) || 0) },
    { key: 'RMACreatedDate', label: 'Created Date', width: 130, render: fmtDate },
    { key: 'CustomerName', label: 'Customer', width: 200 },
    { key: 'CustomerOrder', label: 'Customer Order', width: 130 },
    { key: 'Facility', label: 'Facility', width: 90 },
    { key: 'RmaStateDescription', label: 'Status', width: 110 },
    { key: 'Note', label: 'Note', width: 220 },
    { key: 'RMACreatedBy', label: 'Created By', width: 120 }
  ];

  return (
    <div className="flex-row-layout" style={{ height: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)', color: 'var(--text)' }}>
      <FilterPanel
        pageGroupId="rma"
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
          <h2 style={{ margin: 0, fontSize: '24px' }}>↩️ RMA</h2>

          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="Search RMAs..."
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
            <button
              onClick={() => setShowNewRMA(true)}
              style={{
                height: 38, padding: '0 20px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 12px var(--orange-glow)'
              }}
            >
              + New RMA
            </button>
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
            <span style={{ fontSize: '48px', marginBottom: 16 }}>↩️</span>
            <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '16px', fontWeight: '700' }}>No Data Loaded Yet</h3>
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', maxWidth: '320px' }}>Set your filters, then click "Generate" to load RMAs.</p>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <DataGrid
              rows={data}
              columns={columns}
              loading={loading}
              onEdit={(row) => setSelectedRMA(row)}
            />
          </div>
        )}
      </div>

      {showNewRMA && (
        <RMADrawer
          user={user}
          onClose={() => setShowNewRMA(false)}
          onSaved={() => loadData(filters, searchTerm)}
        />
      )}

      {selectedRMA && (
        <RMADrawer
          user={user}
          rma={selectedRMA}
          onClose={() => setSelectedRMA(null)}
          onSaved={() => loadData(filters, searchTerm)}
        />
      )}
    </div>
  );
}
