import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

const DEFAULT_AVATAR = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

// Helper for formatting dates cleanly
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Helper to format currency values
function formatCurrency(val) {
  if (val == null || val === '') return '—';
  const num = Number(val);
  if (isNaN(num)) return val;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EGP';
}

export default function EmployeeDrawer({ employeeID, onClose }) {
  const [activeTab, setActiveTab] = useState('employment');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enlargedPhoto, setEnlargedPhoto] = useState(null);

  useEffect(() => {
    if (!employeeID) return;
    async function fetchEmployeeDetail() {
      setLoading(true);
      setError('');
      try {
        const res = await apiCall('Get Employee Detail', { EmployeeID: employeeID }, {}, 'hr');
        const list0 = res.List0 || [];
        const empData = list0.length > 0 ? list0[0] : (Array.isArray(res) ? res.find(e => Number(e.EmployeeID) === Number(employeeID)) : null);
        if (empData) {
          const termInfo = (res.List1 || []).find(t => Number(t.EmployeeID) === Number(employeeID));
          const salaries = res.List2 || [];
          const kpis = res.List3 || [];
          const leaves = res.List4 || [];
          setData({
            ...empData,
            TerminationDate: termInfo ? termInfo.TerminationDate : empData.LeavingDate,
            TerminationNote: termInfo ? termInfo.TerminationNote : empData.TerminationNotes,
            salaries: salaries,
            kpis: kpis,
            leaves: leaves
          });
        } else {
          setError('Employee details not found.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load employee details.');
      }
      setLoading(false);
    }
    fetchEmployeeDetail();
  }, [employeeID]);

  if (!employeeID) return null;

  const displayName = data?.Fullname || data?.FullName || `Employee #${employeeID}`;
  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'EMP';
  const hasPhoto = data?.ImagePhoto && !data.ImagePhoto.endsWith('/-0.jpg') && !data.ImagePhoto.endsWith('/0-0.jpg');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose} 
        style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
          animation: 'fadeIn 0.25s ease-out'
        }}
      ></div>

      {/* Slide-out Drawer Panel */}
      <div 
        style={{
          position: 'relative', width: '100%', maxWidth: '800px', height: '100%',
          background: 'var(--surface)', borderLeft: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column',
          padding: '24px', animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden'
        }}
      >
        {/* CSS Animations */}
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
          .drawer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
          .drawer-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
          .drawer-val { font-size: 13.5px; font-weight: 600; color: var(--text); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; }
          .drawer-item { background: var(--soft); border: 1px solid var(--border); border-radius: var(--radius-xs); padding: 10px 14px; }
        `}</style>

        {/* Drawer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img 
              src={hasPhoto ? data.ImagePhoto : DEFAULT_AVATAR}
              alt={displayName}
              style={{ width: 180, height: 180, borderRadius: '8px', objectFit: 'cover', objectPosition: 'top', border: '2px solid var(--border)', cursor: 'zoom-in' }}
              onClick={() => setEnlargedPhoto({ src: hasPhoto ? data.ImagePhoto : DEFAULT_AVATAR, name: displayName })}
              onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
            />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {data?.Fullname || data?.FullName || `Employee #${employeeID}`}
                {data?.IsManger === 1 && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    background: 'rgba(249, 115, 22, 0.08)',
                    color: 'var(--orange)',
                    border: '1px solid var(--orange)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Manager
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>ID: #{employeeID}</span>
                <span>•</span>
                <span style={{ color: 'var(--orange)', fontWeight: 700 }}>{data?.JobName || 'Employee'}</span>
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
            { id: 'employment', label: '💼 Employment' },
            { id: 'personal', label: '👤 Personal Info' },
            { id: 'financial', label: '💵 Financials' },
            { id: 'kpis', label: '📈 KPIs' },
            { id: 'leaves', label: '📅 Leave Balance' }
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
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner"></div></div>
          ) : error ? (
            <div className="err-page">{error}</div>
          ) : data ? (
            <>
              {/* Tab 1: Employment */}
              {activeTab === 'employment' && (
                <div className="drawer-grid">
                  <div className="drawer-item">
                    <div className="drawer-label">Job Title</div>
                    <div className="drawer-val">{data.JobName}</div>
                  </div>
                  <div className="drawer-item">
                    <div className="drawer-label">Department</div>
                    <div className="drawer-val">{data.DepartmentName}</div>
                  </div>
                  <div className="drawer-item">
                    <div className="drawer-label">Division</div>
                    <div className="drawer-val">{data.DivisionName || '—'}</div>
                  </div>
                  <div className="drawer-item">
                    <div className="drawer-label">Branch</div>
                    <div className="drawer-val">{data.BranchName}</div>
                  </div>
                  <div className="drawer-item">
                    <div className="drawer-label">Joining Date</div>
                    <div className="drawer-val">{formatDate(data.JoiningDate)}</div>
                  </div>
                  <div className="drawer-item">
                    <div className="drawer-label">Contract Date</div>
                    <div className="drawer-val">{formatDate(data.ContractDate)}</div>
                  </div>
                  <div className="drawer-item">
                    <div className="drawer-label">Leaving Date</div>
                    <div className="drawer-val">{formatDate(data.LeavingDate || data.TerminationDate)}</div>
                  </div>
                  {data.TerminationNote && (
                    <div className="drawer-item" style={{ gridColumn: 'span 2' }}>
                      <div className="drawer-label">Termination Reason / Note</div>
                      <div className="drawer-val" style={{ color: 'var(--red)', fontWeight: 600 }}>
                        {data.TerminationNote}
                      </div>
                    </div>
                  )}
                  <div className="drawer-item">
                    <div className="drawer-label">Grade / Class</div>
                    <div className="drawer-val">{data.JobGrade || '—'}</div>
                  </div>
                  <div className="drawer-item">
                    <div className="drawer-label">Employee Type</div>
                    <div className="drawer-val">{data.EmployeeType || '—'}</div>
                  </div>
                  <div className="drawer-item">
                    <div className="drawer-label">Manager / Reports To</div>
                    <div className="drawer-val">{data.ReportingTo || data.ReportTo || '—'}</div>
                  </div>
                  <div className="drawer-item">
                    <div className="drawer-label">Status</div>
                    <div className="drawer-val">
                      <span className={`badge ${data.EmployeeCurrentStauts === 'Working' || data.Active === 1 ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 11, padding: '2px 8px' }}>
                        {data.EmployeeCurrentStauts || (data.Active === 1 ? 'Working' : 'Inactive')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Personal Info */}
              {activeTab === 'personal' && (
                <div className="drawer-grid">
                  <div className="drawer-item">
                    <div className="drawer-label">Birth Date</div>
                    <div className="drawer-val">{formatDate(data.Birthdate)}</div>
                  </div>
                  <div className="drawer-item">
                    <div className="drawer-label">Education / Major</div>
                    <div className="drawer-val">{data.Education ? `${data.Education} (${data.Major || 'No Major'})` : '—'}</div>
                  </div>
                  <div className="drawer-item">
                    <div className="drawer-label">Mobile (Primary)</div>
                    <div className="drawer-val">{data.Mob || '—'}</div>
                  </div>
                  <div className="drawer-item">
                    <div className="drawer-label">Tel (Secondary)</div>
                    <div className="drawer-val">{data.Tel || '—'}</div>
                  </div>
                  <div className="drawer-item" style={{ gridColumn: 'span 2' }}>
                    <div className="drawer-label">Address</div>
                    <div className="drawer-val">{data.Address || '—'}</div>
                  </div>
                </div>
              )}

              {/* Tab 3: Financials */}
              {activeTab === 'financial' && (
                <div className="drawer-grid">
                  {data.salaries && data.salaries.length > 0 ? (
                    <div className="drawer-item" style={{ gridColumn: 'span 2' }}>
                      <div className="drawer-label" style={{ marginBottom: 8 }}>Salary Components Breakdown</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                        <thead>
                          <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                            <th style={{ textAlign: 'left', padding: '6px 4px', color: 'var(--muted)' }}>Component</th>
                            <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--muted)' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.salaries.map((sal, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '6px 4px', fontWeight: 600, color: 'var(--text)' }}>
                                {sal.SalaryName || 'Salary Component'}
                              </td>
                              <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>
                                {formatCurrency(sal.SalaryAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                            <td style={{ padding: '10px 4px', color: 'var(--text)' }}>Total Salary</td>
                            <td style={{ padding: '10px 4px', textAlign: 'right', color: 'var(--green)', fontSize: 13.5 }}>
                              {formatCurrency(data.salaries.reduce((sum, sal) => sum + (Number(sal.SalaryAmount) || 0), 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div style={{ gridColumn: 'span 2', padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      No salary components breakdown available.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: KPIs */}
              {activeTab === 'kpis' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {data.kpis && data.kpis.length > 0 ? (
                    <div className="drawer-item" style={{ width: '100%' }}>
                      <div className="drawer-label" style={{ marginBottom: 12 }}>Performance Evaluations</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                            <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--muted)', fontWeight: 700 }}>Period</th>
                            <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--muted)', fontWeight: 700 }}>KPI Description</th>
                            <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--muted)', fontWeight: 700 }}>Target</th>
                            <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--muted)', fontWeight: 700 }}>Achieved</th>
                            <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--muted)', fontWeight: 700 }}>Score %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.kpis.map((kpi, idx) => {
                            const target = Number(kpi.TargetScore) || 0;
                            const achieved = Number(kpi.AchievedScore) || 0;
                            const percentage = target > 0 ? Math.round((achieved / target) * 100) : 0;
                            
                            let badgeClass = 'badge-gray';
                            if (percentage >= 90) {
                              badgeClass = 'badge-green';
                            } else if (percentage >= 75) {
                              badgeClass = 'badge-blue';
                            } else if (percentage >= 50) {
                              badgeClass = 'badge-orange';
                            } else if (percentage > 0) {
                              badgeClass = 'badge-red';
                            }

                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '10px 6px', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text)' }}>
                                  {kpi.EvaluationYear} Q{kpi.EvaluationQuarter}
                                </td>
                                <td style={{ padding: '10px 6px', color: 'var(--text)', lineHeight: 1.4, whiteSpace: 'normal' }}>
                                  <div>{kpi.KPIDescription || '—'}</div>
                                  {kpi.EvaluateBy && (
                                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <span>👤 Evaluated By:</span>
                                      <span style={{ fontWeight: 600 }}>{kpi.EvaluateBy}</span>
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>
                                  {target}
                                </td>
                                <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>
                                  {achieved}
                                </td>
                                <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                                  <span className={`badge ${badgeClass}`} style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px' }}>
                                    {percentage}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, background: 'var(--soft)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>📈</div>
                      No KPI evaluations recorded for this employee.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Leave Balance */}
              {activeTab === 'leaves' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {data.leaves && data.leaves.length > 0 ? (
                    <div className="drawer-item" style={{ width: '100%' }}>
                      <div className="drawer-label" style={{ marginBottom: 12 }}>Leave Balance Breakdown (2026)</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                            <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--muted)', fontWeight: 700 }}>Leave Type</th>
                            <th style={{ textAlign: 'center', padding: '8px 6px', color: 'var(--muted)', fontWeight: 700 }}>Year</th>
                            <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--muted)', fontWeight: 700 }}>Remaining Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.leaves.map((leave, idx) => {
                            const bal = Number(leave.balance) || 0;
                            let badgeClass = 'badge-blue';
                            if (bal <= 0) {
                              badgeClass = 'badge-red';
                            } else if (bal <= 3) {
                              badgeClass = 'badge-orange';
                            } else if (bal > 15) {
                              badgeClass = 'badge-green';
                            }

                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '10px 6px', fontWeight: 600, color: 'var(--text)' }}>
                                  {leave.LeaveName || '—'}
                                </td>
                                <td style={{ padding: '10px 6px', textAlign: 'center', color: 'var(--muted)' }}>
                                  {leave.BalanceYear}
                                </td>
                                <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                                  <span className={`badge ${badgeClass}`} style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px' }}>
                                    {bal} Days
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, background: 'var(--soft)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
                      No leave balance records found for this employee.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No employee selected.</div>
          )}
        </div>
      </div>

      {enlargedPhoto && (
        <div 
          onClick={() => setEnlargedPhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          `}</style>
          <div 
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '90%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'zoomIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={enlargedPhoto.src} 
              alt={enlargedPhoto.name}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: '8px',
                border: '3px solid rgba(255, 255, 255, 0.95)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
                objectFit: 'contain'
              }}
            />
            <div 
              style={{
                marginTop: 14,
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                textAlign: 'center'
              }}
            >
              {enlargedPhoto.name}
            </div>
            <button
              onClick={() => setEnlargedPhoto(null)}
              style={{
                position: 'absolute',
                top: -15,
                right: -15,
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.6)',
                border: '2px solid #fff',
                color: '#fff',
                fontSize: 18,
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.style.backgroundColor = 'var(--orange)'}
              onMouseLeave={(e) => e.style.backgroundColor = 'rgba(0,0,0,0.6)'}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
