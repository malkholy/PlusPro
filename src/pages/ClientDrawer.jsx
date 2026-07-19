import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

function formatQty(val) {
  if (val == null || val === '') return '0.00';
  const n = Number(val);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMobile(val) {
  if (!val) return '';
  let s = val.toString().trim();
  if (s.startsWith('963')) {
    return '0' + s.slice(3);
  }
  return s;
}

export default function ClientDrawer({ clientID, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState('details');
  const [activeSubTab, setActiveSubTab] = useState('transactions'); // 'transactions', 'charging', 'activation', 'redemption'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editJob, setEditJob] = useState('');
  const [editGov, setEditGov] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [governorates, setGovernorates] = useState([]);

  useEffect(() => {
    if (!clientID) return;
    async function fetchGovs() {
      try {
        const res = await apiCall('GetGovernorates');
        if (res.State === 0 && res.List0 && res.List0.length > 0) {
          setGovernorates(res.List0);
        } else {
          // Fallback if the stored procedure is not yet executed/updated in the SQL Server database
          setGovernorates([
            { GovermentID: 1, ArabicName: 'دمشق' },
            { GovermentID: 2, ArabicName: 'ريف دمشق' },
            { GovermentID: 3, ArabicName: 'حلب' },
            { GovermentID: 4, ArabicName: 'حمص' },
            { GovermentID: 5, ArabicName: 'حماة' },
            { GovermentID: 6, ArabicName: 'اللاذقية' },
            { GovermentID: 7, ArabicName: 'طرطوس' },
            { GovermentID: 8, ArabicName: 'إدلب' },
            { GovermentID: 9, ArabicName: 'درعا' },
            { GovermentID: 10, ArabicName: 'السويداء' },
            { GovermentID: 11, ArabicName: 'القنيطرة' },
            { GovermentID: 12, ArabicName: 'دير الزور' },
            { GovermentID: 13, ArabicName: 'الحسكة' },
            { GovermentID: 14, ArabicName: 'الرقة' }
          ]);
        }
      } catch (e) {
        console.error('Error fetching governorates:', e);
      }
    }
    fetchGovs();
  }, [clientID]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiCall('UpdateClientProfile', {
        ClientID: Number(clientID),
        Job: editJob,
        GovermentID: editGov ? Number(editGov) : null,
        Address: editAddress
      });
      if (res.State !== 0) {
        alert(res.Message || 'Failed to update client profile');
      } else {
        const selectedGov = governorates.find(g => Number(g.GovermentID) === Number(editGov));
        setData(prev => ({
          ...prev,
          Job: editJob,
          GovermentID: editGov ? Number(editGov) : null,
          ArabicName: selectedGov ? selectedGov.ArabicName : '',
          Address: editAddress
        }));
        setIsEditing(false);
        if (onSaved) onSaved();
      }
    } catch (err) {
      alert(err.message);
    }
    setSaving(false);
  };

  const inputStyle = {
    width: '100%',
    height: '34px',
    padding: '0 10px',
    border: '1.5px solid var(--border)',
    borderRadius: '8px',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: '12.5px',
    fontFamily: 'var(--font)',
    outline: 'none',
    transition: 'border-color 0.2s',
    marginTop: '6px'
  };

  useEffect(() => {
    if (!clientID) return;
    async function fetchClientDetail() {
      setLoading(true);
      setError('');
      try {
        const res = await apiCall('GetClientDetail', { ClientID: Number(clientID) });
        if (res.State !== 0) {
          setError(res.Message || 'Failed to load client details.');
          setData(null);
        } else {
          const clientData = res.List0 && res.List0.length > 0 ? res.List0[0] : null;
          if (clientData) {
            setData({
              ...clientData,
              transactionHistory: res.List1 || []
            });
            setEditJob(clientData.Job || '');
            setEditGov(clientData.GovermentID || '');
            setEditAddress(clientData.Address || '');
          } else {
            setError('Client details not found.');
          }
        }
      } catch (err) {
        console.error(err);
        setError('Connection error: ' + err.message);
      }
      setLoading(false);
    }
    fetchClientDetail();
  }, [clientID]);

  if (!clientID) return null;

  const displayName = data?.Name || `Client #${clientID}`;
  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'CL';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose} 
        style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
          animation: 'fadeIn 0.2s ease-out'
        }}
      ></div>

      {/* Slide-out Drawer Panel */}
      <div 
        style={{
          position: 'relative', width: '100%', maxWidth: '950px', height: '100%',
          background: 'var(--surface)', borderLeft: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column',
          padding: '24px', animation: 'slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden'
        }}
      >
        {/* CSS Animations */}
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
          .drawer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
          .drawer-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
          .drawer-val { font-size: 13px; font-weight: 600; color: var(--text); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .drawer-item { background: var(--soft); border: 1px solid var(--border); border-radius: var(--radius-xs); padding: 10px 14px; }
          .sub-tab-btn { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; color: var(--muted); transition: all 0.15s; }
          .sub-tab-btn.active { background: var(--orange-soft); color: var(--orange); border-color: var(--orange); }
        `}</style>

        {/* Drawer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div 
              style={{ 
                width: 48, height: 48, borderRadius: '12px', 
                background: 'linear-gradient(135deg, var(--orange), var(--orange2))', 
                color: '#fff', fontSize: '18px', fontWeight: 800, 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow)'
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                {displayName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                GLC ID: <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>#{clientID}</span>
                {data?.Job && <span style={{ marginLeft: 8, padding: '1px 6px', background: 'var(--soft)', borderRadius: 4, fontWeight: 700, color: 'var(--orange)' }}>{data.Job}</span>}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{
              width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)',
              background: 'var(--soft)', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text)',
              transition: 'background 0.2s'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 18, marginBottom: 20 }}>
          {[
            { id: 'details', label: '👤 Profile & Details' },
            { id: 'history', label: '🪙 Loyalty History' }
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => setActiveTab(t.id)} 
              style={{
                background: 'none', border: 'none', padding: '8px 4px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', color: activeTab === t.id ? 'var(--orange)' : 'var(--muted)',
                borderBottom: activeTab === t.id ? '2.5px solid var(--orange)' : '2.5px solid transparent',
                transition: 'all 0.15s ease', fontFamily: 'var(--font)', marginBottom: -1
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner"></div></div>
          ) : error ? (
            <div className="err-page">{error}</div>
          ) : data ? (
            <>
              {/* Tab 1: Profile Details */}
              {activeTab === 'details' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        style={{
                          height: 32, padding: '0 16px', border: 'none', borderRadius: '8px',
                          background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                          color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(249,115,22,0.2)', transition: 'all 0.15s ease',
                          fontFamily: 'var(--font)'
                        }}
                      >
                        ✏️ Edit Profile
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          style={{
                            height: 32, padding: '0 16px', border: 'none', borderRadius: '8px',
                            background: 'var(--green)', color: '#fff', fontSize: '12px',
                            fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {saving ? 'Saving...' : '💾 Save'}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setEditJob(data.Job || '');
                            setEditGov(data.GovermentID || '');
                            setEditAddress(data.Address || '');
                          }}
                          style={{
                            height: 32, padding: '0 16px', border: '1px solid var(--border)',
                            borderRadius: '8px', background: 'var(--soft)', color: 'var(--text)',
                            fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                            fontFamily: 'var(--font)', transition: 'all 0.15s ease'
                          }}
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="drawer-grid">
                    <div className="drawer-item">
                      <div className="drawer-label">Full Name</div>
                      <div className="drawer-val" title={data.Name}>{data.Name || '—'}</div>
                    </div>
                    <div className="drawer-item">
                      <div className="drawer-label">Job / Profession</div>
                      {isEditing ? (
                        <select
                          value={editJob}
                          onChange={e => setEditJob(e.target.value)}
                          style={inputStyle}
                        >
                          <option value="">Select Job...</option>
                          {['دهان', 'تاجر', 'متعهد', 'مهندس', 'آخر'].map(job => (
                            <option key={job} value={job}>{job}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="drawer-val">{data.Job || '—'}</div>
                      )}
                    </div>
                    <div className="drawer-item">
                      <div className="drawer-label">Mobile Number</div>
                      <div className="drawer-val">{formatMobile(data.Mobile) || '—'}</div>
                    </div>
                    <div className="drawer-item" style={{ gridColumn: 'span 2' }}>
                      <div className="drawer-label">Government Name (Arabic)</div>
                      {isEditing ? (
                        <select
                          value={editGov}
                          onChange={e => setEditGov(e.target.value)}
                          style={inputStyle}
                        >
                          <option value="">Select Government...</option>
                          {governorates.map(g => (
                            <option key={g.GovermentID} value={g.GovermentID}>{g.ArabicName}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="drawer-val">{data.ArabicName || '—'}</div>
                      )}
                    </div>
                    <div className="drawer-item" style={{ gridColumn: 'span 2' }}>
                      <div className="drawer-label">Address</div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editAddress}
                          onChange={e => setEditAddress(e.target.value)}
                          style={inputStyle}
                        />
                      ) : (
                        <div className="drawer-val" title={data.Address} style={{ whiteSpace: 'normal' }}>
                          {data.Address || '—'}
                        </div>
                      )}
                    </div>

                    <div className="drawer-item">
                      <div className="drawer-label">Created Date</div>
                      <div className="drawer-val">{formatDate(data.CreatedDate)}</div>
                    </div>

                    <div className="drawer-item" style={{ background: 'var(--orange-soft)', borderColor: 'rgba(249,115,22,0.2)' }}>
                      <div className="drawer-label" style={{ color: 'var(--orange)' }}>Loyalty Points Balance</div>
                      <div className="drawer-val" style={{ fontSize: '18px', fontWeight: 800, color: Number(data.Balance || 0) < 0 ? 'var(--red)' : 'var(--green)', marginTop: 2 }}>
                        {formatQty(data.Balance)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Loyalty History */}
              {activeTab === 'history' && (() => {
                const history = data.transactionHistory || [];
                const totalTrans = history.length;
                const totalCharged = history.reduce((acc, curr) => {
                  const pt = Number(curr.Point || 0);
                  return pt > 0 ? acc + pt : acc;
                }, 0);
                const totalRedeemed = history.reduce((acc, curr) => {
                  const pt = Number(curr.Point || 0);
                  return pt < 0 ? acc + Math.abs(pt) : acc;
                }, 0);
                const netChange = history.reduce((acc, curr) => acc + Number(curr.Point || 0), 0);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    {/* KPI Summary Grid */}
                    <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                      <div className="kpi-card" style={{ padding: '12px 14px' }}>
                        <div className="kpi-label" style={{ fontSize: '9px', marginBottom: '4px' }}>Total Transactions</div>
                        <div className="kpi-value" style={{ fontSize: '18px' }}>{totalTrans.toLocaleString()}</div>
                      </div>
                      <div className="kpi-card" style={{ padding: '12px 14px' }}>
                        <div className="kpi-label" style={{ fontSize: '9px', marginBottom: '4px' }}>Total Charged</div>
                        <div className="kpi-value" style={{ fontSize: '18px', color: 'var(--green)' }}>+{formatQty(totalCharged)}</div>
                      </div>
                      <div className="kpi-card" style={{ padding: '12px 14px' }}>
                        <div className="kpi-label" style={{ fontSize: '9px', marginBottom: '4px' }}>Total Redeemed</div>
                        <div className="kpi-value" style={{ fontSize: '18px', color: 'var(--red)' }}>-{formatQty(totalRedeemed)}</div>
                      </div>
                      <div className="kpi-card" style={{ padding: '12px 14px', background: 'var(--orange-soft)', borderColor: 'rgba(249,115,22,0.2)' }}>
                        <div className="kpi-label" style={{ fontSize: '9px', marginBottom: '4px', color: 'var(--orange)' }}>Net Change</div>
                        <div className="kpi-value" style={{ fontSize: '18px', color: netChange >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {netChange >= 0 ? '+' : ''}{formatQty(netChange)}
                        </div>
                      </div>
                    </div>

                    {/* Loyalty List */}
                    <div className="table-panel" style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 0 }}>
                      <div className="table-wrap" style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
                        <table>
                          <thead>
                            <tr>
                              <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)' }}>Date</th>
                              <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)' }}>Code</th>
                              <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)' }}>Card/Serial</th>
                              <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)' }}>Description / Gift</th>
                              <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', textAlign: 'right' }}>Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.length === 0 ? (
                              <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--muted)', padding: 18 }}>No transaction history found.</td></tr>
                            ) : (
                              history.map((item, idx) => {
                                const points = Number(item.Point || 0);
                                const isPositive = points >= 0;
                                return (
                                  <tr key={idx}>
                                    <td>{formatDate(item.TransactionDate)}</td>
                                    <td style={{ fontFamily: 'var(--mono)' }}>{item.Code || '—'}</td>
                                    <td style={{ fontFamily: 'var(--mono)' }}>{item.CardSerial || '—'}</td>
                                    <td style={{ fontWeight: item.GiftName ? 600 : 400 }}>{item.GiftName || (isPositive ? 'Points Charged/Activated' : 'Points Redeemed')}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: isPositive ? 'var(--green)' : 'var(--red)' }}>
                                      {isPositive ? '+' : ''}{formatQty(points)}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>Select a client to view details.</div>
          )}
        </div>
      </div>
    </div>
  );
}
