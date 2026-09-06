import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';

// Local (not UTC) date helper -- matches PrintPlanModal.jsx/PlanningShowPlan.jsx.
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: 0.4
};
const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid var(--border2)', borderRadius: 'var(--radius-xs)',
  boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 13
};
const thStyle = { textAlign: 'left', padding: '6px 8px', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '6px 8px', fontSize: 12.5, color: 'var(--text)', borderBottom: '1px solid var(--border)' };

export default function ProductionBulkModal({ user, onClose, onProduced }) {
  const [date, setDate] = useState(() => toLocalDateStr(new Date()));
  const [shiftNo, setShiftNo] = useState('');
  const [machineType, setMachineType] = useState('');
  const [machineTypeOptions, setMachineTypeOptions] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // orders: left grid, one row per Shop Order (newIssueQty is editable).
  // orderLines: right panel -- { [shopOrderNumber]: [line, ...] }, same
  // shape/behavior as ShopOrderProductionDrawer.jsx's `lines` state --
  // each line's Issue Now is individually editable, defaulted via the same
  // proportional-split formula that drawer uses on its header Qty blur.
  const [orders, setOrders] = useState([]);
  const [orderLines, setOrderLines] = useState({});
  const [linesLoading, setLinesLoading] = useState(false);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState(null);
  const newLineKeyRef = useRef(0);

  const [producing, setProducing] = useState(false);
  const [producingOne, setProducingOne] = useState(false);
  const [produceResults, setProduceResults] = useState([]);

  useEffect(() => {
    apiCall('Machine Type All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) setMachineTypeOptions(d.List0 || []);
    }).catch(() => {});
    apiCall('Item Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setItemOptions((d.List0 || []).map(i => ({
          label: `${i.ItemCode} - ${i.ItemName}`, value: i.ItemID, itemCode: i.ItemCode, itemName: i.ItemName
        })));
      }
    }).catch(() => {});
  }, [user]);

  const fetchBalance = async (itemCode, warehouse) => {
    try {
      const bd = await apiCall('GetGridData', { PageGroupID: 'item_balance', fromItem: itemCode, toItem: itemCode }, { User: user?.Username }, 'plus');
      if (bd.State !== 0) return null;
      const match = (bd.List0 || []).find(b => String(b.Warehouse || '').trim().toUpperCase() === String(warehouse || '').trim().toUpperCase());
      return match ? Number(match.ItemBalance || 0) : null;
    } catch {
      return null;
    }
  };

  const handleLoad = async (preferredSelection) => {
    if (!date) { setError('Please select a date.'); return; }
    if (!shiftNo) { setError('Please select a shift.'); return; }
    if (!machineType) { setError('Please select a machine type.'); return; }
    setError('');
    setSuccess('');
    setProduceResults([]);
    setLoading(true);
    setLoaded(false);
    setOrders([]);
    setOrderLines({});
    try {
      const [calRes, hdrRes] = await Promise.all([
        apiCall('Get Planning Shift Calendar', { FromDate: date, ToDate: date }, { User: user?.Username }, 'planning'),
        apiCall('GetGridData', { PageGroupID: 'shop_orders' }, { User: user?.Username }, 'plus')
      ]);
      if (calRes.State !== 0) throw new Error(calRes.Message || 'Failed to load shift plan.');
      if (hdrRes.State !== 0) throw new Error(hdrRes.Message || 'Failed to load shop orders.');

      const filtered = (calRes.List0 || []).filter(r =>
        Number(r.ShiftNo) === Number(shiftNo) && Number(r.MachineType) === Number(machineType) && r.ShopOrderNo
      );
      const plannedByOrder = {};
      // The exact shift-plan slot(s) each order's issue in THIS shift
      // corresponds to -- an order can span multiple shifts, but only the
      // slot(s) matching this Date+Shift+MachineType selection get their
      // QtyIssued updated when Produce runs (see handleProduce).
      const slotsByOrder = {};
      filtered.forEach(r => {
        plannedByOrder[r.ShopOrderNo] = (plannedByOrder[r.ShopOrderNo] || 0) + Number(r.PlannedQty || 0);
        if (!slotsByOrder[r.ShopOrderNo]) slotsByOrder[r.ShopOrderNo] = [];
        slotsByOrder[r.ShopOrderNo].push({ shiftPlanID: r.ShiftPlanID, plannedQty: Number(r.PlannedQty || 0) });
      });

      const headerByNumber = {};
      (hdrRes.List0 || []).forEach(h => { headerByNumber[h.ShopOrderNumber] = h; });

      const orderRows = Object.keys(plannedByOrder).map(no => {
        const h = headerByNumber[no];
        const shiftPlannedQty = plannedByOrder[no];
        const required = Number(h?.QuantityRequired || 0);
        const oldIssued = Number(h?.QuantiftyIssued || 0);
        const remaining = required - oldIssued;
        const isClosed = Number(h?.OrderState) === 20;
        const missingHeader = !h;
        return {
          shopOrderNumber: no,
          machineCode: h?.MachineCode || '—', itemCode: h?.ParentItemCode || '—', itemDescription: h?.ItemDescription || '',
          warehouse: h?.ShopOrderWarehouse || '', required, oldIssued,
          newIssueQty: shiftPlannedQty, // editable
          remaining, isClosed, missingHeader, stateDescription: h?.StateDescription,
          slots: slotsByOrder[no] || []
        };
      }).sort((a, b) => String(a.machineCode).localeCompare(String(b.machineCode)));

      setOrders(orderRows);
      setLoaded(true);
      const preferred = preferredSelection != null && orderRows.some(o => String(o.shopOrderNumber) === String(preferredSelection) && !o.isClosed && !o.missingHeader)
        ? orderRows.find(o => String(o.shopOrderNumber) === String(preferredSelection))
        : null;
      const firstSelectable = preferred || orderRows.find(o => !o.isClosed && !o.missingHeader);
      setSelectedOrderNumber(firstSelectable ? firstSelectable.shopOrderNumber : null);

      const withHeader = orderRows.filter(o => !o.isClosed && !o.missingHeader);
      setLinesLoading(true);
      const lineResponses = await Promise.all(
        withHeader.map(o => apiCall('Shop Order Lines', { param1: o.shopOrderNumber }, { User: user?.Username }, 'lookup'))
      );

      // Fetch balance once per distinct (item, warehouse) across every order.
      const rawByOrder = {};
      withHeader.forEach((o, i) => { rawByOrder[o.shopOrderNumber] = lineResponses[i].State === 0 ? (lineResponses[i].List0 || []) : []; });
      const balanceKeys = [...new Set(
        withHeader.flatMap(o => rawByOrder[o.shopOrderNumber].map(l => `${l.ChildItemCode}|${o.warehouse}`))
      )];
      const balanceResults = await Promise.all(balanceKeys.map(key => {
        const [code, wh] = key.split('|');
        return fetchBalance(code, wh);
      }));
      const balanceByKey = {};
      balanceKeys.forEach((key, i) => { balanceByKey[key] = balanceResults[i]; });

      const linesMap = {};
      withHeader.forEach(o => {
        const factor = o.required > 0 ? o.newIssueQty / o.required : 0;
        linesMap[o.shopOrderNumber] = rawByOrder[o.shopOrderNumber].map(l => ({
          key: `existing-${l.Line}`, isNew: false, line: l.Line,
          childItemID: l.ChildItemID, childItemCode: l.ChildItemCode, childItemDescription: l.ItemDescription,
          quantityRequired: Number(l.ChildQuantityRequired || 0), alreadyIssued: Number(l.ChildQuantityIssued || 0),
          issueNow: Number(l.ChildQuantityRequired || 0) * factor,
          balance: balanceByKey[`${l.ChildItemCode}|${o.warehouse}`] ?? null
        }));
      });
      setOrderLines(linesMap);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLinesLoading(false);
    }
  };

  const updateOrderNewIssueQty = (shopOrderNumber, val) => {
    const num = val === '' ? 0 : Number(val);
    setOrders(prev => prev.map(o => o.shopOrderNumber === shopOrderNumber ? { ...o, newIssueQty: num } : o));
  };

  // Same convention as ShopOrderProductionDrawer.jsx's handleIssuedQtyBlur:
  // re-splits every line proportionally to the header's new Qty only on
  // blur (not every keystroke), and only as a *starting point* -- lines
  // stay individually editable afterward.
  const handleHeaderQtyBlur = (o) => {
    const required = o.required;
    const newQty = o.newIssueQty;
    if (required <= 0) return;
    const factor = newQty / required;
    setOrderLines(prev => ({
      ...prev,
      [o.shopOrderNumber]: (prev[o.shopOrderNumber] || []).map(l => ({ ...l, issueNow: Number(l.quantityRequired || 0) * factor }))
    }));
  };

  const updateLineIssueNow = (shopOrderNumber, idx, val) => {
    setOrderLines(prev => ({
      ...prev,
      [shopOrderNumber]: prev[shopOrderNumber].map((l, i) => i === idx ? { ...l, issueNow: val } : l)
    }));
  };

  const addLine = (shopOrderNumber) => {
    newLineKeyRef.current -= 1;
    setOrderLines(prev => ({
      ...prev,
      [shopOrderNumber]: [...(prev[shopOrderNumber] || []), {
        key: `new-${newLineKeyRef.current}`, isNew: true, line: null,
        childItemID: '', childItemCode: '', childItemDescription: '',
        quantityRequired: 0, alreadyIssued: 0, issueNow: '', balance: null
      }]
    }));
  };

  const removeLine = (shopOrderNumber, idx) => {
    const target = orderLines[shopOrderNumber]?.[idx];
    if (!target || !target.isNew || Number(target.alreadyIssued || 0) > 0) {
      setError('Only newly-added lines with no issued quantity can be removed.');
      return;
    }
    setOrderLines(prev => ({ ...prev, [shopOrderNumber]: prev[shopOrderNumber].filter((_, i) => i !== idx) }));
  };

  const updateNewLineItem = async (o, idx, itemID) => {
    const lines = orderLines[o.shopOrderNumber] || [];
    const alreadyOnOrder = lines.some((l, i) => i !== idx && String(l.childItemID) === String(itemID));
    if (alreadyOnOrder) { setError('This item is already on the lines for this order.'); return; }
    setError('');
    const opt = itemOptions.find(x => String(x.value) === String(itemID));
    setOrderLines(prev => ({
      ...prev,
      [o.shopOrderNumber]: prev[o.shopOrderNumber].map((l, i) => i === idx ? {
        ...l, childItemID: itemID, childItemCode: opt?.itemCode || '', childItemDescription: opt?.itemName || '', balance: null
      } : l)
    }));
    if (!opt) return;
    const balance = await fetchBalance(opt.itemCode, o.warehouse);
    setOrderLines(prev => ({
      ...prev,
      [o.shopOrderNumber]: prev[o.shopOrderNumber].map((l, i) => i === idx ? { ...l, balance } : l)
    }));
  };

  const ordersComputed = useMemo(() => orders.map(o => ({
    ...o,
    overRemaining: !o.missingHeader && o.newIssueQty > o.remaining + 0.00001
  })), [orders]);

  const includedOrders = useMemo(
    () => ordersComputed.filter(o => !o.isClosed && !o.missingHeader && !o.overRemaining),
    [ordersComputed]
  );

  const selectedOrder = useMemo(
    () => ordersComputed.find(o => o.shopOrderNumber === selectedOrderNumber) || null,
    [ordersComputed, selectedOrderNumber]
  );

  const allIncludedLines = useMemo(
    () => includedOrders.flatMap(o => (orderLines[o.shopOrderNumber] || []).map(l => ({ ...l, shopOrderNumber: o.shopOrderNumber }))),
    [includedOrders, orderLines]
  );

  const overBalanceLines = allIncludedLines.filter(l => l.balance !== null && Number(l.issueNow || 0) > l.balance);
  const newLineMissingItem = allIncludedLines.filter(l => l.isNew && !l.childItemID);
  const blockingOrderErrors = ordersComputed.filter(o => o.missingHeader || o.overRemaining);
  const hasErrors = blockingOrderErrors.length > 0 || overBalanceLines.length > 0 || newLineMissingItem.length > 0;
  const toProduceCount = includedOrders.length;

  // Same validity checks as the batch gate, scoped to just the selected
  // order -- lets "Produce This Order" work even while a DIFFERENT order
  // still has a problem.
  const selectedOrderLines = selectedOrder ? (orderLines[selectedOrder.shopOrderNumber] || []) : [];
  const selectedOrderHasErrors = !selectedOrder || selectedOrder.isClosed || selectedOrder.missingHeader || selectedOrder.overRemaining
    || selectedOrderLines.some(l => (l.balance !== null && Number(l.issueNow || 0) > l.balance) || (l.isNew && !l.childItemID));

  // Issues one order (Issue Shop Order + the per-slot QtyIssued tracking
  // update) and returns the result -- shared by both "Produce All" and
  // "Produce This Order".
  const issueOneOrder = async (o) => {
    const lines = orderLines[o.shopOrderNumber] || [];
    const lineMember = lines.map(l => l.isNew ? {
      Line: null,
      ChildItemID: Number(l.childItemID),
      ChildQuantityRequired: Number(l.quantityRequired || 0),
      ChildIssued: Number(l.issueNow || 0)
    } : {
      Line: l.line,
      ChildIssued: Number(l.issueNow || 0)
    });
    const res = await apiCall('Issue Shop Order', {
      ShopOrderNo: o.shopOrderNumber, IssuedQty: o.newIssueQty
    }, { User: user?.Username, LineMember: JSON.stringify(lineMember) }, 'shop_order');
    if (res.State !== 0) return { ok: false, message: res.Message };

    // Link this release back to the specific shift-plan slot(s) this
    // shift's issue actually corresponds to (an order can span multiple
    // shifts) -- a tracking-only step, so a failure here doesn't undo the
    // real issue, just gets noted.
    let trackingNote = '';
    const totalSlotPlanned = o.slots.reduce((sum, s) => sum + s.plannedQty, 0);
    if (o.slots.length > 0 && totalSlotPlanned > 0) {
      const trackLineMember = o.slots.map(s => ({
        ShiftPlanID: s.shiftPlanID, Delta: o.newIssueQty * (s.plannedQty / totalSlotPlanned)
      }));
      const trackRes = await apiCall('Update Shift Plan Issued Qty', null, {
        User: user?.Username, LineMember: JSON.stringify(trackLineMember)
      }, 'planning');
      if (trackRes.State !== 0) trackingNote = ` (issued, but slot tracking failed: ${trackRes.Message || 'unknown error'})`;
    }

    return { ok: true, message: res.Message, trackingNote };
  };

  const handleProduce = async () => {
    setError('');
    setSuccess('');
    setProducing(true);
    const results = [];
    try {
      for (const o of includedOrders) {
        const result = await issueOneOrder(o);
        results.push({ shopOrderNumber: o.shopOrderNumber, ...result });
        setProduceResults([...results]);
        if (!result.ok) {
          setError(`Stopped at Shop Order ${o.shopOrderNumber}: ${result.message || 'Failed to issue.'} (${results.filter(r => r.ok).length} of ${includedOrders.length} succeeded before this)`);
          setProducing(false);
          return;
        }
      }
      setSuccess(`Produced ${results.length} Shop Order${results.length > 1 ? 's' : ''} for this shift!`);
      onProduced?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setProducing(false);
    }
  };

  // Issue just the currently-selected order, then reload the whole screen
  // (orders, lines, balances) so the next order you look at reflects what
  // just happened -- lets you go one Shop Order at a time instead of
  // committing to the whole batch at once.
  const handleProduceOne = async () => {
    const o = selectedOrder;
    if (!o || o.isClosed || o.missingHeader || o.overRemaining) return;
    setError('');
    setSuccess('');
    setProducingOne(true);
    try {
      const result = await issueOneOrder(o);
      if (!result.ok) {
        setProduceResults(prev => [...prev, { shopOrderNumber: o.shopOrderNumber, ...result }]);
        setError(`Shop Order ${o.shopOrderNumber}: ${result.message || 'Failed to issue.'}`);
        return;
      }
      // handleLoad resets produceResults as part of a fresh load -- add
      // this result back in afterward so it survives the refresh.
      await handleLoad(o.shopOrderNumber);
      setProduceResults([{ shopOrderNumber: o.shopOrderNumber, ...result }]);
      setSuccess(`Produced Shop Order ${o.shopOrderNumber}${result.trackingNote || ''} -- refreshed.`);
      onProduced?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setProducingOne(false);
    }
  };

  const shiftLabel = shiftNo === '1' ? 'Shift 1 (07:00 AM - 07:00 PM)' : shiftNo === '2' ? 'Shift 2 (07:00 PM - 07:00 AM)' : '';

  return (
    <>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 1300, maxWidth: '97vw', maxHeight: '92vh', background: 'var(--surface)', borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', zIndex: 1200,
        fontFamily: 'var(--font)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 'var(--radius-xs)', background: 'var(--orange-soft)', fontSize: 16
            }}>⚙️</span>
            Production
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: 22, lineHeight: 1, cursor: 'pointer',
              color: 'var(--muted)', width: 32, height: 32, borderRadius: '999px', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--red)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)'; }}
          >×</button>
        </div>

        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--soft)', display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 180 }}>
            <label style={labelStyle}>Date</label>
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setLoaded(false); }} style={inputStyle} />
          </div>
          <div style={{ width: 220 }}>
            <label style={labelStyle}>Shift</label>
            <select value={shiftNo} onChange={e => { setShiftNo(e.target.value); setLoaded(false); }} style={inputStyle}>
              <option value="">Select shift...</option>
              <option value="1">Shift 1 (07:00 AM - 07:00 PM)</option>
              <option value="2">Shift 2 (07:00 PM - 07:00 AM)</option>
            </select>
          </div>
          <div style={{ width: 200 }}>
            <label style={labelStyle}>Machine Type</label>
            <select value={machineType} onChange={e => { setMachineType(e.target.value); setLoaded(false); }} style={inputStyle}>
              <option value="">Select type...</option>
              {machineTypeOptions.map(t => (
                <option key={t.TypeID} value={t.TypeID}>{(t.TypeDescription || '').trim()}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleLoad}
            disabled={loading}
            style={{
              padding: '9px 22px', borderRadius: 'var(--radius-xs)', border: 'none',
              background: loading ? 'var(--hint)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20, background: 'var(--bg)' }}>
          {error && (
            <div style={{ padding: 12, background: 'var(--red-soft)', color: 'var(--red)', borderRadius: 'var(--radius-xs)', fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>{error}</div>
          )}
          {success && (
            <div style={{ padding: 12, background: 'var(--green-soft)', color: 'var(--green)', borderRadius: 'var(--radius-xs)', fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>{success}</div>
          )}

          {!loaded ? (
            <div style={{ fontSize: 13, color: 'var(--hint)', padding: 20, textAlign: 'center' }}>
              Select a date, shift, and machine type, then click Load.
            </div>
          ) : orders.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--hint)', padding: 20, textAlign: 'center' }}>
              No Shop Orders linked to shifts for this date/shift/machine type.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.3fr', gap: 20 }}>
              {/* LEFT: all Shop Orders for this shift */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 12.5, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Shop Orders -- {shiftLabel}
                </h4>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Machine</th>
                        <th style={thStyle}>Shop Order</th>
                        <th style={thStyle}>Item</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Old Issue Qty</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>New Issue Qty</th>
                        <th style={thStyle}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersComputed.map(o => {
                        const problem = o.missingHeader || o.overRemaining;
                        const isSelected = o.shopOrderNumber === selectedOrderNumber;
                        return (
                          <tr
                            key={o.shopOrderNumber}
                            onClick={() => setSelectedOrderNumber(o.shopOrderNumber)}
                            style={{
                              opacity: o.isClosed ? 0.5 : 1,
                              background: problem ? 'var(--red-soft)' : (isSelected ? 'var(--orange-soft)' : 'transparent'),
                              boxShadow: isSelected ? 'inset 3px 0 0 var(--orange)' : 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <td style={tdStyle}>{o.machineCode}</td>
                            <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontWeight: 700 }}>{o.shopOrderNumber}</td>
                            <td style={tdStyle}>{o.itemCode}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                              {o.oldIssued.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                            </td>
                            <td style={{ ...tdStyle, width: 120 }}>
                              <input
                                type="number" step="0.00001" value={o.newIssueQty}
                                disabled={o.isClosed || o.missingHeader}
                                onChange={e => updateOrderNewIssueQty(o.shopOrderNumber, e.target.value)}
                                onBlur={() => handleHeaderQtyBlur(o)}
                                style={{
                                  ...inputStyle, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700,
                                  borderColor: o.overRemaining ? 'var(--red)' : 'var(--border2)',
                                  background: o.overRemaining ? 'var(--red-soft)' : (o.isClosed || o.missingHeader ? 'var(--soft)' : 'var(--surface)')
                                }}
                              />
                            </td>
                            <td style={{ ...tdStyle, fontSize: 11 }}>
                              {o.isClosed
                                ? <span style={{ color: 'var(--muted)' }}>Closed -- skipped</span>
                                : o.missingHeader
                                ? <span style={{ color: 'var(--red)', fontWeight: 700 }}>No header found</span>
                                : o.overRemaining
                                ? <span style={{ color: 'var(--red)', fontWeight: 700 }} title="Lower this order's New Issue Qty">Only {o.remaining.toLocaleString(undefined, { maximumFractionDigits: 3 })} remaining</span>
                                : <span style={{ color: 'var(--green)' }}>{o.stateDescription || 'Ready'}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {produceResults.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Results</h4>
                    {produceResults.map(r => (
                      <div key={r.shopOrderNumber} style={{
                        fontSize: 12, padding: '5px 10px', borderRadius: 'var(--radius-xs)', marginBottom: 4,
                        background: r.ok ? 'var(--green-soft)' : 'var(--red-soft)', color: r.ok ? 'var(--green)' : 'var(--red)'
                      }}>
                        {r.ok ? '✓' : '✗'} Shop Order {r.shopOrderNumber}{!r.ok && r.message ? ` -- ${r.message}` : ''}{r.trackingNote}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT: per-order Lines tables -- same shape/behavior as
                  ShopOrderProductionDrawer.jsx's single-order Lines table. */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 12.5, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Lines
                </h4>
                {linesLoading ? (
                  <div style={{ fontSize: 13, color: 'var(--hint)' }}>Loading...</div>
                ) : !selectedOrder ? (
                  <div style={{ fontSize: 13, color: 'var(--hint)' }}>Click a Shop Order on the left to view/edit its lines.</div>
                ) : selectedOrder.isClosed || selectedOrder.missingHeader ? (
                  <div style={{ fontSize: 13, color: 'var(--hint)' }}>This order has no lines to show ({selectedOrder.isClosed ? 'already closed' : 'no header found'}).</div>
                ) : (
                  [selectedOrder].map(o => {
                    const lines = orderLines[o.shopOrderNumber] || [];
                    return (
                      <div key={o.shopOrderNumber} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                            Shop Order <span style={{ fontFamily: 'var(--mono)', color: 'var(--orange2)' }}>{o.shopOrderNumber}</span> -- {o.itemCode}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => addLine(o.shopOrderNumber)}
                              title="Issue a raw material not originally on this order's BOM"
                              style={{ padding: '4px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 11.5, cursor: 'pointer' }}
                            >
                              + Add Line
                            </button>
                            <button
                              onClick={handleProduceOne}
                              disabled={producingOne || producing || selectedOrderHasErrors}
                              title={selectedOrderHasErrors ? 'Fix this order\'s Qty/lines first' : 'Issue just this order, then reload the screen'}
                              style={{
                                padding: '4px 12px', borderRadius: 'var(--radius-xs)', border: 'none',
                                background: (producingOne || selectedOrderHasErrors) ? 'var(--hint)' : 'linear-gradient(135deg, var(--green), var(--green))',
                                color: '#fff', fontWeight: 700, fontSize: 11.5,
                                cursor: (producingOne || producing || selectedOrderHasErrors) ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {producingOne ? 'Producing...' : '▶ Produce This Order'}
                            </button>
                          </div>
                        </div>
                        {lines.length === 0 ? (
                          <div style={{ fontSize: 12, color: 'var(--hint)' }}>No lines.</div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={thStyle}>#</th>
                                <th style={thStyle}>Item Code</th>
                                <th style={thStyle}>Description</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Qty Required</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Already Issued</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Balance ({o.warehouse || '—'})</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Issue Now</th>
                                <th style={{ borderBottom: '1px solid var(--border)' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {lines.map((l, idx) => {
                                const short = l.balance !== null && l.balance < Number(l.quantityRequired || 0);
                                const overBalance = l.balance !== null && Number(l.issueNow || 0) > l.balance;
                                return (
                                  <tr key={l.key} style={{ background: idx % 2 === 1 ? 'var(--soft)' : 'transparent' }}>
                                    <td style={tdStyle}>{l.isNew ? <span style={{ color: 'var(--orange2)', fontWeight: 700 }}>new</span> : l.line}</td>
                                    <td style={{ ...tdStyle, minWidth: 160 }}>
                                      {l.isNew ? (
                                        <SearchableSelect
                                          value={l.childItemID}
                                          onChange={(id) => updateNewLineItem(o, idx, id)}
                                          options={itemOptions}
                                          placeholder="Search item..."
                                        />
                                      ) : l.childItemCode}
                                    </td>
                                    <td style={tdStyle}>{l.childItemDescription || '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)', color: l.isNew ? 'var(--hint)' : 'var(--text)' }}>
                                      {l.isNew ? (
                                        <span title="Additional/unplanned issue -- not part of the original BOM requirement">0 (additional)</span>
                                      ) : (
                                        Number(l.quantityRequired || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })
                                      )}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                                      {Number(l.alreadyIssued || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })}
                                    </td>
                                    <td style={{
                                      ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700,
                                      color: l.balance === null ? 'var(--hint)' : (short ? 'var(--red)' : 'var(--green)')
                                    }}>
                                      {l.balance === null ? '—' : l.balance.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                                    </td>
                                    <td style={{ ...tdStyle, width: 120 }}>
                                      <input
                                        type="number" step="0.00001" value={l.issueNow}
                                        onChange={e => updateLineIssueNow(o.shopOrderNumber, idx, e.target.value)}
                                        style={{
                                          ...inputStyle, textAlign: 'right',
                                          borderColor: overBalance ? 'var(--red)' : 'var(--border2)',
                                          background: overBalance ? 'var(--red-soft)' : 'var(--surface)'
                                        }}
                                      />
                                    </td>
                                    <td style={{ ...tdStyle, width: 30 }}>
                                      {l.isNew && (
                                        <button
                                          onClick={() => removeLine(o.shopOrderNumber, idx)}
                                          style={{
                                            background: 'none', border: 'none', color: 'var(--muted)', fontSize: 15, lineHeight: 1,
                                            cursor: 'pointer', width: 22, height: 22, borderRadius: '999px', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center'
                                          }}
                                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-soft)'; e.currentTarget.style.color = 'var(--red)'; }}
                                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)'; }}
                                        >×</button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })
                )}

                {blockingOrderErrors.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--red)', background: 'var(--red-soft)', padding: '8px 12px', borderRadius: 'var(--radius-xs)' }}>
                    {blockingOrderErrors.length} order{blockingOrderErrors.length > 1 ? 's have' : ' has'} a Qty problem (see left grid) -- fix before producing.
                  </div>
                )}
                {overBalanceLines.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)', background: 'var(--red-soft)', padding: '8px 12px', borderRadius: 'var(--radius-xs)' }}>
                    {overBalanceLines.length} line{overBalanceLines.length > 1 ? 's exceed' : ' exceeds'} its available balance -- fix before producing.
                  </div>
                )}
                {newLineMissingItem.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)', background: 'var(--red-soft)', padding: '8px 12px', borderRadius: 'var(--radius-xs)' }}>
                    {newLineMissingItem.length} new line{newLineMissingItem.length > 1 ? 's need' : ' needs'} an item selected -- fix before producing.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--soft)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Close
          </button>
          {loaded && orders.length > 0 && !hasErrors && !linesLoading && includedOrders.length > 0 && (
            <button
              onClick={handleProduce}
              disabled={producing || producingOne}
              style={{
                padding: '8px 24px', borderRadius: 'var(--radius-xs)', border: 'none',
                background: (producing || producingOne) ? 'var(--hint)' : 'linear-gradient(135deg, var(--green), var(--green))',
                color: '#fff', fontWeight: 700, fontSize: 13, cursor: (producing || producingOne) ? 'not-allowed' : 'pointer'
              }}
            >
              {producing ? 'Producing...' : `⚙️ Produce All (${toProduceCount})`}
            </button>
          )}
        </div>
      </div>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1150 }} onClick={() => !producing && !producingOne && onClose()} />
    </>
  );
}
