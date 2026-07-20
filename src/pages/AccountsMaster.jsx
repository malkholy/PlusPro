import React, { useState, useEffect, useMemo } from 'react';
import { apiCall } from '../shared/api.js';

// Tree Node component representing a Chart of Accounts node
function TreeNode({ node, searchField, expandedKeys, setExpandedKeys, selectedKey, setSelectedKey, onSelect }) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = !!expandedKeys[node.AccountNumber];
  const isSelected = selectedKey === node.AccountNumber;

  // Determine if this node or any of its children match the search filter
  const matchesSearch = useMemo(() => {
    if (!searchField) return true;
    const term = searchField.toLowerCase();
    
    // Check recursively
    const checkMatch = (n) => {
      const descMatch = (n.AccountDescription || '').toLowerCase().includes(term);
      const codeMatch = (n.AccountNumber || '').toLowerCase().includes(term);
      if (descMatch || codeMatch) return true;
      if (n.children && n.children.length > 0) {
        return n.children.some(checkMatch);
      }
      return false;
    };
    return checkMatch(node);
  }, [node, searchField]);

  if (!matchesSearch) return null;

  const toggleExpand = (e) => {
    e.stopPropagation();
    setExpandedKeys(prev => ({
      ...prev,
      [node.AccountNumber]: !prev[node.AccountNumber]
    }));
  };

  const handleSelect = () => {
    setSelectedKey(node.AccountNumber);
    onSelect(node);
  };

  const getAccountTypeBadgeColor = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('asset')) return 'var(--green)';
    if (t.includes('liability')) return 'var(--red)';
    if (t.includes('revenue') || t.includes('income')) return 'var(--blue)';
    if (t.includes('expense')) return 'var(--orange)';
    return 'var(--muted)';
  };

  return (
    <div style={{ marginLeft: 16 }}>
      <div 
        onClick={handleSelect}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          borderRadius: '8px',
          cursor: 'pointer',
          background: isSelected ? 'var(--orange-glow)' : 'transparent',
          borderLeft: isSelected ? '3px solid var(--orange)' : '3px solid transparent',
          transition: 'all 0.15s ease',
          margin: '2px 0'
        }}
        className="tree-node-row"
      >
        {/* Toggle icon */}
        <span 
          onClick={hasChildren ? toggleExpand : undefined}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            marginRight: '6px',
            fontSize: '11px',
            color: 'var(--muted)',
            cursor: hasChildren ? 'pointer' : 'default',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease'
          }}
        >
          {hasChildren ? '▶' : ''}
        </span>

        {/* Node Icon */}
        <span style={{ marginRight: '8px', fontSize: '15px' }}>
          {node.isTypeGroup ? '🗂️' : (hasChildren ? (isExpanded ? '📂' : '📁') : '📄')}
        </span>

        {/* Account Info */}
        {!node.isTypeGroup && (
          <span style={{ 
            fontFamily: 'var(--mono)', 
            fontSize: '13px', 
            fontWeight: 700, 
            color: isSelected ? 'var(--orange2)' : (hasChildren ? 'var(--orange-dark)' : 'var(--muted)'),
            marginRight: '8px'
          }}>
            {node.AccountNumber}
          </span>
        )}

        <span style={{ 
          fontSize: node.isTypeGroup ? '14px' : '13px', 
          fontWeight: isSelected ? 700 : (node.isTypeGroup ? 900 : (hasChildren ? 700 : 500)),
          color: isSelected ? 'var(--orange2)' : (node.isTypeGroup ? 'var(--text)' : (hasChildren ? 'var(--text)' : 'var(--muted)')),
          textTransform: node.isTypeGroup ? 'uppercase' : 'none',
          letterSpacing: node.isTypeGroup ? '0.5px' : 'normal',
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {node.AccountDescription}
        </span>

        {/* Level badge */}
        {!node.isTypeGroup && (
          <span style={{
            fontSize: '10px',
            fontWeight: 800,
            background: 'var(--soft)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '2px 6px',
            marginRight: '8px',
            color: 'var(--muted)'
          }}>
            L{node.LevelNumber}
          </span>
        )}

        {/* Account Type badge */}
        {!node.isTypeGroup && node.AccountType && (
          <span style={{
            fontSize: '10px',
            fontWeight: 800,
            color: '#ffffff',
            background: getAccountTypeBadgeColor(node.AccountType),
            borderRadius: '4px',
            padding: '2px 6px'
          }}>
            {node.AccountType}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div style={{ borderLeft: '1px dashed var(--border)', marginLeft: 8 }}>
          {node.children.map((child, index) => (
            <TreeNode 
              key={child.AccountNumber || index}
              node={child}
              searchField={searchField}
              expandedKeys={expandedKeys}
              setExpandedKeys={setExpandedKeys}
              selectedKey={selectedKey}
              setSelectedKey={setSelectedKey}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccountsMaster({ user, def }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedKeys, setExpandedKeys] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);
  const [treeViewMode, setTreeViewMode] = useState('hierarchy'); // 'hierarchy' or 'accountType'
  const [selectedAccount, setSelectedAccount] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const d = await apiCall('Accounts Master All', null, { User: user?.Username }, 'lookup');
      if (d.State !== 0) {
        setError(d.Message || 'Failed to fetch Accounts Master');
      } else {
        setData(d.List0 || []);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || 'Server connection error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user]);

  // Construct hierarchal tree data structure
  const treeData = useMemo(() => {
    if (!data.length) return [];
    
    if (treeViewMode === 'accountType') {
      // 1. Group accounts by AccountType
      const typesMap = {};
      data.forEach(acc => {
        const type = acc.AccountType || 'Other';
        if (!typesMap[type]) typesMap[type] = [];
        typesMap[type].push(acc);
      });

      // 2. For each AccountType, build its internal hierarchy tree
      const rootTypes = Object.keys(typesMap).map(type => {
        const accountsInType = typesMap[type];
        const accountMap = {};
        accountsInType.forEach(acc => {
          accountMap[acc.AccountNumber] = { ...acc, children: [] };
        });

        const typeRoots = [];
        accountsInType.forEach(acc => {
          const mapped = accountMap[acc.AccountNumber];
          const parentId = acc.ParentAccount;
          // Check if parent account exists within the same AccountType group
          if (parentId && accountMap[parentId]) {
            accountMap[parentId].children.push(mapped);
          } else {
            typeRoots.push(mapped);
          }
        });

        // Sort roots inside this type
        typeRoots.sort((a, b) => (a.AccountNumber || '').localeCompare(b.AccountNumber || ''));
        const sortTypeChildren = (nodes) => {
          nodes.forEach(n => {
            if (n.children && n.children.length > 0) {
              n.children.sort((a, b) => (a.AccountNumber || '').localeCompare(b.AccountNumber || ''));
              sortTypeChildren(n.children);
            }
          });
        };
        sortTypeChildren(typeRoots);

        return {
          AccountNumber: type.toUpperCase(),
          AccountDescription: `${type} Accounts`,
          LevelNumber: 0,
          AccountType: null,
          isTypeGroup: true,
          children: typeRoots
        };
      });

      // Sort type groups alphabetically
      rootTypes.sort((a, b) => a.AccountNumber.localeCompare(b.AccountNumber));
      return rootTypes;
    } else {
      // Normal hierarchy
      const map = {};
      data.forEach(acc => {
        map[acc.AccountNumber] = { ...acc, children: [] };
      });

      const roots = [];
      data.forEach(acc => {
        const mapped = map[acc.AccountNumber];
        const parentId = acc.ParentAccount;
        if (parentId && map[parentId]) {
          map[parentId].children.push(mapped);
        } else {
          roots.push(mapped);
        }
      });

      // Sort accounts by Number
      const sortNodes = (nodes) => {
        nodes.sort((a, b) => (a.AccountNumber || '').localeCompare(b.AccountNumber || ''));
        nodes.forEach(n => {
          if (n.children.length > 0) {
            sortNodes(n.children);
          }
        });
      };
      sortNodes(roots);
      return roots;
    }
  }, [data, treeViewMode]);

  // Auto-expand tree nodes matching search criteria
  useEffect(() => {
    if (!searchTerm || !data.length) return;
    const term = searchTerm.toLowerCase();
    const newExpanded = {};

    // For each matching element, expand all parents
    data.forEach(item => {
      const matches = (item.AccountNumber || '').toLowerCase().includes(term) ||
                      (item.AccountDescription || '').toLowerCase().includes(term);
      if (matches && item.ParentAccount) {
        // Trace back and flag parent keys
        let parentId = item.ParentAccount;
        while (parentId) {
          newExpanded[parentId] = true;
          const parentItem = data.find(x => x.AccountNumber === parentId);
          parentId = parentItem ? parentItem.ParentAccount : null;
        }
      }
    });

    setExpandedKeys(newExpanded);
  }, [searchTerm, data]);

  const handleExpandAll = () => {
    const keys = {};
    data.forEach(acc => {
      keys[acc.AccountNumber] = true;
    });
    setExpandedKeys(keys);
  };

  const handleCollapseAll = () => {
    setExpandedKeys({});
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard: ' + text);
  };

  const getAccountTypeBadgeColor = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('asset')) return 'var(--green)';
    if (t.includes('liability')) return 'var(--red)';
    if (t.includes('revenue') || t.includes('income')) return 'var(--blue)';
    if (t.includes('expense')) return 'var(--orange)';
    return 'var(--muted)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-title">{def?.icon || '📂'} {def?.label || 'Accounts Master'}</div>
          <div className="page-sub">{def?.desc || 'Interactive Chart of Accounts Directory Tree'}</div>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="err-page">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Main split dashboard view */}
      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0, marginTop: 16 }}>
        {/* Left Tree Directory View */}
        <div style={{
          flex: '1.4',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow)',
          padding: '20px',
          minWidth: 0,
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* Tree Controls Toolbar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            {/* Search filter input */}
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Search accounts by code or description..."
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 16px 0 36px',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  background: 'var(--soft)',
                  color: 'var(--text)',
                  outline: 'none',
                  fontFamily: 'var(--font)'
                }}
              />
              <span style={{ position: 'absolute', left: 12, top: 10, color: 'var(--muted)' }}></span>
            </div>
            
            {/* View Mode Regroup button */}
            <button 
              onClick={() => {
                setTreeViewMode(prev => prev === 'hierarchy' ? 'accountType' : 'hierarchy');
                setSelectedAccount(null);
                setSelectedKey(null);
                setExpandedKeys({});
              }}
              style={{
                height: '38px',
                padding: '0 16px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                background: treeViewMode === 'accountType' ? 'linear-gradient(135deg, var(--orange), var(--orange-dark))' : 'var(--surface)',
                color: treeViewMode === 'accountType' ? '#fff' : 'var(--text)',
                boxShadow: treeViewMode === 'accountType' ? '0 2px 4px rgba(249,115,22,0.2)' : 'none',
                transition: 'all 0.15s ease',
                fontFamily: 'var(--font)',
                whiteSpace: 'nowrap'
              }}
              title={treeViewMode === 'hierarchy' ? "Regroup tree by Account Type" : "Restore normal accounts hierarchy"}
            >
              {treeViewMode === 'hierarchy' ? '🗂️ Group by Type' : '📂 Normal View'}
            </button>

            {/* Expand / Collapse buttons */}
            <button 
              className="btn-secondary" 
              onClick={handleExpandAll} 
              style={{ height: '38px', whiteSpace: 'nowrap', fontSize: '12px' }}
              title="Expand all nodes"
            >
              👐 Expand All
            </button>
            <button 
              className="btn-secondary" 
              onClick={handleCollapseAll} 
              style={{ height: '38px', whiteSpace: 'nowrap', fontSize: '12px' }}
              title="Collapse all nodes"
            >
              🔒 Collapse All
            </button>
          </div>

          {/* Tree Directory Content Container */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px', color: 'var(--muted)' }}>
                Loading Chart of Accounts Tree…
              </div>
            ) : treeData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                No accounts found. Click refresh to retry.
              </div>
            ) : (
              <div style={{ marginLeft: -16 }}>
                {treeData.map((rootNode, index) => (
                  <TreeNode
                    key={rootNode.AccountNumber || index}
                    node={rootNode}
                    searchField={searchTerm}
                    expandedKeys={expandedKeys}
                    setExpandedKeys={setExpandedKeys}
                    selectedKey={selectedKey}
                    setSelectedKey={setSelectedKey}
                    onSelect={setSelectedAccount}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Details Panel View */}
        <div style={{
          flex: '0.85',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          height: '100%',
          overflowY: 'auto'
        }}>
          {selectedAccount ? (
            selectedAccount.isTypeGroup ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                color: 'var(--muted)',
                textAlign: 'center',
                padding: '24px 0'
              }}>
                <span style={{ fontSize: '40px', marginBottom: 12 }}>🗂️</span>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>
                  {selectedAccount.AccountNumber}
                </div>
                <div style={{ fontSize: '12.5px', marginTop: 6, color: 'var(--muted)' }}>
                  This is a category group containing all {selectedAccount.AccountNumber.toLowerCase()} accounts.
                </div>
              </div>
            ) : (
              <div>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: 'var(--orange2)',
                      background: 'var(--orange-soft)',
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}>
                      Account Details
                    </span>
                    
                    {/* Account Level */}
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      background: 'var(--soft)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      color: 'var(--muted)'
                    }}>
                      Hierarchy Level {selectedAccount.LevelNumber}
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '8px 0 4px 0', color: 'var(--text)' }}>
                    {selectedAccount.AccountDescription}
                  </h3>
                  
                  {/* Account Number details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <code style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--muted)',
                      background: 'var(--soft)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)'
                    }}>
                      {selectedAccount.AccountNumber}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(selectedAccount.AccountNumber)}
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: 'var(--orange2)',
                        fontWeight: 600
                      }}
                      title="Copy Account Number"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>

                {/* Specification fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Account Type</div>
                    {selectedAccount.AccountType ? (
                      <span style={{
                        display: 'inline-block',
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#ffffff',
                        background: getAccountTypeBadgeColor(selectedAccount.AccountType),
                        borderRadius: '6px',
                        padding: '4px 10px',
                        marginTop: 2
                      }}>
                        {selectedAccount.AccountType}
                      </span>
                    ) : (
                      <span style={{ fontSize: '13px', color: 'var(--muted)' }}>—</span>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Short Description</div>
                    <div style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>
                      {selectedAccount.ShortDescription || '—'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Extra Description</div>
                    <div style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>
                      {selectedAccount.ExtraDescription || '—'}
                    </div>
                  </div>

                  {selectedAccount.ParentAccount && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Parent Account Code</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--muted)'
                        }}>
                          {selectedAccount.ParentAccount}
                        </code>
                        <button
                          onClick={() => {
                            setSelectedKey(selectedAccount.ParentAccount);
                            const parent = data.find(x => x.AccountNumber === selectedAccount.ParentAccount);
                            if (parent) {
                              setSelectedAccount(parent);
                              // Expand the parent's path if collapsed
                              setExpandedKeys(prev => ({ ...prev, [selectedAccount.ParentAccount]: true }));
                            }
                          }}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: 'var(--orange2)',
                            fontWeight: 600
                          }}
                        >
                          🔍 Focus Parent
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              color: 'var(--muted)',
              textAlign: 'center',
              padding: '24px 0'
            }}>
              <span style={{ fontSize: '40px', marginBottom: 12 }}>📁</span>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>No Account Selected</div>
              <div style={{ fontSize: '12.5px', marginTop: 4 }}>Select an account node from the directory tree to inspect full specifications.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
