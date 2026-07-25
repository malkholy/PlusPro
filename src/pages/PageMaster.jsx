import { useState, useEffect, useMemo } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import PageMasterDrawer from './PageMasterDrawer.jsx';
import PageBuilder from './PageBuilder.jsx';

const EMPTY_FORM = {
  PageGroupID: '',
  Label: '',
  Icon: '',
  Description: '',
  IsGroup: false,
  ParentGroupID: '',
  SortOrder: 99
};

export default function PageMaster({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [selected, setSelected] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'tree' or 'grid'
  const [drawerItem, setDrawerItem] = useState(null); // null (closed) | { isNew: true } | full row
  const [showPageBuilder, setShowPageBuilder] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiCall('GetPagesAndGroups', {}, {}, 'plus');
      if (res.State === 0) {
        setItems(res.List0 || []);
      } else {
        setError(res.Message || 'Failed to load pages and groups');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setLoading(false);
  }

  const groups = useMemo(() => items.filter(i => i.IsGroup), [items]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i =>
      i.Label.toLowerCase().includes(q) ||
      i.PageGroupID.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Build a flat, ordered tree list: groups followed by their children
  const treeRows = useMemo(() => {
    const rows = [];
    const topGroups = filteredItems
      .filter(i => i.IsGroup)
      .sort((a, b) => a.SortOrder - b.SortOrder);
    const orphanPages = filteredItems
      .filter(i => !i.IsGroup && !i.ParentID)
      .sort((a, b) => a.SortOrder - b.SortOrder);

    topGroups.forEach(g => {
      rows.push({ ...g, depth: 0 });
      filteredItems
        .filter(i => i.ParentID === g.PageGroupID)
        .sort((a, b) => a.SortOrder - b.SortOrder)
        .forEach(child => rows.push({ ...child, depth: 1 }));
    });
    orphanPages.forEach(p => rows.push({ ...p, depth: 0 }));

    return rows;
  }, [filteredItems]);

  function handleSelect(item) {
    setSelected(item);
    setIsNew(false);
    setSuccessMsg(null);
    setError(null);
    setFormData({
      PageGroupID: item.PageGroupID,
      Label: item.Label,
      Icon: item.Icon || '',
      Description: item.Description || '',
      IsGroup: !!item.IsGroup,
      ParentGroupID: item.ParentID || '',
      SortOrder: item.SortOrder ?? 99
    });
  }

  function handleNew(asGroup) {
    setSelected(null);
    setIsNew(true);
    setSuccessMsg(null);
    setError(null);
    setFormData({ ...EMPTY_FORM, IsGroup: asGroup });
  }

  async function handleSave() {
    if (!formData.PageGroupID.trim() || !formData.Label.trim()) {
      setError('Page ID and Label are required fields.');
      return;
    }
    if (!formData.IsGroup && !formData.ParentGroupID) {
      setError('A page must belong to a parent group.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await apiCall('SavePageOrGroup', {
        PageGroupID: formData.PageGroupID.trim(),
        ParentGroupID: formData.IsGroup ? null : formData.ParentGroupID,
        SortOrder: formData.SortOrder,
        Label: formData.Label.trim(),
        Icon: formData.Icon.trim(),
        Description: formData.Description.trim(),
        IsGroup: formData.IsGroup ? 1 : 0
      }, {}, 'plus');

      if (res.State === 0) {
        setSuccessMsg('✓ Saved successfully!');
        setIsNew(false);
        await loadData();
        setSelected(prev => ({ ...formData, ParentID: formData.ParentGroupID }));
      } else {
        setError(res.Message || 'Failed to save');
      }
    } catch (err) {
      setError('Save connection error: ' + err.message);
    }
    setSaving(false);
  }

  async function deleteItem(item) {
    if (!item) return;
    const hasChildren = items.some(i => i.ParentID === item.PageGroupID);
    if (hasChildren) {
      setError('Cannot delete this group while it still has pages inside it. Move or delete its pages first.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${item.Label}"? This will also remove related permissions and query bindings.`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiCall('DeletePageOrGroup', { PageGroupID: item.PageGroupID }, {}, 'plus');
      if (res.State === 0) {
        setSuccessMsg('✓ Deleted successfully.');
        setSelected(null);
        setIsNew(false);
        setFormData(EMPTY_FORM);
        await loadData();
      } else {
        setError(res.Message || 'Failed to delete');
      }
    } catch (err) {
      setError('Delete connection error: ' + err.message);
    }
    setSaving(false);
  }

  function handleDelete() {
    return deleteItem(selected);
  }

  const groupLabelById = useMemo(() => {
    const map = {};
    groups.forEach(g => { map[g.PageGroupID] = g.Label; });
    return map;
  }, [groups]);

  const gridColumns = [
    { key: 'Icon', label: '', width: 50, render: v => <span style={{ fontSize: 16 }}>{v}</span> },
    { key: 'Label', label: 'Label', width: 220 },
    { key: 'PageGroupID', label: 'ID', width: 180 },
    { key: 'IsGroup', label: 'Type', width: 100, render: v => v ? 'Group' : 'Page' },
    { key: 'ParentID', label: 'Parent', width: 180, render: v => (v ? (groupLabelById[v] || v) : '—') },
    { key: 'SortOrder', label: 'Sort', width: 90, numeric: true },
    { key: 'Description', label: 'Description', flex: 1 }
  ];

  const showForm = isNew || !!selected;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Page Master</h2>
          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
            Manage sidebar navigation groups and pages registered in the system.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('tree')}
              title="Tree View"
              style={{
                height: 34, padding: '0 14px', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                background: viewMode === 'tree' ? 'var(--orange)' : 'var(--soft)',
                color: viewMode === 'tree' ? '#fff' : 'var(--muted)'
              }}
            >
              🌳 Tree
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              style={{
                height: 34, padding: '0 14px', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                background: viewMode === 'grid' ? 'var(--orange)' : 'var(--soft)',
                color: viewMode === 'grid' ? '#fff' : 'var(--muted)'
              }}
            >
              ▦ Grid
            </button>
          </div>
          <button
            onClick={() => setShowPageBuilder(true)}
            style={{
              height: 34, padding: '0 16px', background: 'var(--soft)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            🪄 AI Page Builder
          </button>
          <button
            onClick={() => handleNew(true)}
            style={{
              height: 34, padding: '0 16px', background: 'var(--soft)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <span>+</span> New Group
          </button>
          <button
            onClick={() => handleNew(false)}
            style={{
              height: 34, padding: '0 16px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(249,115,22,0.18)', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <span>+</span> New Page
          </button>
        </div>
      </div>

      {viewMode === 'grid' && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <DataGrid
            title="Pages & Groups"
            subtitle="All sidebar navigation groups and pages registered in the system"
            columns={gridColumns}
            rows={items}
            loading={loading}
            onAdd={() => setDrawerItem({ isNew: true, IsGroup: false })}
            onEdit={(row) => setDrawerItem(row)}
            onDelete={(rows) => deleteItem(rows[0])}
            onRefresh={loadData}
          />
        </div>
      )}

      {drawerItem && (
        <PageMasterDrawer
          user={user}
          editItem={drawerItem.isNew ? null : drawerItem}
          groups={groups}
          onClose={() => setDrawerItem(null)}
          onSaveSuccess={loadData}
        />
      )}

      {showPageBuilder && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
            <button
              onClick={() => { setShowPageBuilder(false); loadData(); }}
              style={{
                height: 32, padding: '0 16px', background: 'var(--soft)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
              }}
            >
              ✕ Close
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 24 }}>
            <PageBuilder user={user} />
          </div>
        </div>
      )}

      {viewMode === 'tree' && (
      <div style={{ display: 'flex', flex: 1, gap: 24, minHeight: 0 }}>
        {/* Left Side: Tree list */}
        <div style={{
          width: 380, flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, display: 'flex', flexDirection: 'column', minHeight: 0, boxShadow: 'var(--shadow)'
        }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search pages / groups..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', height: 36, padding: '0 12px 0 32px', background: 'var(--soft)',
                  border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', outline: 'none'
                }}
              />
              <span style={{ position: 'absolute', left: 10, top: 9, fontSize: 13, color: 'var(--hint)' }}>🔍</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading pages...</div>
            ) : treeRows.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No pages or groups found.</div>
            ) : (
              treeRows.map(item => {
                const isSelected = selected?.PageGroupID === item.PageGroupID;
                return (
                  <div
                    key={item.PageGroupID}
                    onClick={() => handleSelect(item)}
                    style={{
                      padding: '10px 14px',
                      marginLeft: item.depth * 18,
                      borderRadius: 10,
                      cursor: 'pointer',
                      background: isSelected ? 'var(--orange-soft)' : 'transparent',
                      border: '1px solid ' + (isSelected ? 'var(--orange)' : 'transparent'),
                      marginBottom: 4,
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: item.IsGroup ? 800 : 700, color: 'var(--text)' }}>
                        {item.Icon} {item.Label}
                      </span>
                      {item.IsGroup && (
                        <span style={{
                          fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', color: 'var(--orange)',
                          background: 'rgba(249,115,22,0.1)', padding: '2px 6px', borderRadius: 4
                        }}>
                          Group
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, fontFamily: 'monospace' }}>
                      {item.PageGroupID} • sort {item.SortOrder}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Form */}
        <div style={{
          flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
          boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', minHeight: 0
        }}>
          {!showForm ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Select a page or group from the list, or create a new one.
            </div>
          ) : (
            <>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>
                  {isNew ? (formData.IsGroup ? 'Create New Group' : 'Create New Page') : `Editing: ${formData.PageGroupID}`}
                </h3>
                {!isNew && (
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✕ Delete
                  </button>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {error && (
                  <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--red)', padding: 10, borderRadius: 8, fontSize: 12.5, marginBottom: 16 }}>
                    {error}
                  </div>
                )}
                {successMsg && (
                  <div style={{ background: 'var(--green-soft)', border: '1px solid rgba(22,163,74,0.2)', color: 'var(--green)', padding: 10, borderRadius: 8, fontSize: 12.5, marginBottom: 16 }}>
                    {successMsg}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                      Page/Group ID
                    </label>
                    <input
                      type="text"
                      value={formData.PageGroupID}
                      disabled={!isNew}
                      onChange={e => setFormData({ ...formData, PageGroupID: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
                      placeholder="e.g. item_master"
                      style={{
                        width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8,
                        fontSize: 12.5, color: 'var(--text)', background: isNew ? 'var(--bg)' : 'var(--soft)', outline: 'none', fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                      Type
                    </label>
                    <select
                      value={formData.IsGroup ? 'group' : 'page'}
                      disabled={!isNew}
                      onChange={e => setFormData({ ...formData, IsGroup: e.target.value === 'group' })}
                      style={{
                        width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8,
                        fontSize: 12.5, color: 'var(--text)', background: isNew ? 'var(--bg)' : 'var(--soft)', outline: 'none'
                      }}
                    >
                      <option value="page">Page</option>
                      <option value="group">Group</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                      Label
                    </label>
                    <input
                      type="text"
                      value={formData.Label}
                      onChange={e => setFormData({ ...formData, Label: e.target.value })}
                      placeholder="e.g. Item Master"
                      style={{
                        width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8,
                        fontSize: 12.5, color: 'var(--text)', background: 'var(--bg)', outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                      Icon (emoji)
                    </label>
                    <input
                      type="text"
                      value={formData.Icon}
                      onChange={e => setFormData({ ...formData, Icon: e.target.value })}
                      placeholder="🏷️"
                      style={{
                        width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8,
                        fontSize: 14, color: 'var(--text)', background: 'var(--bg)', outline: 'none'
                      }}
                    />
                  </div>

                  {!formData.IsGroup && (
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                        Parent Group
                      </label>
                      <select
                        value={formData.ParentGroupID}
                        onChange={e => setFormData({ ...formData, ParentGroupID: e.target.value })}
                        style={{
                          width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8,
                          fontSize: 12.5, color: 'var(--text)', background: 'var(--bg)', outline: 'none'
                        }}
                      >
                        <option value="">(Select Group)</option>
                        {groups.map(g => (
                          <option key={g.PageGroupID} value={g.PageGroupID}>{g.Label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={formData.SortOrder}
                      onChange={e => setFormData({ ...formData, SortOrder: parseInt(e.target.value, 10) || 0 })}
                      style={{
                        width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8,
                        fontSize: 12.5, color: 'var(--text)', background: 'var(--bg)', outline: 'none'
                      }}
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
                    placeholder="Optional page purpose description..."
                    style={{
                      width: '100%', height: 60, padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 8,
                      fontSize: 12.5, color: 'var(--text)', background: 'var(--bg)', outline: 'none', resize: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  onClick={() => { setSelected(null); setIsNew(false); setFormData(EMPTY_FORM); setError(null); setSuccessMsg(null); }}
                  disabled={saving}
                  style={{
                    height: 36, padding: '0 16px', background: 'var(--soft)', color: 'var(--text)',
                    border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
                  }}
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
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
