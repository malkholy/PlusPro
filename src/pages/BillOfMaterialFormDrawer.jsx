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

export default function BillOfMaterialFormDrawer({ user, editRow, onClose, onSaveSuccess }) {
  const isEditMode = !!editRow;

  const [itemOptions, setItemOptions] = useState([]);
  const [machineOptions, setMachineOptions] = useState([]);

  const [itemID, setItemID] = useState(editRow?.ParentItemID || '');
  const [itemCode, setItemCode] = useState(editRow?.ParentItemCode || '');
  const [itemDescription, setItemDescription] = useState(editRow?.ItemDescription || '');
  const [machineID, setMachineID] = useState(editRow?.MachineID || '');
  const [batchQuantity, setBatchQuantity] = useState(editRow?.BatchQuantity ?? '');

  const [lines, setLines] = useState([]);
  const [linesLoading, setLinesLoading] = useState(isEditMode);

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
        setError(d.Message || 'Failed to load items.');
      }
    }).catch(e => setError('Failed to load items: ' + e.message));
    apiCall('Machine Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setMachineOptions((d.List0 || []).map(m => ({ label: `${m.MachineCode} - ${m.MachineDescription}`, value: m.MachineID })));
      } else {
        setError(d.Message || 'Failed to load machines.');
      }
    }).catch(e => setError('Failed to load machines: ' + e.message));
  }, [user]);

  useEffect(() => {
    if (!isEditMode) return;
    setLinesLoading(true);
    apiCall('BOM L1 Formula', { ParentItemCode: editRow.ParentItemCode }, { User: user?.Username }, 'plus')
      .then(d => {
        if (d.State === 0) {
          const rows = (d.List0 || []).filter(l => String(l.LineFormulaID) === String(editRow.FormulaID));
          setLines(rows.map(l => ({
            childItemID: l.ChildItemID, childItemCode: l.ChildItemCode, childItemDescription: l.ChildItemDescription,
            quantity: l.Quantity
          })));
        } else {
          setError(d.Message || 'Failed to load BOM lines.');
        }
      })
      .catch(e => setError('Failed to load BOM lines: ' + e.message))
      .finally(() => setLinesLoading(false));
  }, [isEditMode, editRow, user]);

  const addLine = () => setLines(prev => [...prev, { childItemID: '', childItemCode: '', childItemDescription: '', quantity: '' }]);
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));
  const updateLineItem = (idx, id) => {
    const opt = itemOptions.find(o => String(o.value) === String(id));
    setLines(prev => prev.map((l, i) => i === idx ? {
      ...l, childItemID: id, childItemCode: opt?.itemCode || '', childItemDescription: opt?.itemName || ''
    } : l));
  };
  const updateLineQty = (idx, val) => setLines(prev => prev.map((l, i) => i === idx ? { ...l, quantity: val } : l));

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!itemID) { setError('Please select an item.'); return; }
    if (!machineID) { setError('Please select a machine.'); return; }
    if (!batchQuantity || Number(batchQuantity) <= 0) { setError('Please enter a Batch Quantity greater than 0.'); return; }
    if (lines.length === 0) { setError('Add at least one BOM line.'); return; }
    if (lines.some(l => !l.childItemID)) { setError('Every line needs an item selected.'); return; }
    if (lines.some(l => !l.quantity || Number(l.quantity) <= 0)) { setError('Every line needs a quantity greater than 0.'); return; }

    setSaving(true);

    const payload = {
      ...(isEditMode ? { FormulaID: editRow.FormulaID } : {}),
      ParentItemID: Number(itemID),
      MachineID: Number(machineID),
      BatchQuantity: Number(batchQuantity)
    };

    const lineMember = lines.map((l, i) => ({
      Line: i + 1,
      ChildItemID: Number(l.childItemID),
      Quantity: Number(l.quantity)
    }));

    try {
      const res = await apiCall(
        isEditMode ? 'Edit BOM' : 'New BOM',
        payload,
        { User: user?.Username, LineMember: JSON.stringify(lineMember) },
        'bom'
      );
      if (res.State === 0) {
        setSuccess('Saved successfully!');
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

  const thStyle = { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: '1px solid var(--border)' };

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 640, maxWidth: '95vw',
        background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', zIndex: 1100,
        display: 'flex', flexDirection: 'column', fontFamily: 'var(--font)'
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            {isEditMode ? `Edit BOM: ${editRow.ParentItemCode}` : 'New Bill Of Material'}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Item</label>
                <SearchableSelect
                  value={itemID}
                  onChange={(id) => {
                    setItemID(id);
                    const opt = itemOptions.find(o => String(o.value) === String(id));
                    setItemCode(opt?.itemCode || '');
                    setItemDescription(opt?.itemName || '');
                  }}
                  options={itemOptions}
                  placeholder="Search item code / description..."
                  disabled={isEditMode}
                />
              </div>
              <div>
                <label style={labelStyle}>Item Description</label>
                <input value={itemDescription} readOnly style={{ ...inputStyle, background: 'var(--soft)', color: 'var(--muted)' }} />
              </div>
              <div>
                <label style={labelStyle}>Machine</label>
                <SearchableSelect value={machineID} onChange={setMachineID} options={machineOptions} placeholder="Search machine..." />
              </div>
              <div>
                <label style={labelStyle}>Batch Quantity</label>
                <input type="number" step="0.00001" value={batchQuantity} onChange={e => setBatchQuantity(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>BOM Lines</h3>
              <button
                onClick={addLine}
                style={{ padding: '6px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}
              >
                + Add Line
              </button>
            </div>

            {linesLoading ? (
              <div style={{ fontSize: 13, color: 'var(--hint)' }}>Loading...</div>
            ) : lines.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--hint)' }}>No lines yet -- click "Add Line" to add raw materials.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Item</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Qty / Batch</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '8px 6px', fontSize: 13, color: 'var(--muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 6px', minWidth: 220 }}>
                        <SearchableSelect
                          value={l.childItemID}
                          onChange={(id) => updateLineItem(idx, id)}
                          options={itemOptions}
                          placeholder="Search item..."
                        />
                      </td>
                      <td style={{ padding: '8px 6px', width: 120 }}>
                        <input
                          type="number" step="0.00001" value={l.quantity}
                          onChange={e => updateLineQty(idx, e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right' }}
                        />
                      </td>
                      <td style={{ padding: '8px 6px', width: 40 }}>
                        <button
                          onClick={() => removeLine(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 16, cursor: 'pointer' }}
                        >×</button>
                      </td>
                    </tr>
                  ))}
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

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} onClick={onClose} />
    </>
  );
}
