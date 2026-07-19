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

function pct(a, b) {
  if (!a || !b || Number(b) === 0) return '—';
  return ((Number(a) / Number(b)) * 100).toFixed(1) + '%';
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

function AccountPanel({ account, details, grandTotal }) {
  const [expanded, setExpanded] = useState({});

  // Group details by ParentDescription
  const groups = details.reduce((acc, row) => {
    const key = row.ParentDescription || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const sortedDetails = [...details].sort((a,b) => Number(b.TotalAmount||0) - Number(a.TotalAmount||0));
  const accountTotal = details.reduce((s, r) => s + Number(r.TotalAmount || 0), 0);
  const maxGroup = Math.max(...Object.values(groups).map(rows => rows.reduce((s,r)=>s+Number(r.TotalAmount||0),0)));
  const maxDetail = Math.max(...details.map(r => Number(r.TotalAmount || 0)));

  return (
    <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden'}}>
      <div style={{padding:'13px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span style={{fontSize:14, fontWeight:700}}>{account.AccountDescription}</span>
        <span style={{fontSize:13, fontWeight:700, color:'var(--orange)'}}>{fmt(accountTotal)}</span>
      </div>

      {Object.entries(groups).sort((a,b)=>b[1].reduce((s,r)=>s+Number(r.TotalAmount||0),0)-a[1].reduce((s,r)=>s+Number(r.TotalAmount||0),0)).map(([parent, rows]) => {
        const groupTotal = rows.reduce((s,r) => s + Number(r.TotalAmount||0), 0);
        const isOpen = expanded[parent];
        return (
          <div key={parent}>
            <div onClick={() => setExpanded(e => ({...e, [parent]: !e[parent]}))}
              style={{
                display:'flex', alignItems:'center', gap:10, padding:'11px 18px',
                cursor:'pointer', borderBottom:'1px solid var(--border)',
                background: isOpen ? 'var(--soft)' : 'transparent',
                transition:'background .15s'
              }}>
              <span style={{fontSize:11, color:'var(--muted)', width:14, flexShrink:0, transition:'transform .2s', display:'inline-block', transform: isOpen?'rotate(90deg)':'none'}}>›</span>
              <span style={{fontSize:13, fontWeight:500, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{parent}</span>
              <div style={{width:80, height:5, background:'var(--border)', borderRadius:999, overflow:'hidden', flexShrink:0}}>
                <div style={{width:(groupTotal/maxGroup*100)+'%', height:'100%', background:'var(--orange)', borderRadius:999}}></div>
              </div>
              <span style={{fontSize:13, fontWeight:700, minWidth:52, textAlign:'right', flexShrink:0}}>{fmt(groupTotal)}</span>
              <span style={{fontSize:11, color:'var(--muted)', minWidth:38, textAlign:'right', flexShrink:0}}>{pct(groupTotal, accountTotal)}</span>
            </div>

            {isOpen && (
              <div style={{background:'var(--soft)'}}>
                {[...rows].sort((a,b)=>Number(b.TotalAmount||0)-Number(a.TotalAmount||0)).map((r, i) => (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', gap:8, padding:'8px 18px 8px 42px',
                    borderBottom: i < rows.length-1 ? '1px solid var(--border)' : '1px solid var(--border)'
                  }}>
                    <span style={{fontSize:11, color:'var(--text)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{r.SegmentDescription || r.Segment7}</span>
                    <div style={{width:50, height:4, background:'var(--border)', borderRadius:999, overflow:'hidden', flexShrink:0}}>
                      <div style={{width:(Number(r.TotalAmount)/maxDetail*100)+'%', height:'100%', background:'#fb923c', borderRadius:999}}></div>
                    </div>
                    <span style={{fontSize:11, fontWeight:600, minWidth:46, textAlign:'right', flexShrink:0}}>{fmt(r.TotalAmount)}</span>
                    <span style={{fontSize:10, color:'var(--muted)', minWidth:34, textAlign:'right', flexShrink:0}}>{pct(r.TotalAmount, groupTotal)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ExpensesDetail({ user, lineData: initLineData, periodLabel: initPeriodLabel, onBack, controlData }) {
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
  const [kpis, setKpis] = useState([]);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const periodLabel = getPeriodLabel(period, months, quarters, year);
  const lineData = buildLineData(period, months, quarters, year);

  async function load() {
    setLoading(true); setError(''); setKpis([]); setDetails([]);
    try {
      const d = await apiCall('Get Expenses Details By Period', lineData);
      setKpis(d.List0 || []);
      setDetails(d.List2 || []);
    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [period, months, quarters, year]);

  const grandTotal = kpis.reduce((s, k) => s + Number(k.TotalAmount || 0), 0);
  const totalSalesAmount = Number(kpis[0]?.TotalSalesAmount || controlData?.TotalSalesAmount || 0);

  return (
    <div>
      {/* Header Card */}
      <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px', marginBottom:16}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <div style={{fontSize:12, color:'var(--muted)', marginBottom:4}}>
              <span style={{color:'var(--orange)', cursor:'pointer'}} onClick={onBack}>Control Page</span>
              <span style={{margin:'0 6px'}}>›</span><span>Expenses</span>
            </div>
            <div className="page-title">Expenses Details</div>
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

      {/* KPI Cards */}
      <div className="kpi-grid" style={{gridTemplateColumns:`repeat(${kpis.length + 1}, 1fr)`, marginBottom:24}}>
        {kpis.map((k, i) => {
          const ratio = totalSalesAmount ? ((Number(k.TotalAmount||0) / totalSalesAmount) * 100).toFixed(1) : null;
          return (
            <div key={i} className="kpi-card">
              {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
                <div className="kpi-label">{k.AccountDescription || k.Account}</div>
                <div className="kpi-value">{fmt(k.TotalAmount)}</div>
                <div className="kpi-change kpi-neu">{periodLabel}</div>
                {ratio && <div className="kpi-change" style={{marginTop:4, color:'var(--muted)'}}>Exp/Sales: <span style={{fontWeight:700, color: Number(ratio)<=15?'var(--green)':'var(--red)'}}>{ratio}%</span></div>}
              </>}
            </div>
          );
        })}
        <div className="kpi-card">
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <div className="kpi-label">Total Expenses</div>
            <div className="kpi-value">{fmt(grandTotal)}</div>
            <div className="kpi-change kpi-neu">{periodLabel}</div>
            {totalSalesAmount && <div className="kpi-change" style={{marginTop:4, color:'var(--muted)'}}>Exp/Sales: <span style={{fontWeight:700, color: Number((grandTotal/totalSalesAmount*100).toFixed(1))<=15?'var(--green)':'var(--red)'}}>{(grandTotal/totalSalesAmount*100).toFixed(1)}%</span></div>}
          </>}
        </div>
      </div>

      {/* Two panels side by side */}
      <div className="section-label" style={{marginBottom:10}}>By Category — click to expand</div>
      {loading ? (
        <div className="loading-wrap"><div className="spinner"></div></div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
          {kpis.map((account, i) => {
            const accountDetails = details.filter(d => String(d.Account) === String(account.Account));
            return (
              <AccountPanel key={i} account={account} details={accountDetails} grandTotal={grandTotal} />
            );
          })}
        </div>
      )}
    </div>
  );
}
