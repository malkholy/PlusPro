import React, { useState, useEffect, useRef } from 'react';
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

function calcRatio(a, b) {
  if (!a || !b || Number(b) === 0) return null;
  return ((Number(a) / Number(b)) * 100).toFixed(1);
}

function MultiSelect({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
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
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '20px 24px', boxShadow: 'var(--shadow)',
};

function BRow({ icon, label, amount, pctVal, color, bold }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: bold ? 700 : 500 }}>
        {icon && <span>{icon}</span>}{label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 700, minWidth: 60, textAlign: 'right' }}>{amount}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: color || 'var(--orange)', minWidth: 44, textAlign: 'right' }}>{pctVal}</span>
      </div>
    </div>
  );
}

export default function PurchasingDetail({ user, lineData: initLineData, periodLabel: initPeriodLabel, onBack, controlData }) {
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
  const [vendors, setVendors] = useState([]);
  const [vendorBalances, setVendorBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const periodLabel = getPeriodLabel(period, months, quarters, year);
  const lineData = buildLineData(period, months, quarters, year);

  async function load() {
    setLoading(true); setError(''); setData(null); setVendors([]); setVendorBalances([]);
    try {
      const d = await apiCall('Get Purchasing Details By Period', lineData);
      setData(d.List0?.[0] || null);
      setVendors(d.List1 || []);
      setVendorBalances(d.List2 || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [period, months, quarters, year]);

  const totalPurch = Number(data?.TotalPurchasingAmount || controlData?.TotalPurchasingAmount || 0);
  const totalPaid = Number(data?.TotalPaid || controlData?.TotalPaid || 0);
  const vendorBal = Number(data?.VendorBalance || controlData?.VendorBalance || 0);
  const importPurch = Number(data?.ImportPurchasing || 0);
  const localPurch = Number(data?.LocalPurchasing || 0);
  const rawPurch = Number(data?.RawPurchasing || 0);
  const otherPurch = Number(data?.OtherPurchasing || 0);
  const payRatio = calcRatio(totalPaid, totalPurch);
  const maxVendor = vendors.length ? Math.max(...vendors.map(v => Number(v.TotalAmount || 0))) : 1;
  const maxVendorBal = vendorBalances.length ? Math.max(...vendorBalances.map(v => Number(v.VendorBalance || 0))) : 1;

  return (
    <div>
      {/* Header Card */}
      <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px', marginBottom:16}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <div style={{fontSize:12, color:'var(--muted)', marginBottom:4}}>
              <span style={{color:'var(--orange)', cursor:'pointer'}} onClick={onBack}>Control Page</span>
              <span style={{margin:'0 6px'}}>›</span><span>Purchasing</span>
            </div>
            <div className="page-title">Purchasing Details</div>
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

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
        {[
          { label: 'Total Purchasing', value: fmt(totalPurch) },
          { label: 'Total Paid', value: fmt(totalPaid) },
          { label: 'Payment Ratio', value: payRatio ? payRatio + '%' : '—', color: payRatio ? (Number(payRatio) >= 80 ? 'var(--green)' : 'var(--red)') : 'inherit', sub: payRatio ? (Number(payRatio) >= 80 ? '▲ On track' : '▼ Below target') : '—', subColor: payRatio ? (Number(payRatio) >= 80 ? 'var(--green)' : 'var(--red)') : 'var(--muted)' },
          { label: 'Vendor Balance', value: fmt(vendorBal) },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ color: k.color || 'inherit' }}>{k.value}</div>
              <div className="kpi-change" style={{ color: k.subColor || 'var(--muted)' }}>{k.sub || periodLabel}</div>
            </>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Purchasing Breakdown</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{periodLabel}</span>
          </div>
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <BRow icon="🏠" label="Local"  amount={fmt(localPurch)}  pctVal={pct(localPurch,  totalPurch)} color="var(--orange)" />
            <BRow icon="🌍" label="Import" amount={fmt(importPurch)} pctVal={pct(importPurch, totalPurch)} color="var(--blue)" />
            <BRow label="Total" amount={fmt(totalPurch)} pctVal="100%" bold color="var(--text)" />
          </>}
        </div>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Purchasing Type</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{periodLabel}</span>
          </div>
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <BRow icon="🧪" label="Raw"   amount={fmt(rawPurch)}   pctVal={pct(rawPurch,   totalPurch)} color="var(--green)" />
            <BRow icon="📦" label="Other" amount={fmt(otherPurch)} pctVal={pct(otherPurch, totalPurch)} color="var(--amber)" />
            <BRow label="Total" amount={fmt(totalPurch)} pctVal="100%" bold color="var(--text)" />
          </>}
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16}}>

        <div className="table-panel" style={{marginBottom:0}}>
          <div className="panel-head">
            <span className="panel-title">Top 10 Vendors</span>
            <span style={{fontSize:12, color:'var(--muted)'}}>{periodLabel}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Vendor Name</th><th style={{textAlign:'right'}}>Total Amount</th><th style={{minWidth:140}}>Distribution</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={4} style={{textAlign:'center',padding:24}}><div className="spinner" style={{margin:'0 auto'}}></div></td></tr>
                  : vendors.length === 0 ? <tr><td colSpan={4} style={{textAlign:'center',padding:24,color:'var(--muted)'}}>No data</td></tr>
                  : vendors.map((v, i) => (
                    <tr key={i}>
                      <td style={{color:'var(--muted)',fontWeight:600}}>{i+1}</td>
                      <td style={{fontWeight:500}}>{v.VendorName}</td>
                      <td style={{textAlign:'right',fontWeight:700}}>{fmt(v.TotalAmount)}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{flex:1,height:6,background:'var(--border)',borderRadius:999,overflow:'hidden'}}>
                            <div style={{width:(Number(v.TotalAmount)/maxVendor*100)+'%',height:'100%',background:'var(--orange)',borderRadius:999}}></div>
                          </div>
                          <span style={{fontSize:11,color:'var(--muted)',minWidth:40,textAlign:'right'}}>{pct(v.TotalAmount,totalPurch)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-panel" style={{marginBottom:0}}>
          <div className="panel-head">
            <span className="panel-title">Top 10 Vendor Balances</span>
            <span style={{fontSize:12, color:'var(--muted)'}}>{periodLabel}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Vendor Name</th><th style={{textAlign:'right'}}>Balance</th><th style={{minWidth:140}}>Distribution</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={4} style={{textAlign:'center',padding:24}}><div className="spinner" style={{margin:'0 auto'}}></div></td></tr>
                  : vendorBalances.length === 0 ? <tr><td colSpan={4} style={{textAlign:'center',padding:24,color:'var(--muted)'}}>No data</td></tr>
                  : vendorBalances.map((v, i) => (
                    <tr key={i}>
                      <td style={{color:'var(--muted)',fontWeight:600}}>{i+1}</td>
                      <td style={{fontWeight:500}}>{v.VendorName}</td>
                      <td style={{textAlign:'right',fontWeight:700,color:'var(--red)'}}>{fmt(Math.abs(Number(v.VendorBalance)))}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{flex:1,height:6,background:'var(--border)',borderRadius:999,overflow:'hidden'}}>
                            <div style={{width:(Math.abs(Number(v.VendorBalance))/maxVendorBal*100)+'%',height:'100%',background:'var(--orange)',borderRadius:999}}></div>
                          </div>
                          <span style={{fontSize:11,color:'var(--muted)',minWidth:40,textAlign:'right'}}>{pct(Math.abs(Number(v.VendorBalance)),vendorBal)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
