import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiCall } from '../shared/api.js';
import FilterPanel from '../shared/FilterPanel.jsx';
import EditJournalDrawer from './EditJournalDrawer.jsx';
import DataGrid from '../shared/DataGrid.jsx';

export default function JournalEntry({ user, def }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drawerRow, setDrawerRow] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [activeFilters, setActiveFilters] = useState({
    account: '',
    startDate: (() => { const y = new Date().getFullYear(); return `${y}-01-01`; })(),
    endDate: new Date().toISOString().split('T')[0],
  });

  const columns = [
    {
      key: 'JournalDate',
      label: 'Date',
      type: 'date',
      sortable: true,
      filterable: true,
      width: 110,
      render: (val) => val ? val.split('T')[0] : '—'
    },
    {
      key: 'EventNumber',
      label: 'Event No',
      type: 'number',
      sortable: true,
      filterable: true,
      align: 'left',
      width: 100
    },
    {
      key: 'JournalNumber',
      label: 'Journal #',
      type: 'string',
      sortable: true,
      filterable: true,
      width: 130
    },
    {
      key: 'JournalDescription',
      label: 'Description',
      type: 'string',
      sortable: true,
      filterable: true,
      width: 320
    },
    {
      key: 'TotalDebitsBook',
      label: 'Total Debits',
      type: 'number',
      sortable: true,
      filterable: true,
      align: 'right',
      width: 130,
      render: (val) => (
        <span style={{ color: '#1D4FB8', fontWeight: 600 }}>
          {Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: 'TotalCreditsBook',
      label: 'Total Credits',
      type: 'number',
      sortable: true,
      filterable: true,
      align: 'right',
      width: 130,
      render: (val) => (
        <span style={{ color: '#B5651D', fontWeight: 600 }}>
          {Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: 'TotalLines',
      label: 'Lines',
      type: 'number',
      sortable: true,
      filterable: true,
      align: 'center',
      width: 80
    },
    {
      key: 'JournalState',
      label: 'State',
      type: 'string',
      sortable: true,
      filterable: true,
      width: 100,
      render: (val) => (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          background: val === 'Posted' ? '#E7F7EF' : '#FFF6EC',
          color: val === 'Posted' ? '#1B8F5A' : '#B5651D'
        }}>
          {val}
        </span>
      )
    }
  ];

  async function handleSearch(filterValues) {
    setActiveFilters(filterValues);
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('Journal Entry', {
        fromDate: filterValues.startDate,
        toDate: filterValues.endDate,
        journalNo: filterValues.journalNo || ''
      });
      if (res.State === 0) {
        setData(res.List0 || []);
      } else {
        setError(res.Message || 'Failed to fetch journal entries.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const openDrawer = (row) => {
    setDrawerRow(row);
    setDrawerOpen(true);
  };

  const handleAddNew = () => {
    setDrawerRow(null);
    setDrawerOpen(true);
  };

  return (
    <div className="flex-row-layout" style={{ flex: 1, minHeight: 0, minWidth: 0, height: '100%', gap: 16 }}>
      {error && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, background: 'var(--red)', color: 'white', padding: '10px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <FilterPanel
        filters={['date', 'journalNo']}
        onSearch={handleSearch}
        loading={loading}
        user={user}
        defaultFilters={activeFilters}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
        <DataGrid
          title="Journal Entries"
          columns={columns}
          rows={data}
          loading={loading}
          onAdd={handleAddNew}
          onEdit={openDrawer}
          onRefresh={() => handleSearch(activeFilters)}
        />
      </div>

      {/* Edit Drawer overlay */}
      {drawerOpen && (
        <EditJournalDrawer
          row={drawerRow}
          user={user}
          onClose={() => { setDrawerRow(null); setDrawerOpen(false); }}
          onSaveSuccess={() => handleSearch(activeFilters)}
        />
      )}
    </div>
  );
}
