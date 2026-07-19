import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September' },{ value: 10, label: 'October' },
  { value: 11, label: 'November' },{ value: 12, label: 'December' },
];
const QUARTERS = [
  { value: 1, label: 'Q1 (Jan-Mar)' }, { value: 2, label: 'Q2 (Apr-Jun)' },
  { value: 3, label: 'Q3 (Jul-Sep)' }, { value: 4, label: 'Q4 (Oct-Dec)' },
];
const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

function getPeriodLabel(period, months, quarters, year) {
  if (period === 'yearly') return `Year ${year}`;
  if (period === 'quarterly') {
    const s = [...quarters].sort((a, b) => a - b);
    return s.length === 1 ? `Q${s[0]} ${year}` : s.map(q => `Q${q}`).join(', ') + ` ${year}`;
  }
  const s = [...months].sort((a, b) => a - b);
  return s.length === 1 ? `${MONTHS.find(m => m.value === s[0])?.label} ${year}` : s.map(m => MONTHS.find(x => x.value === m)?.label?.slice(0, 3)).join(', ') + ` ${year}`;
}

function buildLineData(period, months, quarters, year) {
  if (period === 'yearly') return { Period: 'yearly', Months: '', Quarter: 0, Year: year };
  if (period === 'quarterly') {
    const s = [...quarters].sort((a, b) => a - b);
    const qm = s.flatMap(q => q === 1 ? [1, 2, 3] : q === 2 ? [4, 5, 6] : q === 3 ? [7, 8, 9] : [10, 11, 12]);
    return { Period: 'quarterly', Months: [...new Set(qm)].join(','), Quarter: s[0], Year: year };
  }
  return { Period: 'monthly', Months: [...months].sort((a, b) => a - b).join(','), Quarter: 0, Year: year };
}

// Multi-select dropdown
function MultiSelect({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);
  const label = selected.length === 0 ? placeholder
    : selected.length === 1 ? options.find(o => o.value === selected[0])?.label
    : `${selected.length} selected`;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        height: 30, padding: '0 10px', fontSize: 12, border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-xs)', background: 'var(--surface)', color: 'var(--text)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minWidth: 120, fontFamily: 'var(--font)'
      }}>
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {selected.length > 1 && <span style={{ background: 'var(--orange)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 999 }}>{selected.length}</span>}
        <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 34, right: 0, background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          zIndex: 100, minWidth: 160, boxShadow: 'var(--shadow-lg)', maxHeight: 240, overflowY: 'auto'
        }}>
          {options.map(o => (
            <div key={o.value} onClick={() => {
              const next = selected.includes(o.value) ? selected.filter(v => v !== o.value) : [...selected, o.value];
              onChange(next.length ? next : [o.value]);
            }} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 12,
              cursor: 'pointer', color: selected.includes(o.value) ? 'var(--orange)' : 'var(--text)',
              fontWeight: selected.includes(o.value) ? 600 : 400,
              background: selected.includes(o.value) ? 'var(--orange-soft)' : 'transparent'
            }}>
              <input type="checkbox" checked={selected.includes(o.value)} readOnly style={{ accentColor: 'var(--orange)', width: 13, height: 13 }} />
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Premium Reusable SVG Bar Chart component
function MonthlyBarChart({ data, year, dataKey, colorHue = 24, label = 'Value', valueSuffix = '', onBarClick }) {
  const height = 260;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 45;

  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>No trend data available</div>;
  }

  const maxVal = Math.max(...data.map(d => Number(d[dataKey] || 0)), 10);
  const minVal = 0;
  const yRange = maxVal - minVal;

  const containerRef = React.useRef(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const w = entry.contentRect.width;
        if (w > 100) {
          setWidth(w);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const displayWidth = Math.max(width, 300);
  const chartWidth = displayWidth - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const barWidth = Math.max((chartWidth / data.length) * 0.5, 12);
  const barSpacing = (chartWidth / data.length);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const points = data.map((d, i) => {
    const val = Number(d[dataKey] || 0);
    const x = paddingLeft + (i * barSpacing) + (barSpacing - barWidth) / 2;
    const barHeight = ((val - minVal) / yRange) * chartHeight;
    const y = paddingTop + chartHeight - barHeight;
    const mVal = d.MonthVal ?? d.monthVal ?? d.Month ?? d.month;
    const isFuture = year > currentYear || (year === currentYear && Number(mVal) > currentMonth);
    return { 
      x, 
      y, 
      w: barWidth, 
      h: Math.max(barHeight, 2),
      val, 
      month: MONTHS.find(m => m.value === Number(mVal))?.label || `Month ${mVal}`,
      centerX: x + barWidth / 2,
      isFuture
    };
  });

  const gridLines = [];
  const gridCount = 4;
  for (let i = 0; i <= gridCount; i++) {
    const y = paddingTop + (i * (chartHeight / gridCount));
    const val = maxVal - (i * (yRange / gridCount));
    gridLines.push({ y, val });
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', minHeight: height }}>
      <svg width={displayWidth} height={height} style={{ overflow: 'visible' }}>
        {/* Y Grid Lines & Labels */}
        {gridLines.map((line, idx) => (
          <g key={idx}>
            <line 
              x1={paddingLeft} 
              y1={line.y} 
              x2={displayWidth - paddingRight} 
              y2={line.y} 
              stroke="var(--border)" 
              strokeWidth="0.8" 
              strokeDasharray="4 4" 
            />
            <text 
              x={paddingLeft - 8} 
              y={line.y + 4} 
              textAnchor="end" 
              fontSize="10" 
              fontWeight="600"
              fill="var(--muted)"
              style={{ fontFamily: 'var(--font)' }}
            >
              {Math.round(line.val).toLocaleString()}
            </text>
          </g>
        ))}

        {/* X Labels */}
        {points.map((p, idx) => (
          <text 
            key={idx} 
            x={p.centerX} 
            y={height - 18} 
            transform={`rotate(-25, ${p.centerX}, ${height - 18})`}
            textAnchor="middle" 
            fontSize="9" 
            fontWeight="700"
            fill={hoveredIdx === idx ? `hsl(${colorHue}, 90%, 50%)` : 'var(--muted)'}
            style={{ fontFamily: 'var(--font)', cursor: 'default' }}
          >
            {p.month}
          </text>
        ))}

        {/* Bar Rectangles & Value Labels */}
        {points.map((p, idx) => {
          if (p.isFuture) return null;
          const isHovered = hoveredIdx === idx;
          const barColor = `hsl(${colorHue + idx * 2.5}, 90%, ${isHovered ? 52 : 62}%)`;
          const strokeColor = `hsl(${colorHue + idx * 2.5}, 95%, 45%)`;
          return (
            <g key={idx}>
              {/* Vertical Bar */}
              <rect
                x={p.x}
                y={p.y}
                width={p.w}
                height={p.h}
                rx="4"
                ry="4"
                fill={barColor}
                stroke={strokeColor}
                strokeWidth={isHovered ? '2' : '1'}
                style={{ transition: 'all 0.1s ease', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => {
                  if (onBarClick) {
                    const mVal = data[idx].MonthVal ?? data[idx].monthVal ?? data[idx].Month ?? data[idx].month;
                    onBarClick(Number(mVal), p.month);
                  }
                }}
              />
              
              {/* Value Label above the bar */}
              <text
                x={p.centerX}
                y={p.y - 7}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="800"
                fill={isHovered ? strokeColor : 'var(--text)'}
                style={{ fontFamily: 'var(--font)', cursor: 'default', transition: 'all 0.1s ease' }}
              >
                {p.val.toLocaleString()}{valueSuffix}
              </text>

              {/* Month label inside the bar (horizontal abbreviation) */}
              {p.h > 20 && (
                <text
                  x={p.centerX}
                  y={p.y + p.h / 2 + 4}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight="800"
                  fill="#ffffff"
                  style={{ fontFamily: 'var(--font)', cursor: 'default', pointerEvents: 'none' }}
                >
                  {p.month.slice(0, 3)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredIdx !== null && (
        <div style={{
          position: 'absolute',
          left: `${points[hoveredIdx].centerX - 60}px`,
          top: `${points[hoveredIdx].y - 50}px`,
          background: 'var(--text)',
          color: 'var(--surface)',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: 700,
          boxShadow: 'var(--shadow-lg)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10
        }}>
          <div>{points[hoveredIdx].month}</div>
          <div style={{ color: `hsl(${colorHue}, 90%, 50%)`, marginTop: 2 }}>
            {points[hoveredIdx].val.toLocaleString()}{valueSuffix} {label}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExpressDetail({ user, def, onBack }) {
  const now = new Date();
  const [period, setPeriod] = useState('monthly');
  const [months, setMonths] = useState([now.getMonth() + 1]);
  const [quarters, setQuarters] = useState([Math.ceil((now.getMonth() + 1) / 3)]);
  const [year, setYear] = useState(now.getFullYear());
  const [stats, setStats] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [govData, setGovData] = useState([]);
  const [requestTrendData, setRequestTrendData] = useState([]);
  const [joinedClientsData, setJoinedClientsData] = useState([]);
  const [top50Clients, setTop50Clients] = useState([]);
  const [requestsPerGift, setRequestsPerGift] = useState([]);
  const [top50Redeemed, setTop50Redeemed] = useState([]);
  const [maximizedPanel, setMaximizedPanel] = useState(null);

  const getMaximizedTitle = () => {
    switch (maximizedPanel) {
      case 'activeClientsTrend': return `Total Active Clients Over Months (${year})`;
      case 'activeClientsGov': return 'Active Clients Per Governorate';
      case 'redemptionRequests': return `Total Redemption Requests Over Months (${year})`;
      case 'joinedClients': return `Total Joined Clients Over Months (${year})`;
      case 'topClientsBalance': return 'Top 50 Clients by Balance';
      case 'topClientsRedemption': return `Top 50 Clients by Redemption (${year})`;
      case 'requestsPerGift': return 'Total Requests per Gift';
      default: return '';
    }
  };

  const renderMaximizedContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <div className="spinner"></div>
        </div>
      );
    }
    
    switch (maximizedPanel) {
      case 'activeClientsTrend':
        return (
          <div style={{ position: 'relative', height: 420 }}>
            <MonthlyBarChart 
              data={trendData} 
              year={year} 
              dataKey="ActiveClients" 
              colorHue={24} 
              label="Active Clients" 
              onBarClick={(monthVal, monthName) => {
                setMaximizedPanel(null);
                handleBarClick(monthVal, monthName, 'active');
              }}
            />
          </div>
        );
      case 'activeClientsGov':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)', height: 35 }}>
                <th style={{ padding: '8px 12px' }}>Governorate</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Active Clients</th>
              </tr>
            </thead>
            <tbody>
              {govData.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)', height: 40 }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{item.Governorate || 'Unknown'}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--blue)' }}>
                    {Number(item.ActiveClients).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'redemptionRequests':
        return (
          <div style={{ position: 'relative', height: 420 }}>
            <MonthlyBarChart 
              data={requestTrendData} 
              year={year} 
              dataKey="TotalRequests" 
              colorHue={142} 
              label="Requests" 
              onBarClick={(monthVal, monthName) => {
                setMaximizedPanel(null);
                handleBarClick(monthVal, monthName, 'requests');
              }}
            />
          </div>
        );
      case 'joinedClients':
        return (
          <div style={{ position: 'relative', height: 420 }}>
            <MonthlyBarChart 
              data={joinedClientsData} 
              year={year} 
              dataKey="JoinedClients" 
              colorHue={271} 
              label="Joined Clients" 
              onBarClick={(monthVal, monthName) => {
                setMaximizedPanel(null);
                handleBarClick(monthVal, monthName, 'joined');
              }}
            />
          </div>
        );
      case 'topClientsBalance':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)', height: 35 }}>
                <th style={{ padding: '8px 12px' }}>Client</th>
                <th style={{ padding: '8px 12px' }}>Job / Gov</th>
                <th style={{ padding: '8px 12px' }}>Mobile No</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {top50Clients.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)', height: 45 }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                    <div>{item.Name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{item.GLCID}</div>
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>
                    <div>{item.Job || '—'}</div>
                    <div style={{ fontSize: 11 }}>{item.Governorate || 'Unknown'}</div>
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 13 }}>
                    {item.Mobile ? (item.Mobile.startsWith('963') ? '0' + item.Mobile.slice(3) : item.Mobile) : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--orange)' }}>
                    {Number(item.Balance).toLocaleString()} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'topClientsRedemption':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)', height: 35 }}>
                <th style={{ padding: '8px 12px' }}>Client</th>
                <th style={{ padding: '8px 12px' }}>Job / Gov</th>
                <th style={{ padding: '8px 12px' }}>Mobile No</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Redeemed</th>
              </tr>
            </thead>
            <tbody>
              {top50Redeemed.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)', height: 45 }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                    <div>{item.Name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{item.GLCID}</div>
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>
                    <div>{item.Job || '—'}</div>
                    <div style={{ fontSize: 11 }}>{item.Governorate || 'Unknown'}</div>
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 13 }}>
                    {item.Mobile ? (item.Mobile.startsWith('963') ? '0' + item.Mobile.slice(3) : item.Mobile) : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--orange)' }}>
                    {Number(item.TotalRedeemed).toLocaleString()} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'requestsPerGift':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)', height: 35 }}>
                <th style={{ padding: '8px 12px' }}>Gift Name</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Requests</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Amount</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Points</th>
              </tr>
            </thead>
            <tbody>
              {requestsPerGift.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)', height: 45 }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{item.GiftName}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>
                    {Number(item.TotalRequests).toLocaleString()}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>
                    {Number(item.TotalAmount).toLocaleString()}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--green)' }}>
                    {Number(item.TotalPoints).toLocaleString()} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      default:
        return null;
    }
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerType, setDrawerType] = useState('');
  const [drawerClients, setDrawerClients] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const periodLabel = getPeriodLabel(period, months, quarters, year);
  const lineData = buildLineData(period, months, quarters, year);

  const handleBarClick = async (monthVal, monthName, type) => {
    setDrawerType(type);
    let titleStr = '';
    if (type === 'active') titleStr = `Active Clients · ${monthName} ${year}`;
    else if (type === 'requests') titleStr = `Redemption Requests · ${monthName} ${year}`;
    else titleStr = `Newly Joined Clients · ${monthName} ${year}`;
    
    setDrawerTitle(titleStr);
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerClients([]);
    try {
      const d = await apiCall('GetExpressBarClients', { Year: year, Month: monthVal, Type: type }, { User: user?.Username });
      if (d.State === 0) {
        setDrawerClients(d.List0 || []);
      }
    } catch (e) {
      console.error(e);
    }
    setDrawerLoading(false);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await apiCall('GetExpressStatistics', lineData, { User: user?.Username });
      if (d.State !== 0) {
        setError(d.Message || 'Failed to fetch Express statistics');
        setStats(null);
        setTrendData([]);
        setGovData([]);
        setRequestTrendData([]);
        setJoinedClientsData([]);
        setTop50Clients([]);
        setRequestsPerGift([]);
        setTop50Redeemed([]);
      } else {
        setStats(d.List0?.[0] || null);
        setTrendData(d.List1 || []);
        setGovData(d.List2 || []);
        setRequestTrendData(d.List3 || []);
        setJoinedClientsData(d.List4 || []);
        setTop50Clients(d.List5 || []);
        setRequestsPerGift(d.List6 || []);
        setTop50Redeemed(d.List7 || []);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || 'Error loading Express statistics');
      setStats(null);
      setTrendData([]);
      setGovData([]);
      setRequestTrendData([]);
      setJoinedClientsData([]);
      setTop50Clients([]);
      setRequestsPerGift([]);
      setTop50Redeemed([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [period, months, quarters, year]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
      {/* Header Card with Filters */}
      <div className="header-card" style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        marginBottom: 16,
        boxShadow: 'var(--shadow)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              <span>{def?.label || 'Express Statistics'}</span>
            </div>
            <div className="page-title">{def?.icon || '📊'} {def?.label || 'Express Statistics'}</div>
          </div>
          <button className="btn-primary" onClick={load} style={{ height: 32, fontSize: 12 }}>🔄 Refresh</button>
        </div>
        
        <div style={{ height: '0.5px', background: 'var(--border)', margin: '12px 0' }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', border: '0.5px solid var(--border2)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
            {['monthly', 'quarterly', 'yearly'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: '5px 14px', fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                background: period === p ? 'var(--orange)' : 'var(--surface)',
                color: period === p ? '#fff' : 'var(--muted)', fontWeight: period === p ? 600 : 400,
                textTransform: 'capitalize'
              }}>{p}</button>
            ))}
          </div>
          {period === 'monthly' && <MultiSelect options={MONTHS} selected={months} onChange={setMonths} placeholder="Select months" />}
          {period === 'quarterly' && <MultiSelect options={QUARTERS} selected={quarters} onChange={setQuarters} placeholder="Select quarters" />}
          <select className="filter-select" value={year} onChange={e => setYear(Number(e.target.value))} style={{ height: 30, fontSize: 12 }}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        
        <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)', background: 'var(--soft)', padding: '3px 10px', borderRadius: 999 }}>
          📅 {periodLabel}
        </div>
      </div>

      {error && <div className="err-page">⚠ {error}</div>}

      {/* KPI Cards Grid */}
      <div className="kpi-grid" style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="kpi-card">
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}><div className="spinner"></div></div> : <>
            <div className="kpi-label">👥 Active Clients</div>
            <div className="kpi-value" style={{ color: 'var(--blue)' }}>
              {stats ? Number(stats.TotalActiveClients).toLocaleString() : '0'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              Active loyalty clients
            </div>
          </>}
        </div>

        <div className="kpi-card">
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}><div className="spinner"></div></div> : <>
            <div className="kpi-label">💳 Charging Cards</div>
            <div className="kpi-value" style={{ color: 'var(--amber)' }}>
              {stats ? Number(stats.TotalChargingCards).toLocaleString() : '0'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              Distinct cards charged
            </div>
          </>}
        </div>

        <div className="kpi-card">
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}><div className="spinner"></div></div> : <>
            <div className="kpi-label">🪙 Avg Card Point</div>
            <div className="kpi-value" style={{ color: 'var(--green)' }}>
              {stats ? Number(stats.AvgCardPoint || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' pts' : '0 pts'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              Average points per card
            </div>
          </>}
        </div>

        <div className="kpi-card" style={{ background: 'var(--orange-soft)', borderColor: 'rgba(249,115,22,0.2)' }}>
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}><div className="spinner"></div></div> : <>
            <div className="kpi-label" style={{ color: 'var(--orange)' }}>💰 Total Gift Amount</div>
            <div className="kpi-value" style={{ color: 'var(--orange)' }}>
              {stats ? Number(stats.TotalValue).toLocaleString() : '0'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--orange)', opacity: 0.8, marginTop: 4 }}>
              Sum of all redeemed gift amounts
            </div>
          </>}
        </div>
      </div>

      {/* Side-by-Side: Chart & Governorate Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginBottom: 20 }}>
        {/* Monthly Trend Chart Panel */}
        <div className="panel" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>📊 Total Active Clients Over Months ({year})</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge badge-orange">Monthly Active Trend</span>
              <button 
                onClick={() => setMaximizedPanel('activeClientsTrend')} 
                style={{
                  border: 'none', background: 'var(--soft)', cursor: 'pointer',
                  width: 24, height: 24, borderRadius: 6, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  color: 'var(--muted)', fontWeight: 'bold'
                }}
                title="Maximize"
              >⛶</button>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 260, position: 'relative' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '260px' }}>
                <div className="spinner"></div>
              </div>
            ) : (
              <MonthlyBarChart 
                data={trendData} 
                year={year} 
                dataKey="ActiveClients" 
                colorHue={24} 
                label="Active Clients" 
                onBarClick={(monthVal, monthName) => handleBarClick(monthVal, monthName, 'active')}
              />
            )}
          </div>
        </div>

        {/* Governorate Grid Panel */}
        <div className="panel" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>🌍 Active Clients Per Gov</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge badge-blue">Location Share</span>
              <button 
                onClick={() => setMaximizedPanel('activeClientsGov')} 
                style={{
                  border: 'none', background: 'var(--soft)', cursor: 'pointer',
                  width: 24, height: 24, borderRadius: 6, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  color: 'var(--muted)', fontWeight: 'bold'
                }}
                title="Maximize"
              >⛶</button>
            </div>
          </div>
          <div style={{ flex: 1, maxHeight: 260, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <div className="spinner"></div>
              </div>
            ) : govData.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0', fontSize: 13 }}>
                No governorate records found.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>
                    <th style={{ padding: '6px 4px' }}>Governorate</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Active Clients</th>
                    <th style={{ padding: '6px 4px', minWidth: 80 }}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {govData.map((g, i) => {
                    const maxGovClients = Math.max(...govData.map(x => x.ActiveClients), 1);
                    const sharePct = (g.ActiveClients / maxGovClients) * 100;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 4px', fontWeight: 700 }}>
                          <span style={{
                            background: 'var(--blue-soft)',
                            border: '1px solid var(--border)',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            color: 'var(--blue)'
                          }}>{g.Governorate}</span>
                        </td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600 }}>
                          {g.ActiveClients.toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                              <div style={{ width: `${sharePct}%`, height: '100%', background: 'var(--blue)', borderRadius: 999 }}></div>
                            </div>
                            <span style={{ fontSize: 9, color: 'var(--muted)', width: 22 }}>{sharePct.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Trend Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, flexShrink: 0 }}>
        {/* Total Requests Chart Panel */}
        <div className="panel" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>📊 Total Redemption Requests Over Months ({year})</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge badge-green">Monthly Requests Trend</span>
              <button 
                onClick={() => setMaximizedPanel('redemptionRequests')} 
                style={{
                  border: 'none', background: 'var(--soft)', cursor: 'pointer',
                  width: 24, height: 24, borderRadius: 6, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  color: 'var(--muted)', fontWeight: 'bold'
                }}
                title="Maximize"
              >⛶</button>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 260, position: 'relative' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '260px' }}>
                <div className="spinner"></div>
              </div>
            ) : (
              <MonthlyBarChart 
                data={requestTrendData} 
                year={year} 
                dataKey="TotalRequests" 
                colorHue={142} // Green theme
                label="Requests" 
                onBarClick={(monthVal, monthName) => handleBarClick(monthVal, monthName, 'requests')}
              />
            )}
          </div>
        </div>

        {/* Total Joined Clients Chart Panel */}
        <div className="panel" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>📊 Total Joined Clients Over Months ({year})</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge badge-purple">Monthly Joined Clients</span>
              <button 
                onClick={() => setMaximizedPanel('joinedClients')} 
                style={{
                  border: 'none', background: 'var(--soft)', cursor: 'pointer',
                  width: 24, height: 24, borderRadius: 6, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  color: 'var(--muted)', fontWeight: 'bold'
                }}
                title="Maximize"
              >⛶</button>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 260, position: 'relative' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '260px' }}>
                <div className="spinner"></div>
              </div>
            ) : (
              <MonthlyBarChart 
                data={joinedClientsData} 
                year={year} 
                dataKey="JoinedClients" 
                colorHue={271} // Purple theme
                label="Joined Clients" 
                onBarClick={(monthVal, monthName) => handleBarClick(monthVal, monthName, 'joined')}
              />
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Top 50 Clients by Balance & Top 50 Clients by Redemption */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Top 50 Clients by Balance Panel */}
        <div className="panel" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>🏆 Top 50 Clients by Balance</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge badge-purple">Points Leaders</span>
              <button 
                onClick={() => setMaximizedPanel('topClientsBalance')} 
                style={{
                  border: 'none', background: 'var(--soft)', cursor: 'pointer',
                  width: 24, height: 24, borderRadius: 6, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  color: 'var(--muted)', fontWeight: 'bold'
                }}
                title="Maximize"
              >⛶</button>
            </div>
          </div>
          <div style={{ flex: 1, maxHeight: 320, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <div className="spinner"></div>
              </div>
            ) : top50Clients.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0', fontSize: 13 }}>
                No records found.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>
                    <th style={{ padding: '8px 4px' }}>Client</th>
                    <th style={{ padding: '8px 4px' }}>Job / Gov</th>
                    <th style={{ padding: '8px 4px' }}>Mobile No</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {top50Clients.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 600 }}>
                        <div>{item.Name}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{item.GLCID}</div>
                      </td>
                      <td style={{ padding: '8px 4px', color: 'var(--muted)' }}>
                        <div>{item.Job || '—'}</div>
                        <div style={{ fontSize: 10 }}>{item.Governorate || 'Unknown'}</div>
                      </td>
                      <td style={{ padding: '8px 4px', fontFamily: 'var(--mono)', fontSize: 12 }}>
                        {item.Mobile ? (item.Mobile.startsWith('963') ? '0' + item.Mobile.slice(3) : item.Mobile) : '—'}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 800, color: 'var(--orange)' }}>
                        {Number(item.Balance).toLocaleString()} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top 50 Clients by Redemption Panel */}
        <div className="panel" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>🏆 Top 50 Clients by Redemption</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge badge-purple">Redemption Leaders</span>
              <button 
                onClick={() => setMaximizedPanel('topClientsRedemption')} 
                style={{
                  border: 'none', background: 'var(--soft)', cursor: 'pointer',
                  width: 24, height: 24, borderRadius: 6, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  color: 'var(--muted)', fontWeight: 'bold'
                }}
                title="Maximize"
              >⛶</button>
            </div>
          </div>
          <div style={{ flex: 1, maxHeight: 320, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <div className="spinner"></div>
              </div>
            ) : top50Redeemed.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0', fontSize: 13 }}>
                No records found.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>
                    <th style={{ padding: '8px 4px' }}>Client</th>
                    <th style={{ padding: '8px 4px' }}>Job / Gov</th>
                    <th style={{ padding: '8px 4px' }}>Mobile No</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Redeemed</th>
                  </tr>
                </thead>
                <tbody>
                  {top50Redeemed.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 600 }}>
                        <div>{item.Name}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{item.GLCID}</div>
                      </td>
                      <td style={{ padding: '8px 4px', color: 'var(--muted)' }}>
                        <div>{item.Job || '—'}</div>
                        <div style={{ fontSize: 10 }}>{item.Governorate || 'Unknown'}</div>
                      </td>
                      <td style={{ padding: '8px 4px', fontFamily: 'var(--mono)', fontSize: 12 }}>
                        {item.Mobile ? (item.Mobile.startsWith('963') ? '0' + item.Mobile.slice(3) : item.Mobile) : '—'}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 800, color: 'var(--orange)' }}>
                        {Number(item.TotalRedeemed).toLocaleString()} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Requests Per Gift */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
        <div className="panel" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>🎁 Total Requests per Gift</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge badge-green">Loyalty Popularity</span>
              <button 
                onClick={() => setMaximizedPanel('requestsPerGift')} 
                style={{
                  border: 'none', background: 'var(--soft)', cursor: 'pointer',
                  width: 24, height: 24, borderRadius: 6, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  color: 'var(--muted)', fontWeight: 'bold'
                }}
                title="Maximize"
              >⛶</button>
            </div>
          </div>
          <div style={{ flex: 1, maxHeight: 320, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <div className="spinner"></div>
              </div>
            ) : requestsPerGift.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0', fontSize: 13 }}>
                No records found for this period.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>
                    <th style={{ padding: '8px 4px' }}>Gift Name</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Total Requests</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Total Amount</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Total Points</th>
                  </tr>
                </thead>
                <tbody>
                  {requestsPerGift.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 600 }}>{item.GiftName}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>
                        {Number(item.TotalRequests).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>
                        {Number(item.TotalAmount).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 800, color: 'var(--green)' }}>
                        {Number(item.TotalPoints).toLocaleString()} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Slide-out Drawer */}
      {drawerOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'flex-end',
          transition: 'opacity 0.2s ease'
        }} onClick={() => setDrawerOpen(false)}>
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>
          <div style={{
            width: 'min(680px, 100vw)',
            background: 'var(--surface)',
            height: '100%',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            padding: '24px',
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text)' }}>{drawerTitle}</h3>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  {drawerLoading ? 'Fetching records...' : `${drawerClients.length} clients found`}
                </div>
              </div>
              <button 
                onClick={() => setDrawerOpen(false)}
                style={{
                  border: 'none', background: 'var(--soft)', cursor: 'pointer',
                  width: 30, height: 30, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                  fontSize: 14, color: 'var(--muted)'
                }}
              >✕</button>
            </div>

            {/* Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {drawerLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
                  <div className="spinner"></div>
                  <span style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>Loading client records...</span>
                </div>
              ) : drawerClients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>ℹ️</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>No clients found for this period.</div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--soft)', borderBottom: '1.5px solid var(--border)' }}>
                      <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, textAlign: 'left', color: 'var(--muted)' }}>GLCID</th>
                      <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, textAlign: 'left', color: 'var(--muted)' }}>Name</th>
                      <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, textAlign: 'left', color: 'var(--muted)' }}>Gov</th>
                      <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, textAlign: 'left', color: 'var(--muted)' }}>Mobile</th>
                      {drawerType === 'active' && (
                        <>
                          <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, textAlign: 'right', color: 'var(--muted)' }}>Tx Count</th>
                          <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, textAlign: 'right', color: 'var(--muted)' }}>Points</th>
                        </>
                      )}
                      {drawerType === 'requests' && (
                        <>
                          <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, textAlign: 'right', color: 'var(--muted)' }}>Reqs</th>
                          <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, textAlign: 'right', color: 'var(--muted)' }}>Points</th>
                        </>
                      )}
                      {drawerType === 'joined' && (
                        <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, textAlign: 'left', color: 'var(--muted)' }}>Join Date</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {drawerClients.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontWeight: 600 }}>{c.GLCID}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.Name}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{c.Governorate || 'Unknown'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)' }}>{c.Mobile ? (c.Mobile.startsWith('963') ? '0' + c.Mobile.slice(3) : c.Mobile) : '—'}</td>
                        {drawerType === 'active' && (
                          <>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{c.TransactionCount}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--orange)' }}>{Number(c.TotalPoints).toLocaleString()}</td>
                          </>
                        )}
                        {drawerType === 'requests' && (
                          <>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{c.RequestCount}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{Number(c.TotalPoints).toLocaleString()}</td>
                          </>
                        )}
                        {drawerType === 'joined' && (
                          <td style={{ padding: '10px 12px' }}>
                            {c.CreatedDate ? new Date(c.CreatedDate).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Maximized Panel Modal */}
      {maximizedPanel && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          zIndex: 99990,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }} onClick={() => setMaximizedPanel(null)}>
          <div style={{
            width: 'min(1080px, calc(100vw - 48px))',
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100vh - 48px)',
            padding: '24px'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{getMaximizedTitle()}</h3>
              <button 
                onClick={() => setMaximizedPanel(null)} 
                style={{
                  border: 'none', background: 'var(--soft)', cursor: 'pointer',
                  width: 30, height: 30, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                  fontSize: 14, color: 'var(--muted)'
                }}
              >✕</button>
            </div>
            
            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {renderMaximizedContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
