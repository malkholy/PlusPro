import { useState, useEffect, useMemo } from 'react';
import { apiCall } from '../shared/api.js';

const EMPTY_FORM = {
  PageGroupID: '',
  Label: '',
  Icon: '',
  Description: '',
  IsGroup: false,
  ParentGroupID: '',
  SortOrder: 99
};

export default function PageMasterDrawer({ user, editItem, groups, onClose, onSaveSuccess }) {
  const isNewInitially = !editItem;

  const [activeTab, setActiveTab] = useState('main');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [formData, setFormData] = useState(() => editItem ? {
    PageGroupID: editItem.PageGroupID,
    Label: editItem.Label,
    Icon: editItem.Icon || '',
    Description: editItem.Description || '',
    IsGroup: !!editItem.IsGroup,
    ParentGroupID: editItem.ParentID || '',
    SortOrder: editItem.SortOrder ?? 99
  } : { ...EMPTY_FORM, IsGroup: !!editItem?.IsGroup });

  // The PageGroupID is only usable for Filters/User Authorization once it actually exists in the DB.
  const [savedPageGroupID, setSavedPageGroupID] = useState(editItem && !editItem.isNew ? editItem.PageGroupID : null);
  const isNew = !savedPageGroupID;

  // Filters tab state
  const [queries, setQueries] = useState([]);
  const [queriesLoading, setQueriesLoading] = useState(false);
  const [linkedQueryIds, setLinkedQueryIds] = useState(new Set());
  const [filterSaving, setFilterSaving] = useState(null);
  const [queryToLink, setQueryToLink] = useState('');
  const [queryToLinkGeneral, setQueryToLinkGeneral] = useState('');

  // User Authorization tab state
  const [systemUsers, setSystemUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userPermissions, setUserPermissions] = useState([]);
  const [authSaving, setAuthSaving] = useState(null);
  const [userToGrant, setUserToGrant] = useState('');

  // Operations tab state -- read-only list of PLS.OperationMaster rows
  // registered against this PageGroupID (see src/shared/permissions.js /
  // UserPermissions.jsx for how these get granted to users).
  const [operations, setOperations] = useState([]);
  const [operationsLoading, setOperationsLoading] = useState(false);

  useEffect(() => {
    if ((activeTab === 'filters' || activeTab === 'queries') && savedPageGroupID) loadQueries();
    if (activeTab === 'auth' && savedPageGroupID) loadAuth();
    if (activeTab === 'operations' && savedPageGroupID) loadOperations();
  }, [activeTab, savedPageGroupID]);

  async function loadQueries() {
    setQueriesLoading(true);
    try {
      const res = await apiCall('GetQueryMaster', {}, {}, 'plus');
      if (res.State === 0) {
        const qMap = {};
        (res.List0 || []).forEach(row => {
          if (!qMap[row.QueryID]) {
            qMap[row.QueryID] = { ...row, PageGroups: [] };
          }
          if (row.PageGroupID) qMap[row.QueryID].PageGroups.push(row.PageGroupID);
        });
        const list = Object.values(qMap);
        setQueries(list);
        setLinkedQueryIds(new Set(list.filter(q => q.PageGroups.includes(savedPageGroupID)).map(q => q.QueryID)));
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    }
    setQueriesLoading(false);
  }

  async function loadAuth() {
    setUsersLoading(true);
    try {
      const [uRes, permRes] = await Promise.all([
        apiCall('GetSystemUsers', {}, {}, 'plus'),
        apiCall('GetUserPagePermissions', {}, {}, 'plus')
      ]);
      if (uRes.State === 0) setSystemUsers(uRes.List0 || []);
      if (permRes.State === 0) {
        setUserPermissions((permRes.List0 || []).filter(p => p.PageGroupID === savedPageGroupID));
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    }
    setUsersLoading(false);
  }

  async function loadOperations() {
    setOperationsLoading(true);
    try {
      const res = await apiCall('GetOperationMaster', {}, {}, 'plus');
      if (res.State === 0) {
        setOperations((res.List0 || []).filter(op => op.PageGroupID === savedPageGroupID));
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    }
    setOperationsLoading(false);
  }

  async function handleSaveMain() {
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
        setSavedPageGroupID(formData.PageGroupID.trim());
        onSaveSuccess();
      } else {
        setError(res.Message || 'Failed to save');
      }
    } catch (err) {
      setError('Save connection error: ' + err.message);
    }
    setSaving(false);
  }

  async function toggleQueryLink(query) {
    const isLinked = linkedQueryIds.has(query.QueryID);
    setFilterSaving(query.QueryID);
    setError(null);
    try {
      const res = await apiCall('SaveQueryPageRelation', {
        QueryID: query.QueryID,
        PageGroupID: savedPageGroupID,
        IsLinked: isLinked ? 0 : 1
      }, {}, 'plus');
      if (res.State === 0) {
        setLinkedQueryIds(prev => {
          const next = new Set(prev);
          isLinked ? next.delete(query.QueryID) : next.add(query.QueryID);
          return next;
        });
      } else {
        setError(res.Message || 'Failed to update query link');
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    }
    setFilterSaving(null);
  }

  async function toggleUserAuth(username, currentlyAllowed) {
    setAuthSaving(username);
    setError(null);
    try {
      const res = await apiCall('SaveUserPagePermission', {
        Username: username,
        PageGroupID: savedPageGroupID,
        CanView: currentlyAllowed ? 0 : 1
      }, {}, 'plus');
      if (res.State === 0) {
        await loadAuth();
      } else {
        setError(res.Message || 'Failed to update permission');
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    }
    setAuthSaving(null);
  }

  const hasAuth = (username) => userPermissions.some(p => p.Username === username && p.CanView);

  // Filters tab is for the FilterPanel's dropdown pickers, which are backed by Lookup-type queries.
  const lookupQueries = queries.filter(q => q.QueryType === 'Lookup');
  const linkedQueries = lookupQueries.filter(q => linkedQueryIds.has(q.QueryID));
  const linkableQueries = lookupQueries.filter(q => !linkedQueryIds.has(q.QueryID));

  // Queries tab is for the page's own data queries (grids/details/actions) — everything except Lookup.
  const generalQueries = queries.filter(q => q.QueryType !== 'Lookup');
  const linkedGeneralQueries = generalQueries.filter(q => linkedQueryIds.has(q.QueryID));
  const linkableGeneralQueries = generalQueries.filter(q => !linkedQueryIds.has(q.QueryID));

  const authorizedUsers = systemUsers.filter(u => hasAuth(u.Username));
  const grantableUsers = systemUsers.filter(u => !hasAuth(u.Username));

  async function handleLinkQuery() {
    if (!queryToLink) return;
    const query = queries.find(q => String(q.QueryID) === String(queryToLink));
    if (!query) return;
    await toggleQueryLink(query);
    setQueryToLink('');
  }

  async function handleLinkGeneralQuery() {
    if (!queryToLinkGeneral) return;
    const query = queries.find(q => String(q.QueryID) === String(queryToLinkGeneral));
    if (!query) return;
    await toggleQueryLink(query);
    setQueryToLinkGeneral('');
  }

  async function handleGrantUser() {
    if (!userToGrant) return;
    await toggleUserAuth(userToGrant, false);
    setUserToGrant('');
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: 760, background: 'var(--bg)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.15)' }}>

        <div style={{ padding: '20px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              {isNew ? (formData.IsGroup ? 'Create New Group' : 'Create New Page') : `Editing: ${formData.PageGroupID}`}
            </h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Configure page details, query filter links, and user authorization</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: 'var(--soft)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 20, padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          {[
            { id: 'main', label: 'Main Info' },
            { id: 'filters', label: 'Filters (Links to Page)' },
            { id: 'queries', label: 'Queries' },
            { id: 'auth', label: 'User Authorization' },
            { id: 'operations', label: 'Operations' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 2px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 700, color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
                borderBottom: '2px solid ' + (activeTab === tab.id ? 'var(--orange)' : 'transparent')
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
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

          {activeTab === 'main' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                    fontSize: 12.5, color: 'var(--text)', background: isNew ? 'var(--surface)' : 'var(--soft)', outline: 'none', fontFamily: 'monospace'
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
                    fontSize: 12.5, color: 'var(--text)', background: isNew ? 'var(--surface)' : 'var(--soft)', outline: 'none'
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
                    fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none'
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
                    fontSize: 14, color: 'var(--text)', background: 'var(--surface)', outline: 'none'
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
                      fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none'
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
                    fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none'
                  }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Description
                </label>
                <textarea
                  value={formData.Description}
                  onChange={e => setFormData({ ...formData, Description: e.target.value })}
                  placeholder="Optional page purpose description..."
                  style={{
                    width: '100%', height: 60, padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 8,
                    fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none', resize: 'none'
                  }}
                />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSaveMain}
                  disabled={saving}
                  style={{
                    height: 36, padding: '0 24px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                    color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 12px var(--orange-glow)'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Main Info'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'filters' && (
            isNew ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Please save this page's Main Info first to configure query filter links.
              </div>
            ) : queriesLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading queries...</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
                  <select
                    value={queryToLink}
                    onChange={e => setQueryToLink(e.target.value)}
                    style={{
                      flex: 1, height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8,
                      fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none'
                    }}
                  >
                    <option value="">(Select a query to link)</option>
                    {linkableQueries.map(q => (
                      <option key={q.QueryID} value={q.QueryID}>{q.QueryName} • {q.Operation}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleLinkQuery}
                    disabled={!queryToLink || filterSaving !== null}
                    style={{
                      height: 38, padding: '0 20px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                      color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    + Link
                  </button>
                </div>

                {linkedQueries.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 10 }}>
                    No filter queries linked to this page yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {linkedQueries.map(q => (
                      <div
                        key={q.QueryID}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px',
                          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>⚡ {q.QueryName}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>{q.Operation} • {q.QueryType}</div>
                        </div>
                        <button
                          onClick={() => toggleQueryLink(q)}
                          disabled={filterSaving === q.QueryID}
                          style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Unlink
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          )}

          {activeTab === 'queries' && (
            isNew ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Please save this page's Main Info first to configure query links.
              </div>
            ) : queriesLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading queries...</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
                  <select
                    value={queryToLinkGeneral}
                    onChange={e => setQueryToLinkGeneral(e.target.value)}
                    style={{
                      flex: 1, height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8,
                      fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none'
                    }}
                  >
                    <option value="">(Select a query to link)</option>
                    {linkableGeneralQueries.map(q => (
                      <option key={q.QueryID} value={q.QueryID}>{q.QueryName} • {q.Operation}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleLinkGeneralQuery}
                    disabled={!queryToLinkGeneral || filterSaving !== null}
                    style={{
                      height: 38, padding: '0 20px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                      color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    + Link
                  </button>
                </div>

                {linkedGeneralQueries.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 10 }}>
                    No queries linked to this page yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {linkedGeneralQueries.map(q => (
                      <div
                        key={q.QueryID}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px',
                          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>⚡ {q.QueryName}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>{q.Operation} • {q.QueryType}</div>
                        </div>
                        <button
                          onClick={() => toggleQueryLink(q)}
                          disabled={filterSaving === q.QueryID}
                          style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Unlink
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          )}

          {activeTab === 'auth' && (
            isNew ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Please save this page's Main Info first to configure user authorization.
              </div>
            ) : usersLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading users...</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
                  <select
                    value={userToGrant}
                    onChange={e => setUserToGrant(e.target.value)}
                    style={{
                      flex: 1, height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8,
                      fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none'
                    }}
                  >
                    <option value="">(Select a user to authorize)</option>
                    {grantableUsers.map(u => (
                      <option key={u.Username} value={u.Username}>{u.Name || u.Username} ({u.Username})</option>
                    ))}
                  </select>
                  <button
                    onClick={handleGrantUser}
                    disabled={!userToGrant || authSaving !== null}
                    style={{
                      height: 38, padding: '0 20px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                      color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    + Grant
                  </button>
                </div>

                {authorizedUsers.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 10 }}>
                    No users are authorized for this page yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {authorizedUsers.map(u => (
                      <div
                        key={u.Username}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px',
                          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{u.Name || u.Username}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{u.Username}{u.GroupName ? ` • ${u.GroupName}` : ''}</div>
                        </div>
                        <button
                          onClick={() => toggleUserAuth(u.Username, true)}
                          disabled={authSaving === u.Username}
                          style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          )}

          {activeTab === 'operations' && (
            isNew ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Please save this page's Main Info first to see its registered operations.
              </div>
            ) : operationsLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading operations...</div>
            ) : operations.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 10 }}>
                No operations registered for this page yet. Operations are added directly in SQL (PLS.OperationMaster) as each form's actions are built -- see src/shared/permissions.js for how they're checked, and User Permissions for granting them to users.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {operations.filter(op => !op.ParentOperationKey).map(op => {
                  const children = operations.filter(c => c.ParentOperationKey === op.OperationKey);
                  return (
                    <div key={op.OperationKey}>
                      <div style={{
                        display: 'flex', flexDirection: 'column', padding: '10px 14px',
                        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10
                      }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>⚙️ {op.Label}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>{op.OperationKey}</div>
                        {op.Description && (
                          <div style={{ fontSize: 11, color: 'var(--hint)', marginTop: 4 }}>{op.Description}</div>
                        )}
                      </div>
                      {children.length > 0 && (
                        <div style={{ paddingLeft: 24, marginLeft: 16, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {children.map(child => (
                            <div key={child.OperationKey} style={{
                              display: 'flex', flexDirection: 'column', padding: '8px 12px',
                              background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 8
                            }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>↳ {child.Label}</div>
                              <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>{child.OperationKey}</div>
                              {child.Description && (
                                <div style={{ fontSize: 10.5, color: 'var(--hint)', marginTop: 4 }}>{child.Description}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
