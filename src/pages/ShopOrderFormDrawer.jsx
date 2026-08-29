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

// Local (not UTC) YYYY-MM-DD -- toISOString() would shift the date for any
// timezone ahead of UTC (Egypt, UTC+2).
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function ShopOrderFormDrawer({ user, editRow, onClose, onSaveSuccess }) {
  const isEditMode = !!editRow;

  const [itemOptions, setItemOptions] = useState([]);
  const [formulaOptions, setFormulaOptions] = useState([]);
  const [machineOptions, setMachineOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [optionsError, setOptionsError] = useState('');

  const [itemID, setItemID] = useState(editRow?.ParentItemID || '');
  const [itemCode, setItemCode] = useState(editRow?.ParentItemCode || '');
  const [itemDescription, setItemDescription] = useState(editRow?.ItemDescription || '');
  const [formulaID, setFormulaID] = useState(editRow?.FlormulaID || '');
  const [machineID, setMachineID] = useState(editRow?.MachineID || '');
  const [warehouse, setWarehouse] = useState(editRow?.ShopOrderWarehouse || '');
  const [qty, setQty] = useState(editRow?.QuantityRequired ?? '');
  const [shopOrderDate, setShopOrderDate] = useState(editRow?.ShopOrderDate ? editRow.ShopOrderDate.split('T')[0] : toLocalDateStr(new Date()));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

    apiCall('Formula Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setFormulaOptions((d.List0 || []).map(f => ({
          label: `${f.ParentItemCode} (Formula ${f.FormulaID})`, value: f.FormulaID,
          parentItemID: f.ParentItemID, batchQuantity: f.BatchQuantity
        })));
      } else {
        setOptionsError(d.Message || 'Failed to load formulas.');
      }
    }).catch(e => setOptionsError('Failed to load formulas: ' + e.message));

    apiCall('Machine Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setMachineOptions((d.List0 || []).map(m => ({ label: `${m.MachineCode} - ${m.MachineDescription}`, value: m.MachineID })));
      } else {
        setOptionsError(d.Message || 'Failed to load machines.');
      }
    }).catch(e => setOptionsError('Failed to load machines: ' + e.message));

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
    setFormulaID('');
  };

  const itemFormulaOptions = formulaOptions.filter(f => String(f.parentItemID) === String(itemID));
  const selectedFormula = formulaOptions.find(f => String(f.value) === String(formulaID));
  const batchQuantity = Number(selectedFormula?.batchQuantity || 0);
  const factor = batchQuantity > 0 && Number(qty) > 0 ? Number(qty) / batchQuantity : 0;

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!itemID) { setError('Please select an item.'); return; }
    if (!formulaID) { setError('Please select a formula.'); return; }
    if (!machineID) { setError('Please select a machine.'); return; }
    if (!warehouse) { setError('Please select a warehouse.'); return; }
    if (!qty || Number(qty) <= 0) { setError('Please enter a Qty greater than 0.'); return; }
    if (!shopOrderDate) { setError('Please select a date.'); return; }
    if (batchQuantity <= 0) { setError('Selected formula has no Batch Quantity set.'); return; }

    setSaving(true);
    try {
      const res = await apiCall(isEditMode ? 'Edit Shop Order' : 'New Shop Order', {
        ...(isEditMode ? { ShopOrderNo: editRow.ShopOrderNumber } : {}),
        ShopOrderDate: shopOrderDate,
        Warehouse: warehouse,
        // The SP's OPENJSON WITH clause declares these columns as
        // "ParentITemID"/"MAchineID" (typo'd casing) -- OPENJSON's default
        // path matching is case-sensitive on this server, so the JSON keys
        // here must match that exact casing or the values come through NULL.
        ParentITemID: Number(itemID),
        FormulaID: Number(formulaID),
        MAchineID: Number(machineID),
        Qty: Number(qty)
      }, { User: user?.Username }, 'shop_order');

      if (res.State === 0) {
        setSuccess(isEditMode ? 'Shop Order updated successfully!' : 'Shop Order created successfully!');
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

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 560, maxWidth: '95vw',
        background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', zIndex: 1100,
        display: 'flex', flexDirection: 'column', fontFamily: 'var(--font)'
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            {isEditMode ? `Edit Shop Order: ${editRow.ShopOrderNumber}` : 'New Shop Order'}
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
          {(error || optionsError) && (
            <div style={{ padding: 12, background: 'var(--red-soft)', color: 'var(--red)', borderRadius: 'var(--radius-xs)', fontSize: 13, fontWeight: 600 }}>
              {error || optionsError}
            </div>
          )}
          {success && (
            <div style={{ padding: 12, background: 'var(--green-soft)', color: 'var(--green)', borderRadius: 'var(--radius-xs)', fontSize: 13, fontWeight: 600 }}>{success}</div>
          )}

          <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Item</label>
                <SearchableSelect value={itemID} onChange={handleItemChange} options={itemOptions} placeholder="Search item code / description..." disabled={isEditMode} />
              </div>
              <div>
                <label style={labelStyle}>Item Description</label>
                <input value={itemDescription} readOnly style={{ ...inputStyle, background: 'var(--soft)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label style={labelStyle}>Formula</label>
                <SearchableSelect
                  value={formulaID}
                  onChange={setFormulaID}
                  options={itemFormulaOptions}
                  placeholder={itemID ? 'Search formula...' : 'Select an item first'}
                  disabled={!itemID}
                />
                {itemID && itemFormulaOptions.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--hint)', marginTop: 4 }}>No BOM formula found for this item.</div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Batch Qty</label>
                <input value={batchQuantity || '—'} readOnly style={{ ...inputStyle, background: 'var(--soft)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label style={labelStyle}>Machine</label>
                <SearchableSelect value={machineID} onChange={setMachineID} options={machineOptions} placeholder="Search machine..." />
              </div>
              <div>
                <label style={labelStyle}>Warehouse</label>
                <SearchableSelect value={warehouse} onChange={setWarehouse} options={warehouseOptions} placeholder="Search warehouse..." />
              </div>
              <div>
                <label style={labelStyle}>Qty</label>
                <input type="number" step="0.00001" value={qty} onChange={e => setQty(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={shopOrderDate} onChange={e => setShopOrderDate(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {factor > 0 && (
              <div style={{ fontSize: 11.5, color: 'var(--hint)' }}>
                = {factor.toLocaleString(undefined, { maximumFractionDigits: 3 })}x batch factor -- each BOM line's per-batch quantity will be scaled by this.
              </div>
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

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} onClick={onClose} />
    </>
  );
}
