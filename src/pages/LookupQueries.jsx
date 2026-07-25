import { useState, useEffect, useMemo } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

const EMPTY_FORM = {
  QueryID: '',
  QueryName: '',
  SPName: '[PLS].[APIPlusOperation]',
  Operation: '',
  Description: '',
  QuerySQL: '',
  DatabaseName: 'ERPMega',
  SchemaName: 'dbo',
  TableOrViewName: '',
  ApiUrl: ''
};

export default function LookupQueries({ user }) {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const isNew = !formData.QueryID;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiCall('GetQueryMaster', {}, {}, 'plus');
      if (res.State === 0) {
        const qMap = {};
        (res.List0 || []).forEach(row => {
          if (!qMap[row.QueryID]) qMap[row.QueryID] = { ...row };
        });
        setQueries(Object.values(qMap).filter(q => q.QueryType === 'Lookup'));
      } else {
        setError(res.Message || 'Failed to load lookup queries');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setLoading(false);
  }

  const columns = [
    { key: 'QueryName', label: 'Lookup Name', width: 220 },
    { key: 'Operation', label: 'Operation', width: 200 },
    { key: 'SPName', label: 'Stored Procedure', width: 200 },
    { key: 'TableOrViewName', label: 'Table / View', width: 180 },
    { key: 'ApiUrl', label: 'API URL', flex: 1 }
  ];

  function openAdd() {
    setFormData(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(row) {
    setFormData({
      QueryID: row.QueryID,
      QueryName: row.QueryName,
      SPName: row.SPName,
      Operation: row.Operation,
      Description: row.Description || '',
      QuerySQL: row.QuerySQL || '',
      DatabaseName: row.DatabaseName || '',
      SchemaName: row.SchemaName || '',
      TableOrViewName: row.TableOrViewName || '',
      ApiUrl: row.ApiUrl || ''
    });
    setError(null);
    setFormOpen(true);
  }

  async function handleSave() {
    if (!formData.QueryName.trim() || !formData.Operation.trim()) {
      setError('Lookup Name and Operation are required fields.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await apiCall('SaveQueryMaster', { ...formData, QueryType: 'Lookup' }, {}, 'plus');
      if (res.State === 0) {
        setFormOpen(false);
        await loadData();
      } else {
        setError(res.Message || 'Failed to save lookup query');
      }
    } catch (err) {
      setError('Save connection error: ' + err.message);
    }
    setSaving(false);
  }

  async function handleDelete(rows) {
    const row = rows[0];
    if (!row) return;
    if (!window.confirm(`Are you sure you want to delete lookup query "${row.QueryName}"? This will unlink it from all associated pages.`)) {
      return;
    }
    setError(null);
    try {
      const res = await apiCall('DeleteQueryMaster', { QueryID: row.QueryID }, {}, 'plus');
      if (res.State === 0) {
        await loadData();
      } else {
        setError(res.Message || 'Failed to delete lookup query');
      }
    } catch (err) {
      setError('Delete connection error: ' + err.message);
    }
  }

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && (
        <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--red)', padding: 10, borderRadius: 8, fontSize: 12.5, marginBottom: 16 }}>
          {error}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          title="Lookup Queries"
          subtitle="Filter / lookup queries used to populate FilterPanel dropdown pickers"
          columns={columns}
          rows={queries}
          loading={loading}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={handleDelete}
          onRefresh={loadData}
        />
      </div>

      {formOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 560, background: 'var(--bg)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                {isNew ? 'New Lookup Query' : `Editing: ${formData.QueryName}`}
              </h2>
              <button onClick={() => setFormOpen(false)} style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: 'var(--soft)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Lookup Name
                </label>
                <input
                  type="text"
                  value={formData.QueryName}
                  onChange={e => setFormData({ ...formData, QueryName: e.target.value })}
                  placeholder="e.g. Get Customer Lookup"
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                    Operation Code
                  </label>
                  <input
                    type="text"
                    value={formData.Operation}
                    onChange={e => setFormData({ ...formData, Operation: e.target.value })}
                    placeholder="e.g. GetCustomerLookup"
                    style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                    Stored Procedure
                  </label>
                  <input
                    type="text"
                    value={formData.SPName}
                    onChange={e => setFormData({ ...formData, SPName: e.target.value })}
                    placeholder="[PLS].[APIPlusOperation]"
                    style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Description
                </label>
                <textarea
                  value={formData.Description}
                  onChange={e => setFormData({ ...formData, Description: e.target.value })}
                  placeholder="Optional lookup purpose description..."
                  style={{ width: '100%', height: 60, padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase' }}>
                    Database
                  </label>
                  <input
                    type="text"
                    value={formData.DatabaseName}
                    onChange={e => setFormData({ ...formData, DatabaseName: e.target.value })}
                    placeholder="ERPMega"
                    style={{ width: '100%', height: 36, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)', background: 'var(--surface)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase' }}>
                    Schema
                  </label>
                  <input
                    type="text"
                    value={formData.SchemaName}
                    onChange={e => setFormData({ ...formData, SchemaName: e.target.value })}
                    placeholder="dbo"
                    style={{ width: '100%', height: 36, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)', background: 'var(--surface)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase' }}>
                    Table / View
                  </label>
                  <input
                    type="text"
                    value={formData.TableOrViewName}
                    onChange={e => setFormData({ ...formData, TableOrViewName: e.target.value })}
                    placeholder="e.g. QGetCustomerLookup"
                    style={{ width: '100%', height: 36, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)', background: 'var(--surface)', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Target API URL (for non-default ports/hosts)
                </label>
                <input
                  type="text"
                  value={formData.ApiUrl}
                  onChange={e => setFormData({ ...formData, ApiUrl: e.target.value })}
                  placeholder="e.g. https://be.glcpaints.com:7788/api/General/GeneralAPI"
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Query SQL Script
                </label>
                <textarea
                  value={formData.QuerySQL}
                  onChange={e => setFormData({ ...formData, QuerySQL: e.target.value })}
                  placeholder="SELECT * FROM TableName WHERE Condition;"
                  style={{ width: '100%', height: 120, padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 11.5, fontFamily: 'monospace', color: 'var(--text)', background: 'var(--surface)', outline: 'none', lineHeight: 1.4 }}
                />
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setFormOpen(false)}
                disabled={saving}
                style={{ height: 36, padding: '0 16px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  height: 36, padding: '0 24px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px var(--orange-glow)'
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
