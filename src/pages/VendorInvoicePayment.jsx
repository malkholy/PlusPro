import React, { useState, useEffect } from 'react';
import DataGrid from '../shared/DataGrid';
import FilterPanel from '../shared/FilterPanel';
import SearchableSelect from '../shared/SearchableSelect.jsx';
import { apiCall } from '../shared/api.js';

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

export default function VendorInvoicePayment({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [hasSearched, setHasSearched] = useState(false);

  const [vendorOptions, setVendorOptions] = useState([]);
  const [yearOptions, setYearOptions] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [newVendor, setNewVendor] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState(null);

  useEffect(() => {
    apiCall('Vendor Master All', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) setVendorOptions((d.List0 || []).map(v => ({ label: `${v.VendorNumber} - ${v.VendorName}`, value: v.VendorNumber })));
    });
    apiCall('Year Master All', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) setYearOptions((d.List0 || []).map(y => ({ label: String(y.Year), value: y.Year })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openNew() {
    setNewVendor('');
    setNewYear('');
    setNewError(null);
    setShowNew(true);
  }

  async function handleSaveNew() {
    if (!newVendor || !newYear) {
      setNewError('Vendor and Year are required.');
      return;
    }
    setNewSaving(true);
    setNewError(null);
    try {
      const res = await apiCall('New Invoice Payment Header', { VendorNo: newVendor, InvoiceYear: newYear }, { User: user?.Username }, 'acp');
      if (res.State !== 0) {
        setNewError(res.Message || 'Failed to create.');
        return;
      }
      setShowNew(false);
      if (hasSearched) loadData(filters, searchTerm);
    } catch (err) {
      setNewError(err.message || 'Connection error.');
    } finally {
      setNewSaving(false);
    }
  }

  const loadData = async (currentFilters, currentSearch = '') => {
    try {
      setLoading(true);
      setError(null);

      const res = await apiCall('GetGridData', { PageGroupID: 'vendor_invoice_payment', ...currentFilters }, {}, 'plus');
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
        setError(res.Message || 'Failed to load Vendor Invoice Payments.');
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
    { key: 'InternalID', label: 'ID', width: 90, numeric: true, render: v => String(Number(v) || 0) },
    { key: 'VendorNo', label: 'Vendor No', width: 100, numeric: true, render: v => String(Number(v) || 0) },
    { key: 'VendorName', label: 'Vendor Name', width: 220 },
    { key: 'VendorExtraName', label: 'Vendor Extra Name', width: 220 },
    { key: 'InvoiceYear', label: 'Year', width: 80, numeric: true, render: v => String(v) },
    { key: 'CreatedBy', label: 'Created By', width: 120 },
    { key: 'CreatedDate', label: 'Created Date', width: 130, render: fmtDate }
  ];

  return (
    <div className="flex-row-layout" style={{ height: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)', color: 'var(--text)' }}>
      <FilterPanel
        pageGroupId="vendor_invoice_payment"
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
          <h2 style={{ margin: 0, fontSize: '24px' }}>💰 Vendor Invoice Payment</h2>

          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="Search..."
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
              onClick={openNew}
              style={{
                height: 38, padding: '0 20px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 12px var(--orange-glow)'
              }}
            >
              + New
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
            <span style={{ fontSize: '48px', marginBottom: 16 }}>💰</span>
            <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '16px', fontWeight: '700' }}>No Data Loaded Yet</h3>
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', maxWidth: '320px' }}>Set your filters, then click "Generate" to load vendor invoice payments.</p>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <DataGrid
              rows={data}
              columns={columns}
              loading={loading}
              hideSearch
            />
          </div>
        )}
      </div>

      {showNew && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 420, maxWidth: '90vw', background: 'var(--bg)', borderRadius: 14, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '20px 22px' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>+ New Invoice Payment Header</h3>

              {newError && (
                <div style={{ marginTop: 12, background: 'var(--error-bg, #ff4c4c22)', color: 'var(--error, #ff4c4c)', padding: '10px 12px', borderRadius: 8, fontSize: 12.5 }}>
                  {newError}
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase' }}>Vendor</label>
                <SearchableSelect value={newVendor} onChange={setNewVendor} options={vendorOptions} placeholder="Select vendor" openOnFocus />
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase' }}>Year</label>
                <SearchableSelect value={newYear} onChange={setNewYear} options={yearOptions} placeholder="Select year" openOnFocus />
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setShowNew(false)}
                disabled={newSaving}
                style={{ height: 36, padding: '0 20px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNew}
                disabled={newSaving}
                style={{
                  height: 36, padding: '0 24px',
                  background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: newSaving ? 'default' : 'pointer',
                  opacity: newSaving ? 0.7 : 1
                }}
              >
                {newSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
