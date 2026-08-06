import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

const EMPTY_FORM = {
  ReportID: '',
  ReportName: '',
  FileName: '',
  PageGroupID: '',
  KeyParam: '',
  Description: '',
  IsFastReport: true,
  Queries: []
};

const EMPTY_QUERY = { QueryName: '', QuerySQL: '' };

export default function ReportsMaster({ user }) {
  const [reports, setReports] = useState([]);
  const [reportQueryMap, setReportQueryMap] = useState({});
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const isNew = !formData.ReportID;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [rRes, pRes] = await Promise.all([
        apiCall('GetReportsMaster', {}, {}, 'plus'),
        apiCall('GetPagesAndGroups', {}, {}, 'plus')
      ]);

      if (rRes.State === 0) {
        const qMap = {};
        (rRes.List1 || []).forEach(row => {
          if (!qMap[row.ReportID]) qMap[row.ReportID] = [];
          qMap[row.ReportID].push(row);
        });
        setReportQueryMap(qMap);
        setReports((rRes.List0 || []).map(r => ({
          ...r,
          QueryNames: (qMap[r.ReportID] || []).map(q => q.QueryName).join(', ')
        })));
      } else {
        setError(rRes.Message || 'Failed to load reports');
      }

      if (pRes.State === 0) {
        setPages((pRes.List0 || []).filter(p => !p.IsGroup));
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setLoading(false);
  }

  const columns = [
    { key: 'ReportID', label: 'ID', width: 70, numeric: true },
    { key: 'ReportName', label: 'Report Name', width: 200 },
    { key: 'FileName', label: 'File Name', width: 220 },
    { key: 'PageLabel', label: 'Linked Page', width: 160 },
    { key: 'KeyParam', label: 'Key Param', width: 110 },
    { key: 'IsFastReport', label: 'Type', width: 100, render: v => (v !== 0 && v !== false) ? 'FastReport' : 'Built-in' },
    { key: 'QueryNames', label: 'Queries', flex: 1 },
    { key: 'Description', label: 'Description', flex: 1 }
  ];

  function openAdd() {
    setFormData(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(row) {
    setFormData({
      ReportID: row.ReportID,
      ReportName: row.ReportName,
      FileName: row.FileName,
      PageGroupID: row.PageGroupID || '',
      KeyParam: row.KeyParam || '',
      Description: row.Description || '',
      IsFastReport: row.IsFastReport !== 0 && row.IsFastReport !== false,
      Queries: (reportQueryMap[row.ReportID] || []).map(q => ({ QueryName: q.QueryName, QuerySQL: q.QuerySQL }))
    });
    setError(null);
    setFormOpen(true);
  }

  function addQueryRow() {
    setFormData(prev => ({ ...prev, Queries: [...prev.Queries, { ...EMPTY_QUERY }] }));
  }

  function updateQueryRow(index, field, value) {
    setFormData(prev => ({
      ...prev,
      Queries: prev.Queries.map((q, i) => i === index ? { ...q, [field]: value } : q)
    }));
  }

  function removeQueryRow(index) {
    setFormData(prev => ({ ...prev, Queries: prev.Queries.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    if (!formData.ReportName.trim() || !formData.FileName.trim()) {
      setError('Report Name and File Name are required fields.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await apiCall('SaveReportsMaster', formData, {}, 'plus');
      if (res.State === 0) {
        setFormOpen(false);
        await loadData();
      } else {
        setError(res.Message || 'Failed to save report');
      }
    } catch (err) {
      setError('Save connection error: ' + err.message);
    }
    setSaving(false);
  }

  async function handleDelete(rows) {
    const row = rows[0];
    if (!row) return;
    if (!window.confirm(`Are you sure you want to delete report "${row.ReportName}"?`)) return;
    setError(null);
    try {
      const res = await apiCall('DeleteReportsMaster', { ReportID: row.ReportID }, {}, 'plus');
      if (res.State === 0) {
        await loadData();
      } else {
        setError(res.Message || 'Failed to delete report');
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
          title="Reports Master"
          subtitle="Catalog of printable reports, their source files, linked page and the SQL used to feed them"
          columns={columns}
          rows={reports}
          loading={loading}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={handleDelete}
          onRefresh={loadData}
        />
      </div>

      {formOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 720, maxWidth: '95vw', background: 'var(--bg)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                {isNew ? 'New Report' : `Editing: ${formData.ReportName}`}
              </h2>
              <button onClick={() => setFormOpen(false)} style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: 'var(--soft)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Report Name
                </label>
                <input
                  type="text"
                  value={formData.ReportName}
                  onChange={e => setFormData({ ...formData, ReportName: e.target.value })}
                  placeholder="e.g. Pick Release"
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                    File Name
                  </label>
                  <input
                    type="text"
                    value={formData.FileName}
                    onChange={e => setFormData({ ...formData, FileName: e.target.value })}
                    placeholder="e.g. NEW RELEASE REPORT.frx"
                    style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                    Key Parameter
                  </label>
                  <input
                    type="text"
                    value={formData.KeyParam}
                    onChange={e => setFormData({ ...formData, KeyParam: e.target.value })}
                    placeholder="e.g. orderNo"
                    style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--text)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.IsFastReport}
                    onChange={e => setFormData({ ...formData, IsFastReport: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: 'var(--orange)' }}
                  />
                  Is FastReport (.frx via NewReleaseReportApi)
                </label>
                <p style={{ margin: '4px 0 0 24px', fontSize: 11, color: 'var(--muted)' }}>
                  Uncheck if there's no verified .frx yet -- the frontend renders its own printable view instead.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Linked Page
                </label>
                <select
                  value={formData.PageGroupID}
                  onChange={e => setFormData({ ...formData, PageGroupID: e.target.value })}
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none' }}
                >
                  <option value="">— None —</option>
                  {pages.map(p => (
                    <option key={p.PageGroupID} value={p.PageGroupID}>{p.Icon} {p.Label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Description
                </label>
                <textarea
                  value={formData.Description}
                  onChange={e => setFormData({ ...formData, Description: e.target.value })}
                  placeholder="Optional report purpose description..."
                  style={{ width: '100%', height: 60, padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none', resize: 'none' }}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Queries (e.g. Header, Lines)
                  </div>
                  <button
                    onClick={addQueryRow}
                    style={{ height: 30, padding: '0 14px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add Query
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {formData.Queries.map((q, i) => (
                    <div key={i} style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input
                          type="text"
                          value={q.QueryName}
                          onChange={e => updateQueryRow(i, 'QueryName', e.target.value)}
                          placeholder="Query Name (e.g. Header)"
                          style={{ flex: 1, height: 34, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text)', background: 'var(--surface)', outline: 'none', fontWeight: 700 }}
                        />
                        <button
                          onClick={() => removeQueryRow(i)}
                          title="Remove"
                          style={{ width: 34, height: 34, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--red-soft)', color: 'var(--red)', fontSize: 14, cursor: 'pointer', flexShrink: 0 }}
                        >
                          ×
                        </button>
                      </div>
                      <textarea
                        value={q.QuerySQL}
                        onChange={e => updateQueryRow(i, 'QuerySQL', e.target.value)}
                        placeholder={`SELECT ... WHERE OrderNumber = @${formData.KeyParam || 'key'}`}
                        style={{ width: '100%', height: 100, padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 11.5, fontFamily: 'monospace', color: 'var(--text)', background: 'var(--surface)', outline: 'none', resize: 'vertical', lineHeight: 1.4 }}
                      />
                    </div>
                  ))}
                  {formData.Queries.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>No queries added yet.</div>
                  )}
                </div>
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
