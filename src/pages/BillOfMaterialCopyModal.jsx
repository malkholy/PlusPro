import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: 0.4
};

export default function BillOfMaterialCopyModal({ user, row, onClose, onSuccess }) {
  const [itemOptions, setItemOptions] = useState([]);
  const [targetItemID, setTargetItemID] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiCall('Item Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setItemOptions((d.List0 || [])
          .filter(i => String(i.ItemID) !== String(row.ParentItemID))
          .map(i => ({ label: `${i.ItemCode} - ${i.ItemName}`, value: i.ItemID })));
      }
    });
  }, [user, row.ParentItemID]);

  const handleCopy = async () => {
    setError('');
    if (!targetItemID) { setError('Please select a target item.'); return; }
    setSaving(true);
    try {
      const res = await apiCall('Copy BOM', { SourceFormulaID: row.FormulaID, TargetItemID: Number(targetItemID) }, { User: user?.Username }, 'bom');
      if (res.State === 0) {
        onSuccess();
      } else {
        setError(res.Message || 'Failed to copy.');
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
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 440, maxWidth: '92vw', background: 'var(--surface)', borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', zIndex: 1200,
        fontFamily: 'var(--font)', overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Copy Bill Of Material</h3>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Copying <strong>{row.ParentItemCode}</strong> (Formula {row.FormulaID}) -- Machine, Batch Qty, and all lines carry over unchanged.
          </div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{
              color: 'var(--red)', background: 'var(--red-soft)', fontSize: 12.5, fontWeight: 600,
              padding: '8px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(220,38,38,0.15)'
            }}>
              {error}
            </div>
          )}
          <div>
            <label style={labelStyle}>Target Item</label>
            <SearchableSelect
              value={targetItemID}
              onChange={setTargetItemID}
              options={itemOptions}
              placeholder="Search item code / description..."
            />
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--soft)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)',
              background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            disabled={saving}
            style={{
              padding: '8px 20px', borderRadius: 'var(--radius-xs)', border: 'none',
              background: saving ? 'var(--hint)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Copying...' : 'Copy'}
          </button>
        </div>
      </div>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1150 }} onClick={() => !saving && onClose()} />
    </>
  );
}
