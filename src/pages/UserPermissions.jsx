import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import SQLFilterInput from '../shared/SQLFilterInput.jsx';

// 3-panel layout: Users | Groups & Pages (name + view checkbox only) |
// selected page's permissions (Grid row-filter / Lookup queries / Operations
// tabs). Mirrors the LookupPermissions.jsx pattern used elsewhere in the app.
export default function UserPermissions({ user }) {
  const [users, setUsers] = useState([]);
  const [pagesAndGroups, setPagesAndGroups] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [queries, setQueries] = useState([]);
  const [queryPermissions, setQueryPermissions] = useState([]);
  const [operationMaster, setOperationMaster] = useState([]);
  const [operationPermissions, setOperationPermissions] = useState([]);

  const [selectedPageGroupID, setSelectedPageGroupID] = useState(null);
  const [activeTab, setActiveTab] = useState('grid'); // 'grid' | 'lookup' | 'operations'
  const [selectedLookupQueryID, setSelectedLookupQueryID] = useState(null);
  const [lookupTabSearch, setLookupTabSearch] = useState('');

  // Loading states
  const [usersLoading, setUsersLoading] = useState(false);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [permsLoading, setPermsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Search & Filter
  const [userSearch, setUserSearch] = useState('');
  const [error, setError] = useState('');

  // Collapse/Expand states
  const [collapsedUserGroups, setCollapsedUserGroups] = useState({});
  const [collapsedNavGroups, setCollapsedNavGroups] = useState({});
  const [showSQLPreviews, setShowSQLPreviews] = useState({});

  useEffect(() => {
    loadUsers();
    loadPagesAndGroups();
    loadQueryMaster();
    loadOperationMaster();
  }, []);

  useEffect(() => {
    // Clear immediately (not just on deselect) so the previous user's
    // checkboxes never flash stale/wrong data while the new user's
    // permissions are still in flight -- permsLoading covers that gap.
    setUserPermissions([]);
    setQueryPermissions([]);
    setOperationPermissions([]);
    if (selectedUser) {
      loadUserPermissions(selectedUser.Username);
    }
  }, [selectedUser]);

  useEffect(() => {
    setActiveTab('grid');
    setSelectedLookupQueryID(null);
    setLookupTabSearch('');
  }, [selectedPageGroupID]);

  async function loadUsers() {
    setUsersLoading(true);
    setError('');
    try {
      const res = await apiCall('GetSystemUsers', {}, {}, 'plus');
      if (res.State !== 0) {
        setError(res.Message || 'Failed to load system users.');
      } else {
        setUsers(res.List0 || []);
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
    }
    setUsersLoading(false);
  }

  async function loadPagesAndGroups() {
    setPagesLoading(true);
    try {
      const res = await apiCall('GetPagesAndGroups', {}, {}, 'plus');
      if (res.State === 0) {
        setPagesAndGroups(res.List0 || []);
      }
    } catch (e) {
      console.error('Failed to load pages and groups:', e);
    }
    setPagesLoading(false);
  }

  async function loadQueryMaster() {
    try {
      const res = await apiCall('GetQueryMaster', {}, {}, 'plus');
      if (res.State === 0) {
        setQueries(res.List0 || []);
      }
    } catch (e) {
      console.error('Failed to load query master list:', e);
    }
  }

  async function loadOperationMaster() {
    try {
      const res = await apiCall('GetOperationMaster', {}, {}, 'plus');
      if (res.State === 0) {
        setOperationMaster(res.List0 || []);
      }
    } catch (e) {
      console.error('Failed to load operation master list:', e);
    }
  }

  async function loadUserPermissions(username) {
    setPermsLoading(true);
    try {
      const res = await apiCall('GetUserPagePermissions', {}, {}, 'plus');
      if (res.State === 0) {
        const filtered = (res.List0 || []).filter(
          p => p.Username.toLowerCase() === username.toLowerCase()
        );
        setUserPermissions(filtered);
      }

      const qRes = await apiCall('GetUserQueryPermissions', {}, {}, 'plus');
      if (qRes.State === 0) {
        const filteredQ = (qRes.List0 || []).filter(
          qp => qp.Username.toLowerCase() === username.toLowerCase()
        );
        setQueryPermissions(filteredQ);
      }

      const opRes = await apiCall('GetUserOperationPermissions', {}, {}, 'plus');
      if (opRes.State === 0) {
        const filteredOp = (opRes.List0 || []).filter(
          op => op.Username.toLowerCase() === username.toLowerCase()
        );
        setOperationPermissions(filteredOp);
      }
    } catch (e) {
      console.error('Failed to load user permissions:', e);
    }
    setPermsLoading(false);
  }

  async function handleTogglePermission(pageGroupId, currentlyAllowed) {
    if (!selectedUser) return;
    const targetState = currentlyAllowed ? 0 : 1;
    setActionLoadingId(pageGroupId);

    try {
      const res = await apiCall('SaveUserPagePermission', {
        Username: selectedUser.Username,
        PageGroupID: pageGroupId,
        CanView: targetState
      }, {}, 'plus');

      if (res.State !== 0) {
        alert(res.Message || 'Failed to update permission.');
      } else {
        await loadUserPermissions(selectedUser.Username);
      }
    } catch (err) {
      alert('Connection error: ' + err.message);
    }
    setActionLoadingId(null);
  }

  async function handleSaveQueryPermission(queryId, filterText, condMode, condBuilder) {
    if (!selectedUser) return;
    setActionLoadingId(`q_${queryId}`);
    try {
      const res = await apiCall('SaveUserQueryPermission', {
        Username: selectedUser.Username,
        QueryID: queryId,
        SQLFilter: filterText,
        CondMode: condMode,
        CondBuilder: condBuilder
      }, {}, 'plus');

      if (res.State !== 0) {
        alert(res.Message || 'Failed to update query permission.');
      } else {
        await loadUserPermissions(selectedUser.Username);
      }
    } catch (err) {
      alert('Connection error: ' + err.message);
    }
    setActionLoadingId(null);
  }

  async function handleToggleOperationPermission(operationKey, currentlyAllowed) {
    if (!selectedUser) return;
    const targetState = currentlyAllowed ? 0 : 1;
    setActionLoadingId(`op_${operationKey}`);
    try {
      const res = await apiCall('SaveUserOperationPermission', {
        Username: selectedUser.Username,
        OperationKey: operationKey,
        CanPerform: targetState
      }, {}, 'plus');

      if (res.State !== 0) {
        alert(res.Message || 'Failed to update operation permission.');
      } else {
        await loadUserPermissions(selectedUser.Username);
      }
    } catch (err) {
      alert('Connection error: ' + err.message);
    }
    setActionLoadingId(null);
  }

  const isUserAdmin = (usr) => {
    if (!usr) return false;
    const usernameLower = (usr.Username || '').toLowerCase();
    const adminBypassList = [
      'mhd',
      'mohamed',
      'malkholy',
      'm.alkholy',
      'mohamed.kholy',
      'mohamed.alkholy',
      'ma'
    ];
    if (adminBypassList.includes(usernameLower)) return true;
    const val = usr.IsAdmin !== undefined ? usr.IsAdmin : (usr.isAdmin !== undefined ? usr.isAdmin : usr.isadmin);
    return val === 1 || val === true || String(val) === '1' || String(val) === 'true';
  };

  const hasPermission = (pageGroupId) => {
    return userPermissions.some(p => p.PageGroupID === pageGroupId && p.CanView);
  };

  const hasOperationPermission = (operationKey) => {
    return operationPermissions.some(p => p.OperationKey === operationKey && p.CanPerform);
  };

  // Filter user list based on search input
  const filteredUsers = users.filter(u =>
    (u.Username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.Name || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  const groupedUsers = filteredUsers.reduce((acc, u) => {
    const grp = u.GroupName || 'General Users';
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(u);
    return acc;
  }, {});

  const groups = pagesAndGroups.filter(pg => pg.IsGroup);
  const orphanPages = pagesAndGroups.filter(pg => !pg.IsGroup && !pg.ParentID);

  const selectedPage = selectedPageGroupID ? pagesAndGroups.find(p => p.PageGroupID === selectedPageGroupID) : null;
  const pageQueriesForSelected = selectedPageGroupID ? queries.filter(q => q.PageGroupID === selectedPageGroupID) : [];
  const gridQuery = pageQueriesForSelected.find(q => q.QueryType === 'Grid');
  const lookupQueriesForSelected = pageQueriesForSelected.filter(q => q.QueryType !== 'Grid');
  const pageOpsForSelected = selectedPageGroupID ? operationMaster.filter(o => o.PageGroupID === selectedPageGroupID) : [];
  const topPageOps = pageOpsForSelected.filter(o => !o.ParentOperationKey);

  function renderQueryDetail(q) {
    const qPerm = queryPermissions.find(qp => qp.QueryID === q.QueryID);
    const isGrid = q.QueryType === 'Grid';
    const showSQL = !!showSQLPreviews[q.QueryID];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>⚡ {q.QueryName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {qPerm?.CondMode === 'deny' && (
              <span style={{ fontSize: 8, fontWeight: 800, color: 'var(--red)', background: 'var(--red-soft)', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                🚫 Denied
              </span>
            )}
            <span style={{
              fontSize: 8, fontWeight: 800, color: isGrid ? 'var(--orange)' : 'var(--muted)',
              background: isGrid ? 'rgba(249,115,22,0.12)' : 'rgba(148,163,184,0.12)',
              padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', whiteSpace: 'nowrap'
            }}>
              {isGrid ? 'Main Grid' : q.QueryType || 'Lookup'}
            </span>
          </div>
        </div>

        <div style={{ fontSize: 9.5, color: 'var(--muted)', fontFamily: 'monospace' }}>
          {q.Operation}
        </div>
        {q.Description && (
          <div style={{ fontSize: 9.5, color: 'var(--hint)' }}>{q.Description}</div>
        )}
        {q.QuerySQL && (
          <button
            onClick={() => setShowSQLPreviews(prev => ({ ...prev, [q.QueryID]: !prev[q.QueryID] }))}
            style={{ background: 'none', border: 'none', color: 'var(--orange)', fontSize: 9.5, fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, outline: 'none', alignSelf: 'flex-start' }}
          >
            {showSQL ? '▼ Hide Query SQL' : '▶ Show Query SQL'}
          </button>
        )}
        {q.QuerySQL && showSQL && (
          <pre style={{
            margin: 0, padding: '6px 10px', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 6,
            fontSize: 9.5, fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap', color: 'var(--text)', lineHeight: 1.4
          }}>
            {q.QuerySQL}
          </pre>
        )}

        {!selectedUser ? (
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontStyle: 'italic' }}>Select a user to view or edit their row-level filter for this query.</div>
        ) : isUserAdmin(selectedUser) ? (
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontStyle: 'italic' }}>Admins bypass row-level filters -- no condition needed.</div>
        ) : (
          <SQLFilterInput
            query={q}
            qPerm={qPerm}
            onSave={(val, mode, builder) => handleSaveQueryPermission(q.QueryID, val, mode, builder)}
            isLoading={actionLoadingId === `q_${q.QueryID}`}
            manualSave
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {error && <div className="err-page">⚠ {error}</div>}

      <div style={{ display: 'flex', flex: 1, gap: 20, minHeight: 0 }}>

        {/* Panel 1: System Users, grouped */}
        <div style={{
          width: 260, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
          display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)', minHeight: 0
        }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>👤 Users</h3>
            <input
              type="text"
              placeholder="🔍 Search users..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              style={{ width: '100%', height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--text)', fontSize: 12.5, outline: 'none' }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
            {usersLoading ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 12.5 }}>Loading users...</div>
            ) : Object.keys(groupedUsers).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 12.5 }}>No users found.</div>
            ) : Object.keys(groupedUsers).map(groupName => {
              const groupUsers = groupedUsers[groupName];
              const isCollapsed = collapsedUserGroups[groupName] !== false;
              return (
                <div key={groupName} style={{ marginBottom: 10 }}>
                  <div
                    onClick={() => setCollapsedUserGroups(prev => ({ ...prev, [groupName]: !isCollapsed }))}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', cursor: 'pointer', borderRadius: 8, background: 'var(--soft)', border: '1px solid var(--border)', marginBottom: 6, userSelect: 'none' }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)' }}>📁 {groupName} ({groupUsers.length})</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>{isCollapsed ? '▶' : '▼'}</span>
                  </div>
                  {!isCollapsed && groupUsers.map(u => {
                    const isSelected = selectedUser?.Username === u.Username;
                    const isAdmin = isUserAdmin(u);
                    return (
                      <div
                        key={u.Username}
                        onClick={() => setSelectedUser(u)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                          background: isSelected ? 'rgba(249,115,22,0.1)' : 'transparent',
                          border: isSelected ? '1px solid rgba(249,115,22,0.2)' : '1px solid transparent',
                          marginBottom: 3
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.Name || u.Username}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>{u.Username}</div>
                        </div>
                        {isAdmin && <span style={{ fontSize: 8, fontWeight: 800, color: 'var(--orange)', background: 'rgba(249,115,22,0.12)', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>ADMIN</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel 2: Groups & Pages -- name and view-checkbox only */}
        <div style={{
          width: 280, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
          display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)', minHeight: 0
        }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>📁 Groups & Pages</h3>
          </div>
          {selectedUser && permsLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderBottom: '1px solid var(--border)', background: 'var(--soft)' }}>
              <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>Loading permissions...</span>
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', opacity: permsLoading ? 0.5 : 1, pointerEvents: permsLoading ? 'none' : 'auto', transition: 'opacity 0.15s' }}>
            {pagesLoading ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 12.5 }}>Loading pages...</div>
            ) : (
              <>
                {groups.map(group => {
                  const groupChildren = pagesAndGroups.filter(pg => pg.ParentID === group.PageGroupID);
                  const isGroupAllowed = hasPermission(group.PageGroupID);
                  const isCollapsed = collapsedNavGroups[group.PageGroupID] !== false;
                  const isGroupSelected = selectedPageGroupID === group.PageGroupID;

                  return (
                    <div key={group.PageGroupID} style={{ marginBottom: 6 }}>
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                          background: isGroupSelected ? 'rgba(249,115,22,0.1)' : 'var(--soft)',
                          border: isGroupSelected ? '1px solid rgba(249,115,22,0.2)' : '1px solid var(--border)',
                          marginBottom: 4
                        }}
                      >
                        <span
                          onClick={() => setCollapsedNavGroups(prev => ({ ...prev, [group.PageGroupID]: !isCollapsed }))}
                          style={{ fontSize: 10, color: 'var(--muted)', cursor: 'pointer' }}
                        >
                          {isCollapsed ? '▶' : '▼'}
                        </span>
                        <input
                          type="checkbox"
                          checked={isGroupAllowed}
                          disabled={!selectedUser || actionLoadingId === group.PageGroupID}
                          onClick={e => e.stopPropagation()}
                          onChange={() => handleTogglePermission(group.PageGroupID, isGroupAllowed)}
                          style={{ width: 15, height: 15, cursor: selectedUser ? 'pointer' : 'not-allowed', flexShrink: 0 }}
                        />
                        <span
                          onClick={() => setSelectedPageGroupID(group.PageGroupID)}
                          style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {group.Label}
                        </span>
                      </div>

                      {!isCollapsed && groupChildren.map(child => {
                        const isChildAllowed = hasPermission(child.PageGroupID);
                        const isChildSelected = selectedPageGroupID === child.PageGroupID;
                        return (
                          <div
                            key={child.PageGroupID}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px 7px 26px', borderRadius: 8, cursor: 'pointer',
                              background: isChildSelected ? 'rgba(249,115,22,0.1)' : 'transparent',
                              border: isChildSelected ? '1px solid rgba(249,115,22,0.2)' : '1px solid transparent',
                              marginBottom: 2, opacity: isGroupAllowed ? 1 : 0.6
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChildAllowed}
                              disabled={!selectedUser || !isGroupAllowed || actionLoadingId === child.PageGroupID}
                              onClick={e => e.stopPropagation()}
                              onChange={() => handleTogglePermission(child.PageGroupID, isChildAllowed)}
                              style={{ width: 14, height: 14, cursor: (selectedUser && isGroupAllowed) ? 'pointer' : 'not-allowed', flexShrink: 0 }}
                            />
                            <span
                              onClick={() => setSelectedPageGroupID(child.PageGroupID)}
                              style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            >
                              {child.Label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {orphanPages.length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, padding: '0 10px' }}>
                      Standalone Pages
                    </div>
                    {orphanPages.map(page => {
                      const isAllowed = hasPermission(page.PageGroupID);
                      const isSelected = selectedPageGroupID === page.PageGroupID;
                      return (
                        <div
                          key={page.PageGroupID}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                            background: isSelected ? 'rgba(249,115,22,0.1)' : 'transparent',
                            border: isSelected ? '1px solid rgba(249,115,22,0.2)' : '1px solid transparent',
                            marginBottom: 2
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            disabled={!selectedUser || actionLoadingId === page.PageGroupID}
                            onClick={e => e.stopPropagation()}
                            onChange={() => handleTogglePermission(page.PageGroupID, isAllowed)}
                            style={{ width: 14, height: 14, cursor: selectedUser ? 'pointer' : 'not-allowed', flexShrink: 0 }}
                          />
                          <span
                            onClick={() => setSelectedPageGroupID(page.PageGroupID)}
                            style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            {page.Label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Panel 3: Selected page's permissions -- Grid / Lookup / Operations tabs */}
        <div style={{
          flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
          display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)', minHeight: 0
        }}>
          {!selectedPage ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 32, gap: 10, color: 'var(--muted)' }}>
              <div style={{ fontSize: 30 }}>🔑</div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Select a Group or Page</div>
              <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>
                Pick a group or page from the middle panel to manage its Grid row-filter, Lookup queries, and Operation permissions.
              </div>
            </div>
          ) : (
            <>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{selectedPage.Icon || '📄'} {selectedPage.Label}</span>
                  {selectedUser && <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 12 }}>for <span style={{ color: 'var(--orange)' }}>{selectedUser.Name || selectedUser.Username}</span></span>}
                </h4>
                {selectedPage.Description && <div style={{ fontSize: 11.5, color: 'var(--hint)', marginTop: 6 }}>{selectedPage.Description}</div>}

                <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginTop: 14 }}>
                  <button
                    onClick={() => setActiveTab('grid')}
                    style={{ height: 30, padding: '0 14px', border: 0, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: activeTab === 'grid' ? 'var(--orange)' : 'var(--surface)', color: activeTab === 'grid' ? '#fff' : 'var(--muted)' }}
                  >
                    📊 Grid Permission
                  </button>
                  <button
                    onClick={() => setActiveTab('lookup')}
                    style={{ height: 30, padding: '0 14px', border: 0, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: activeTab === 'lookup' ? 'var(--orange)' : 'var(--surface)', color: activeTab === 'lookup' ? '#fff' : 'var(--muted)' }}
                  >
                    ⚡ Lookup Queries ({lookupQueriesForSelected.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('operations')}
                    style={{ height: 30, padding: '0 14px', border: 0, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: activeTab === 'operations' ? 'var(--orange)' : 'var(--surface)', color: activeTab === 'operations' ? '#fff' : 'var(--muted)' }}
                  >
                    ⚙️ Operations ({pageOpsForSelected.length})
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
                {selectedUser && permsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 }}>
                    <div className="spinner" />
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>Loading permissions for {selectedUser.Name || selectedUser.Username}...</div>
                  </div>
                ) : activeTab === 'grid' ? (
                  !gridQuery ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No Grid query registered for this page.</div>
                  ) : (
                    renderQueryDetail(gridQuery)
                  )
                ) : activeTab === 'lookup' ? (
                  lookupQueriesForSelected.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8, color: 'var(--muted)' }}>
                      <div style={{ fontSize: 26 }}>⚡</div>
                      <div style={{ fontSize: 12.5, fontStyle: 'italic' }}>No Lookup or Detail queries registered for this page.</div>
                    </div>
                  ) : (() => {
                    const filteredLookupQueries = lookupQueriesForSelected.filter(q =>
                      (q.QueryName || '').toLowerCase().includes(lookupTabSearch.toLowerCase()) ||
                      (q.Operation || '').toLowerCase().includes(lookupTabSearch.toLowerCase())
                    );
                    const selectedLookupQuery = lookupQueriesForSelected.find(q => q.QueryID === selectedLookupQueryID);
                    return (
                      <div style={{ display: 'flex', gap: 18, minHeight: 320, alignItems: 'flex-start' }}>
                        {/* Sub-list of Lookup/Detail queries for this page */}
                        <div style={{ width: 230, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {lookupQueriesForSelected.length > 5 && (
                            <input
                              type="text"
                              placeholder="🔍 Search queries..."
                              value={lookupTabSearch}
                              onChange={e => setLookupTabSearch(e.target.value)}
                              style={{ width: '100%', height: 30, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--text)', fontSize: 11.5, outline: 'none' }}
                            />
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto', paddingRight: 2 }}>
                            {filteredLookupQueries.length === 0 ? (
                              <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', padding: '8px 2px' }}>No matching queries.</div>
                            ) : filteredLookupQueries.map(q => {
                              const qPerm = queryPermissions.find(qp => qp.QueryID === q.QueryID);
                              const isDenied = qPerm?.CondMode === 'deny';
                              const hasFilter = !isDenied && !!qPerm?.SQLFilter;
                              const isSelected = selectedLookupQueryID === q.QueryID;
                              return (
                                <div
                                  key={q.QueryID}
                                  onClick={() => setSelectedLookupQueryID(q.QueryID)}
                                  style={{
                                    padding: '9px 12px', borderRadius: 9, cursor: 'pointer',
                                    background: isSelected ? 'rgba(249,115,22,0.1)' : 'var(--soft)',
                                    border: isSelected ? '1px solid rgba(249,115,22,0.25)' : '1px solid var(--border)',
                                    transition: 'all 0.12s'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                    <span style={{ fontSize: 11.5, fontWeight: 700, color: isSelected ? 'var(--orange)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      ⚡ {q.QueryName}
                                    </span>
                                    <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>›</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 3 }}>
                                    <span style={{ fontSize: 9.5, color: 'var(--muted)', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {q.Operation}
                                    </span>
                                    {isDenied && (
                                      <span style={{ fontSize: 7.5, fontWeight: 800, color: 'var(--red)', background: 'var(--red-soft)', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>DENIED</span>
                                    )}
                                    {hasFilter && (
                                      <span style={{ fontSize: 7.5, fontWeight: 800, color: 'var(--green, #16a34a)', background: 'var(--green-soft, #16a34a22)', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>FILTERED</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Detail / condition editor for the selected query */}
                        <div style={{ flex: 1, minWidth: 0, borderLeft: '1px solid var(--border)', paddingLeft: 18 }}>
                          {selectedLookupQuery ? (
                            renderQueryDetail(selectedLookupQuery)
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8, color: 'var(--muted)' }}>
                              <div style={{ fontSize: 26 }}>👈</div>
                              <div style={{ fontSize: 12, textAlign: 'center' }}>Select a query on the left to view or edit its condition.</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  pageOpsForSelected.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No operations registered for this page.</div>
                  ) : !selectedUser ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Select a user to view or edit operation permissions.</div>
                  ) : isUserAdmin(selectedUser) ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Admins bypass operation permissions -- no grants needed.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {topPageOps.map(op => {
                        const isAllowed = hasOperationPermission(op.OperationKey);
                        const children = pageOpsForSelected.filter(o => o.ParentOperationKey === op.OperationKey);
                        return (
                          <div key={op.OperationKey}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                              <div style={{ minWidth: 0, flex: 1, paddingRight: 16 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{op.Label}</div>
                                {op.Description && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{op.Description}</div>}
                              </div>
                              <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={isAllowed}
                                  disabled={actionLoadingId === `op_${op.OperationKey}`}
                                  onChange={() => handleToggleOperationPermission(op.OperationKey, isAllowed)}
                                  style={{ width: 16, height: 16, marginRight: 8, cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: 11.5, fontWeight: 600, color: isAllowed ? 'var(--orange)' : 'var(--muted)' }}>
                                  {actionLoadingId === `op_${op.OperationKey}` ? 'Saving...' : isAllowed ? 'Allowed' : 'Denied'}
                                </span>
                              </label>
                            </div>

                            {children.length > 0 && (
                              <div style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {children.map(child => {
                                  const isChildAllowed = hasOperationPermission(child.OperationKey);
                                  return (
                                    <div key={child.OperationKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                                      <div style={{ minWidth: 0, flex: 1, paddingRight: 16 }}>
                                        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>↳ {child.Label}</div>
                                        {child.Description && <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{child.Description}</div>}
                                      </div>
                                      <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                                        <input
                                          type="checkbox"
                                          checked={isChildAllowed}
                                          disabled={actionLoadingId === `op_${child.OperationKey}`}
                                          onChange={() => handleToggleOperationPermission(child.OperationKey, isChildAllowed)}
                                          style={{ width: 15, height: 15, marginRight: 8, cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: 11, fontWeight: 600, color: isChildAllowed ? 'var(--orange)' : 'var(--muted)' }}>
                                          {actionLoadingId === `op_${child.OperationKey}` ? 'Saving...' : isChildAllowed ? 'Allowed' : 'Denied'}
                                        </span>
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
