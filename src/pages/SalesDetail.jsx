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

function fmt(val) {
  if (val == null || val === '') return '—';
  const n = Number(val);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return sign + (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toFixed(2);
}

function fmtWeight(val) {
  if (val == null || val === '') return '—';
  const n = Number(val);
  return fmt(n) + ' kg';
}

function fmtVolume(val) {
  if (val == null || val === '') return '—';
  const n = Number(val);
  return fmt(n) + ' L';
}

function pct(a, b) {
  if (!a || !b || Number(b) === 0) return '—';
  return ((Number(a) / Number(b)) * 100).toFixed(1) + '%';
}

function growth(a, b) {
  if (!a || !b || Number(a) === 0) return null;
  return ((Number(b) - Number(a)) / Number(a)) * 100;
}

function GrowthBadge({ prev, curr, style }) {
  const g = growth(prev, curr);
  if (g === null) return <span style={{color:'var(--muted)', ...style}}>—</span>;
  const up = g >= 0;
  return <span style={{color: up?'var(--green)':'var(--red)', fontWeight:600, fontSize:13, ...style}}>{up?'▲':'▼'} {up?'+':''}{g.toFixed(1)}%</span>;
}

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
    <div ref={ref} style={{position:'relative'}}>
      <button onClick={() => setOpen(o => !o)} style={{
        height:30, padding:'0 10px', fontSize:12, border:'0.5px solid var(--border)',
        borderRadius:'var(--radius-xs)', background:'var(--surface)', color:'var(--text)',
        cursor:'pointer', display:'flex', alignItems:'center', gap:6, minWidth:120, fontFamily:'var(--font)'
      }}>
        <span style={{flex:1, textAlign:'left', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{label}</span>
        {selected.length > 1 && <span style={{background:'var(--orange)', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:999}}>{selected.length}</span>}
        <span style={{fontSize:10}}>▾</span>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:34, right:0, background:'var(--surface)',
          border:'1px solid var(--border)', borderRadius:'var(--radius-sm)',
          zIndex:100, minWidth:160, boxShadow:'var(--shadow-lg)', maxHeight:240, overflowY:'auto'
        }}>
          {options.map(o => (
            <div key={o.value} onClick={() => {
              const next = selected.includes(o.value) ? selected.filter(v => v !== o.value) : [...selected, o.value];
              onChange(next.length ? next : [o.value]);
            }} style={{
              display:'flex', alignItems:'center', gap:8, padding:'8px 12px', fontSize:12,
              cursor:'pointer', color: selected.includes(o.value)?'var(--orange)':'var(--text)',
              fontWeight: selected.includes(o.value)?600:400,
              background: selected.includes(o.value)?'var(--orange-soft)':'transparent'
            }}>
              <input type="checkbox" checked={selected.includes(o.value)} readOnly style={{accentColor:'var(--orange)', width:13, height:13}} />
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getPeriodLabel(period, months, quarters, year) {
  if (period === 'yearly') return `Year ${year}`;
  if (period === 'quarterly') {
    const s = [...quarters].sort((a,b)=>a-b);
    return s.length===1 ? `Q${s[0]} ${year}` : s.map(q=>`Q${q}`).join(', ')+` ${year}`;
  }
  const s = [...months].sort((a,b)=>a-b);
  return s.length===1 ? `${MONTHS.find(m=>m.value===s[0])?.label} ${year}` : s.map(m=>MONTHS.find(x=>x.value===m)?.label?.slice(0,3)).join(', ')+` ${year}`;
}

function buildLineData(period, months, quarters, year) {
  if (period === 'yearly') return { Period:'yearly', Months:'', Quarter:0, Year:year };
  if (period === 'quarterly') {
    const s = [...quarters].sort((a,b)=>a-b);
    const qm = s.flatMap(q => q===1?[1,2,3]:q===2?[4,5,6]:q===3?[7,8,9]:[10,11,12]);
    return { Period:'quarterly', Months:[...new Set(qm)].join(','), Quarter:s[0], Year:year };
  }
  return { Period:'monthly', Months:[...months].sort((a,b)=>a-b).join(','), Quarter:0, Year:year };
}

const card = {
  background:'var(--surface)', border:'1px solid var(--border)',
  borderRadius:'var(--radius)', padding:'20px 24px', boxShadow:'var(--shadow)',
};

function BRow({ icon, label, amount, pctVal, color, bold }) {
  return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)'}}>
      <div style={{display:'flex', alignItems:'center', gap:10, fontSize:14, fontWeight:bold?700:500}}>
        {icon && <span>{icon}</span>}{label}
      </div>
      <div style={{display:'flex', alignItems:'center', gap:16}}>
        <span style={{fontSize:14, fontWeight:700, minWidth:60, textAlign:'right'}}>{amount}</span>
        <span style={{fontSize:13, fontWeight:600, color:color||'var(--orange)', minWidth:44, textAlign:'right'}}>{pctVal}</span>
      </div>
    </div>
  );
}

export default function SalesDetail({ user, lineData: initLineData, periodLabel: initPeriodLabel, onBack, controlData }) {
  const now = new Date();
  const init = initLineData || {};
  const [period, setPeriod] = useState(init.Period || 'monthly');
  const [months, setMonths] = useState(init.Months ? init.Months.split(',').map(Number) : [now.getMonth()+1]);
  const [quarters, setQuarters] = useState(
    init.Period === 'quarterly' && init.Months
      ? (() => {
          const mList = init.Months.split(',').map(Number);
          const qSet = new Set();
          mList.forEach(m => {
            if (m >= 1 && m <= 3) qSet.add(1);
            if (m >= 4 && m <= 6) qSet.add(2);
            if (m >= 7 && m <= 9) qSet.add(3);
            if (m >= 10 && m <= 12) qSet.add(4);
          });
          return [...qSet].sort((a, b) => a - b);
        })()
      : [init.Quarter || Math.ceil((now.getMonth() + 1) / 3)]
  );
  const [year, setYear] = useState(init.Year || now.getFullYear());
  const [data, setData] = useState(null);
  const [comparisonMode, setComparisonMode] = useState('period'); // 'period' or 'ytd'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState(null);
  const [drawerData, setDrawerData] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState('');

  const periodLabel = getPeriodLabel(period, months, quarters, year);
  const lineData = buildLineData(period, months, quarters, year);

  async function load() {
    setLoading(true); setError(''); setData(null);
    try {
      const d = await apiCall('Get Sales Details By Period', lineData);
      setData(d.List0?.[0] || null);
    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  async function openBreakdown(type) {
    setDrawerType(type);
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerError('');
    setDrawerData([]);
    try {
      const res = await apiCall('Get Customer Type Detail Breakdown', {
        ...lineData,
        CustomerType: type
      });
      setDrawerData(res.List0 || []);
    } catch (e) {
      setDrawerError(e.message);
    }
    setDrawerLoading(false);
  }

  useEffect(() => { load(); }, [period, months, quarters, year]);

  const totalSales      = Number(data?.TotalSalesAmount || controlData?.TotalSalesAmount || 0);
  const totalFinalAmount = Number(data?.TotalFinalAmount || 0);
  const totalCollection = Number(data?.TotalCollection  || controlData?.TotalCollection  || 0);
  const customerBalance = Number(data?.CustomerBalance  || controlData?.CustomerBalance  || 0);
  const exportSales     = Number(data?.ExportSales      || 0);
  const localSales      = totalSales - exportSales;
  const collRatio       = totalFinalAmount ? ((totalCollection/totalFinalAmount)*100).toFixed(1)
                        : (totalSales ? ((totalCollection/totalSales)*100).toFixed(1) : null);
  const localTotal      = Number(data?.WhiteSales||0)+Number(data?.ColorCenterSales||0)+Number(data?.ProjectSales||0);
  const otherSales      = Math.max(0, localSales - localTotal);
  const ytdLocal2025    = Number(data?.SalesAmount2025||0)-Number(data?.YTD2025Export||0);
  const ytdLocal2026    = Number(data?.SalesAmount2026||0)-Number(data?.YTD2026Export||0);
  const ytdTotal2025    = Number(data?.SalesAmount2025||0);
  const ytdTotal2026    = Number(data?.SalesAmount2026||0);

  // Weight metrics calculations
  const totalWeight       = Number(data?.TotalWeight || 0);
  const prevTotalWeight   = Number(data?.PrevTotalWeight || 0);
  const ytdWeight2025     = Number(data?.YTDWeight2025 || 0);
  const ytdWeight2026     = Number(data?.YTDWeight2026 || 0);

  // Selected period weights (current vs previous year)
  const whiteWeight       = Number(data?.WhiteWeight || 0);
  const prevWhiteWeight   = Number(data?.PrevWhiteWeight || 0);
  const colorCenterWeight = Number(data?.ColorCenterWeight || 0);
  const prevColorCenterWeight = Number(data?.PrevColorCenterWeight || 0);
  const projectWeight     = Number(data?.ProjectWeight || 0);
  const prevProjectWeight = Number(data?.PrevProjectWeight || 0);
  const exportWeight      = Number(data?.ExportWeight || 0);
  const prevExportWeight   = Number(data?.PrevExportWeight || 0);

  const localWeightTotal  = whiteWeight + colorCenterWeight + projectWeight;
  const localWeight       = Math.max(0, totalWeight - exportWeight);
  const otherWeight       = Math.max(0, localWeight - localWeightTotal);

  const prevLocalWeightTotal = prevWhiteWeight + prevColorCenterWeight + prevProjectWeight;
  const prevLocalWeight      = Math.max(0, prevTotalWeight - prevExportWeight);
  const prevOtherWeight      = Math.max(0, prevLocalWeight - prevLocalWeightTotal);

  // YTD weights (current vs previous year)
  const ytdWhiteWeight2026 = Number(data?.YTDWhiteWeight2026 || 0);
  const ytdWhiteWeight2025 = Number(data?.YTDWhiteWeight2025 || 0);
  const ytdColorCenterWeight2026 = Number(data?.YTDColorCenterWeight2026 || 0);
  const ytdColorCenterWeight2025 = Number(data?.YTDColorCenterWeight2025 || 0);
  const ytdProjectWeight2026 = Number(data?.YTDProjectWeight2026 || 0);
  const ytdProjectWeight2025 = Number(data?.YTDProjectWeight2025 || 0);
  const ytdExportWeight2026 = Number(data?.YTDExportWeight2026 || 0);
  const ytdExportWeight2025 = Number(data?.YTDExportWeight2025 || 0);

  const ytdLocalWeightTotal2026 = ytdWhiteWeight2026 + ytdColorCenterWeight2026 + ytdProjectWeight2026;
  const ytdLocalWeight2026      = Math.max(0, ytdWeight2026 - ytdExportWeight2026);
  const ytdOtherWeight2026       = Math.max(0, ytdLocalWeight2026 - ytdLocalWeightTotal2026);

  const ytdLocalWeightTotal2025 = ytdWhiteWeight2025 + ytdColorCenterWeight2025 + ytdProjectWeight2025;
  const ytdLocalWeight2025      = Math.max(0, ytdWeight2025 - ytdExportWeight2025);
  const ytdOtherWeight2025       = Math.max(0, ytdLocalWeight2025 - ytdLocalWeightTotal2025);

  // Volume metrics calculations (Color Center Liters)
  const colorCenterVolume     = Number(data?.ColorCenterVolume || 0);
  const prevColorCenterVolume = Number(data?.PrevColorCenterVolume || 0);
  const ytdColorCenterVolume2025 = Number(data?.YTDColorCenterVolume2025 || 0);
  const ytdColorCenterVolume2026 = Number(data?.YTDColorCenterVolume2026 || 0);

  const comparisonRows = comparisonMode === 'period' ? [
    { icon: '👥', label: 'White Customers', p: prevWhiteWeight,       c: whiteWeight },
    { icon: '🎨', label: 'Color Centers',   p: prevColorCenterWeight, c: colorCenterWeight },
    { icon: '🏗️', label: 'Projects',        p: prevProjectWeight,     c: projectWeight },
    { icon: '🌍', label: 'Export',          p: prevExportWeight,      c: exportWeight },
    { icon: '📦', label: 'Other',           p: prevOtherWeight,       c: otherWeight },
    { icon: '⚖️', label: 'Total Weight',    p: prevTotalWeight,       c: totalWeight, bold: true },
  ] : [
    { icon: '👥', label: 'White Customers', p: ytdWhiteWeight2025,       c: ytdWhiteWeight2026 },
    { icon: '🎨', label: 'Color Centers',   p: ytdColorCenterWeight2025, c: ytdColorCenterWeight2026 },
    { icon: '🏗️', label: 'Projects',        p: ytdProjectWeight2025,     c: ytdProjectWeight2026 },
    { icon: '🌍', label: 'Export',          p: ytdExportWeight2025,      c: ytdExportWeight2026 },
    { icon: '📦', label: 'Other',           p: ytdOtherWeight2025,       c: ytdOtherWeight2026 },
    { icon: '📈', label: 'Total YTD Weight',p: ytdWeight2025,            c: ytdWeight2026, bold: true },
  ];

  return (
    <div>
      {/* Header Card */}
      <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px', marginBottom:16}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <div style={{fontSize:12, color:'var(--muted)', marginBottom:4}}>
              <span style={{color:'var(--orange)', cursor:'pointer'}} onClick={onBack}>Control Page</span>
              <span style={{margin:'0 6px'}}>›</span><span>Sales</span>
            </div>
            <div className="page-title">Sales Details</div>
          </div>
          <button className="btn-primary" onClick={load} style={{height:32, fontSize:12}}>🔄 Refresh</button>
        </div>
        <div style={{height:'0.5px', background:'var(--border)', margin:'12px 0'}}></div>
        <div style={{display:'flex', alignItems:'center', gap:8}} onClick={e => e.stopPropagation()}>
          <div style={{display:'flex', border:'0.5px solid var(--border2)', borderRadius:'var(--radius-xs)', overflow:'hidden'}}>
            {['monthly','quarterly','yearly'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding:'5px 14px', fontSize:12, border:'none', cursor:'pointer', fontFamily:'var(--font)',
                background: period===p?'var(--orange)':'var(--surface)',
                color: period===p?'#fff':'var(--muted)', fontWeight: period===p?600:400,
                textTransform:'capitalize'
              }}>{p}</button>
            ))}
          </div>
          {period === 'monthly' && <MultiSelect options={MONTHS} selected={months} onChange={setMonths} placeholder="Select months" />}
          {period === 'quarterly' && <MultiSelect options={QUARTERS} selected={quarters} onChange={setQuarters} placeholder="Select quarters" />}
          <select className="filter-select" value={year} onChange={e => setYear(Number(e.target.value))} style={{height:30, fontSize:12}}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{marginTop:10, display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'var(--muted)', background:'var(--soft)', padding:'3px 10px', borderRadius:999}}>
          📅 {periodLabel}
        </div>
      </div>

      {error && <div className="err-page">⚠ {error}</div>}

      {/* SECTION 1: FINANCIAL METRICS */}
      <div className="section-label" style={{marginTop:16, marginBottom:12, fontSize:14, fontWeight:700, color:'var(--orange)', display:'flex', alignItems:'center', gap:8}}>
        <span>💵</span> Financial Metrics & Collections
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)', marginBottom:24}}>
        {[
          { label:'Total Sales',      value:fmt(totalSales),      color:null },
          { label:'Total Collection', value:fmt(totalCollection), color:null },
          { label:'Collection Ratio', value:collRatio?collRatio+'%':'—',
            color:collRatio?(Number(collRatio)>=80?'var(--green)':'var(--red)'):null,
            sub:collRatio?(Number(collRatio)>=80?'▲ On track':'▼ Below target'):'—' },
          { label:'Customer Balance', value:fmt(customerBalance), color:null },
        ].map((k,i) => (
          <div key={i} className="kpi-card">
            {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{color:k.color||'inherit'}}>{k.value}</div>
              <div className="kpi-change" style={{color:k.color||'var(--muted)'}}>{k.sub||periodLabel}</div>
            </>}
          </div>
        ))}
      </div>

      <style>{`
        .customer-type-link {
          color: inherit;
          cursor: pointer;
          transition: color 0.15s ease;
        }
        .customer-type-link:hover {
          color: var(--orange);
          text-decoration: underline;
        }
      `}</style>

      {/* 3 panels */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:32}}>
        <div style={card}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <span style={{fontSize:15, fontWeight:700}}>Sales Breakdown</span>
            <span style={{fontSize:12, color:'var(--muted)'}}>{periodLabel}</span>
          </div>
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <BRow icon="🏠" label="Local"  amount={fmt(localSales)}  pctVal={pct(localSales,totalSales)}  color="var(--orange)" />
            <BRow icon="🌍" label={<span onClick={() => openBreakdown('Export')} className="customer-type-link">Export</span>} amount={fmt(exportSales)} pctVal={pct(exportSales,totalSales)} color="var(--blue)" />
            <BRow label="Total" amount={fmt(totalSales)} pctVal="100%" bold color="var(--text)" />
          </>}
        </div>

        <div style={card}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <span style={{fontSize:15, fontWeight:700}}>Customer Breakdown</span>
            <span style={{fontSize:12, color:'var(--muted)'}}>Local Sales</span>
          </div>
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <BRow icon="👥" label={<span onClick={() => openBreakdown('White Customers')} className="customer-type-link">White Customers</span>} amount={fmt(data?.WhiteSales)}       pctVal={pct(data?.WhiteSales,localSales)}       color="var(--green)" />
            <BRow icon="🎨" label={<span onClick={() => openBreakdown('Color Centers')} className="customer-type-link">Color Centers</span>}   amount={fmt(data?.ColorCenterSales)} pctVal={pct(data?.ColorCenterSales,localSales)} color="var(--amber)" />
            <BRow icon="🏗️" label={<span onClick={() => openBreakdown('Projects')} className="customer-type-link">Projects</span>}        amount={fmt(data?.ProjectSales)}     pctVal={pct(data?.ProjectSales,localSales)}     color="#7c3aed" />
            <BRow icon="📦" label={<span onClick={() => openBreakdown('Other')} className="customer-type-link">Other</span>}           amount={fmt(otherSales)}             pctVal={pct(otherSales,localSales)}             color="var(--muted)" />
            <BRow label="Total Local" amount={fmt(localSales)} pctVal="100%" bold color="var(--text)" />
          </>}
        </div>

        <div style={card}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <span style={{fontSize:15, fontWeight:700}}>YTD {year-1} vs {year}</span>
            <span style={{fontSize:12, color:'var(--muted)'}}>Year to date</span>
          </div>
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <div style={{display:'grid', gridTemplateColumns:'1fr 80px 80px 72px', gap:6, padding:'6px 0', borderBottom:'1px solid var(--border)'}}>
              {['Type',String(year-1),String(year),'Growth'].map((h,i)=>(
                <span key={i} style={{fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', textAlign:i>0?'right':'left'}}>{h}</span>
              ))}
            </div>
            {[
              {icon:'🏠', label:'Local',  p:ytdLocal2025, c:ytdLocal2026},
              {icon:'🌍', label:'Export', p:data?.YTD2025Export, c:data?.YTD2026Export},
              {icon:'📊', label:'Total',  p:ytdTotal2025, c:ytdTotal2026, bold:true},
            ].map((r,i) => (
              <div key={i} style={{display:'grid', gridTemplateColumns:'1fr 80px 80px 72px', gap:6, padding:'10px 0', borderBottom:i<2?'1px solid var(--border)':'none', alignItems:'center'}}>
                <span style={{fontSize:13, fontWeight:r.bold?700:500}}>{r.icon} {r.label}</span>
                <span style={{fontSize:13, textAlign:'right', color:'var(--muted)', fontWeight:r.bold?700:400}}>{fmt(r.p)}</span>
                <span style={{fontSize:13, textAlign:'right', fontWeight:700}}>{fmt(r.c)}</span>
                <span style={{textAlign:'right'}}><GrowthBadge prev={r.p} curr={r.c} /></span>
              </div>
            ))}
          </>}
        </div>
      </div>

      {/* SECTION 2: WEIGHT & TONNAGE METRICS */}
      <div className="section-label" style={{marginTop:32, marginBottom:12, fontSize:14, fontWeight:700, color:'var(--orange)', display:'flex', alignItems:'center', gap:8}}>
        <span>⚖️</span> Weight & Tonnage Metrics
      </div>

      {/* Weight KPI Cards */}
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)', marginBottom:24}}>
        {[
          { label:'Period Weight', value:fmtWeight(totalWeight), color:null },
          { label:'Prev Period Weight', value:fmtWeight(prevTotalWeight), color:null },
          { label:'Period Growth', value: growth(prevTotalWeight, totalWeight) !== null ? (growth(prevTotalWeight, totalWeight) >= 0 ? '▲ ' : '▼ ') + growth(prevTotalWeight, totalWeight).toFixed(1) + '%' : '—',
            color: growth(prevTotalWeight, totalWeight) !== null ? (growth(prevTotalWeight, totalWeight) >= 0 ? 'var(--green)' : 'var(--red)') : null,
            sub: 'vs Prev Year Period' },
          { label:'YTD Weight Growth', value: growth(ytdWeight2025, ytdWeight2026) !== null ? (growth(ytdWeight2025, ytdWeight2026) >= 0 ? '▲ ' : '▼ ') + growth(ytdWeight2025, ytdWeight2026).toFixed(1) + '%' : '—',
            color: growth(ytdWeight2025, ytdWeight2026) !== null ? (growth(ytdWeight2025, ytdWeight2026) >= 0 ? 'var(--green)' : 'var(--red)') : null,
            sub: `${year-1} vs ${year} YTD` },
        ].map((k,i) => (
          <div key={i} className="kpi-card">
            {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{color:k.color||'inherit'}}>{k.value}</div>
              <div className="kpi-change" style={{color:k.color||'var(--muted)'}}>{k.sub||periodLabel}</div>
            </>}
          </div>
        ))}
      </div>

      {/* Weight & Volume YoY Comparison Panels */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24}}>
        {/* Card 1: Weight YoY Comparison */}
        <div style={card}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <span style={{fontSize:15, fontWeight:700}}>Weight YoY Comparison</span>
            <div style={{display:'flex', border:'0.5px solid var(--border2)', borderRadius:'var(--radius-xs)', overflow:'hidden'}}>
              {['period','ytd'].map(m => (
                <button key={m} onClick={() => setComparisonMode(m)} style={{
                  padding:'3px 8px', fontSize:11, border:'none', cursor:'pointer', fontFamily:'var(--font)',
                  background: comparisonMode===m?'var(--orange)':'var(--surface)',
                  color: comparisonMode===m?'#fff':'var(--muted)', fontWeight: comparisonMode===m?600:400,
                  textTransform:'uppercase'
                }}>{m}</button>
              ))}
            </div>
          </div>
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <div style={{display:'grid', gridTemplateColumns:'1fr 90px 90px 72px', gap:6, padding:'6px 0', borderBottom:'1px solid var(--border)'}}>
              {['Customer Type', comparisonMode === 'period' ? String(year-1) : 'YTD ' + (year-1), comparisonMode === 'period' ? String(year) : 'YTD ' + year, 'Growth'].map((h,i)=>(
                <span key={i} style={{fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', textAlign:i>0?'right':'left'}}>{h}</span>
              ))}
            </div>
            {comparisonRows.map((r,i) => (
              <div key={i} style={{display:'grid', gridTemplateColumns:'1fr 90px 90px 72px', gap:6, padding:'10px 0', borderBottom:i<5?'1px solid var(--border)':'none', alignItems:'center'}}>
                <span style={{fontSize:13, fontWeight:r.bold?700:500}}>
                  {r.icon} {r.bold ? (
                    r.label
                  ) : (
                    <span onClick={() => openBreakdown(r.label)} className="customer-type-link">{r.label}</span>
                  )}
                </span>
                <span style={{fontSize:13, textAlign:'right', color:'var(--muted)', fontWeight:r.bold?700:400}}>{fmtWeight(r.p)}</span>
                <span style={{fontSize:13, textAlign:'right', fontWeight:700}}>{fmtWeight(r.c)}</span>
                <span style={{textAlign:'right'}}><GrowthBadge prev={r.p} curr={r.c} /></span>
              </div>
            ))}
          </>}
        </div>

        {/* Card 2: Color Center Volume YoY Comparison */}
        <div style={card}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <span style={{fontSize:15, fontWeight:700}}>Color Center Volume (Liters)</span>
            <span style={{fontSize:12, color:'var(--muted)'}}>YoY Comparison</span>
          </div>
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <div style={{display:'grid', gridTemplateColumns:'1fr 90px 90px 72px', gap:6, padding:'6px 0', borderBottom:'1px solid var(--border)'}}>
              {['Period',String(year-1),String(year),'Growth'].map((h,i)=>(
                <span key={i} style={{fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', textAlign:i>0?'right':'left'}}>{h}</span>
              ))}
            </div>
            {[
              {icon:'🧪', label:period === 'yearly' ? 'Yearly Volume' : period === 'quarterly' ? 'Quarterly Volume' : 'Monthly Volume', p:prevColorCenterVolume, c:colorCenterVolume},
              {icon:'📈', label:'YTD Volume', p:ytdColorCenterVolume2025, c:ytdColorCenterVolume2026, bold:true},
            ].map((r,i) => (
              <div key={i} style={{display:'grid', gridTemplateColumns:'1fr 90px 90px 72px', gap:6, padding:'10px 0', borderBottom:i<1?'1px solid var(--border)':'none', alignItems:'center'}}>
                <span style={{fontSize:13, fontWeight:r.bold?700:500}}>{r.icon} {r.label}</span>
                <span style={{fontSize:13, textAlign:'right', color:'var(--muted)', fontWeight:r.bold?700:400}}>{fmtVolume(r.p)}</span>
                <span style={{fontSize:13, textAlign:'right', fontWeight:700}}>{fmtVolume(r.c)}</span>
                <span style={{textAlign:'right'}}><GrowthBadge prev={r.p} curr={r.c} /></span>
              </div>
            ))}
          </>}
        </div>
      </div>

      {/* Detail Drawer Overlay */}
      {drawerOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)',
          zIndex: 1000, display: 'flex', justifyContent: 'flex-end',
        }} onClick={() => setDrawerOpen(false)}>
          <div style={{
            width: 'min(95vw, 1200px)', background: 'var(--surface)', borderLeft: '1px solid var(--border)',
            height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)',
            padding: '24px', overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
              <div>
                <div style={{fontSize:11, color:'var(--muted)', textTransform:'uppercase', fontWeight:700, letterSpacing:'.08em'}}>YTD Comparison Breakdown</div>
                <div style={{fontSize:20, fontWeight:800, color:'var(--orange)'}}>{drawerType}</div>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{
                background:'none', border:'none', color:'var(--muted)', fontSize:24, cursor:'pointer', padding:5
              }}>×</button>
            </div>
            
            <div style={{height:'0.5px', background:'var(--border)', marginBottom:16}}></div>

            {drawerLoading ? (
              <div style={{flex:1, display:'flex', justifyContent:'center', alignItems:'center', minHeight: 200}}>
                <div className="spinner"></div>
              </div>
            ) : drawerError ? (
              <div style={{color:'var(--red)', padding:16, textAlign:'center'}}>⚠ {drawerError}</div>
            ) : drawerData.length === 0 ? (
              <div style={{color:'var(--muted)', padding:32, textAlign:'center'}}>No customers found for this period.</div>
            ) : (() => {
              const isColorCenter = drawerType === 'Color Centers';
              
              // Calculate aggregated KPIs for Top 25
              const totalAmt2026 = drawerData.reduce((acc, c) => acc + Number(c.AmountYTD2026 || 0), 0);
              const totalAmt2025 = drawerData.reduce((acc, c) => acc + Number(c.AmountYTD2025 || 0), 0);
              
              const totalQty2026 = drawerData.reduce((acc, c) => acc + Number(isColorCenter ? c.VolumeYTD2026 : c.WeightYTD2026 || 0), 0);
              const totalQty2025 = drawerData.reduce((acc, c) => acc + Number(isColorCenter ? c.VolumeYTD2025 : c.WeightYTD2025 || 0), 0);

              const avgAmt2026 = drawerData.length ? (totalAmt2026 / drawerData.length) : 0;
              const avgAmt2025 = drawerData.length ? (totalAmt2025 / drawerData.length) : 0;

              return (
                <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
                  {/* KPI Cards */}
                  <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginBottom:20}}>
                    <div style={{
                      background:'var(--soft)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'14px 16px', display:'flex', flexDirection:'column', gap:2
                    }}>
                      <div style={{fontSize:10, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.03em'}}>Top 25 YTD Sales</div>
                      <div style={{display:'flex', alignItems:'baseline', gap:8, flexWrap:'wrap', marginTop:2}}>
                        <span style={{fontSize:18, fontWeight:800, color:'var(--text)'}}>{fmt(totalAmt2026)}</span>
                        <span style={{fontSize:18, color:'var(--muted)', fontWeight:500}}>vs {fmt(totalAmt2025)}</span>
                        <GrowthBadge prev={totalAmt2025} curr={totalAmt2026} style={{fontSize:18}} />
                      </div>
                    </div>

                    <div style={{
                      background:'var(--soft)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'14px 16px', display:'flex', flexDirection:'column', gap:2
                    }}>
                      <div style={{fontSize:10, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.03em'}}>{isColorCenter ? 'Top 25 YTD Volume' : 'Top 25 YTD Weight'}</div>
                      <div style={{display:'flex', alignItems:'baseline', gap:8, flexWrap:'wrap', marginTop:2}}>
                        <span style={{fontSize:18, fontWeight:800, color:'var(--text)'}}>{isColorCenter ? fmtVolume(totalQty2026) : fmtWeight(totalQty2026)}</span>
                        <span style={{fontSize:18, color:'var(--muted)', fontWeight:500}}>vs {isColorCenter ? fmtVolume(totalQty2025) : fmtWeight(totalQty2025)}</span>
                        <GrowthBadge prev={totalQty2025} curr={totalQty2026} style={{fontSize:18}} />
                      </div>
                    </div>

                    <div style={{
                      background:'var(--soft)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'14px 16px', display:'flex', flexDirection:'column', gap:2
                    }}>
                      <div style={{fontSize:10, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.03em'}}>Average YTD Sales</div>
                      <div style={{display:'flex', alignItems:'baseline', gap:8, flexWrap:'wrap', marginTop:2}}>
                        <span style={{fontSize:18, fontWeight:800, color:'var(--text)'}}>{fmt(avgAmt2026)}</span>
                        <span style={{fontSize:18, color:'var(--muted)', fontWeight:500}}>vs {fmt(avgAmt2025)}</span>
                        <GrowthBadge prev={avgAmt2025} curr={avgAmt2026} style={{fontSize:18}} />
                      </div>
                    </div>
                  </div>

                  {/* Table Container */}
                  <div style={{flex:1, overflowY:'auto'}}>
                    <table style={{width:'100%', borderCollapse:'collapse'}}>
                      <thead>
                        <tr>
                          <th rowSpan={2} style={{
                            position: 'sticky', top: 0, zIndex: 3, background: 'var(--surface)',
                            padding:'8px 12px', textAlign:'left', borderBottom:'1px solid var(--border)', fontSize:11, color:'var(--muted)', verticalAlign:'middle'
                          }}>Customer</th>
                          <th colSpan={3} style={{
                            position: 'sticky', top: 0, zIndex: 2, background: 'var(--surface)',
                            padding:'6px 12px', textAlign:'center', borderBottom:'1px solid var(--border)', fontSize:11, color:'var(--muted)'
                          }}>YTD Sales Amount (EGP)</th>
                          <th colSpan={3} style={{
                            position: 'sticky', top: 0, zIndex: 2, 
                            background: 'linear-gradient(rgba(100, 116, 139, 0.03), rgba(100, 116, 139, 0.03)), var(--surface)',
                            borderLeft: '1px solid var(--border)',
                            padding:'6px 12px', textAlign:'center', borderBottom:'1px solid var(--border)', fontSize:11, color:'var(--muted)'
                          }}>{isColorCenter ? 'YTD Volume' : 'YTD Weight'}</th>
                        </tr>
                        <tr>
                          <th style={{
                            position: 'sticky', top: '29px', zIndex: 2, background: 'var(--surface)',
                            padding:'6px 12px', textAlign:'right', borderBottom:'1px solid var(--border)', fontSize:10, color:'var(--muted)'
                          }}>{year}</th>
                          <th style={{
                            position: 'sticky', top: '29px', zIndex: 2, background: 'var(--surface)',
                            padding:'6px 12px', textAlign:'right', borderBottom:'1px solid var(--border)', fontSize:10, color:'var(--muted)'
                          }}>{year - 1}</th>
                          <th style={{
                            position: 'sticky', top: '29px', zIndex: 2, background: 'var(--surface)',
                            padding:'6px 12px', textAlign:'center', borderBottom:'1px solid var(--border)', fontSize:10, color:'var(--muted)'
                          }}>% Growth</th>
                          <th style={{
                            position: 'sticky', top: '29px', zIndex: 2, 
                            background: 'linear-gradient(rgba(100, 116, 139, 0.03), rgba(100, 116, 139, 0.03)), var(--surface)',
                            borderLeft: '1px solid var(--border)',
                            padding:'6px 12px', textAlign:'right', borderBottom:'1px solid var(--border)', fontSize:10, color:'var(--muted)'
                          }}>{year}</th>
                          <th style={{
                            position: 'sticky', top: '29px', zIndex: 2, 
                            background: 'linear-gradient(rgba(100, 116, 139, 0.03), rgba(100, 116, 139, 0.03)), var(--surface)',
                            padding:'6px 12px', textAlign:'right', borderBottom:'1px solid var(--border)', fontSize:10, color:'var(--muted)'
                          }}>{year - 1}</th>
                          <th style={{
                            position: 'sticky', top: '29px', zIndex: 2, 
                            background: 'linear-gradient(rgba(100, 116, 139, 0.03), rgba(100, 116, 139, 0.03)), var(--surface)',
                            padding:'6px 12px', textAlign:'center', borderBottom:'1px solid var(--border)', fontSize:10, color:'var(--muted)'
                          }}>% Growth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drawerData.map((cust, i) => (
                          <tr key={cust.CustomerNumber} style={{
                            borderBottom:'1px solid var(--border2)',
                            background: i % 2 === 0 ? 'var(--soft)' : 'transparent'
                          }}>
                            <td style={{padding:'10px 12px', fontSize:13}}>
                              <div style={{fontWeight:600}}>{cust.CustomerName}</div>
                              <div style={{fontSize:11, color:'var(--muted)'}}>{cust.CustomerNumber}</div>
                            </td>
                            <td style={{padding:'10px 12px', textAlign:'right', fontSize:13, fontWeight:600}}>
                              {fmt(cust.AmountYTD2026)}
                            </td>
                            <td style={{padding:'10px 12px', textAlign:'right', fontSize:13, color:'var(--muted)'}}>
                              {fmt(cust.AmountYTD2025)}
                            </td>
                            <td style={{padding:'10px 12px', textAlign:'center', fontSize:12}}>
                              <GrowthBadge prev={cust.AmountYTD2025} curr={cust.AmountYTD2026} />
                            </td>
                            <td style={{
                              padding:'10px 12px', textAlign:'right', fontSize:13, fontWeight:600,
                              borderLeft: '1px solid var(--border)',
                              background: 'rgba(100, 116, 139, 0.02)'
                            }}>
                              {isColorCenter ? fmtVolume(cust.VolumeYTD2026) : fmtWeight(cust.WeightYTD2026)}
                            </td>
                            <td style={{
                              padding:'10px 12px', textAlign:'right', fontSize:13, color:'var(--muted)',
                              background: 'rgba(100, 116, 139, 0.02)'
                            }}>
                              {isColorCenter ? fmtVolume(cust.VolumeYTD2025) : fmtWeight(cust.WeightYTD2025)}
                            </td>
                            <td style={{
                              padding:'10px 12px', textAlign:'center', fontSize:12,
                              background: 'rgba(100, 116, 139, 0.02)'
                            }}>
                              {isColorCenter ? (
                                <GrowthBadge prev={cust.VolumeYTD2025} curr={cust.VolumeYTD2026} />
                              ) : (
                                <GrowthBadge prev={cust.WeightYTD2025} curr={cust.WeightYTD2026} />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
