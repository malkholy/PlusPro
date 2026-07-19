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

function getPeriodLabel(period, months, quarters, year) {
  if (period === "yearly") return "Year " + year;
  if (period === "quarterly") {
    const s = [...quarters].sort((a,b)=>a-b);
    return s.length===1 ? "Q"+s[0]+" "+year : s.map(q=>"Q"+q).join(", ")+" "+year;
  }
  const s = [...months].sort((a,b)=>a-b);
  return s.length===1
    ? (MONTHS.find(m=>m.value===s[0])?.label||"")+" "+year
    : s.map(m=>MONTHS.find(x=>x.value===m)?.label?.slice(0,3)).join(", ")+" "+year;
}

function buildLineData(period, months, quarters, year) {
  if (period === "yearly") return { Period:"yearly", Months:"", Quarter:0, Year:year };
  if (period === "quarterly") {
    const s = [...quarters].sort((a,b)=>a-b);
    const qm = s.flatMap(q => q===1?[1,2,3]:q===2?[4,5,6]:q===3?[7,8,9]:[10,11,12]);
    return { Period:"quarterly", Months:[...new Set(qm)].join(","), Quarter:s[0], Year:year };
  }
  return { Period:"monthly", Months:[...months].sort((a,b)=>a-b).join(","), Quarter:0, Year:year };
}

function MultiSelect({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);
  const label = selected.length === 0 ? placeholder
    : selected.length === 1 ? options.find(o => o.value === selected[0])?.label
    : selected.length + " selected";
  return (
    React.createElement("div", { ref, style:{position:"relative"} },
      React.createElement("button", {
        onClick: () => setOpen(o => !o),
        style:{height:30,padding:"0 10px",fontSize:12,border:"0.5px solid var(--border)",borderRadius:"var(--radius-xs)",background:"var(--surface)",color:"var(--text)",cursor:"pointer",display:"flex",alignItems:"center",gap:6,minWidth:120,fontFamily:"var(--font)"}
      },
        React.createElement("span", {style:{flex:1,textAlign:"left",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}, label),
        selected.length > 1 && React.createElement("span", {style:{background:"var(--orange)",color:"#fff",fontSize:10,fontWeight:700,padding:"1px 5px",borderRadius:999}}, selected.length),
        React.createElement("span", {style:{fontSize:10}}, "▾")
      ),
      open && React.createElement("div", {
        style:{position:"absolute",top:34,right:0,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",zIndex:100,minWidth:160,boxShadow:"var(--shadow-lg)",maxHeight:240,overflowY:"auto"}
      },
        options.map(o =>
          React.createElement("div", {
            key: o.value,
            onClick: () => {
              const next = selected.includes(o.value) ? selected.filter(v => v !== o.value) : [...selected, o.value];
              onChange(next.length ? next : [o.value]);
            },
            style:{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",fontSize:12,cursor:"pointer",color:selected.includes(o.value)?"var(--orange)":"var(--text)",fontWeight:selected.includes(o.value)?600:400,background:selected.includes(o.value)?"var(--orange-soft)":"transparent"}
          },
            React.createElement("input", {type:"checkbox",checked:selected.includes(o.value),readOnly:true,style:{accentColor:"var(--orange)",width:13,height:13}}),
            o.label
          )
        )
      )
    )
  );
}

function StateBadge({ state }) {
  const cfg = {
    Inflow:  { bg:"var(--green-soft)", color:"var(--green)", icon:"▲" },
    Outflow: { bg:"var(--red-soft)",   color:"var(--red)",   icon:"▼" },
    Neutral: { bg:"var(--soft)",       color:"var(--muted)", icon:"●" },
  };
  const c = cfg[state] || cfg.Neutral;
  return React.createElement("span", {
    style:{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:999,background:c.bg,color:c.color}
  }, c.icon + " " + state);
}

function GroupPanel({ title, icon, summary, details }) {
  const [expanded, setExpanded] = useState({});
  const groupTotal = summary.reduce((s,c) => s + Number(c.Balance||0), 0);
  const maxBalance = Math.max(...summary.map(c => Math.abs(Number(c.Balance||0))), 1);
  return (
    <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden"}}>
      <div style={{padding:"13px 18px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:14,fontWeight:700}}>{icon} {title}</span>
        <span style={{fontSize:13,fontWeight:700,color:"var(--orange)"}}>{fmt(Math.abs(groupTotal))}</span>
      </div>
      {summary.map((s, i) => {
        const currDetails = details.filter(d => d.LineCurrency === s.LineCurrency);
        const isOpen = expanded[s.LineCurrency];
        return (
          <div key={i}>
            <div onClick={() => setExpanded(e => ({...e, [s.LineCurrency]: !e[s.LineCurrency]}))}
              style={{display:"flex",alignItems:"center",gap:10,padding:"11px 18px",cursor:"pointer",borderBottom:"1px solid var(--border)",background:isOpen?"var(--soft)":"transparent",transition:"background .15s"}}>
              <span style={{fontSize:11,color:"var(--muted)",width:14,flexShrink:0,display:"inline-block",transition:"transform .2s",transform:isOpen?"rotate(90deg)":"none"}}>›</span>
              <span style={{fontSize:13,fontWeight:600,minWidth:50}}>{s.LineCurrency}</span>
              <div style={{flex:1,height:5,background:"var(--border)",borderRadius:999,overflow:"hidden"}}>
                <div style={{width:(Math.abs(Number(s.Balance||0))/maxBalance*100)+"%",height:"100%",background:"var(--orange)",borderRadius:999}}></div>
              </div>
              <span style={{fontSize:13,fontWeight:700,minWidth:60,textAlign:"right"}}>{fmt(Math.abs(Number(s.Balance||0)))}</span>
            </div>
            {isOpen && (
              <div style={{background:"var(--soft)"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 80px 80px 80px 70px",gap:6,padding:"7px 18px 7px 42px",borderBottom:"1px solid var(--border)"}}>
                  {["Description","Opening","Debit","Credit","Movement","Closing","State"].map((h,i) => (
                    <span key={i} style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",textAlign:i>0?"right":"left"}}>{h}</span>
                  ))}
                </div>
                {currDetails.map((d, j) => {
                  const closing = Math.abs(Number(d.ClosingBalance||0));
                  const opening = Math.abs(Number(d.OpeningBalance||0));
                  const movement = closing - opening;
                  return (
                    <div key={j} style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 80px 80px 80px 70px",gap:6,padding:"9px 18px 9px 42px",borderBottom:j<currDetails.length-1?"1px solid var(--border)":"none",alignItems:"center"}}>
                      <span style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.AccountDescription}</span>
                      <span style={{fontSize:12,textAlign:"right",color:"var(--muted)"}}>{fmt(opening)}</span>
                      <span style={{fontSize:12,textAlign:"right",color:"var(--green)"}}>{fmt(Math.abs(Number(d.TotalDebit||0)))}</span>
                      <span style={{fontSize:12,textAlign:"right",color:"var(--red)"}}>{fmt(Math.abs(Number(d.TotalCredit||0)))}</span>
                      <span style={{fontSize:12,textAlign:"right",fontWeight:600,color:movement>=0?"var(--green)":"var(--red)"}}>
                        {movement >= 0 ? "+" : ""}{fmt(movement)}
                      </span>
                      <span style={{fontSize:12,textAlign:"right",fontWeight:700}}>{fmt(closing)}</span>
                      <span style={{textAlign:"right"}}><StateBadge state={d.CashState} /></span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getBankCurrency(bankCode, bankName, fallbackCurrency) {
  const code = (bankCode || "").toUpperCase();
  const name = (bankName || "").toLowerCase();
  
  if (code.includes("EG") || name.includes("جنيه") || name.includes("egp")) {
    return "EGP";
  }
  if (code.includes("SD") || name.includes("دولار") || name.includes("usd") || name.includes("dollar")) {
    return "USD";
  }
  if (code.includes("EU") || name.includes("يورو") || name.includes("eur") || name.includes("euro")) {
    return "EUR";
  }
  return fallbackCurrency;
}

function TopBanksPanel({ topBanks, summary }) {
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  
  // Categorize each bank record to its correct account currency
  const currencies = [...new Set(topBanks.map(b => getBankCurrency(b.Bank, b.BankAccountName, b.LineCurrency)))];
  const activeCurr = selectedCurrency || currencies[0];
  
  // Calculate the max number of banks in any single currency to set the standard row count
  const maxRowsCount = Math.max(...currencies.map(curr => 
    topBanks.filter(b => b.LineCurrency === curr && getBankCurrency(b.Bank, b.BankAccountName, b.LineCurrency) === curr).length
  ), 1);

  // Get actual banks for the active currency, sorted by parent bank name
  const activeBanks = topBanks
    .filter(b => b.LineCurrency === activeCurr && getBankCurrency(b.Bank, b.BankAccountName, b.LineCurrency) === activeCurr)
    .sort((a, b) => (a.BankAccountName || "").localeCompare(b.BankAccountName || ""));

  // Pad activeBanks with empty rows up to maxRowsCount
  const filteredBanks = [...activeBanks];
  while (filteredBanks.length < maxRowsCount) {
    filteredBanks.push({
      Bank: "",
      BankAccountName: "",
      LineCurrency: activeCurr,
      OpeningBalance: null,
      TotalDebit: null,
      TotalCredit: null,
      ClosingBalance: null,
      CashState: "Neutral",
      isEmptyPlaceholder: true
    });
  }

  const grandTotal = activeBanks.reduce((s,b) => s + Math.abs(Number(b.ClosingBalance||0)), 0);
  return (
    <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden"}}>
      <div style={{padding:"13px 18px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:14,fontWeight:700}}>Balances by Bank Institution</span>
        <span style={{fontSize:13,fontWeight:700,color:"var(--orange)"}}>{fmt(grandTotal)}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat("+currencies.length+", 1fr)",gap:8,padding:14,borderBottom:"1px solid var(--border)"}}>
        {currencies.map((curr, i) => {
          const currBanks = topBanks.filter(b => b.LineCurrency === curr && getBankCurrency(b.Bank, b.BankAccountName, b.LineCurrency) === curr);
          const total = currBanks.reduce((s,b) => s + Math.abs(Number(b.ClosingBalance||0)), 0);
          const isActive = activeCurr === curr;
          return (
            <div key={i} onClick={() => setSelectedCurrency(curr)} style={{
              background:isActive?"var(--surface)":"var(--soft)",
              border:isActive?"1.5px solid var(--orange)":"1px solid var(--border)",
              borderRadius:"var(--radius-sm)",padding:"10px 12px",cursor:"pointer",transition:"all .15s"
            }}>
              <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>{curr}</div>
              <div style={{fontSize:14,fontWeight:700,color:isActive?"var(--orange)":"var(--text)"}}>{fmt(total)}</div>
              <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{currBanks.length} institutions</div>
            </div>
          );
        })}
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              {["Bank Code","Parent Bank Name","Opening","Debit","Credit","Closing","State"].map((h,i) => (
                <th key={i} style={{padding:"9px 14px",background:"var(--soft)",color:"var(--muted)",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",textAlign:i>1?"right":"left",borderBottom:"1px solid var(--border)",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredBanks.map((b, i) => {
              if (b.isEmptyPlaceholder) {
                return (
                  <tr key={i}>
                    <td style={{padding:"10px 14px",fontSize:12,borderBottom:i<filteredBanks.length-1?"1px solid var(--border)":"none"}}>&nbsp;</td>
                    <td style={{padding:"10px 14px",fontSize:13,borderBottom:i<filteredBanks.length-1?"1px solid var(--border)":"none"}}>&nbsp;</td>
                    <td style={{padding:"10px 14px",fontSize:12,textAlign:"right",borderBottom:i<filteredBanks.length-1?"1px solid var(--border)":"none"}}>&nbsp;</td>
                    <td style={{padding:"10px 14px",fontSize:12,textAlign:"right",borderBottom:i<filteredBanks.length-1?"1px solid var(--border)":"none"}}>&nbsp;</td>
                    <td style={{padding:"10px 14px",fontSize:12,textAlign:"right",borderBottom:i<filteredBanks.length-1?"1px solid var(--border)":"none"}}>&nbsp;</td>
                    <td style={{padding:"10px 14px",fontSize:13,textAlign:"right",borderBottom:i<filteredBanks.length-1?"1px solid var(--border)":"none"}}>&nbsp;</td>
                    <td style={{padding:"10px 14px",textAlign:"right",borderBottom:i<filteredBanks.length-1?"1px solid var(--border)":"none"}}>&nbsp;</td>
                  </tr>
                );
              }
              return (
                <tr key={i}>
                  <td style={{padding:"10px 14px",fontSize:12,fontFamily:"var(--mono)",color:"var(--muted)",borderBottom:i<filteredBanks.length-1?"1px solid var(--border)":"none"}}>{b.Bank}</td>
                  <td style={{padding:"10px 14px",fontSize:13,fontWeight:500,borderBottom:i<filteredBanks.length-1?"1px solid var(--border)":"none"}}>{b.BankAccountName}</td>
                  <td style={{padding:"10px 14px",fontSize:12,textAlign:"right",color:"var(--muted)",borderBottom:i<filteredBanks.length-1?"1px solid var(--border)":"none"}}>{fmt(Math.abs(Number(b.OpeningBalance||0)))}</td>
                  <td style={{padding:"10px 14px",fontSize:12,textAlign:"right",color:"var(--green)",borderBottom:i<filteredBanks.length-1?"1px solid var(--border)":"none"}}>{fmt(b.TotalDebit)}</td>
                  <td style={{padding:"10px 14px",fontSize:12,textAlign:"right",color:"var(--red)",borderBottom:i<filteredBanks.length-1?"1px solid var(--border)":"none"}}>{fmt(b.TotalCredit)}</td>
                  <td style={{padding:"10px 14px",fontSize:13,textAlign:"right",fontWeight:700,borderBottom:i<filteredBanks.length-1?"1px solid var(--border)":"none"}}>{fmt(Math.abs(Number(b.ClosingBalance||0)))}</td>
                  <td style={{padding:"10px 14px",textAlign:"right",borderBottom:i<filteredBanks.length-1?"1px solid var(--border)":"none"}}><StateBadge state={b.CashState} /></td>
                </tr>
              );
            })}
              <tr style={{background:"var(--soft)"}}>
                <td style={{padding:"10px 14px",fontSize:12,fontWeight:700,borderTop:"1px solid var(--border2)"}} colSpan={2}>Total</td>
                <td style={{padding:"10px 14px",fontSize:12,textAlign:"right",fontWeight:700,color:"var(--muted)",borderTop:"1px solid var(--border2)"}}>
                  {fmt(filteredBanks.reduce((s,b)=>s+Math.abs(Number(b.OpeningBalance||0)),0))}
                </td>
                <td style={{padding:"10px 14px",fontSize:12,textAlign:"right",fontWeight:700,color:"var(--green)",borderTop:"1px solid var(--border2)"}}>
                  {fmt(filteredBanks.reduce((s,b)=>s+Number(b.TotalDebit||0),0))}
                </td>
                <td style={{padding:"10px 14px",fontSize:12,textAlign:"right",fontWeight:700,color:"var(--red)",borderTop:"1px solid var(--border2)"}}>
                  {fmt(filteredBanks.reduce((s,b)=>s+Number(b.TotalCredit||0),0))}
                </td>
                <td style={{padding:"10px 14px",fontSize:13,textAlign:"right",fontWeight:700,borderTop:"1px solid var(--border2)"}}>
                  {fmt(filteredBanks.reduce((s,b)=>s+Math.abs(Number(b.ClosingBalance||0)),0))}
                </td>
                <td style={{padding:"10px 14px",borderTop:"1px solid var(--border2)"}}></td>
              </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CashDetail({ user, lineData: initLineData, periodLabel: initPeriodLabel, onBack }) {
  const now = new Date();
  const init = initLineData || {};
  const [period, setPeriod] = useState(init.Period || "monthly");
  const [months, setMonths] = useState(init.Months ? init.Months.split(",").map(Number) : [now.getMonth()+1]);
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
  const [summary, setSummary] = useState([]);
  const [details, setDetails] = useState([]);
  const [topBanks, setTopBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const periodLabel = getPeriodLabel(period, months, quarters, year);
  const lineData = buildLineData(period, months, quarters, year);

  async function load() {
    setLoading(true); setError(""); setSummary([]); setDetails([]); setTopBanks([]);
    try {
      const d = await apiCall("Get Cash Details By Period", lineData);
      setSummary(d.List0 || []);
      setDetails(d.List1 || []);
      setTopBanks(d.List2 || []);
    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [period, months, quarters, year]);

  const treasury = summary.filter(c => c.AccountGroup === "126");
  const bank     = summary.filter(c => c.AccountGroup === "127");
  const treasuryDetails = details.filter(d => d.AccountGroup === "126");
  const bankDetails     = details.filter(d => d.AccountGroup === "127");
  const totalTreasury   = treasury.reduce((s,c) => s+Number(c.Balance||0), 0);
  const totalBank       = bank.reduce((s,c) => s+Number(c.Balance||0), 0);
  const grandTotal      = totalTreasury + totalBank;

  return (
    <div>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"16px 20px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>
              <span style={{color:"var(--orange)",cursor:"pointer"}} onClick={onBack}>Control Page</span>
              <span style={{margin:"0 6px"}}>›</span><span>Cash</span>
            </div>
            <div className="page-title">Cash Details</div>
          </div>
          <button className="btn-primary" onClick={load} style={{height:32,fontSize:12}}>Refresh</button>
        </div>
        <div style={{height:"0.5px",background:"var(--border)",margin:"12px 0"}}></div>
        <div style={{display:"flex",alignItems:"center",gap:8}} onClick={e => e.stopPropagation()}>
          <div style={{display:"flex",border:"0.5px solid var(--border2)",borderRadius:"var(--radius-xs)",overflow:"hidden"}}>
            {["monthly","quarterly","yearly"].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding:"5px 14px",fontSize:12,border:"none",cursor:"pointer",fontFamily:"var(--font)",
                background:period===p?"var(--orange)":"var(--surface)",
                color:period===p?"#fff":"var(--muted)",fontWeight:period===p?600:400,
                textTransform:"capitalize"
              }}>{p}</button>
            ))}
          </div>
          {period === "monthly" && <MultiSelect options={MONTHS} selected={months} onChange={setMonths} placeholder="Select months" />}
          {period === "quarterly" && <MultiSelect options={QUARTERS} selected={quarters} onChange={setQuarters} placeholder="Select quarters" />}
          <select className="filter-select" value={year} onChange={e => setYear(Number(e.target.value))} style={{height:30,fontSize:12}}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:5,fontSize:11,color:"var(--muted)",background:"var(--soft)",padding:"3px 10px",borderRadius:999}}>
          {periodLabel}
        </div>
      </div>

      {error && <div className="err-page">{error}</div>}

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24}}>
        {[
          { label:"Treasury", group:"126" },
          { label:"Bank",     group:"127" },
        ].map((g, gi) => {
          const rows = summary.filter(s => s.AccountGroup === g.group);
          const opening = rows.reduce((s,r) => s + Math.abs(Number(r.OpeningBalance||0)), 0);
          const current = rows.reduce((s,r) => s + Math.abs(Number(r.Balance||0)), 0);
          const diff    = current - opening;
          return (
            <div key={gi} className="kpi-card" style={{padding:"16px 20px"}}>
              {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
                <div className="kpi-label" style={{fontSize:13, fontWeight:700, marginBottom:14}}>{g.label}</div>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>
                  <div>
                    <div className="kpi-label">Year Opening</div>
                    <div style={{fontSize:18, fontWeight:700}}>{fmt(opening)}</div>
                  </div>
                  <div>
                    <div className="kpi-label">Current Balance</div>
                    <div style={{fontSize:18, fontWeight:700}}>{fmt(current)}</div>
                  </div>
                  <div>
                    <div className="kpi-label">Difference</div>
                    <div style={{fontSize:18, fontWeight:700, color: diff>=0?"var(--green)":"var(--red)"}}>
                      {diff>=0?"+":""}{fmt(diff)}
                    </div>
                  </div>
                </div>
              </>}
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner"></div></div>
      ) : (
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
            <GroupPanel title="Treasury" icon="🏦" summary={treasury} details={treasuryDetails} />
            <GroupPanel title="Bank"     icon="🏛️" summary={bank}     details={bankDetails} />
          </div>
          {topBanks.length > 0 && (
            <>
              <div className="section-label" style={{marginBottom:10}}>Balances by Bank Institution</div>
              <TopBanksPanel topBanks={topBanks} summary={summary} />
            </>
          )}
        </>
      )}
    </div>
  );
}
