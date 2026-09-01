import React, { useState, useEffect } from 'react';
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
const thStyle = { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '8px 10px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)' };

export default function FGInquiryModal({ user, onClose }) {
  const [itemOptions, setItemOptions] = useState([]);
  const [planningRows, setPlanningRows] = useState([]);
  const [formulaOptions, setFormulaOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [optionsError, setOptionsError] = useState('');

  const [itemID, setItemID] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [qty, setQty] = useState('');
  const [warehouse, setWarehouse] = useState('');

  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [formulaCode, setFormulaCode] = useState('');
  const [batchQuantity, setBatchQuantity] = useState(0);
  const [batchFactor, setBatchFactor] = useState(0);
  const [effectiveQty, setEffectiveQty] = useState(0);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    apiCall('Item Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setItemOptions((d.List0 || []).map(i => ({
          label: `${i.ItemCode} - ${i.ItemName}`, value: i.ItemID, itemCode: i.ItemCode, itemName: i.ItemName
        })));
      } else {
        setOptionsError(d.Message || 'Failed to load items.');
      }
    }).catch(e => setOptionsError('Failed to load items: ' + e.message));

    apiCall('GetGridData', { PageGroupID: 'planning_item_master' }, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) setPlanningRows(d.List0 || []);
    }).catch(() => {});

    apiCall('Formula Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setFormulaOptions((d.List0 || []).map(f => ({
          value: f.FormulaID, parentItemID: f.ParentItemID, batchQuantity: f.BatchQuantity, formulaCode: f.ParentItemCode
        })));
      }
    }).catch(() => {});

    apiCall('xx', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setWarehouseOptions((d.List0 || []).map(w => ({ label: `${w.Warehouse} - ${w.WarhouseDescription}`, value: w.Warehouse })));
      } else {
        setOptionsError(d.Message || 'Failed to load warehouses.');
      }
    }).catch(e => setOptionsError('Failed to load warehouses: ' + e.message));
  }, [user]);

  const handleItemChange = (id) => {
    setItemID(id);
    const opt = itemOptions.find(o => String(o.value) === String(id));
    setItemCode(opt?.itemCode || '');
    setItemDescription(opt?.itemName || '');
    setSearched(false);
    setLines([]);
    setError('');
  };

  const handleSearch = async () => {
    setError('');
    if (!itemID) { setError('Please select an item.'); return; }
    if (!qty || Number(qty) <= 0) { setError('Please enter a Qty greater than 0.'); return; }
    if (!warehouse) { setError('Please select a warehouse.'); return; }

    const planningRow = planningRows.find(r => String(r.ItemID) === String(itemID));
    const defaultFormulaID = planningRow?.DefaultFormula;
    if (!defaultFormulaID) {
      setError('No Default Formula set for this item in Planning Item Master.');
      return;
    }

    const formula = formulaOptions.find(f => String(f.value) === String(defaultFormulaID));
    const batchQty = Number(formula?.batchQuantity || 0);
    if (batchQty <= 0) {
      setError('The default formula has no Batch Quantity set.');
      return;
    }

    setSearching(true);
    try {
      const d = await apiCall('BOM L1 Formula', { ParentItemCode: itemCode }, { User: user?.Username }, 'plus');
      if (d.State !== 0) { setError(d.Message || 'Failed to load formula lines.'); return; }

      const bomLines = (d.List0 || []).filter(l => String(l.LineFormulaID) === String(defaultFormulaID));
      // Production only runs in whole batches -- Qty is rounded up to the
      // nearest multiple of Batch Qty, and each line's Total Required is
      // recalculated off that whole-batch factor (not a fractional ratio).
      const factor = Math.ceil(Number(qty) / batchQty);

      const balances = await Promise.all(bomLines.map(l =>
        apiCall('GetGridData', { PageGroupID: 'item_balance', fromItem: l.ChildItemCode, toItem: l.ChildItemCode }, { User: user?.Username }, 'plus')
          .then(bd => (bd.State === 0 ? (bd.List0 || []) : []))
          .catch(() => [])
      ));

      setFormulaCode(formula?.formulaCode || '');
      setBatchQuantity(batchQty);
      setBatchFactor(factor);
      setEffectiveQty(factor * batchQty);
      setLines(bomLines.map((l, i) => {
        const match = balances[i].find(b => String(b.Warehouse || '').trim().toUpperCase() === String(warehouse).trim().toUpperCase());
        return {
          line: l.Line, childItemCode: l.ChildItemCode, childItemDescription: l.ChildItemDescription,
          quantityPerBatch: Number(l.Quantity || 0), totalRequired: Number(l.Quantity || 0) * factor,
          balance: match ? Number(match.ItemBalance || 0) : null
        };
      }));
      setSearched(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 920, maxWidth: '95vw', maxHeight: '90vh', background: 'var(--surface)', borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', zIndex: 1200,
        fontFamily: 'var(--font)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 'var(--radius-xs)', background: 'var(--orange-soft)', fontSize: 16
            }}>📦</span>
            FG Inquiry
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
          <div style={{ flex: '1 1 260px', minWidth: 220 }}>
            <label style={labelStyle}>Item</label>
            <SearchableSelect value={itemID} onChange={handleItemChange} options={itemOptions} placeholder="Search item code / description..." />
          </div>
          <div style={{ width: 140 }}>
            <label style={labelStyle}>Qty</label>
            <input type="number" step="0.00001" value={qty} onChange={e => { setQty(e.target.value); setSearched(false); }} style={inputStyle} />
          </div>
          <div style={{ flex: '1 1 200px', minWidth: 180 }}>
            <label style={labelStyle}>Warehouse</label>
            <SearchableSelect value={warehouse} onChange={(v) => { setWarehouse(v); setSearched(false); }} options={warehouseOptions} placeholder="Search warehouse..." />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            style={{
              padding: '9px 22px', borderRadius: 'var(--radius-xs)', border: 'none',
              background: searching ? 'var(--hint)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: searching ? 'not-allowed' : 'pointer'
            }}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: 'var(--bg)' }}>
          {(error || optionsError) && (
            <div style={{
              color: 'var(--red)', background: 'var(--red-soft)', fontSize: 12.5, fontWeight: 600,
              padding: '8px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(220,38,38,0.15)', marginBottom: 16
            }}>
              {error || optionsError}
            </div>
          )}

          {!searched ? (
            <div style={{ fontSize: 13, color: 'var(--hint)', padding: 20, textAlign: 'center' }}>
              Select an item and enter a Qty, then click Search.
            </div>
          ) : lines.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--hint)', padding: 20, textAlign: 'center' }}>
              No BOM lines found for this item's default formula.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                Formula <strong style={{ color: 'var(--text)' }}>{formulaCode}</strong> · Batch Qty {batchQuantity.toLocaleString(undefined, { maximumFractionDigits: 5 })} · {batchFactor} batch{batchFactor > 1 ? 'es' : ''}
              </div>
              {effectiveQty !== Number(qty) && (
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--orange2)', background: 'var(--orange-soft)',
                  padding: '6px 10px', borderRadius: 'var(--radius-xs)', marginBottom: 12, display: 'inline-block'
                }}>
                  Qty must be a whole multiple of Batch Qty -- rounded {Number(qty).toLocaleString(undefined, { maximumFractionDigits: 5 })} up to {effectiveQty.toLocaleString(undefined, { maximumFractionDigits: 5 })} ({batchFactor} × {batchQuantity.toLocaleString(undefined, { maximumFractionDigits: 5 })}).
                </div>
              )}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'auto' }}>
                <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Item Code</th>
                      <th style={thStyle}>Description</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Qty / Batch</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Total Required</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Balance ({warehouse})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map(l => {
                      const short = l.balance !== null && l.balance < l.totalRequired;
                      return (
                        <tr key={l.line}>
                          <td style={tdStyle}>{l.line}</td>
                          <td style={tdStyle}>{l.childItemCode}</td>
                          <td style={tdStyle}>{l.childItemDescription || '—'}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>
                            {l.quantityPerBatch.toLocaleString(undefined, { maximumFractionDigits: 5 })}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                            {l.totalRequired.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                          </td>
                          <td style={{
                            ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700,
                            color: l.balance === null ? 'var(--hint)' : (short ? 'var(--red)' : 'var(--green)')
                          }}>
                            {l.balance === null ? '—' : l.balance.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1150 }} onClick={onClose} />
    </>
  );
}
