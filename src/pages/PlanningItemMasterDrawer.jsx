import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';

const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 };

export default function PlanningItemMasterDrawer({ user, editRow, onClose, onSaveSuccess }) {
  const isEditMode = !!editRow;

  const [itemOptions, setItemOptions] = useState([]);
  const [itemID, setItemID] = useState(editRow?.ItemID || '');
  const [itemCode, setItemCode] = useState(editRow?.ItemCode || '');
  const [itemType, setItemType] = useState(editRow?.ItemType || '');
  const [itemDescription, setItemDescription] = useState(editRow?.ItemDescription || '');
  const [defaultMachine, setDefaultMachine] = useState(editRow?.DefaultMachine ?? '');
  const [defaultFormula, setDefaultFormula] = useState(editRow?.DefaultFormula ?? '');
  const [saftyStock, setSaftyStock] = useState(editRow?.SaftyStock ?? '');
  const [leadTime, setLeadTime] = useState(editRow?.LeadTime ?? '');
  const [netWeight, setNetWeight] = useState(editRow?.NetWeight ?? '');
  const [colorName, setColorName] = useState(editRow?.ColorName || '');
  const [colorPriority, setColorPriority] = useState(editRow?.ColorPriority ?? '');
  const [producationTime, setProducationTime] = useState(editRow?.ProducationTime ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiCall('Item Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setItemOptions((d.List0 || []).map(i => ({
          label: `${i.ItemCode} - ${i.ItemName}`,
          value: i.ItemID,
          itemCode: i.ItemCode,
          itemType: i.ItemType,
          itemName: i.ItemName
        })));
      }
    });
  }, [user]);

  const handleItemChange = (id) => {
    setItemID(id);
    const opt = itemOptions.find(o => String(o.value) === String(id));
    if (opt) {
      setItemCode(opt.itemCode || '');
      setItemType(opt.itemType || '');
      setItemDescription(opt.itemName || '');
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!itemID) {
      setError('Please select an item.');
      return;
    }

    setSaving(true);

    const payload = {
      ID: isEditMode ? editRow.ID : 0,
      ItemID: Number(itemID),
      ItemCode: itemCode,
      ItemType: itemType,
      DefaultMachine: defaultMachine === '' ? 0 : Number(defaultMachine),
      DefaultFormula: defaultFormula === '' ? 0 : Number(defaultFormula),
      SaftyStock: saftyStock === '' ? 0 : Number(saftyStock),
      LeadTime: leadTime === '' ? 0 : Number(leadTime),
      NetWeight: netWeight === '' ? 0 : Number(netWeight),
      ColorName: colorName,
      ColorPriority: colorPriority === '' ? 0 : Number(colorPriority),
      ProducationTime: producationTime === '' ? 0 : Number(producationTime)
    };

    try {
      const res = await apiCall(
        isEditMode ? 'Edit Item Planning' : 'New Item Planning',
        payload,
        { User: user?.Username },
        'planning'
      );
      if (res.State === 0) {
        setSuccess('Saved successfully!');
        setTimeout(() => {
          onSaveSuccess();
          onClose();
        }, 700);
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
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '520px', backgroundColor: '#fff', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>
            {isEditMode ? `Edit Planning Item: ${editRow.ItemCode}` : 'New Planning Item'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748B' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, backgroundColor: '#F8FAFC' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {error && <div style={{ padding: 12, backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 6, fontSize: 14 }}>{error}</div>}
            {success && <div style={{ padding: 12, backgroundColor: '#DCFCE7', color: '#15803D', borderRadius: 6, fontSize: 14 }}>{success}</div>}

            <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#334155' }}>Item</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Item</label>
                  <SearchableSelect
                    value={itemID}
                    onChange={handleItemChange}
                    options={itemOptions}
                    placeholder="Search item code / description..."
                    disabled={isEditMode}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Item Code</label>
                    <input value={itemCode} readOnly style={{ ...inputStyle, background: '#F1F5F9', color: '#64748B' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Item Type</label>
                    <input value={itemType} readOnly style={{ ...inputStyle, background: '#F1F5F9', color: '#64748B' }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Item Description</label>
                  <input value={itemDescription} readOnly style={{ ...inputStyle, background: '#F1F5F9', color: '#64748B' }} />
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#334155' }}>Planning Defaults</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Default Machine</label>
                  <input type="number" value={defaultMachine} onChange={e => setDefaultMachine(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Default Formula</label>
                  <input type="number" value={defaultFormula} onChange={e => setDefaultFormula(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Safety Stock</label>
                  <input type="number" value={saftyStock} onChange={e => setSaftyStock(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Lead Time (days)</label>
                  <input type="number" value={leadTime} onChange={e => setLeadTime(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Net Weight</label>
                  <input type="number" step="0.00001" value={netWeight} onChange={e => setNetWeight(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Production Time</label>
                  <input type="number" value={producationTime} onChange={e => setProducationTime(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Color Name</label>
                  <input value={colorName} onChange={e => setColorName(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Color Priority</label>
                  <input type="number" value={colorPriority} onChange={e => setColorPriority(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', backgroundColor: '#fff', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#fff', color: '#475569', fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '8px 24px', borderRadius: 6, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }} onClick={onClose} />
    </>
  );
}
