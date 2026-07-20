import React, { useState, useEffect, useMemo } from 'react';
import { apiCall } from '../shared/api.js';

function TreeNode({ node, searchField, expandedKeys, setExpandedKeys, selectedKey, setSelectedKey, onSelect }) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = !!expandedKeys[node.SegmentValue];
  const isSelected = selectedKey === node.SegmentValue;

  const matchesSearch = useMemo(() => {
    if (!searchField) return true;
    const term = searchField.toLowerCase();
    
    const checkMatch = (n) => {
      const descMatch = (n.ValueDescription || '').toLowerCase().includes(term);
      const valMatch = (n.SegmentValue || '').toLowerCase().includes(term);
      if (descMatch || valMatch) return true;
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
      [node.SegmentValue]: !prev[node.SegmentValue]
    }));
  };

  const handleSelect = () => {
    setSelectedKey(node.SegmentValue);
    onSelect(node);
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
      >
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

        <span style={{ marginRight: '8px', fontSize: '15px' }}>
          {hasChildren ? (isExpanded ? '📂' : '📁') : '📄'}
        </span>

        <span style={{ 
          fontFamily: 'var(--mono)', 
          fontSize: '13px', 
          fontWeight: 700, 
          color: isSelected ? 'var(--orange2)' : (hasChildren ? 'var(--orange-dark)' : 'var(--muted)'),
          marginRight: '8px'
        }}>
          {node.SegmentValue}
        </span>

        <span style={{ 
          fontSize: '13px', 
          fontWeight: isSelected ? 700 : (hasChildren ? 700 : 500),
          color: isSelected ? 'var(--orange2)' : (hasChildren ? 'var(--text)' : 'var(--muted)'),
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {node.ValueDescription}
        </span>

        <span style={{
          fontSize: '10px',
          fontWeight: 800,
          background: 'var(--soft)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '2px 6px',
          marginLeft: '8px',
          color: 'var(--muted)'
        }}>
          L{node.LevelNumber}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div style={{ borderLeft: '1px dashed var(--border)', marginLeft: 8 }}>
          {node.children.map((child, index) => (
            <TreeNode 
              key={child.SegmentValue || index}
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

export default function SegmentDefinition({ user, def }) {
  const [segments, setSegments] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState('');
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [expandedKeys, setExpandedKeys] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    async function fetchSegments() {
      try {
        const d = await apiCall('Segment Definition Master', null, { User: user?.Username }, 'lookup');
        if (d.State === 0 && d.List0) {
          setSegments(d.List0);
        }
      } catch (e) {
        console.error('Failed to load segments', e);
      }
    }
    fetchSegments();
  }, [user]);

  async function loadData() {
    if (!selectedSegment) {
      setData([]);
      setSelectedNode(null);
      setSelectedKey(null);
      return;
    }
    
    setLoading(true);
    setError('');
    setSelectedNode(null);
    setSelectedKey(null);
    try {
      const d = await apiCall('Segments Master List', { param1: selectedSegment }, { User: user?.Username }, 'lookup');
      if (d.State !== 0) {
        setError(d.Message || 'Failed to fetch segment values');
        setData([]);
      } else {
        setData(d.List0 || []);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [selectedSegment]);

  const treeData = useMemo(() => {
    if (!data.length) return [];
    
    const map = {};
    data.forEach(item => {
      map[item.SegmentValue] = { ...item, children: [] };
    });

    const roots = [];
    data.forEach(item => {
      const mapped = map[item.SegmentValue];
      const parentId = item.ParentValue;
      if (parentId && map[parentId]) {
        map[parentId].children.push(mapped);
      } else {
        roots.push(mapped);
      }
    });

    const sortChildren = (nodes) => {
      nodes.forEach(n => {
        if (n.children && n.children.length > 0) {
          n.children.sort((a, b) => (a.SegmentValue || '').localeCompare(b.SegmentValue || ''));
          sortChildren(n.children);
        }
      });
    };
    
    roots.sort((a, b) => (a.SegmentValue || '').localeCompare(b.SegmentValue || ''));
    sortChildren(roots);
    
    return roots;
  }, [data]);

  const handleExpandAll = () => {
    const keys = {};
    data.forEach(item => {
      keys[item.SegmentValue] = true;
    });
    setExpandedKeys(keys);
  };

  const handleCollapseAll = () => {
    setExpandedKeys({});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <div className="page-title">{def?.icon || '📑'} {def?.label || 'Segment Definition'}</div>
          <div className="page-sub">{def?.desc || 'Manage Segment Values and Definitions'}</div>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select 
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            style={{
              padding: '0 12px',
              height: '36px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '13px',
              fontWeight: 600,
              minWidth: '200px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">-- Select Segment Definition --</option>
            {segments.map(s => (
              <option key={s.SegmentID} value={s.SegmentID}>
                {s.SegmentID} - {s.SegmentDescription}
              </option>
            ))}
          </select>
          <button className="btn-secondary" onClick={loadData} disabled={loading || !selectedSegment}>
            {loading ? 'Refreshing…' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 20, minHeight: 0 }}>
        {/* Left Panel: Tree View */}
        <div style={{ 
          flex: 6, 
          display: 'flex', 
          flexDirection: 'column', 
          background: 'var(--surface)', 
          borderRadius: '16px', 
          border: '1px solid var(--border)', 
          overflow: 'hidden' 
        }}>
          {/* Tree Header / Controls */}
          <div style={{ 
            padding: '16px', 
            borderBottom: '1px solid var(--border)', 
            display: 'flex', 
            gap: 12, 
            alignItems: 'center',
            background: 'var(--soft)'
          }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 12, top: 10, fontSize: 13 }}>🔍</span>
              <input 
                type="text" 
                placeholder="Search segment values..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                disabled={!selectedSegment}
                style={{ 
                  width: '100%', 
                  padding: '9px 12px 9px 34px', 
                  borderRadius: 'var(--radius-xs)', 
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
            <button className="btn-secondary" onClick={handleExpandAll} disabled={!selectedSegment} style={{ height: 34, fontSize: 12 }}>Expand All</button>
            <button className="btn-secondary" onClick={handleCollapseAll} disabled={!selectedSegment} style={{ height: 34, fontSize: 12 }}>Collapse All</button>
          </div>

          {/* Tree Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', paddingLeft: 0 }}>
            {error ? (
              <div className="err-page" style={{ margin: 16 }}>{error}</div>
            ) : loading ? (
              <div className="loading-wrap">
                <div className="spinner"></div>
                <div>Loading segment hierarchy...</div>
              </div>
            ) : !selectedSegment ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📑</div>
                Select a Segment Definition to view its tree hierarchy.
              </div>
            ) : treeData.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No segment values found.</div>
            ) : (
              treeData.map((node, i) => (
                <TreeNode 
                  key={node.SegmentValue || i}
                  node={node}
                  searchField={searchTerm}
                  expandedKeys={expandedKeys}
                  setExpandedKeys={setExpandedKeys}
                  selectedKey={selectedKey}
                  setSelectedKey={setSelectedKey}
                  onSelect={setSelectedNode}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Selected Details */}
        <div style={{ 
          flex: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          background: 'var(--surface)', 
          borderRadius: '16px', 
          border: '1px solid var(--border)', 
          overflowY: 'auto' 
        }}>
          <div style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid var(--border)',
            background: 'var(--soft)'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800 }}>Segment Details</h3>
          </div>
          
          <div style={{ padding: '24px 20px' }}>
            {selectedNode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Header Profile */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 12, 
                    background: 'linear-gradient(135deg, var(--orange), var(--orange2))', 
                    color: '#fff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: 24,
                    flexShrink: 0
                  }}>
                    {selectedNode.children && selectedNode.children.length > 0 ? '📂' : '📄'}
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                      {selectedNode.ValueDescription || '-'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--orange2)', fontWeight: 700 }}>
                        {selectedNode.SegmentValue}
                      </span>
                      {selectedNode.LevelNumber && (
                        <span style={{ fontSize: '10px', background: 'var(--soft)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: 4, fontWeight: 800, color: 'var(--muted)' }}>
                          Level {selectedNode.LevelNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--border)' }}></div>

                {/* Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Short Description</label>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{selectedNode.ValueShortDescription || '-'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Extra Description</label>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{selectedNode.ValueExtraDescription || '-'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Parent Value</label>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{selectedNode.ParentValue || '-'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Allow Posting</label>
                    <div style={{ 
                      display: 'inline-block',
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontSize: '11px', 
                      fontWeight: 600,
                      background: selectedNode.AllowPostingJournal === 1 ? 'var(--green-soft)' : 'var(--red-soft)',
                      color: selectedNode.AllowPostingJournal === 1 ? 'var(--green)' : 'var(--red)'
                    }}>
                      {selectedNode.AllowPostingJournal === 1 ? 'YES' : 'NO'}
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--border)' }}></div>

                {/* System Info */}
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>System Info</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'var(--soft)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', display: 'block' }}>Created By</label>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>{selectedNode.ValueCreatedByUser || '-'}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', display: 'block' }}>Created Date</label>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>
                        {selectedNode.ValueCreatedDate ? new Date(selectedNode.ValueCreatedDate).toLocaleDateString() : '-'}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', display: 'block' }}>Maintained By</label>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>{selectedNode.ValueLastMaintBy || '-'}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', display: 'block' }}>Maintained Date</label>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>
                        {selectedNode.ValueLastMaintDate ? new Date(selectedNode.ValueLastMaintDate).toLocaleDateString() : '-'}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>👆</div>
                Select a segment value from the tree<br/>to view its full details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
