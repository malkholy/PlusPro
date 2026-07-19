import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

export default function UserPermissions({ user }) {
  const [users, setUsers] = useState([]);
  const [pagesAndGroups, setPagesAndGroups] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [queries, setQueries] = useState([]);
  const [queryPermissions, setQueryPermissions] = useState([]);
  
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
  const [collapsedPageQueries, setCollapsedPageQueries] = useState({});
  const [activeQueryTabs, setActiveQueryTabs] = useState({});
  const [showSQLPreviews, setShowSQLPreviews] = useState({});

  useEffect(() => {
    loadUsers();
    loadPagesAndGroups();
    loadQueryMaster();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserPermissions(selectedUser.Username);
    } else {
      setUserPermissions([]);
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

  async function loadUserPermissions(username) {
    setPermsLoading(true);
    try {
      const res = await apiCall('GetUserPagePermissions', {}, {}, 'plus');
      if (res.State === 0) {
        // Filter permissions for the selected user
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

  // Filter user list based on search input
  const filteredUsers = users.filter(u => 
    (u.Username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.Name || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  // Group users by User Group
  const groupedUsers = filteredUsers.reduce((acc, u) => {
    const grp = u.GroupName || 'General Users';
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(u);
    return acc;
  }, {});

  // Group pages by parent groups
  const groups = pagesAndGroups.filter(pg => pg.IsGroup);
  const orphanPages = pagesAndGroups.filter(pg => !pg.IsGroup && !pg.ParentID);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {error && <div className="err-page">⚠ {error}</div>}

      <div style={{ display: 'flex', flex: 1, gap: 24, minHeight: 0 }}>
        
        {/* Left Pane: Searchable System Users list */}
        <div style={{
          width: 320,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow)',
          minHeight: 0
        }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>System Users</h3>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="🔍 Search users..." 
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 12px 0 32px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--soft)',
                  color: 'var(--text)',
                  fontSize: 13,
                  outline: 'none',
                  transition: 'border-color 0.15s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--orange)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <span style={{ position: 'absolute', left: 10, top: 11, fontSize: 14, color: 'var(--hint)' }}></span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            {usersLoading ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>No users found.</div>
            ) : Object.keys(groupedUsers).map(groupName => {
              const groupUsers = groupedUsers[groupName];
              const isCollapsed = collapsedUserGroups[groupName] !== false;
              
              return (
                <div key={groupName} style={{ marginBottom: 12 }}>
                  {/* Group Header */}
                  <div 
                    onClick={() => setCollapsedUserGroups(prev => ({ ...prev, [groupName]: !isCollapsed }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderRadius: 8,
                      background: 'var(--soft)',
                      border: '1px solid var(--border)',
                      marginBottom: 6,
                      userSelect: 'none'
                    }}
                  >
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      📁 {groupName} ({groupUsers.length})
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                      {isCollapsed ? '▶' : '▼'}
                    </span>
                  </div>

                  {/* Group Users List */}
                  {!isCollapsed && groupUsers.map(u => {
                    const isAdmin = isUserAdmin(u);
                    const isSelected = selectedUser && selectedUser.Username === u.Username;
                    const initials = (u.Name || u.Username).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    
                    return (
                      <div 
                        key={u.Username}
                        onClick={() => setSelectedUser(u)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 12px',
                          borderRadius: 10,
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(249,115,22,0.1)' : 'transparent',
                          border: isSelected ? '1px solid rgba(249,115,22,0.2)' : '1px solid transparent',
                          transition: 'all 0.15s',
                          marginBottom: 4,
                          marginLeft: 4
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'var(--soft)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: isAdmin ? 'linear-gradient(135deg, var(--orange), var(--orange2))' : 'var(--border)',
                          color: isAdmin ? '#fff' : 'var(--muted)',
                          fontWeight: 700,
                          fontSize: 11,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {u.Name || u.Username}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 1 }}>
                            {u.Username}
                          </div>
                        </div>
                        {isAdmin && (
                          <span style={{
                            fontSize: 8,
                            fontWeight: 800,
                            color: 'var(--orange)',
                            background: 'rgba(249,115,22,0.12)',
                            padding: '1px 5px',
                            borderRadius: 4,
                            textTransform: 'uppercase'
                          }}>
                            Admin
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Page Permission Management checklist */}
        <div style={{
          flex: 1,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow)',
          minHeight: 0
        }}>
          {!selectedUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 32, gap: 12, color: 'var(--muted)' }}>
              <div style={{ fontSize: 32 }}>🔑</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>No User Selected</div>
              <div style={{ fontSize: 12.5, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
                Select a user from the left pane list to configure their application page access permissions.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              
              {/* Header Info */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                    Permissions for: <span style={{ color: 'var(--orange)' }}>{selectedUser.Name || selectedUser.Username}</span>
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    Username: <span style={{ fontWeight: 600 }}>{selectedUser.Username}</span>
                  </p>
                </div>
                {isUserAdmin(selectedUser) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    background: 'rgba(34,197,94,0.1)',
                    borderRadius: 10,
                    border: '1px solid rgba(34,197,94,0.2)',
                    color: '#22c55e',
                    fontSize: 12,
                    fontWeight: 700
                  }}>
                    🛡️ Full Bypass (Admin User)
                  </div>
                )}
              </div>

              {/* Checklist Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                
                {isUserAdmin(selectedUser) ? (
                  <div style={{
                    padding: '24px 20px',
                    borderRadius: 12,
                    background: 'var(--soft)',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                    color: 'var(--muted)',
                    fontSize: 13,
                    lineHeight: 1.6,
                    maxWidth: 500,
                    margin: '32px auto'
                  }}>
                    <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>⚡</span>
                    <strong>{selectedUser.Name || selectedUser.Username}</strong> is configured as an Administrator. Admins automatically bypass page permissions and have unrestricted access to all pages and groups. Permission settings do not need to be adjusted.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    {permsLoading && (
                      <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 12 }}>
                        Loading permissions checklist...
                      </div>
                    )}
                    
                    {!permsLoading && groups.map(group => {
                      const groupChildren = pagesAndGroups.filter(pg => pg.ParentID === group.PageGroupID);
                      const isGroupAllowed = hasPermission(group.PageGroupID);
                      const isNavGroupCollapsed = collapsedNavGroups[group.PageGroupID] !== false;
                      
                      return (
                        <div 
                          key={group.PageGroupID} 
                          style={{
                            background: 'var(--soft)',
                            border: '1px solid var(--border)',
                            borderRadius: 14,
                            padding: 16
                          }}
                        >
                          {/* Navigation Group Header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 }}>
                            <div 
                              onClick={() => setCollapsedNavGroups(prev => ({ ...prev, [group.PageGroupID]: !isNavGroupCollapsed }))}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}
                            >
                              <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                                {isNavGroupCollapsed ? '▶' : '▼'}
                              </span>
                              <span style={{ fontSize: 16 }}>{group.Icon || '📁'}</span>
                              <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>{group.Label} (Navigation Group)</span>
                            </div>
                            
                            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                              <input 
                                type="checkbox"
                                checked={isGroupAllowed}
                                disabled={actionLoadingId === group.PageGroupID}
                                onChange={() => handleTogglePermission(group.PageGroupID, isGroupAllowed)}
                                style={{ width: 18, height: 18, marginRight: 8, cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: 12, fontWeight: 700, color: isGroupAllowed ? 'var(--orange)' : 'var(--muted)' }}>
                                {actionLoadingId === group.PageGroupID ? 'Saving...' : isGroupAllowed ? 'Group Allowed' : 'Group Blocked'}
                              </span>
                            </label>
                          </div>

                          {/* Navigation Group Children Pages (Tree View style) */}
                          {groupChildren.length > 0 && !isNavGroupCollapsed && (
                            <div style={{ 
                              position: 'relative', 
                              paddingLeft: 24, 
                              marginLeft: 8,
                              marginTop: 8,
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: 10 
                            }}>
                              {/* Vertical tree line branch connector */}
                              <div style={{
                                position: 'absolute',
                                left: 7,
                                top: -12,
                                bottom: 20, // stops at the last child's middle
                                width: 2,
                                background: 'var(--border)'
                              }} />

                              {groupChildren.map((child, childIdx) => {
                                const isChildAllowed = hasPermission(child.PageGroupID);
                                const pageQueries = queries.filter(q => q.PageGroupID === child.PageGroupID);
                                
                                return (
                                  <div key={child.PageGroupID} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                    {/* Horizontal branch line connector */}
                                    <div style={{
                                      position: 'absolute',
                                      left: -17,
                                      top: 20,
                                      width: 17,
                                      height: 2,
                                      background: 'var(--border)'
                                    }} />

                                    <div 
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 10,
                                        padding: '10px 14px',
                                        opacity: isGroupAllowed ? 1 : 0.65
                                      }}
                                    >
                                      <div style={{ minWidth: 0, flex: 1, paddingRight: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <span style={{ fontSize: 14 }}>{child.Icon || '📄'}</span>
                                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{child.Label}</span>
                                        </div>
                                        {child.Description && (
                                          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {child.Description}
                                          </div>
                                        )}
                                        {pageQueries.length > 0 && (
                                          <button
                                            onClick={() => setCollapsedPageQueries(prev => ({ ...prev, [child.PageGroupID]: !prev[child.PageGroupID] }))}
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              color: 'var(--orange)',
                                              fontSize: 10.5,
                                              fontWeight: 700,
                                              cursor: 'pointer',
                                              padding: '2px 0',
                                              marginTop: 6,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 4,
                                              outline: 'none'
                                            }}
                                          >
                                            {!!collapsedPageQueries[child.PageGroupID] ? '▼ Hide Row Filters' : '▶ Show Row Filters'} ({pageQueries.length})
                                          </button>
                                        )}
                                      </div>

                                      <label style={{ display: 'inline-flex', alignItems: 'center', cursor: isGroupAllowed ? 'pointer' : 'not-allowed' }}>
                                        <input 
                                          type="checkbox"
                                          checked={isChildAllowed}
                                          disabled={!isGroupAllowed || actionLoadingId === child.PageGroupID}
                                          onChange={() => handleTogglePermission(child.PageGroupID, isChildAllowed)}
                                          style={{ width: 16, height: 16, marginRight: 8, cursor: isGroupAllowed ? 'pointer' : 'not-allowed' }}
                                        />
                                        <span style={{ fontSize: 12, fontWeight: 600, color: isChildAllowed ? 'var(--orange)' : 'var(--muted)' }}>
                                          {actionLoadingId === child.PageGroupID ? 'Saving...' : isChildAllowed ? 'Access Allowed' : 'Access Denied'}
                                        </span>
                                      </label>
                                    </div>

                                    {/* Queries List */}
                                    {pageQueries.length > 0 && !!collapsedPageQueries[child.PageGroupID] && (() => {
                                      const renderQueryItem = (q) => {
                                        const qPerm = queryPermissions.find(qp => qp.QueryID === q.QueryID);
                                        const isGrid = q.QueryType === 'Grid';
                                        const showSQL = !!showSQLPreviews[q.QueryID];
                                        
                                        return (
                                          <div 
                                            key={q.QueryID}
                                            style={{
                                              position: 'relative',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              padding: '10px 14px',
                                              background: 'var(--soft)',
                                              border: '1px solid var(--border)',
                                              borderRadius: 8
                                            }}
                                          >
                                            <div style={{
                                              position: 'absolute',
                                              left: -17,
                                              top: 14,
                                              width: 17,
                                              height: 1,
                                              borderTop: '1px dashed var(--border)'
                                            }} />
                                             <div style={{ display: 'flex', gap: 16, width: '100%' }}>
                                               <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>
                                                ⚡ {q.QueryName}
                                              </div>
                                              <span style={{
                                                fontSize: 8,
                                                fontWeight: 800,
                                                color: isGrid ? 'var(--orange)' : 'var(--muted)',
                                                background: isGrid ? 'rgba(249,115,22,0.12)' : 'rgba(148,163,184,0.12)',
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                textTransform: 'uppercase',
                                                whiteSpace: 'nowrap'
                                              }}>
                                                {isGrid ? 'Main Grid' : q.QueryType || 'Lookup'}
                                              </span>
                                            </div>
                                            
                                            <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>
                                              {q.SPName} • {q.Operation}
                                              {q.DatabaseName && ` • Target: ${q.DatabaseName}.${q.SchemaName || 'dbo'}.${q.TableOrViewName}`}
                                            </div>
                                            {q.Description && (
                                              <div style={{ fontSize: 9.5, color: 'var(--hint)', marginTop: 2 }}>
                                                {q.Description}
                                              </div>
                                            )}
                                            {q.QuerySQL && (
                                              <button
                                                onClick={() => setShowSQLPreviews(prev => ({ ...prev, [q.QueryID]: !prev[q.QueryID] }))}
                                                style={{
                                                  background: 'none',
                                                  border: 'none',
                                                  color: 'var(--orange)',
                                                  fontSize: 9.5,
                                                  fontWeight: 700,
                                                  cursor: 'pointer',
                                                  padding: '2px 0',
                                                  marginTop: 4,
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: 4,
                                                  outline: 'none',
                                                  alignSelf: 'flex-start'
                                                }}
                                              >
                                                {showSQL ? '▼ Hide Query SQL' : '▶ Show Query SQL'}
                                              </button>
                                            )}
                                            {q.QuerySQL && showSQL && (
                                              <button
                                                onClick={() => setShowSQLPreviews(prev => ({ ...prev, [q.QueryID]: !prev[q.QueryID] }))}
                                                style={{
                                                  background: 'none',
                                                  border: 'none',
                                                  color: 'var(--orange)',
                                                  fontSize: 9.5,
                                                  fontWeight: 700,
                                                  cursor: 'pointer',
                                                  padding: '2px 0',
                                                  marginTop: 4,
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: 4,
                                                  outline: 'none',
                                                  alignSelf: 'flex-start'
                                                }}
                                              >
                                                {showSQL ? '▼ Hide Query SQL' : '▶ Show Query SQL'}
                                              </button>
                                            )}
                                            {q.QuerySQL && showSQL && (
                                              <pre style={{
                                                marginTop: 6,
                                                padding: '6px 10px',
                                                background: 'var(--surface)',
                                                border: '1px solid var(--border)',
                                                borderRadius: 6,
                                                fontSize: 9.5,
                                                fontFamily: 'monospace',
                                                overflowX: 'auto',
                                                whiteSpace: 'pre-wrap',
                                                color: 'var(--text)',
                                                lineHeight: 1.4,
                                                textAlign: 'left'
                                              }}>
                                                {q.QuerySQL}
                                              </pre>
                                            )}
                                            </div>
                                                         <div style={{ width: 1, borderRight: '1px solid var(--border)', alignSelf: 'stretch' }} />
                                                         <div style={{ flex: 1, minWidth: 0 }}>
                                            <SQLFilterInput 
                                              query={q}
                                              qPerm={qPerm}
                                              onSave={(val, mode, builder) => handleSaveQueryPermission(q.QueryID, val, mode, builder)}
                                              isLoading={actionLoadingId === `q_${q.QueryID}`}
                                            />
                                                         </div>
                                                       </div>
                                          </div>
                                        );
                                      };

                                      const gridQueries = pageQueries.filter(q => q.QueryType === 'Grid');
                                      const lookupQueries = pageQueries.filter(q => q.QueryType !== 'Grid');
                                      const activeTab = activeQueryTabs[child.PageGroupID] || 'Grid';

                                      return (
                                        <div style={{
                                          position: 'relative',
                                          paddingLeft: 24,
                                          marginLeft: 16,
                                          marginTop: 8,
                                          marginBottom: 8,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: 12
                                        }}>
                                          <div style={{
                                            position: 'absolute',
                                            left: 7,
                                            top: -8,
                                            bottom: 14,
                                            width: 1,
                                            borderLeft: '1px dashed var(--border)'
                                          }} />
                                          {/* Tab Bar */}
                                           <div style={{
                                             display: 'flex',
                                             gap: 8,
                                             borderBottom: '1px solid var(--border)',
                                             paddingBottom: 4,
                                             marginBottom: 4,
                                             userSelect: 'none'
                                           }}>
                                             <button
                                               onClick={() => setActiveQueryTabs(prev => ({ ...prev, [child.PageGroupID]: 'Grid' }))}
                                               style={{
                                                 background: 'none',
                                                 border: 'none',
                                                 borderBottom: activeTab === 'Grid' ? '2px solid var(--orange)' : '2px solid transparent',
                                                 color: activeTab === 'Grid' ? 'var(--orange)' : 'var(--muted)',
                                                 fontWeight: 700,
                                                 fontSize: 10.5,
                                                 cursor: 'pointer',
                                                 padding: '4px 8px',
                                                 transition: 'all 0.15s',
                                                 outline: 'none'
                                               }}
                                             >
                                               📊 Grid Data ({gridQueries.length})
                                             </button>
                                             <button
                                               onClick={() => setActiveQueryTabs(prev => ({ ...prev, [child.PageGroupID]: 'Lookup' }))}
                                               style={{
                                                 background: 'none',
                                                 border: 'none',
                                                 borderBottom: activeTab === 'Lookup' ? '2px solid var(--orange)' : '2px solid transparent',
                                                 color: activeTab === 'Lookup' ? 'var(--orange)' : 'var(--muted)',
                                                 fontWeight: 700,
                                                 fontSize: 10.5,
                                                 cursor: 'pointer',
                                                 padding: '4px 8px',
                                                 transition: 'all 0.15s',
                                                 outline: 'none'
                                               }}
                                             >
                                               ⚙️ Lookup / Detail ({lookupQueries.length})
                                             </button>
                                           </div>

                                           {/* Tab Content */}
                                           {activeTab === 'Grid' ? (
                                             <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                               {gridQueries.length === 0 ? (
                                                 <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', padding: 8 }}>No grid data queries registered.</div>
                                               ) : (
                                                 gridQueries.map(q => renderQueryItem(q))
                                               )}
                                             </div>
                                           ) : (
                                             <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                               {lookupQueries.length === 0 ? (
                                                 <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', padding: 8 }}>No lookup or detail queries registered.</div>
                                               ) : (
                                                 lookupQueries.map(q => renderQueryItem(q))
                                               )}
                                             </div>
                                           )}
                                         </div>
                                       );
                                     })()}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Orphan Pages (not under any group) */}
                    {orphanPages.length > 0 && (
                      <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
                          📄 Standalone Pages
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {orphanPages.map(page => {
                            const isAllowed = hasPermission(page.PageGroupID);
                            const pageQueries = queries.filter(q => q.PageGroupID === page.PageGroupID);
                            return (
                              <div key={page.PageGroupID} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                {/* Page Card */}
                                <div 
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 10,
                                    padding: '10px 14px'
                                  }}
                                >
                                  <div style={{ minWidth: 0, flex: 1, paddingRight: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ fontSize: 14 }}>{page.Icon || '📄'}</span>
                                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{page.Label}</span>
                                    </div>
                                    {page.Description && (
                                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                                        {page.Description}
                                      </div>
                                    )}
                                    {pageQueries.length > 0 && (
                                      <button
                                        onClick={() => setCollapsedPageQueries(prev => ({ ...prev, [page.PageGroupID]: !prev[page.PageGroupID] }))}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: 'var(--orange)',
                                          fontSize: 10.5,
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          padding: '2px 0',
                                          marginTop: 6,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          outline: 'none'
                                        }}
                                      >
                                        {!!collapsedPageQueries[page.PageGroupID] ? '▼ Hide Row Filters' : '▶ Show Row Filters'} ({pageQueries.length})
                                      </button>
                                    )}
                                  </div>
                                  <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input 
                                      type="checkbox"
                                      checked={isAllowed}
                                      disabled={actionLoadingId === page.PageGroupID}
                                      onChange={() => handleTogglePermission(page.PageGroupID, isAllowed)}
                                      style={{ width: 16, height: 16, marginRight: 8, cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: isAllowed ? 'var(--orange)' : 'var(--muted)' }}>
                                      {actionLoadingId === page.PageGroupID ? 'Saving...' : isAllowed ? 'Allowed' : 'Denied'}
                                    </span>
                                  </label>
                                </div>

                                 {/* Queries List */}
                                 {pageQueries.length > 0 && !!collapsedPageQueries[page.PageGroupID] && (
                                  <div style={{
                                    position: 'relative',
                                    paddingLeft: 24,
                                    marginLeft: 16,
                                    marginTop: 8,
                                    marginBottom: 8,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 6
                                  }}>
                                    <div style={{
                                      position: 'absolute',
                                      left: 7,
                                      top: -8,
                                      bottom: 14,
                                      width: 1,
                                      borderLeft: '1px dashed var(--border)'
                                    }} />

                                    {pageQueries.map(q => {
                                      const showSQL = !!showSQLPreviews[q.QueryID];
                                      return (
                                      <div 
                                        key={q.QueryID}
                                        style={{
                                          position: 'relative',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          padding: '6px 12px',
                                          background: 'var(--soft)',
                                          border: '1px solid var(--border)',
                                          borderRadius: 8
                                        }}
                                      >
                                        <div style={{
                                          position: 'absolute',
                                          left: -17,
                                          top: 14,
                                          width: 17,
                                          height: 1,
                                          borderTop: '1px dashed var(--border)'
                                        }} />
                                             <div style={{ display: 'flex', gap: 16, width: '100%' }}>
                                               <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                        
                                        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>
                                          ⚡ {q.QueryName}
                                        </div>
                                        <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>
                                          {q.SPName} • {q.Operation}
                                        </div>
                                        {q.Description && (
                                          <div style={{ fontSize: 9.5, color: 'var(--hint)', marginTop: 2 }}>
                                            {q.Description}
                                          </div>
                                        )}
                                        {q.QuerySQL && (
                                          <button
                                            onClick={() => setShowSQLPreviews(prev => ({ ...prev, [q.QueryID]: !prev[q.QueryID] }))}
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              color: 'var(--orange)',
                                              fontSize: 9.5,
                                              fontWeight: 700,
                                              cursor: 'pointer',
                                              padding: '2px 0',
                                              marginTop: 4,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 4,
                                              outline: 'none',
                                              alignSelf: 'flex-start'
                                            }}
                                          >
                                            {showSQL ? '▼ Hide Query SQL' : '▶ Show Query SQL'}
                                          </button>
                                        )}
                                        {q.QuerySQL && showSQL && (
                                          <button
                                            onClick={() => setShowSQLPreviews(prev => ({ ...prev, [q.QueryID]: !prev[q.QueryID] }))}
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              color: 'var(--orange)',
                                              fontSize: 9.5,
                                              fontWeight: 700,
                                              cursor: 'pointer',
                                              padding: '2px 0',
                                              marginTop: 4,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 4,
                                              outline: 'none',
                                              alignSelf: 'flex-start'
                                            }}
                                          >
                                            {showSQL ? '▼ Hide Query SQL' : '▶ Show Query SQL'}
                                          </button>
                                        )}
                                        {q.QuerySQL && showSQL && (
                                          <pre style={{
                                            marginTop: 6,
                                            padding: '6px 10px',
                                            background: 'var(--surface)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 6,
                                            fontSize: 9.5,
                                            fontFamily: 'monospace',
                                            overflowX: 'auto',
                                            whiteSpace: 'pre-wrap',
                                            color: 'var(--text)',
                                            lineHeight: 1.4,
                                            textAlign: 'left'
                                          }}>
                                            {q.QuerySQL}
                                          </pre>
                                        )}
                                        </div>
                                                     <div style={{ width: 1, borderRight: '1px solid var(--border)', alignSelf: 'stretch' }} />
                                                     <div style={{ flex: 1, minWidth: 0 }}>
                                        <SQLFilterInput 
                                              query={q}
                                              qPerm={qPerm}
                                              onSave={(val, mode, builder) => handleSaveQueryPermission(q.QueryID, val, mode, builder)}
                                              isLoading={actionLoadingId === `q_${q.QueryID}`}
                                            />
                                                     </div>
                                                   </div>
                                      </div>
                                    )})} 
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                  </div>
                )}
              </div>
              
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function SQLFilterInput({ query, qPerm, onSave, isLoading }) {
  const [mode, setMode] = useState('sql');
  const [builder, setBuilder] = useState([]);
  const [text, setText] = useState('');
  
  const [fields, setFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(false);

  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ac, setAc] = useState(null); // autocomplete { items, hl }

  const OPS = ["=", "<>", ">", ">=", "<", "<=", "LIKE", "IN", "IS NULL", "IS NOT NULL"];
  const VARS = ["@UserID", "@Username"];

  // Inject styles dynamically once
  useEffect(() => {
    const sId = "up-filter-styles";
    if (!document.getElementById(sId)) {
      const el = document.createElement("style");
      el.id = sId;
      el.textContent = `
        .up-filter-wrap {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .up-mt {
          display: inline-flex;
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 8px;
          align-self: flex-start;
        }
        .up-mt button {
          height: 28px;
          padding: 0 12px;
          border: 0;
          background: var(--surface);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          color: var(--muted);
          font-family: var(--font);
          transition: all 0.15s;
        }
        .up-mt button.active {
          background: var(--orange);
          color: #fff;
        }
        .up-cr {
          display: grid;
          grid-template-columns: 80px 1.2fr 80px 1.5fr 28px;
          gap: 6px;
          align-items: center;
          margin-bottom: 6px;
        }
        .up-cr.first {
          grid-template-columns: 1.2fr 80px 1.5fr 28px;
        }
        .up-cr select, .up-cr input {
          height: 30px;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 0 7px;
          font-size: 12px;
          background: var(--surface);
          color: var(--text);
          outline: none;
          width: 100%;
          font-family: var(--font);
        }
        .up-cr select:focus, .up-cr input:focus {
          border-color: var(--orange);
        }
        .up-cr .conj {
          color: var(--orange);
          font-weight: 800;
        }
        .up-cr .del {
          height: 28px;
          width: 28px;
          border: 0;
          border-radius: 6px;
          background: var(--red-soft);
          color: var(--red);
          cursor: pointer;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .up-cr .del:hover {
          background: var(--red);
          color: #fff;
        }
        .up-addc {
          height: 28px;
          border: 1.5px dashed var(--border);
          border-radius: 6px;
          background: var(--soft);
          color: var(--muted);
          font-weight: 700;
          font-size: 11.5px;
          cursor: pointer;
          width: 100%;
          transition: all 0.15s;
          font-family: var(--font);
          margin-bottom: 8px;
        }
        .up-addc:hover {
          border-color: var(--orange);
          color: var(--orange);
          background: var(--surface);
        }
        .up-pre {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--muted);
          background: var(--soft);
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid var(--border);
          word-break: break-all;
        }
        .up-pre b {
          color: var(--orange);
        }
        .up-ac {
          position: absolute;
          background: var(--surface);
          border: 1px solid var(--orange);
          border-radius: 8px;
          box-shadow: var(--shadow-lg);
          z-index: 99;
          max-height: 150px;
          overflow-y: auto;
          min-width: 180px;
          padding: 4px 0;
        }
        .up-ai {
          padding: 6px 12px;
          font-size: 11px;
          font-family: var(--mono);
          cursor: pointer;
          color: var(--text);
          transition: all 0.1s;
        }
        .up-ai:hover, .up-ai.hl {
          background: var(--orange-soft);
          color: var(--orange);
        }
        .up-val {
          margin-top: 6px;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .up-val.ok {
          background: var(--green-soft);
          color: var(--green);
          border: 1px solid rgba(22, 163, 74, 0.15);
        }
        .up-val.err {
          background: var(--red-soft);
          color: var(--red);
          border: 1px solid rgba(220, 38, 38, 0.15);
        }
        .up-sw {
          position: relative;
          display: flex;
          flex-direction: column;
        }
      `;
      document.head.appendChild(el);
    }
  }, []);

  // Sync state with qPerm
  useEffect(() => {
    if (qPerm) {
      setMode(qPerm.CondMode || 'sql');
      setText(qPerm.SQLFilter || '');
      
      let parsedBuilder = [];
      if (qPerm.CondBuilder) {
        try {
          parsedBuilder = JSON.parse(qPerm.CondBuilder);
        } catch (e) {
          parsedBuilder = [];
        }
      }
      setBuilder(parsedBuilder);
    } else {
      setMode('sql');
      setText('');
      setBuilder([]);
    }
    setValidation(null);
  }, [qPerm]);

  // Load fields for builder and autocomplete suggestions
  useEffect(() => {
    if (query?.QueryID) {
      loadFields();
    }
  }, [query?.QueryID]);

  async function loadFields() {
    setLoadingFields(true);
    try {
      const res = await apiCall('GetQueryFields', { QueryID: query.QueryID }, {}, 'plus');
      if (res.State === 0) {
        setFields((res.List0 || []).map(f => f.FieldName));
      }
    } catch (e) {
      console.error('Failed to load query fields:', e);
    }
    setLoadingFields(false);
  }

  function buildSqlText(rows) {
    return rows.map((r, i) => {
      const conj = i > 0 ? ` ${(r.conj || 'AND')} ` : '';
      let valPart = '';
      if (r.op && !r.op.includes('NULL')) {
        const val = r.val || '';
        valPart = ` ${val.startsWith('@') ? val : `'${val}'`}`;
      }
      return `${conj}${r.field} ${r.op}${valPart}`;
    }).join(' ').trim();
  }

  function savePermission(finalText, finalMode, finalBuilder) {
    onSave(finalText, finalMode, JSON.stringify(finalBuilder));
  }

  function handleConjChange(idx, conj) {
    const updated = [...builder];
    updated[idx] = { ...updated[idx], conj };
    setBuilder(updated);
    const sql = buildSqlText(updated);
    savePermission(sql, 'builder', updated);
  }

  function handleFieldChange(idx, field) {
    const updated = [...builder];
    updated[idx] = { ...updated[idx], field };
    setBuilder(updated);
    const sql = buildSqlText(updated);
    savePermission(sql, 'builder', updated);
  }

  function handleOpChange(idx, op) {
    const updated = [...builder];
    updated[idx] = { ...updated[idx], op };
    if (op.includes('NULL')) {
      updated[idx].val = '';
    }
    setBuilder(updated);
    const sql = buildSqlText(updated);
    savePermission(sql, 'builder', updated);
  }

  function handleValueChange(idx, val) {
    const updated = [...builder];
    updated[idx] = { ...updated[idx], val };
    setBuilder(updated);
  }

  // Auto-save on blur of a text input value in a builder row
  function handleValueBlur(idx) {
    const sql = buildSqlText(builder);
    savePermission(sql, 'builder', builder);
  }

  function handleAddRow() {
    const defaultField = fields[0] || '';
    const updated = [...builder, { field: defaultField, op: '=', val: '', conj: 'AND' }];
    setBuilder(updated);
    const sql = buildSqlText(updated);
    savePermission(sql, 'builder', updated);
  }

  function handleDelRow(idx) {
    const updated = builder.filter((_, i) => i !== idx);
    setBuilder(updated);
    const sql = buildSqlText(updated);
    savePermission(sql, 'builder', updated);
  }

  function handleModeChange(newMode) {
    setMode(newMode);
    if (newMode === 'sql' && builder.length > 0) {
      const sql = buildSqlText(builder);
      setText(sql);
      savePermission(sql, 'sql', builder);
    } else if (newMode === 'builder') {
      const sql = buildSqlText(builder);
      savePermission(sql, 'builder', builder);
    } else {
      savePermission(text, newMode, builder);
    }
  }

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    const pos = e.target.selectionStart;
    const before = val.slice(0, pos);
    const m = before.match(/[A-Za-z@_]+$/);
    if (!m) {
      setAc(null);
      return;
    }
    const word = m[0].toLowerCase();
    const pool = [...fields, ...VARS];
    const items = pool.filter(f => f.toLowerCase().startsWith(word) && f.toLowerCase() !== word);
    if (!items.length) {
      setAc(null);
      return;
    }
    setAc({ items, hl: 0 });
  };

  const handleTextBlur = () => {
    setTimeout(() => {
      setAc(null);
      if (text !== (qPerm?.SQLFilter || '')) {
        savePermission(text, 'sql', builder);
      }
    }, 200);
  };

  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const handleSelectAc = (it) => {
    const nextText = text.replace(/[A-Za-z@_]+$/, '') + it + ' ';
    setText(nextText);
    setAc(null);
    savePermission(nextText, 'sql', builder);
  };

  async function handleValidate() {
    setValidating(true);
    setValidation(null);
    const cond = mode === 'builder' ? buildSqlText(builder) : text;
    try {
      const res = await apiCall('ValidateQueryCondition', {
        QueryID: query.QueryID,
        Condition: cond
      }, {}, 'plus');
      if (res.State === 0) {
        setValidation({ type: 'ok', msg: '✓ Valid SQL Condition' });
      } else {
        setValidation({ type: 'err', msg: `✕ Invalid: ${res.Message || 'Verification failed'}` });
      }
    } catch (e) {
      setValidation({ type: 'err', msg: '✕ Validation connection error: ' + e.message });
    }
    setValidating(false);
  }

  return (
    <div className="up-filter-wrap">
      <div className="up-mt">
        <button className={mode === 'builder' ? 'active' : ''} onClick={() => handleModeChange('builder')}>Builder</button>
        <button className={mode === 'sql' ? 'active' : ''} onClick={() => handleModeChange('sql')}>Raw SQL</button>
      </div>

      {mode === 'builder' ? (
        <>
          {loadingFields ? (
            <div style={{ fontSize: 11, color: 'var(--muted)', padding: 6 }}>Loading query fields...</div>
          ) : (
            <>
              {builder.map((r, i) => (
                <div key={i} className={`up-cr ${i === 0 ? 'first' : ''}`}>
                  {i > 0 && (
                    <select className="conj" value={r.conj || 'AND'} onChange={e => handleConjChange(i, e.target.value)}>
                      <option>AND</option>
                      <option>OR</option>
                    </select>
                  )}
                  <select value={r.field} onChange={e => handleFieldChange(i, e.target.value)}>
                    {fields.length === 0 && <option value="">(No fields)</option>}
                    {fields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <select value={r.op || '='} onChange={e => handleOpChange(i, e.target.value)}>
                    {OPS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {r.op && r.op.includes('NULL') ? (
                    <span style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center' }}>—</span>
                  ) : (
                    <input 
                      value={r.val || ''} 
                      placeholder="value / @UserID" 
                      onChange={e => handleValueChange(i, e.target.value)} 
                      onBlur={() => handleValueBlur(i)}
                    />
                  )}
                  <button className="del" onClick={() => handleDelRow(i)}>✕</button>
                </div>
              ))}
              <button className="up-addc" onClick={handleAddRow}>+ Add Condition Row</button>
              <div className="up-pre">
                <b>WHERE</b> {buildSqlText(builder) || '(none)'}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="up-sw">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input 
              type="text"
              value={text}
              onChange={handleTextChange}
              onFocus={() => setShowSuggestions(true)}
              onBlur={handleTextBlur}
              onKeyDown={handleTextKeyDown}
              placeholder=""
              style={{
                flex: 1,
                height: 32,
                padding: '0 10px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: 11.5,
                fontFamily: 'monospace',
                color: 'var(--text)',
                outline: 'none'
              }}
            />
          </div>
          {ac && showSuggestions && ac.items.length > 0 && (
            <div className="up-ac" style={{ left: 0, top: '100%', marginTop: 4 }}>
              {ac.items.map((it, idx) => (
                <div 
                  key={it} 
                  className={`up-ai ${idx === ac.hl ? 'hl' : ''}`}
                  onMouseDown={() => handleSelectAc(it)}
                >
                  {it}
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
            Type for autocomplete. Variables: <b>@UserID</b>, <b>@Username</b>
          </div>
        </div>
      )}

      {/* Validation & Status */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <button 
          className="btn-secondary" 
          style={{ height: 26, padding: '0 10px', fontSize: 11 }}
          onClick={handleValidate}
          disabled={validating}
        >
          {validating ? 'Validating...' : '✓ Validate Condition'}
        </button>
        {isLoading && <span style={{ fontSize: 10.5, color: 'var(--orange)', fontWeight: 600 }}>Saving...</span>}
      </div>

      {validation && (
        <div className={`up-val ${validation.type}`}>
          {validation.msg}
        </div>
      )}
    </div>
  );
}
