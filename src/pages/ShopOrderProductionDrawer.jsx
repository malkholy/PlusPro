import React, { useState, useEffect, useRef } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: 0.4
};
const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid var(--border2)', borderRadius: 'var(--radius-xs)',
  boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 13
};
const readOnlyBoxStyle = {
  ...inputStyle, background: 'var(--soft)', color: 'var(--muted)', display: 'flex', alignItems: 'center', minHeight: 36, boxSizing: 'border-box'
};
const thStyle = { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '8px 10px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)' };

function StateBadge({ state, description }) {
  const n = Number(state);
  const isDraft = n === 0;
  const isIssued = n === 10;
  const label = description || (isDraft ? 'New' : isIssued ? 'Issued' : `State ${n}`);
  const color = isDraft ? 'var(--muted)' : isIssued ? 'var(--green, #16a34a)' : 'var(--orange2)';
  const bg = isDraft ? 'var(--border)' : isIssued ? 'var(--green-soft, rgba(22,163,74,0.12))' : 'var(--orange-soft)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999,
      background: bg, color, fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}

export default function ShopOrderProductionDrawer({ user, row, onClose, onSaveSuccess, initialIssuedQty, linkedShiftPlanID }) {
  // Issued Qty is the amount for THIS release, added on top of whatever was
  // already issued (Qty Issued = Old Qty Issued + New) -- not a replacement
  // of the running total. Defaults to a "produce it all" starting point --
  // still fully editable for a partial release.
  //
  // Prefers initialIssuedQty (the specific shift SLOT's own Planned Qty,
  // passed in when opened from one slot on Show Plan -- a Shop Order can
  // span multiple slots/shifts, each with its own smaller Planned Qty, so
  // the order's overall QuantityRequired would be the wrong default there).
  // Falls back to the order's QuantityRequired when opened with no specific
  // slot in mind (e.g. from the Shop Orders grid).
  const defaultIssuedQty = Number(initialIssuedQty) > 0
    ? Number(initialIssuedQty)
    : (Number(row.QuantityRequired) > 0 ? Number(row.QuantityRequired) : '');
  const [issuedQty, setIssuedQty] = useState(defaultIssuedQty);
  const [lines, setLines] = useState([]);
  const [linesLoading, setLinesLoading] = useState(true);
  const [itemOptions, setItemOptions] = useState([]);
  const newLineKeyRef = useRef(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiCall('Item Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setItemOptions((d.List0 || []).map(i => ({
          label: `${i.ItemCode} - ${i.ItemName}`, value: i.ItemID, itemCode: i.ItemCode, itemName: i.ItemName
        })));
      }
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    setLinesLoading(true);
    apiCall('Shop Order Lines', { param1: row.ShopOrderNumber }, { User: user?.Username }, 'lookup')
      .then(async d => {
        if (cancelled) return;
        if (d.State !== 0) {
          setError(d.Message || 'Failed to load lines.');
          return;
        }
        const rawLines = d.List0 || [];

        const balances = await Promise.all(rawLines.map(l =>
          apiCall('GetGridData', { PageGroupID: 'item_balance', fromItem: l.ChildItemCode, toItem: l.ChildItemCode }, { User: user?.Username }, 'plus')
            .then(bd => (bd.State === 0 ? (bd.List0 || []) : []))
            .catch(() => [])
        ));
        if (cancelled) return;

        // Same proportional split as handleIssuedQtyBlur, applied up front
        // so the lines match the header's own default Issue Now.
        const required = Number(row.QuantityRequired || 0);
        const defaultFactor = required > 0 && defaultIssuedQty !== '' ? Number(defaultIssuedQty) / required : 0;

        setLines(rawLines.map((l, i) => {
          const match = balances[i].find(b => String(b.Warehouse || '').trim().toUpperCase() === String(row.ShopOrderWarehouse || '').trim().toUpperCase());
          return {
            key: `existing-${l.Line}`, isNew: false, line: l.Line,
            childItemID: l.ChildItemID, childItemCode: l.ChildItemCode, childItemDescription: l.ItemDescription,
            quantityRequired: l.ChildQuantityRequired, alreadyIssued: l.ChildQuantityIssued,
            quantityIssued: defaultFactor > 0 ? Number(l.ChildQuantityRequired || 0) * defaultFactor : '',
            balance: match ? Number(match.ItemBalance || 0) : null
          };
        }));
      })
      .catch(e => { if (!cancelled) setError('Failed to load lines: ' + e.message); })
      .finally(() => { if (!cancelled) setLinesLoading(false); });
    return () => { cancelled = true; };
  }, [row.ShopOrderNumber, row.ShopOrderWarehouse, user]);

  const updateLineIssued = (idx, val) => setLines(prev => prev.map((l, i) => i === idx ? { ...l, quantityIssued: val } : l));

  // Lets a raw material not originally on the order's BOM be issued too --
  // Line: null tells Issue Shop Order to insert it as a brand-new line
  // rather than update an existing one. Required Qty is always 0 -- these
  // are additional/unplanned issues, not a new BOM requirement.
  const addLine = () => {
    newLineKeyRef.current -= 1;
    setLines(prev => [...prev, {
      key: `new-${newLineKeyRef.current}`, isNew: true, line: null,
      childItemID: '', childItemCode: '', childItemDescription: '',
      quantityRequired: 0, alreadyIssued: 0, quantityIssued: '', balance: null
    }]);
  };
  // Only newly-added lines (never saved, so never issued) can be removed --
  // a line that already has Issued Qty can't be deleted.
  const removeLine = (idx) => {
    const target = lines[idx];
    if (!target || !target.isNew || Number(target.alreadyIssued || 0) > 0) {
      setError('Only newly-added lines with no issued quantity can be removed.');
      return;
    }
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  const updateNewLineItem = async (idx, itemID) => {
    const alreadyOnOrder = lines.some((l, i) => i !== idx && String(l.childItemID) === String(itemID));
    if (alreadyOnOrder) {
      setError('This item is already on the lines for this order.');
      return;
    }
    setError('');
    const opt = itemOptions.find(o => String(o.value) === String(itemID));
    setLines(prev => prev.map((l, i) => i === idx ? {
      ...l, childItemID: itemID, childItemCode: opt?.itemCode || '', childItemDescription: opt?.itemName || '', balance: null
    } : l));
    if (!opt) return;
    try {
      const bd = await apiCall('GetGridData', { PageGroupID: 'item_balance', fromItem: opt.itemCode, toItem: opt.itemCode }, { User: user?.Username }, 'plus');
      if (bd.State !== 0) return;
      const match = (bd.List0 || []).find(b => String(b.Warehouse || '').trim().toUpperCase() === String(row.ShopOrderWarehouse || '').trim().toUpperCase());
      setLines(prev => prev.map((l, i) => i === idx ? { ...l, balance: match ? Number(match.ItemBalance || 0) : null } : l));
    } catch {
      // leave balance null -- not shown as short/over, just unknown
    }
  };

  // Defaults every line's release amount to the same proportion of its Qty
  // Required as the header's release amount is of the header's Qty Required
  // -- just a starting point, each line can still be edited afterward.
  const handleIssuedQtyBlur = () => {
    const required = Number(row.QuantityRequired || 0);
    const issued = Number(issuedQty || 0);
    if (required <= 0 || !issuedQty) return;
    const factor = issued / required;
    setLines(prev => prev.map(l => ({ ...l, quantityIssued: Number(l.quantityRequired || 0) * factor })));
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (issuedQty === '' || Number(issuedQty) < 0) { setError('Please enter a valid Issue Now quantity.'); return; }
    if (lines.some(l => l.isNew && !l.childItemID)) { setError('Every new line needs an item selected.'); return; }
    if (lines.some(l => l.quantityIssued !== '' && l.quantityIssued != null && Number(l.quantityIssued) < 0)) {
      setError('Line issued quantities cannot be negative.');
      return;
    }
    const overBalance = lines.find(l => l.balance !== null && Number(l.quantityIssued || 0) > l.balance);
    if (overBalance) {
      setError(`Cannot issue ${Number(overBalance.quantityIssued).toLocaleString(undefined, { maximumFractionDigits: 3 })} of ${overBalance.childItemCode} -- only ${overBalance.balance.toLocaleString(undefined, { maximumFractionDigits: 3 })} available in stock.`);
      return;
    }

    setSaving(true);
    try {
      const lineMember = lines.map(l => l.isNew ? {
        Line: null,
        ChildItemID: Number(l.childItemID),
        ChildQuantityRequired: Number(l.quantityRequired || 0),
        ChildIssued: Number(l.quantityIssued || 0)
      } : {
        Line: l.line,
        ChildIssued: Number(l.quantityIssued || 0)
      });

      const res = await apiCall('Issue Shop Order', {
        ShopOrderNo: row.ShopOrderNumber,
        IssuedQty: Number(issuedQty)
      }, {
        User: user?.Username,
        LineMember: JSON.stringify(lineMember)
      }, 'shop_order');

      if (res.State === 0) {
        // Link this release back to the specific shift-plan slot this
        // Production form was opened from (Show Plan's right-click
        // "▶ Produce"), so the calendar's per-slot Issued Qty reflects it
        // too -- tracking-only, so a failure here doesn't block the real
        // issue that already succeeded, just gets appended to the message.
        let trackingNote = '';
        if (linkedShiftPlanID) {
          const trackRes = await apiCall('Update Shift Plan Issued Qty', null, {
            User: user?.Username,
            LineMember: JSON.stringify([{ ShiftPlanID: linkedShiftPlanID, Delta: Number(issuedQty) }])
          }, 'planning');
          if (trackRes.State !== 0) trackingNote = ` (slot tracking failed: ${trackRes.Message || 'unknown error'})`;
        }
        setSuccess(`Production issue saved successfully!${trackingNote}`);
        setTimeout(() => { onSaveSuccess(); onClose(); }, 700);
      } else {
        setError(res.Message || 'Failed to save.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const required = Number(row.QuantityRequired || 0);
  const alreadyIssued = Number(row.QuantiftyIssued || 0);
  const newTotal = alreadyIssued + Number(issuedQty || 0);
  const pct = required > 0 ? Math.min(100, (newTotal / required) * 100) : 0;

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 900, maxWidth: '95vw',
        background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', zIndex: 1150,
        display: 'flex', flexDirection: 'column', fontFamily: 'var(--font)'
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 'var(--radius-xs)', background: 'var(--orange-soft)', fontSize: 16
            }}>🏭</span>
            Production: Shop Order {row.ShopOrderNumber}
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

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ padding: 12, background: 'var(--red-soft)', color: 'var(--red)', borderRadius: 'var(--radius-xs)', fontSize: 13, fontWeight: 600 }}>{error}</div>
          )}
          {success && (
            <div style={{ padding: 12, background: 'var(--green-soft)', color: 'var(--green)', borderRadius: 'var(--radius-xs)', fontSize: 13, fontWeight: 600 }}>{success}</div>
          )}

          <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: 13, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>📋 Order Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div>
                <label style={labelStyle}>Item Code</label>
                <input value={row.ParentItemCode || '—'} readOnly style={{ ...inputStyle, background: 'var(--soft)', color: 'var(--muted)' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Description</label>
                <input value={row.ItemDescription || '—'} readOnly style={{ ...inputStyle, background: 'var(--soft)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label style={labelStyle}>State</label>
                <div style={readOnlyBoxStyle}><StateBadge state={row.OrderState} description={row.StateDescription} /></div>
              </div>
              <div>
                <label style={labelStyle}>Date</label>
                <input value={row.ShopOrderDate ? row.ShopOrderDate.split('T')[0] : '—'} readOnly style={{ ...inputStyle, background: 'var(--soft)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label style={labelStyle}>Warehouse</label>
                <input value={row.ShopOrderWarehouse || '—'} readOnly style={{ ...inputStyle, background: 'var(--soft)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label style={labelStyle}>Machine</label>
                <input value={row.MachineCode || '—'} readOnly style={{ ...inputStyle, background: 'var(--soft)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label style={labelStyle}>Formula</label>
                <input value={row.FormulaCode || '—'} readOnly style={{ ...inputStyle, background: 'var(--soft)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label style={labelStyle}>Shift</label>
                <input value={row.ShiftID ?? '—'} readOnly style={{ ...inputStyle, background: 'var(--soft)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label style={labelStyle}>Created By</label>
                <input value={row.OrderCreatedBy || '—'} readOnly style={{ ...inputStyle, background: 'var(--soft)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label style={labelStyle}>Created Date</label>
                <input value={row.OrderCreatedDate ? row.OrderCreatedDate.split('T')[0] : '—'} readOnly style={{ ...inputStyle, background: 'var(--soft)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label style={labelStyle}>Qty Required</label>
                <input value={required.toLocaleString(undefined, { maximumFractionDigits: 5 })} readOnly style={{ ...inputStyle, background: 'var(--soft)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label style={labelStyle}>Already Issued</label>
                <input value={alreadyIssued.toLocaleString(undefined, { maximumFractionDigits: 5 })} readOnly style={{ ...inputStyle, background: 'var(--soft)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label style={labelStyle}>Issue Now (this release)</label>
                <input
                  type="number" step="0.00001" value={issuedQty}
                  onChange={e => setIssuedQty(e.target.value)}
                  onBlur={handleIssuedQtyBlur}
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: 'span 4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label style={labelStyle}>Progress After This Release</label>
                  <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 100 ? 'var(--green, #16a34a)' : 'var(--muted)' }}>
                    {newTotal.toLocaleString(undefined, { maximumFractionDigits: 5 })} / {required.toLocaleString(undefined, { maximumFractionDigits: 5 })} ({pct.toFixed(0)}%)
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--border)', overflow: 'hidden', marginTop: 6 }}>
                  <div style={{
                    height: '100%', width: `${pct}%`, borderRadius: 999, transition: 'width 0.15s ease',
                    background: pct >= 100 ? 'var(--green, #16a34a)' : 'linear-gradient(135deg, var(--orange), var(--orange2))'
                  }} />
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Number Of Released</label>
                <div style={readOnlyBoxStyle}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 999,
                    background: 'var(--orange-soft)', color: 'var(--orange2)', fontSize: 12, fontWeight: 800, marginRight: 8
                  }}>
                    {Number(row.NumberOfReleases || 0)}
                  </span>
                  <span style={{ fontSize: 12 }}>saving now will be release #{Number(row.NumberOfReleases || 0) + 1}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>📦 Lines</h3>
                {lines.length > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 999,
                    background: 'var(--soft)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 11, fontWeight: 700
                  }}>
                    {lines.length}
                  </span>
                )}
              </div>
              <button
                onClick={addLine}
                title="Issue a raw material not originally on this order's BOM"
                style={{ padding: '6px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}
              >
                + Add Line
              </button>
            </div>
            {linesLoading ? (
              <div style={{ fontSize: 13, color: 'var(--hint)' }}>Loading...</div>
            ) : lines.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--hint)' }}>No lines yet -- click "Add Line" to issue a raw material.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Item Code</th>
                    <th style={thStyle}>Description</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Qty Required</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Already Issued</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Balance ({row.ShopOrderWarehouse || '—'})</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Issue Now</th>
                    <th style={{ borderBottom: '1px solid var(--border)' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => {
                    const short = l.balance !== null && l.balance < Number(l.quantityRequired || 0);
                    const overBalance = l.balance !== null && Number(l.quantityIssued || 0) > l.balance;
                    return (
                      <tr key={l.key} style={{ background: idx % 2 === 1 ? 'var(--soft)' : 'transparent' }}>
                        <td style={tdStyle}>{l.isNew ? <span style={{ color: 'var(--orange2)', fontWeight: 700 }}>new</span> : l.line}</td>
                        <td style={{ ...tdStyle, minWidth: 200 }}>
                          {l.isNew ? (
                            <SearchableSelect
                              value={l.childItemID}
                              onChange={(id) => updateNewLineItem(idx, id)}
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
                        <td style={{ ...tdStyle, width: 140 }}>
                          <input
                            type="number" step="0.00001" value={l.quantityIssued}
                            onChange={e => updateLineIssued(idx, e.target.value)}
                            style={{
                              ...inputStyle, textAlign: 'right',
                              borderColor: overBalance ? 'var(--red)' : 'var(--border2)',
                              background: overBalance ? 'var(--red-soft)' : 'var(--surface)'
                            }}
                          />
                        </td>
                        <td style={{ ...tdStyle, width: 40 }}>
                          {l.isNew && (
                            <button
                              onClick={() => removeLine(idx)}
                              style={{
                                background: 'none', border: 'none', color: 'var(--muted)', fontSize: 16, lineHeight: 1,
                                cursor: 'pointer', width: 26, height: 26, borderRadius: '999px', display: 'flex',
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
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 22px', borderRadius: 'var(--radius-xs)', border: 'none',
              background: saving ? 'var(--hint)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100 }} onClick={onClose} />
    </>
  );
}
