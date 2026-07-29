import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import SQLFilterInput from '../shared/SQLFilterInput.jsx';

// Dedicated 3-panel screen for managing row-level filters on Lookup-type
// queries specifically. UserPermissions.jsx already edits these too, but
// only nested under whichever page a query happens to be linked to via
// PageQueries -- a Lookup query with no page link (very common: they're
// matched purely by Operation name at runtime, see the lookup fallthrough
// in APIPlusOperation.sql) never shows up there. This page lists every
// Lookup query directly, regardless of page linkage.
const ADMIN_BYPASS = ['mhd', 'mohamed', 'malkholy', 'm.alkholy', 'mohamed.kholy', 'mohamed.alkholy', 'ma'];

function isUserAdmin(usr) {
  if (!usr) return false;
  if (ADMIN_BYPASS.includes((usr.Username || '').toLowerCase())) return true;
  const val = usr.IsAdmin !== undefined ? usr.IsAdmin : (usr.isAdmin !== undefined ? usr.isAdmin : usr.isadmin);
  return val === 1 || val === true || String(val) === '1' || String(val) === 'true';
}

export default function LookupPermissions({ user }) {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [collapsedUserGroups, setCollapsedUserGroups] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);

  const [queries, setQueries] = useState([]);
  const [queryPageLinks, setQueryPageLinks] = useState([]);
  const [queriesLoading, setQueriesLoading] = useState(false);
  const [querySearch, setQuerySearch] = useState('');
  const [selectedQuery, setSelectedQuery] = useState(null);

  const [pagesAndGroups, setPagesAndGroups] = useState([]);
  const [activeTab, setActiveTab] = useState('condition');

  const [queryPermissions, setQueryPermissions] = useState([]);
  const [permsLoading, setPermsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState('');

  const [pendingBulkAction, setPendingBulkAction] = useState(null); // 'deny' | 'permit' | null
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    loadUsers();
    loadLookupQueries();
    loadPagesAndGroups();
  }, []);

  useEffect(() => {
    setActiveTab('condition');
  }, [selectedQuery]);

  useEffect(() => {
    setPendingBulkAction(null);
    if (selectedUser) {
      loadUserQueryPermissions(selectedUser.Username);
    } else {
      setQueryPermissions([]);
    }
  }, [selectedUser]);

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

  async function loadLookupQueries() {
    setQueriesLoading(true);
    try {
      const res = await apiCall('GetQueryMaster', {}, {}, 'plus');
      if (res.State === 0) {
        // GetQueryMaster returns one row per (Query, linked Page) -- de-dupe
        // by QueryID for the middle panel's list, but keep every row (incl.
        // the PageGroupID) around too so the "Linked Pages" tab can show ALL
        // pages a query is linked to, not just the first one.
        const rows = (res.List0 || []).filter(r => r.QueryType === 'Lookup');
        setQueryPageLinks(rows.filter(r => r.PageGroupID));

        const map = {};
        rows.forEach(row => {
          if (!map[row.QueryID]) {
            map[row.QueryID] = row;
          }
        });
        setQueries(Object.values(map).sort((a, b) => a.QueryName.localeCompare(b.QueryName)));
      }
    } catch (e) {
      console.error('Failed to load lookup queries:', e);
    }
    setQueriesLoading(false);
  }

  async function loadPagesAndGroups() {
    try {
      const res = await apiCall('GetPagesAndGroups', {}, {}, 'plus');
      if (res.State === 0) {
        setPagesAndGroups(res.List0 || []);
      }
    } catch (e) {
      console.error('Failed to load pages and groups:', e);
    }
  }

  async function loadUserQueryPermissions(username) {
    setPermsLoading(true);
    try {
      const res = await apiCall('GetUserQueryPermissions', {}, {}, 'plus');
      if (res.State === 0) {
        setQueryPermissions((res.List0 || []).filter(p => p.Username.toLowerCase() === username.toLowerCase()));
      }
    } catch (e) {
      console.error('Failed to load user query permissions:', e);
    }
    setPermsLoading(false);
  }

  async function handleSaveQueryPermission(queryId, filterText, condMode, condBuilder) {
    if (!selectedUser) return;
    setActionLoadingId(queryId);
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
        await loadUserQueryPermissions(selectedUser.Username);
      }
    } catch (err) {
      alert('Connection error: ' + err.message);
    }
    setActionLoadingId(null);
  }

  async function handleBulkAction(action) {
    if (!selectedUser || queries.length === 0) return;
    setBulkLoading(true);
    setPendingBulkAction(null);
    try {
      for (const q of queries) {
        const res = await apiCall('SaveUserQueryPermission', {
          Username: selectedUser.Username,
          QueryID: q.QueryID,
          SQLFilter: action === 'deny' ? '1=0' : null,
          CondMode: action === 'deny' ? 'deny' : 'sql',
          CondBuilder: null
        }, {}, 'plus');
        if (res.State !== 0) {
          alert(`Failed on "${q.QueryName}": ${res.Message || 'Unknown error'}`);
          break;
        }
      }
      await loadUserQueryPermissions(selectedUser.Username);
    } catch (err) {
      alert('Connection error: ' + err.message);
    }
    setBulkLoading(false);
  }

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

  const filteredQueries = queries.filter(q =>
    (q.QueryName || '').toLowerCase().includes(querySearch.toLowerCase()) ||
    (q.Operation || '').toLowerCase().includes(querySearch.toLowerCase())
  );

  const currentPerm = selectedQuery ? queryPermissions.find(p => p.QueryID === selectedQuery.QueryID) : null;

  const linkedPages = selectedQuery
    ? queryPageLinks.filter(p => p.QueryID === selectedQuery.QueryID)
    : [];
  function pageLabelFor(pageGroupID) {
    const pg = pagesAndGroups.find(p => p.PageGroupID === pageGroupID);
    return pg ? pg.Label : pageGroupID;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {error && <div className="err-page">⚠ {error}</div>}

      <div style={{ display: 'flex', flex: 1, gap: 20, minHeight: 0 }}>

        {/* Panel 1: System Users, grouped */}
        <div style={{
          width: 280, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
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

        {/* Panel 2: Lookup queries */}
        <div style={{
          width: 340, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
          display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)', minHeight: 0
        }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>⚡ Lookup Queries</h3>
            <input
              type="text"
              placeholder="🔍 Search queries..."
              value={querySearch}
              onChange={e => setQuerySearch(e.target.value)}
              style={{ width: '100%', height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--text)', fontSize: 12.5, outline: 'none' }}
            />

            {selectedUser && !isUserAdmin(selectedUser) && (
              <div style={{ marginTop: 10 }}>
                {pendingBulkAction ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: pendingBulkAction === 'deny' ? 'var(--red)' : 'var(--green, #16a34a)', flex: 1 }}>
                      {pendingBulkAction === 'deny' ? `Deny all ${queries.length} queries?` : `Permit all ${queries.length} queries?`}
                    </span>
                    <button
                      onClick={() => handleBulkAction(pendingBulkAction)}
                      disabled={bulkLoading}
                      className="btn-primary"
                      style={{ height: 26, padding: '0 10px', fontSize: 10.5 }}
                    >
                      {bulkLoading ? '...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setPendingBulkAction(null)}
                      disabled={bulkLoading}
                      className="btn-secondary"
                      style={{ height: 26, padding: '0 10px', fontSize: 10.5 }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setPendingBulkAction('deny')}
                      style={{ flex: 1, height: 28, borderRadius: 8, border: '1px solid var(--red)', background: 'var(--red-soft)', color: 'var(--red)', fontWeight: 700, fontSize: 10.5, cursor: 'pointer', fontFamily: 'var(--font)' }}
                    >
                      🚫 Deny All
                    </button>
                    <button
                      onClick={() => setPendingBulkAction('permit')}
                      style={{ flex: 1, height: 28, borderRadius: 8, border: '1px solid var(--green, #16a34a)', background: 'var(--green-soft, #16a34a22)', color: 'var(--green, #16a34a)', fontWeight: 700, fontSize: 10.5, cursor: 'pointer', fontFamily: 'var(--font)' }}
                    >
                      ✅ Permit All
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
            {queriesLoading ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 12.5 }}>Loading queries...</div>
            ) : filteredQueries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 12.5 }}>No lookup queries found.</div>
            ) : filteredQueries.map(q => {
              const isSelected = selectedQuery?.QueryID === q.QueryID;
              const qPerm = queryPermissions.find(p => p.QueryID === q.QueryID);
              const isDenied = qPerm?.CondMode === 'deny';
              const hasFilter = !isDenied && !!qPerm?.SQLFilter;
              return (
                <div
                  key={q.QueryID}
                  onClick={() => setSelectedQuery(q)}
                  style={{
                    padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                    background: isSelected ? 'rgba(249,115,22,0.1)' : 'transparent',
                    border: isSelected ? '1px solid rgba(249,115,22,0.2)' : '1px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.QueryName}</div>
                    {selectedUser && isDenied && <span style={{ fontSize: 8, fontWeight: 800, color: 'var(--red)', background: 'var(--red-soft)', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>🚫 DENIED</span>}
                    {selectedUser && hasFilter && <span style={{ fontSize: 8, fontWeight: 800, color: 'var(--green, #16a34a)', background: 'var(--green-soft, #16a34a22)', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>FILTERED</span>}
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>{q.Operation}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel 3: Condition editor for the selected (User, Query) pair */}
        <div style={{
          flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
          display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)', minHeight: 0
        }}>
          {!selectedQuery ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 32, gap: 10, color: 'var(--muted)' }}>
              <div style={{ fontSize: 30 }}>🔧</div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Select a Lookup Query</div>
              <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>
                Pick a query from the middle panel to view its per-user filter condition or which pages it's linked to. Also pick a user on the left to edit a condition.
              </div>
            </div>
          ) : (
            <>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>
                    {selectedQuery.QueryName}
                    {selectedUser && <> <span style={{ color: 'var(--muted)', fontWeight: 600 }}>for</span> <span style={{ color: 'var(--orange)' }}>{selectedUser.Name || selectedUser.Username}</span></>}
                  </span>
                  {selectedUser && currentPerm?.CondMode === 'deny' && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--red)', background: 'var(--red-soft)', padding: '2px 7px', borderRadius: 4 }}>
                      🚫 DENIED
                    </span>
                  )}
                </h4>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontFamily: 'monospace' }}>{selectedQuery.Operation}</div>
                {selectedQuery.Description && <div style={{ fontSize: 11.5, color: 'var(--hint)', marginTop: 6 }}>{selectedQuery.Description}</div>}

                <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginTop: 14 }}>
                  <button
                    onClick={() => setActiveTab('condition')}
                    style={{
                      height: 30, padding: '0 14px', border: 0, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
                      background: activeTab === 'condition' ? 'var(--orange)' : 'var(--surface)',
                      color: activeTab === 'condition' ? '#fff' : 'var(--muted)'
                    }}
                  >
                    🔧 Condition
                  </button>
                  <button
                    onClick={() => setActiveTab('pages')}
                    style={{
                      height: 30, padding: '0 14px', border: 0, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
                      background: activeTab === 'pages' ? 'var(--orange)' : 'var(--surface)',
                      color: activeTab === 'pages' ? '#fff' : 'var(--muted)'
                    }}
                  >
                    📄 Linked Pages ({linkedPages.length})
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
                {activeTab === 'condition' ? (
                  !selectedUser ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10, color: 'var(--muted)' }}>
                      <div style={{ fontSize: 30 }}>👤</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>Select a User</div>
                      <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>
                        Pick a user on the left to view or edit their row-level filter condition for this query.
                      </div>
                    </div>
                  ) : isUserAdmin(selectedUser) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 }}>
                      <div style={{ fontSize: 30 }}>⚡</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{selectedUser.Name || selectedUser.Username} is an Administrator</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', maxWidth: 340, lineHeight: 1.5 }}>
                        Admins automatically bypass row-level filters on every query, including this one -- no condition needs to be set.
                      </div>
                    </div>
                  ) : permsLoading ? (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 12.5 }}>Loading condition...</div>
                  ) : (
                    <SQLFilterInput
                      query={selectedQuery}
                      qPerm={currentPerm}
                      onSave={(val, mode, builder) => handleSaveQueryPermission(selectedQuery.QueryID, val, mode, builder)}
                      isLoading={actionLoadingId === selectedQuery.QueryID}
                      manualSave
                    />
                  )
                ) : (
                  linkedPages.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10, color: 'var(--muted)' }}>
                      <div style={{ fontSize: 30 }}>📄</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>Not Linked to Any Page</div>
                      <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 360, lineHeight: 1.5 }}>
                        This query still works at runtime -- lookups are matched purely by name, not by page link. This just means Page Master's Filters tab won't show it under any page.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {linkedPages.map(p => (
                        <div
                          key={p.PageGroupID}
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--soft)' }}
                        >
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{pageLabelFor(p.PageGroupID)}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>{p.PageGroupID}</div>
                        </div>
                      ))}
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
