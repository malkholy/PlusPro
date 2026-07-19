import { useState, useEffect, useMemo } from 'react';
import { apiCall } from '../shared/api.js';

export default function QueryMaster({ user }) {
  const [queries, setQueries] = useState([]);
  const [pages, setPages] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  const [activeDetailTab, setActiveDetailTab] = useState('config'); // 'config' or 'permissions'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    QueryID: '',
    QueryName: '',
    SPName: '[PLS].[APIPlusOperation]',
    Operation: '',
    Description: '',
    QuerySQL: '',
    DatabaseName: 'ERPMega',
    SchemaName: 'dbo',
    TableOrViewName: '',
    QueryType: 'Grid',
    ApiUrl: ''
  });
  
  // Associated pages state (pageGroupID -> isLinked)
  const [linkedPages, setLinkedPages] = useState({});

  // Quick Permission Grant state
  const [grantUsername, setGrantUsername] = useState('');
  const [grantSQLFilter, setGrantSQLFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const qRes = await apiCall('GetQueryMaster', {}, {}, 'plus');
      const pRes = await apiCall('GetPagesAndGroups', {}, {}, 'plus');
      const uRes = await apiCall('GetSystemUsers', {}, {}, 'plus');
      const permRes = await apiCall('GetUserQueryPermissions', {}, {}, 'plus');

      if (qRes.State === 0) {
        const qMap = {};
        (qRes.List0 || []).forEach(row => {
          if (!qMap[row.QueryID]) {
            qMap[row.QueryID] = {
              QueryID: row.QueryID,
              QueryName: row.QueryName,
              SPName: row.SPName,
              Operation: row.Operation,
              Description: row.Description,
              QuerySQL: row.QuerySQL,
              DatabaseName: row.DatabaseName,
              SchemaName: row.SchemaName,
              TableOrViewName: row.TableOrViewName,
              QueryType: row.QueryType,
              ApiUrl: row.ApiUrl || '',
              PageGroups: []
            };
          }
          if (row.PageGroupID) {
            qMap[row.QueryID].PageGroups.push(row.PageGroupID);
          }
        });
        setQueries(Object.values(qMap));
      } else {
        setError(qRes.Message || 'Failed to load queries');
      }

      if (pRes.State === 0) {
        setPages((pRes.List0 || []).filter(p => !p.IsGroup));
      }

      if (uRes.State === 0) {
        setSystemUsers(uRes.List0 || []);
      }

      if (permRes.State === 0) {
        setAllPermissions(permRes.List0 || []);
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setLoading(false);
  }

  const filteredQueries = useMemo(() => {
    return queries.filter(q => {
      const matchesSearch = 
        q.QueryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.Operation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.TableOrViewName || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'All' || q.QueryType === filterType;
      return matchesSearch && matchesType;
    });
  }, [queries, searchQuery, filterType]);

  // Query permissions list filter
  const queryPermissions = useMemo(() => {
    if (!selectedQuery) return [];
    return allPermissions.filter(p => p.QueryID === selectedQuery.QueryID);
  }, [allPermissions, selectedQuery]);

  function handleSelectQuery(q) {
    setSelectedQuery(q);
    setSuccessMsg(null);
    setError(null);
    setFormData({
      QueryID: q.QueryID,
      QueryName: q.QueryName,
      SPName: q.SPName,
      Operation: q.Operation,
      Description: q.Description || '',
      QuerySQL: q.QuerySQL || '',
      DatabaseName: q.DatabaseName || '',
      SchemaName: q.SchemaName || '',
      TableOrViewName: q.TableOrViewName || '',
      QueryType: q.QueryType,
      ApiUrl: q.ApiUrl || ''
    });
    
    const pageMap = {};
    pages.forEach(p => {
      pageMap[p.PageGroupID] = q.PageGroups.includes(p.PageGroupID);
    });
    setLinkedPages(pageMap);
    setGrantUsername('');
    setGrantSQLFilter('');
  }

  function handleNewQuery() {
    setSelectedQuery(null);
    setActiveDetailTab('config');
    setSuccessMsg(null);
    setError(null);
    setFormData({
      QueryID: '',
      QueryName: '',
      SPName: '[PLS].[APIPlusOperation]',
      Operation: '',
      Description: '',
      QuerySQL: '',
      DatabaseName: 'ERPMega',
      SchemaName: 'dbo',
      TableOrViewName: '',
      QueryType: 'Grid',
      ApiUrl: ''
    });
    
    const pageMap = {};
    pages.forEach(p => {
      pageMap[p.PageGroupID] = false;
    });
    setLinkedPages(pageMap);
    setGrantUsername('');
    setGrantSQLFilter('');
  }

  async function handleSave() {
    if (!formData.QueryName.trim() || !formData.Operation.trim()) {
      setError('Query Name and Operation are required fields.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await apiCall('SaveQueryMaster', formData, {}, 'plus');
      if (res.State === 0) {
        const savedQueryID = res.QueryID || formData.QueryID;
        
        for (const page of pages) {
          const isCurrentlyLinked = selectedQuery?.PageGroups?.includes(page.PageGroupID) || false;
          const targetLinked = !!linkedPages[page.PageGroupID];
          
          if (isCurrentlyLinked !== targetLinked) {
            await apiCall('SaveQueryPageRelation', {
              QueryID: savedQueryID,
              PageGroupID: page.PageGroupID,
              IsLinked: targetLinked ? 1 : 0
            }, {}, 'plus');
          }
        }

        setSuccessMsg('✓ Query master configuration saved successfully!');
        await loadData();
        
        // Reload selection
        const updatedList = await apiCall('GetQueryMaster', {}, {}, 'plus');
        if (updatedList.State === 0) {
          const qMap = {};
          (updatedList.List0 || []).forEach(row => {
            if (!qMap[row.QueryID]) {
              qMap[row.QueryID] = {
                QueryID: row.QueryID,
                QueryName: row.QueryName,
                SPName: row.SPName,
                Operation: row.Operation,
                Description: row.Description,
                QuerySQL: row.QuerySQL,
                DatabaseName: row.DatabaseName,
                SchemaName: row.SchemaName,
                TableOrViewName: row.TableOrViewName,
                QueryType: row.QueryType,
                ApiUrl: row.ApiUrl || '',
                PageGroups: []
              };
            }
            if (row.PageGroupID) {
              qMap[row.QueryID].PageGroups.push(row.PageGroupID);
            }
          });
          const freshQuery = qMap[savedQueryID];
          if (freshQuery) {
            handleSelectQuery(freshQuery);
          }
        }
      } else {
        setError(res.Message || 'Failed to save query master');
      }
    } catch (err) {
      setError('Save connection error: ' + err.message);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!formData.QueryID) return;
    if (!window.confirm(`Are you sure you want to delete query: "${formData.QueryName}"? This will unlink it from all associated pages.`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await apiCall('DeleteQueryMaster', { QueryID: formData.QueryID }, {}, 'plus');
      if (res.State === 0) {
        setSuccessMsg('✓ Query master configuration deleted successfully.');
        handleNewQuery();
        loadData();
      } else {
        setError(res.Message || 'Failed to delete query master');
      }
    } catch (err) {
      setError('Delete connection error: ' + err.message);
    }
    setSaving(false);
  }

  async function handleGrantPermission() {
    if (!grantUsername) {
      setError('Please select a user to grant permission.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiCall('SaveUserQueryPermission', {
        Username: grantUsername,
        QueryID: selectedQuery.QueryID,
        SQLFilter: grantSQLFilter,
        CondMode: 'sql',
        CondBuilder: []
      }, {}, 'plus');

      if (res.State === 0) {
        setSuccessMsg(`✓ Permission successfully configured for user "${grantUsername}"`);
        setGrantUsername('');
        setGrantSQLFilter('');
        await loadData();
      } else {
        setError(res.Message || 'Failed to save user permission');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setSaving(false);
  }

  async function handleRevokePermission(username) {
    if (!window.confirm(`Are you sure you want to revoke filter permission for user "${username}"?`)) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiCall('SaveUserQueryPermission', {
        Username: username,
        QueryID: selectedQuery.QueryID,
        SQLFilter: '',
        CondMode: 'sql',
        CondBuilder: []
      }, {}, 'plus');

      if (res.State === 0) {
        setSuccessMsg(`✓ Permission revoked for user "${username}"`);
        await loadData();
      } else {
        setError(res.Message || 'Failed to revoke permission');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setSaving(false);
  }

  function handleTogglePageLink(pageGroupID) {
    setLinkedPages(prev => ({
      ...prev,
      [pageGroupID]: !prev[pageGroupID]
    }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Query Master Registry</h2>
          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
            Decoupled configuration manager for API query execution and page bindings.
          </p>
        </div>
        <button 
          onClick={handleNewQuery}
          style={{
            height: 34,
            padding: '0 16px',
            background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(249,115,22,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>+</span> Create New Query
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: 24, minHeight: 0 }}>
        {/* Left Side: Query list */}
        <div style={{
          width: 380,
          flexShrink: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          boxShadow: 'var(--shadow)'
        }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Search queries..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 12px 0 32px',
                  background: 'var(--soft)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12.5,
                  color: 'var(--text)',
                  outline: 'none'
                }}
              />
              <span style={{ position: 'absolute', left: 10, top: 9, fontSize: 13, color: 'var(--hint)' }}>🔍</span>
            </div>
            
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['All', 'Grid', 'Lookup', 'Detail', 'Action'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  style={{
                    height: 24,
                    padding: '0 10px',
                    fontSize: 10.5,
                    fontWeight: filterType === type ? 800 : 500,
                    color: filterType === type ? '#fff' : 'var(--muted)',
                    background: filterType === type ? 'var(--orange)' : 'var(--soft)',
                    border: '1px solid ' + (filterType === type ? 'var(--orange)' : 'var(--border)'),
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading query catalog...</div>
            ) : filteredQueries.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No queries found.</div>
            ) : (
              filteredQueries.map(q => {
                const isSelected = selectedQuery?.QueryID === q.QueryID;
                return (
                  <div
                    key={q.QueryID}
                    onClick={() => handleSelectQuery(q)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      background: isSelected ? 'var(--orange-soft)' : 'transparent',
                      border: '1px solid ' + (isSelected ? 'var(--orange)' : 'transparent'),
                      marginBottom: 4,
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                        ⚡ {q.QueryName}
                      </span>
                      <span style={{
                        fontSize: 8.5,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: q.QueryType === 'Grid' ? 'var(--orange)' : 'var(--muted)',
                        background: q.QueryType === 'Grid' ? 'rgba(249,115,22,0.1)' : 'var(--soft)',
                        padding: '2px 6px',
                        borderRadius: 4
                      }}>
                        {q.QueryType}
                      </span>
                    </div>

                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, fontFamily: 'monospace' }}>
                      {q.SPName} • {q.Operation}
                    </div>

                    {q.ApiUrl && (
                      <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>🌐</span> <span style={{ fontFamily: 'monospace' }}>{q.ApiUrl}</span>
                      </div>
                    )}

                    {q.TableOrViewName && (
                      <div style={{ fontSize: 9.5, color: 'var(--hint)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>📂</span> {q.DatabaseName}.{q.SchemaName}.{q.TableOrViewName}
                      </div>
                    )}

                    {q.PageGroups.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                        {q.PageGroups.map(pId => (
                          <span key={pId} style={{
                            fontSize: 8.5,
                            background: 'var(--border)',
                            color: 'var(--text)',
                            padding: '1px 5px',
                            borderRadius: 4
                          }}>
                            {pId}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Tabbed Form details */}
        <div style={{
          flex: 1,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px 0 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>
                {formData.QueryID ? `Query ID: ${formData.QueryID}` : 'Configure New Query'}
              </h3>
              {formData.QueryID && (
                <button 
                  onClick={handleDelete}
                  disabled={saving}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--red)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ✕ Delete Query
                </button>
              )}
            </div>

            {/* Tab selector */}
            <div style={{ display: 'flex', gap: 16 }}>
              <button
                onClick={() => setActiveDetailTab('config')}
                style={{
                  padding: '8px 4px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '2px solid ' + (activeDetailTab === 'config' ? 'var(--orange)' : 'transparent'),
                  color: activeDetailTab === 'config' ? 'var(--text)' : 'var(--muted)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                ⚙️ Configuration
              </button>
              
              <button
                onClick={() => setActiveDetailTab('permissions')}
                style={{
                  padding: '8px 4px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '2px solid ' + (activeDetailTab === 'permissions' ? 'var(--orange)' : 'transparent'),
                  color: activeDetailTab === 'permissions' ? 'var(--text)' : 'var(--muted)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                🔑 User Permissions {queryPermissions.length > 0 && `(${queryPermissions.length})`}
              </button>
            </div>
          </div>

          {/* Tab Contents */}
          {activeDetailTab === 'config' ? (
            <>
              {/* Configuration Form */}
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
                      Query Name
                    </label>
                    <input 
                      type="text"
                      value={formData.QueryName}
                      onChange={e => setFormData({ ...formData, QueryName: e.target.value })}
                      placeholder="e.g. Get Purchase Orders"
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        border: '1.5px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12.5,
                        color: 'var(--text)',
                        background: 'var(--bg)',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                      Query Type
                    </label>
                    <select 
                      value={formData.QueryType}
                      onChange={e => setFormData({ ...formData, QueryType: e.target.value })}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        border: '1.5px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12.5,
                        color: 'var(--text)',
                        background: 'var(--bg)',
                        outline: 'none'
                      }}
                    >
                      <option value="Grid">Grid Data</option>
                      <option value="Lookup">Lookup Catalog</option>
                      <option value="Detail">Detail Variables</option>
                      <option value="Action">Action Operation</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                      Stored Procedure Name
                    </label>
                    <input 
                      type="text"
                      value={formData.SPName}
                      onChange={e => setFormData({ ...formData, SPName: e.target.value })}
                      placeholder="[PLS].[APIPlusOperation]"
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        border: '1.5px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12.5,
                        color: 'var(--text)',
                        background: 'var(--bg)',
                        outline: 'none',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                      Operation Code
                    </label>
                    <input 
                      type="text"
                      value={formData.Operation}
                      onChange={e => setFormData({ ...formData, Operation: e.target.value })}
                      placeholder="e.g. GetPurchaseOrders"
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '0 12px',
                        border: '1.5px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12.5,
                        color: 'var(--text)',
                        background: 'var(--bg)',
                        outline: 'none',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                    Description
                  </label>
                  <textarea 
                    value={formData.Description}
                    onChange={e => setFormData({ ...formData, Description: e.target.value })}
                    placeholder="Optional query purpose description..."
                    style={{
                      width: '100%',
                      height: 60,
                      padding: '10px 12px',
                      border: '1.5px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12.5,
                      color: 'var(--text)',
                      background: 'var(--bg)',
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 14 }}>📂</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>Target Database Source</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase' }}>
                      Database
                    </label>
                    <input 
                      type="text"
                      value={formData.DatabaseName}
                      onChange={e => setFormData({ ...formData, DatabaseName: e.target.value })}
                      placeholder="ERPMega"
                      style={{
                        width: '100%',
                        height: 36,
                        padding: '0 10px',
                        border: '1.5px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--text)',
                        background: 'var(--bg)',
                        outline: 'none'
                      }}
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
                      style={{
                        width: '100%',
                        height: 36,
                        padding: '0 10px',
                        border: '1.5px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--text)',
                        background: 'var(--bg)',
                        outline: 'none'
                      }}
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
                      placeholder="e.g. QGetPurchaseOrders"
                      style={{
                        width: '100%',
                        height: 36,
                        padding: '0 10px',
                        border: '1.5px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--text)',
                        background: 'var(--bg)',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                    Target API URL (For non-default ports/hosts)
                  </label>
                  <input 
                    type="text"
                    value={formData.ApiUrl}
                    onChange={e => setFormData({ ...formData, ApiUrl: e.target.value })}
                    placeholder="e.g. https://be.glcpaints.com:7788/api/General/GeneralAPI"
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      border: '1.5px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 13,
                      color: 'var(--text)',
                      background: 'var(--bg)',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                    Query SQL Script
                  </label>
                  <textarea 
                    value={formData.QuerySQL}
                    onChange={e => setFormData({ ...formData, QuerySQL: e.target.value })}
                    placeholder="SELECT * FROM TableName WHERE Condition;"
                    style={{
                      width: '100%',
                      height: 120,
                      padding: '10px 12px',
                      border: '1.5px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontFamily: 'monospace',
                      color: 'var(--text)',
                      background: 'var(--bg)',
                      outline: 'none',
                      lineHeight: 1.4
                    }}
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 14 }}>🔗</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>Page Bindings (Mappings)</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {pages.map(page => (
                      <label
                        key={page.PageGroupID}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'var(--soft)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={!!linkedPages[page.PageGroupID]}
                          onChange={() => handleTogglePageLink(page.PageGroupID)}
                          style={{
                            width: 16,
                            height: 16,
                            marginRight: 10,
                            accentColor: 'var(--orange)',
                            cursor: 'pointer'
                          }}
                        />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                            {page.Icon} {page.Label}
                          </div>
                          <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 1 }}>
                            ID: {page.PageGroupID}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button 
                  onClick={handleNewQuery}
                  disabled={saving}
                  style={{
                    height: 36,
                    padding: '0 16px',
                    background: 'var(--soft)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
                
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    height: 36,
                    padding: '0 24px',
                    background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px var(--orange-glow)'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* User Permissions Tab */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {!formData.QueryID ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    Please save this query configuration first to grant user permissions.
                  </div>
                ) : (
                  <>
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

                    {/* Grant new permission container */}
                    <div style={{
                      background: 'var(--soft)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 20
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>⚡</span> Configure Row-Level Filter Override
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 12, alignItems: 'flex-end' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase' }}>
                            Select User
                          </label>
                          <select
                            value={grantUsername}
                            onChange={e => setGrantUsername(e.target.value)}
                            style={{
                              width: '100%',
                              height: 36,
                              padding: '0 10px',
                              border: '1.5px solid var(--border)',
                              borderRadius: 8,
                              fontSize: 12.5,
                              color: 'var(--text)',
                              background: 'var(--surface)',
                              outline: 'none'
                            }}
                          >
                            <option value="">(Select User)</option>
                            {systemUsers.map(u => (
                              <option key={u.Username} value={u.Username}>
                                {u.Name || u.Username} ({u.Username})
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase' }}>
                            SQL Where Condition
                          </label>
                          <input
                            type="text"
                            value={grantSQLFilter}
                            onChange={e => setGrantSQLFilter(e.target.value)}
                            placeholder="e.g. Warehouse='1FG' OR VendorNumber='V001'"
                            style={{
                              width: '100%',
                              height: 36,
                              padding: '0 12px',
                              border: '1.5px solid var(--border)',
                              borderRadius: 8,
                              fontSize: 12.5,
                              color: 'var(--text)',
                              background: 'var(--surface)',
                              outline: 'none',
                              fontFamily: 'monospace'
                            }}
                          />
                        </div>
                        
                        <button
                          onClick={handleGrantPermission}
                          disabled={saving}
                          style={{
                            height: 36,
                            padding: '0 16px',
                            background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {saving ? 'Granting...' : 'Grant Permission'}
                        </button>
                      </div>
                    </div>

                    {/* Permissions list table */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>
                        Active Query Filter Permissions
                      </span>
                    </div>

                    {queryPermissions.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12.5, border: '1px dashed var(--border)', borderRadius: 10 }}>
                        No row-level filter permissions have been configured for this query.
                      </div>
                    ) : (
                      <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: 'var(--soft)', borderBottom: '1px solid var(--border)' }}>
                              <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--muted)' }}>User</th>
                              <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--muted)' }}>SQL Filter</th>
                              <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--muted)' }}>Mode</th>
                              <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--muted)', textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {queryPermissions.map(p => (
                              <tr key={p.PermissionID} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text)' }}>
                                  {p.Username}
                                </td>
                                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11.5, color: 'var(--orange)' }}>
                                  {p.SQLFilter || '(no filter condition)'}
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span style={{
                                    fontSize: 8.5,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    background: 'var(--soft)',
                                    padding: '2px 5px',
                                    borderRadius: 4,
                                    color: 'var(--muted)'
                                  }}>
                                    {p.CondMode}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                  <button
                                    onClick={() => handleRevokePermission(p.Username)}
                                    disabled={saving}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--red)',
                                      fontSize: 11.5,
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Revoke
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
