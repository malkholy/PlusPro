import React, { useState, useEffect, useMemo } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';
import SearchableSelect from '../shared/SearchableSelect.jsx';

// Custom (non-GetGridData) report page: Item x Customer monthly sales, with
// the same Monthly/Quarterly/Yearly period-filter pattern as ExpressDetail.jsx/
// SalesDetail.jsx, plus Customer/Item/Sales Person filters. Data comes from a
// dedicated 'GetItemCustomerMonthlySales' operation (APIPlusOperation.sql) --
// the period grouping logic doesn't fit the generic QueryFilterMappings model.
const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];
const QUARTERS = [
  { value: 1, label: 'Q1 (Jan-Mar)' }, { value: 2, label: 'Q2 (Apr-Jun)' },
  { value: 3, label: 'Q3 (Jul-Sep)' }, { value: 4, label: 'Q4 (Oct-Dec)' },
];
const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
const GROUP_BY_OPTIONS = [
  { value: 'Year', label: 'Year' }, { value: 'Month', label: 'Month' }, { value: 'Quarter', label: 'Quarter' },
  { value: 'Item', label: 'Item' }, { value: 'Customer', label: 'Customer' }, { value: 'SalesPerson', label: 'Sales Person' }
];

function buildLineData(period, months, quarters, year) {
  if (period === 'yearly') return { Period: 'yearly', Months: '', Quarter: 0, Year: year };
  if (period === 'quarterly') {
    const s = [...quarters].sort((a, b) => a - b);
    const qm = s.flatMap(q => q === 1 ? [1, 2, 3] : q === 2 ? [4, 5, 6] : q === 3 ? [7, 8, 9] : [10, 11, 12]);
    return { Period: 'quarterly', Months: [...new Set(qm)].join(','), Quarter: s[0], Year: year };
  }
  return { Period: 'monthly', Months: [...months].sort((a, b) => a - b).join(','), Quarter: 0, Year: year };
}

// Multi-select dropdown (same pattern as ExpressDetail.jsx/SalesDetail.jsx).
// allowEmpty=true lets the last item be deselected (used for Group By, where
// zero selections is a valid "no grouping" state); Months/Quarters always
// keep at least one selected, matching the original ExpressDetail behavior.
function MultiSelect({ options, selected, onChange, placeholder, allowEmpty = false }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  useEffect(() => {
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
        height: 34, padding: '0 10px', fontSize: 12.5, border: '1px solid var(--border)',
        borderRadius: 8, background: 'var(--surface)', color: 'var(--text)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minWidth: 140, fontFamily: 'var(--font)'
      }}>
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {selected.length > 1 && <span style={{ background: 'var(--orange)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 999 }}>{selected.length}</span>}
        <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 38, left: 0, background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 10,
          zIndex: 100, minWidth: 180, boxShadow: 'var(--shadow-lg)', maxHeight: 260, overflowY: 'auto'
        }}>
          {options.map(o => (
            <div key={o.value} onClick={() => {
              const next = selected.includes(o.value) ? selected.filter(v => v !== o.value) : [...selected, o.value];
              onChange(allowEmpty || next.length ? next : [o.value]);
            }} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 12.5,
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

function fmtMoney(v) {
  const n = Number(v) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(v) {
  const n = Number(v) || 0;
  const color = n > 0 ? 'var(--green, #16a34a)' : n < 0 ? 'var(--red)' : 'var(--muted)';
  const sign = n > 0 ? '+' : '';
  return <span style={{ color, fontWeight: 700 }}>{sign}{n.toFixed(1)}%</span>;
}

function quarterOf(monthVal) {
  const m = Number(monthVal);
  return m ? Math.ceil(m / 3) : '';
}

// Shared aggregation used both for normal Group By and for each side of a
// Year comparison -- sums Qty/Amount per unique combination of `dims`.
function aggregateRows(rowsArr, dims) {
  const keyFor = r => dims.map(g => {
    if (g === 'Year') return r.InvoiceYear;
    if (g === 'Month') return r.InvoiceMonth;
    if (g === 'Quarter') return quarterOf(r.InvoiceMonth);
    if (g === 'Item') return r.ItemCode;
    if (g === 'Customer') return r.CustomerNumber;
    if (g === 'SalesPerson') return r.SalesPersonNumber;
    return '';
  }).join('|');

  const map = new Map();
  for (const r of rowsArr) {
    const k = keyFor(r);
    let acc = map.get(k);
    if (!acc) {
      acc = { Qty: 0, Amount: 0 };
      if (dims.includes('Year')) acc.InvoiceYear = r.InvoiceYear;
      if (dims.includes('Month')) acc.InvoiceMonth = r.InvoiceMonth;
      if (dims.includes('Quarter')) acc.Quarter = quarterOf(r.InvoiceMonth);
      if (dims.includes('Item')) { acc.ItemCode = r.ItemCode; acc.ItemExtraDescription = r.ItemExtraDescription; }
      if (dims.includes('Customer')) { acc.CustomerNumber = r.CustomerNumber; acc.CustomerExtraName = r.CustomerExtraName; }
      if (dims.includes('SalesPerson')) acc.SalesName = r.SalesName;
      map.set(k, acc);
    }
    acc.Qty += Number(r.Qty) || 0;
    acc.Amount += Number(r.Amount) || 0;
  }
  return map;
}

function pctChange(a, b) {
  if (a) return ((b - a) / Math.abs(a)) * 100;
  return b ? 100 : 0;
}

export default function ItemCustomerSales({ user }) {
  const now = new Date();
  const [period, setPeriod] = useState('monthly');
  const [months, setMonths] = useState([now.getMonth() + 1]);
  const [quarters, setQuarters] = useState([Math.ceil((now.getMonth() + 1) / 3)]);
  const [year, setYear] = useState(now.getFullYear());

  const [customer, setCustomer] = useState('');
  const [itemId, setItemId] = useState('');
  const [salesPerson, setSalesPerson] = useState('');
  const [groupBy, setGroupBy] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareYear, setCompareYear] = useState(now.getFullYear() - 1);
  // Applied* mirrors state, only updated on Generate -- nothing (including
  // compare mode/year and Group By) re-applies until then.
  const [appliedGroupBy, setAppliedGroupBy] = useState([]);
  const [appliedCompareMode, setAppliedCompareMode] = useState(false);
  const [appliedYear, setAppliedYear] = useState(now.getFullYear());
  const [appliedCompareYear, setAppliedCompareYear] = useState(now.getFullYear() - 1);

  const [customerOptions, setCustomerOptions] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);
  const [salesPersonOptions, setSalesPersonOptions] = useState([]);

  const [rows, setRows] = useState([]);
  const [rowsB, setRowsB] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiCall('Customer Master All', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) setCustomerOptions((d.List0 || []).map(c => ({ label: `${c.CustomerNo} - ${c.CustomerName}`, value: c.CustomerNo })));
    });
    apiCall('Item Master All', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) setItemOptions((d.List0 || []).map(i => ({ label: `${i.ItemCode} - ${i.ItemName || i.ItemDescription || ''}`, optionLabel: i.ItemCode, sublabel: i.ItemName || i.ItemDescription, value: i.ItemID })));
    });
    apiCall('Sales Person Master All', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) setSalesPersonOptions((d.List0 || []).map(s => ({ label: s.SalesName, value: s.SalesID })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchYear(y) {
    const lineData = {
      ...buildLineData(period, months, quarters, y),
      Customer: customer || '',
      ItemID: itemId || '',
      SalesPerson: salesPerson || ''
    };
    const res = await apiCall('GetItemCustomerMonthlySales', lineData, { User: user?.Username }, 'plus');
    if (res.State !== 0) throw new Error(res.Message || 'Failed to load report data.');
    return res.List0 || [];
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (compareMode) {
        const [rA, rB] = await Promise.all([fetchYear(year), fetchYear(compareYear)]);
        setRows(rA);
        setRowsB(rB);
      } else {
        setRows(await fetchYear(year));
        setRowsB([]);
      }
    } catch (err) {
      setError(err.message || 'Connection error.');
    }
    setLoading(false);
  }

  // Initial load only -- filters/Group By/Compare are otherwise not applied
  // until the user clicks Generate (see handleGenerate).
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleGenerate() {
    setAppliedGroupBy(groupBy);
    setAppliedCompareMode(compareMode);
    setAppliedYear(year);
    setAppliedCompareYear(compareYear);
    load();
  }

  // Group By: purely client-side, over the already-fetched detail rows --
  // sums Qty/Amount for whichever combination of dimensions is selected
  // (e.g. Item alone; Year+Item together; etc). Empty selection shows the
  // raw detail rows unchanged. In compare mode, Year is never a grouping
  // dimension (it's the comparison axis) -- each side is aggregated
  // separately on the remaining dims, then merged side by side.
  const groupedRows = useMemo(() => {
    if (appliedCompareMode) {
      const dims = appliedGroupBy.filter(g => g !== 'Year');
      const mapA = aggregateRows(rows, dims);
      const mapB = aggregateRows(rowsB, dims);
      const keys = new Set([...mapA.keys(), ...mapB.keys()]);
      const out = [];
      for (const k of keys) {
        const a = mapA.get(k) || {};
        const b = mapB.get(k) || {};
        const qtyA = a.Qty || 0, qtyB = b.Qty || 0;
        const amtA = a.Amount || 0, amtB = b.Amount || 0;
        out.push({
          InvoiceMonth: a.InvoiceMonth ?? b.InvoiceMonth,
          Quarter: a.Quarter ?? b.Quarter,
          ItemCode: a.ItemCode ?? b.ItemCode,
          ItemExtraDescription: a.ItemExtraDescription ?? b.ItemExtraDescription,
          CustomerNumber: a.CustomerNumber ?? b.CustomerNumber,
          CustomerExtraName: a.CustomerExtraName ?? b.CustomerExtraName,
          SalesName: a.SalesName ?? b.SalesName,
          QtyA: qtyA, QtyB: qtyB, QtyDeltaPct: pctChange(qtyA, qtyB),
          AmountA: amtA, AmountB: amtB, AmountDeltaPct: pctChange(amtA, amtB)
        });
      }
      out.sort((x, y) => (y.AmountB || 0) - (x.AmountB || 0));
      return out;
    }
    if (appliedGroupBy.length === 0) return rows;
    return Array.from(aggregateRows(rows, appliedGroupBy).values());
  }, [rows, rowsB, appliedGroupBy, appliedCompareMode]);

  const columns = useMemo(() => {
    if (appliedCompareMode) {
      const dims = appliedGroupBy.filter(g => g !== 'Year');
      const cols = [];
      if (dims.includes('Month')) cols.push({ key: 'InvoiceMonth', label: 'Month', width: 80, numeric: true, render: v => String(v) });
      if (dims.includes('Quarter')) cols.push({ key: 'Quarter', label: 'Quarter', width: 80, render: v => v ? `Q${v}` : '' });
      if (dims.includes('Item')) {
        cols.push({ key: 'ItemCode', label: 'Item Code', width: 120 });
        cols.push({ key: 'ItemExtraDescription', label: 'Item Description', width: 200 });
      }
      if (dims.includes('Customer')) {
        cols.push({ key: 'CustomerNumber', label: 'Customer No', width: 110 });
        cols.push({ key: 'CustomerExtraName', label: 'Customer Name', width: 200 });
      }
      if (dims.includes('SalesPerson')) cols.push({ key: 'SalesName', label: 'Sales Person', width: 140 });
      cols.push({ key: 'QtyA', label: `Qty ${appliedYear}`, width: 120, numeric: true, render: fmtMoney });
      cols.push({ key: 'QtyB', label: `Qty ${appliedCompareYear}`, width: 120, numeric: true, render: fmtMoney });
      cols.push({ key: 'QtyDeltaPct', label: 'Qty Δ%', width: 90, numeric: true, render: fmtPct });
      cols.push({ key: 'AmountA', label: `Amount ${appliedYear}`, width: 140, numeric: true, render: fmtMoney });
      cols.push({ key: 'AmountB', label: `Amount ${appliedCompareYear}`, width: 140, numeric: true, render: fmtMoney });
      cols.push({ key: 'AmountDeltaPct', label: 'Amount Δ%', width: 100, numeric: true, render: fmtPct });
      return cols;
    }
    if (appliedGroupBy.length === 0) {
      return [
        { key: 'InvoiceYear', label: 'Year', width: 80, numeric: true, render: v => String(v) },
        { key: 'InvoiceMonth', label: 'Month', width: 80, numeric: true, render: v => String(v) },
        { key: 'ItemCode', label: 'Item Code', width: 120 },
        { key: 'ItemExtraDescription', label: 'Item Description', width: 240 },
        { key: 'CustomerNumber', label: 'Customer No', width: 110 },
        { key: 'CustomerExtraName', label: 'Customer Name', width: 220 },
        { key: 'SalesName', label: 'Sales Person', width: 160 },
        { key: 'Qty', label: 'Qty', width: 110, numeric: true, render: fmtMoney },
        { key: 'Amount', label: 'Amount', width: 130, numeric: true, render: fmtMoney }
      ];
    }
    const cols = [];
    if (appliedGroupBy.includes('Year')) cols.push({ key: 'InvoiceYear', label: 'Year', width: 80, numeric: true, render: v => String(v) });
    if (appliedGroupBy.includes('Month')) cols.push({ key: 'InvoiceMonth', label: 'Month', width: 90, numeric: true, render: v => String(v) });
    if (appliedGroupBy.includes('Quarter')) cols.push({ key: 'Quarter', label: 'Quarter', width: 80, render: v => v ? `Q${v}` : '' });
    if (appliedGroupBy.includes('Item')) {
      cols.push({ key: 'ItemCode', label: 'Item Code', width: 120 });
      cols.push({ key: 'ItemExtraDescription', label: 'Item Description', width: 240 });
    }
    if (appliedGroupBy.includes('Customer')) {
      cols.push({ key: 'CustomerNumber', label: 'Customer No', width: 110 });
      cols.push({ key: 'CustomerExtraName', label: 'Customer Name', width: 220 });
    }
    if (appliedGroupBy.includes('SalesPerson')) cols.push({ key: 'SalesName', label: 'Sales Person', width: 160 });
    cols.push({ key: 'Qty', label: 'Total Qty', width: 120, numeric: true, render: fmtMoney });
    cols.push({ key: 'Amount', label: 'Total Amount', width: 140, numeric: true, render: fmtMoney });
    return cols;
  }, [appliedGroupBy, appliedCompareMode, appliedYear, appliedCompareYear]);

  const filterPanel = (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
      padding: '14px 18px', marginBottom: 12, boxShadow: 'var(--shadow)',
      display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 14
    }}>
      <div>
        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase' }}>Period</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {['monthly', 'quarterly', 'yearly'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: '7px 14px', fontSize: 12.5, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                background: period === p ? 'var(--orange)' : 'var(--surface)',
                color: period === p ? '#fff' : 'var(--muted)', fontWeight: period === p ? 700 : 500,
                textTransform: 'capitalize'
              }}>{p}</button>
            ))}
          </div>
          {period === 'monthly' && <MultiSelect options={MONTHS} selected={months} onChange={setMonths} placeholder="Select months" />}
          {period === 'quarterly' && <MultiSelect options={QUARTERS} selected={quarters} onChange={setQuarters} placeholder="Select quarters" />}
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5, outline: 'none' }}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginLeft: 4 }}>
            <input
              type="checkbox"
              checked={compareMode}
              onChange={e => {
                const on = e.target.checked;
                setCompareMode(on);
                if (on) setGroupBy(prev => prev.filter(g => g !== 'Year'));
              }}
            />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>vs</span>
          </label>
          {compareMode && (
            <select value={compareYear} onChange={e => setCompareYear(Number(e.target.value))} style={{ height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5, outline: 'none' }}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
        </div>
      </div>

      <div style={{ minWidth: 200 }}>
        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase' }}>Customer</label>
        <SearchableSelect value={customer} onChange={setCustomer} options={customerOptions} placeholder="All customers" />
      </div>

      <div style={{ minWidth: 200 }}>
        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase' }}>Item</label>
        <SearchableSelect value={itemId} onChange={setItemId} options={itemOptions} placeholder="All items" openOnFocus />
      </div>

      <div style={{ minWidth: 180 }}>
        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase' }}>Sales Person</label>
        <SearchableSelect value={salesPerson} onChange={setSalesPerson} options={salesPersonOptions} placeholder="All sales people" />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase' }}>Group By</label>
        <MultiSelect
          options={compareMode ? GROUP_BY_OPTIONS.filter(o => o.value !== 'Year') : GROUP_BY_OPTIONS}
          selected={groupBy}
          onChange={setGroupBy}
          placeholder={compareMode ? 'Grand total (both years)' : 'No grouping (detail rows)'}
          allowEmpty
        />
      </div>

      {(customer || itemId || salesPerson || groupBy.length > 0 || compareMode) && (
        <button
          onClick={() => { setCustomer(''); setItemId(''); setSalesPerson(''); setGroupBy([]); setCompareMode(false); }}
          style={{ height: 34, padding: '0 14px', background: 'var(--soft)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          ✕ Clear filters
        </button>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          height: 34, padding: '0 24px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
          color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
          boxShadow: '0 4px 12px var(--orange-glow)', opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? 'Generating...' : '▶ Generate'}
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {error && <div className="err-page">⚠ {error}</div>}
      {filterPanel}
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          title="Item Customer Sales"
          subtitle={appliedCompareMode
            ? (() => {
                const dims = appliedGroupBy.filter(g => g !== 'Year');
                const by = dims.length ? ` by: ${dims.map(g => GROUP_BY_OPTIONS.find(o => o.value === g)?.label).join(', ')}` : ' (grand total)';
                return `Comparing ${appliedYear} vs ${appliedCompareYear}${by} -- ${groupedRows.length} rows`;
              })()
            : appliedGroupBy.length > 0
              ? `Grouped by: ${appliedGroupBy.map(g => GROUP_BY_OPTIONS.find(o => o.value === g)?.label).join(', ')} (${groupedRows.length} groups from ${rows.length} rows)`
              : 'Monthly / Quarterly / Yearly item-by-customer sales (detail rows) -- change filters and click Generate'}
          columns={columns}
          rows={groupedRows}
          loading={loading}
          onRefresh={load}
        />
      </div>
    </div>
  );
}
