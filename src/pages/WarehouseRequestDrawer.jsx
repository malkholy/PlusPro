import { useState, useEffect, useRef } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';

const EMPTY_LINE = { ItemID: '', ItemCode: '', ItemDescription: '', Lot: '', Qty: '', OnHand: null, LotControl: 0, SellingConversion: 1 };

// Known RequestState values from APIPlusWarehouseRequestOperation.sql (New Request -> 0,
// Transfer Request -> 10, Recieve Request -> 20, Delete Request -> 99). Falls back to the
// raw number if unmapped.
const STATE_LABELS = { 0: 'Open', 10: 'Transferred', 20: 'Received', 99: 'Deleted' };

// This SP sometimes has incidental debug SELECTs mixed in with the real result sets
// (already found and removed one in Transfer Request), which shifts which List index
// (List0, List1, ...) actually holds the RequestNo/RequestState row. Rather than assume
// a fixed position, scan every returned list for the one that actually has RequestState.
function findRequestRow(res) {
  for (const key of Object.keys(res || {})) {
    if (/^List\d+$/.test(key) && Array.isArray(res[key]) && res[key][0] && 'RequestState' in res[key][0]) {
      return res[key][0];
    }
  }
  return null;
}

export default function WarehouseRequestDrawer({ user, onClose, onSaved, request }) {
  const [requestDate, setRequestDate] = useState(() => request?.RequestDate ? request.RequestDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [fromWarehouse, setFromWarehouse] = useState(request?.RequestedWarehouse || '');
  const [toWarehouse, setToWarehouse] = useState(request?.ToWarehouse || '');
  const [note, setNote] = useState(request?.Note || '');
  const [requestType, setRequestType] = useState(request?.RequestType != null ? String(request.RequestType) : '');
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);

  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);
  const [requestTypeOptions, setRequestTypeOptions] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Post-save state: once saved, the drawer stays open in a read-only "view" mode
  // showing the saved request (via the Transfer Request Line Detail query), with
  // an Edit button to resume editing while the request is still open (state 0).
  // Opening an existing request (double-click from the grid) starts directly in
  // this same view mode instead of the blank "New Request" form.
  const [savedRequestNo, setSavedRequestNo] = useState(request?.RequestNo ?? null);
  const [requestState, setRequestState] = useState(request?.RequestState ?? null);
  const [editing, setEditing] = useState(!request);
  const [detailLines, setDetailLines] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [opening, setOpening] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [receiving, setReceiving] = useState(false);

  useEffect(() => {
    if (request?.RequestNo) fetchDetailLines(request.RequestNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tracks whether the request is currently Open-locked (via the SP's Open/Close
  // operations), so we can release it on unmount even if the user closes the
  // drawer via the × button instead of the footer Close button.
  const lockedRef = useRef(false);
  useEffect(() => {
    return () => {
      if (lockedRef.current && savedRequestNo) {
        apiCall('Close', savedRequestNo, {}, 'warehouse_request').catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    apiCall('xx', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setWarehouseOptions((d.List0 || []).map(w => ({ label: `${w.Warehouse} - ${w.WarhouseDescription}`, value: w.Warehouse })));
      }
    });
    apiCall('Item Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setItemOptions((d.List0 || []).map(i => ({ label: `${i.ItemCode} - ${i.ItemName}`, value: i.ItemID, itemCode: i.ItemCode, itemName: i.ItemName, lotControl: Number(i.LotControl) || 0, sellingConversion: Number(i.SellingConversion) || 1 })));
      }
    });
    apiCall('xxxx', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        const opts = (d.List0 || []).map(t => ({ label: t.TypeDescription, value: t.RequestType }));
        setRequestTypeOptions(opts);
        setRequestType(prev => prev || (opts[0]?.value ?? ''));
      }
    });
  }, [user]);

  function addLine() {
    setLines(prev => [...prev, { ...EMPTY_LINE }]);
  }

  function removeLine(index) {
    setLines(prev => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(index, itemID) {
    const opt = itemOptions.find(o => String(o.value) === String(itemID));
    const lotControl = opt?.lotControl || 0;
    setLines(prev => prev.map((l, i) => i === index
      ? { ...l, ItemID: itemID, ItemCode: opt?.itemCode || '', ItemDescription: opt?.itemName || '', OnHand: null, LotControl: lotControl, SellingConversion: opt?.sellingConversion || 1, Lot: lotControl === 0 ? '' : l.Lot }
      : l
    ));
    fetchOnHand(index, itemID, lotControl === 0 ? '' : (lines[index]?.Lot || ''));
  }

  function updateLineField(index, field, value) {
    setLines(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  }

  async function fetchOnHand(index, itemID, lot) {
    if (!itemID || !fromWarehouse) return;
    try {
      const res = await apiCall('On Hand', [{ itemid: Number(itemID), lotnumber: lot || '', warehouse: fromWarehouse }], {}, 'warehouse_request');
      // Note: this SP's 'On Hand' block never sets @State, so it comes back as null
      // rather than 0 -- read the balance directly from List0 instead of gating on State.
      const onHand = Number((res.List0 || [])[0]?.Onhand) || 0;
      setLines(prev => prev.map((l, i) => i === index ? { ...l, OnHand: onHand } : l));
    } catch {
      setLines(prev => prev.map((l, i) => i === index ? { ...l, OnHand: 0 } : l));
    }
  }

  useEffect(() => {
    lines.forEach((l, i) => {
      if (l.ItemID) fetchOnHand(i, l.ItemID, l.Lot);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromWarehouse]);

  async function fetchDetailLines(requestNo) {
    setLoadingDetail(true);
    try {
      const res = await apiCall('GetGridData', { PageGroupID: 'warehouse_transfer_lines', requestNo }, {}, 'plus');
      if (res.State === 0) setDetailLines(res.List0 || []);
    } catch {
      // non-fatal: the drawer still shows the save succeeded, just without the detail table
    }
    setLoadingDetail(false);
  }

  async function handleEditClick() {
    setError(null);
    setOpening(true);
    try {
      const res = await apiCall('Open', savedRequestNo, {}, 'warehouse_request');
      if (res.Message) {
        setError(res.Message);
        setOpening(false);
        return;
      }
      lockedRef.current = true;
    } catch (err) {
      setError('Connection error: ' + err.message);
      setOpening(false);
      return;
    }
    setOpening(false);

    const rehydrated = detailLines.map(d => {
      const opt = itemOptions.find(o => String(o.value) === String(d.ItemID));
      return {
        ItemID: d.ItemID,
        ItemCode: d.ItemCode,
        ItemDescription: d.ItemDescription,
        Lot: '',
        Qty: d.QuantityRequested,
        OnHand: null,
        LotControl: opt?.lotControl || 0,
        SellingConversion: d.SellingConversion || opt?.sellingConversion || 1
      };
    });
    setLines(rehydrated.length ? rehydrated : [{ ...EMPTY_LINE }]);
    setEditing(true);
    setJustSaved(false);
    rehydrated.forEach((l, i) => { if (l.ItemID) fetchOnHand(i, l.ItemID, l.Lot); });
  }

  async function handleCloseClick() {
    if (lockedRef.current && savedRequestNo) {
      try {
        await apiCall('Close', savedRequestNo, {}, 'warehouse_request');
      } catch {
        // non-fatal: closing the drawer regardless
      }
      lockedRef.current = false;
    }
    onClose();
  }

  async function handleTransferClick() {
    setError(null);
    setJustSaved(false);
    setTransferring(true);
    try {
      const res = await apiCall('Transfer Request', savedRequestNo, {}, 'warehouse_request');
      if (res.State === 0) {
        const row = findRequestRow(res);
        setRequestState(row?.RequestState ?? requestState);
        onSaved();
        await fetchDetailLines(savedRequestNo);
      } else {
        setError(res.Message || 'Failed to transfer request');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setTransferring(false);
  }

  async function handleReceiveClick() {
    setError(null);
    setJustSaved(false);
    setReceiving(true);
    try {
      const res = await apiCall('Recieve Request', savedRequestNo, {}, 'warehouse_request');
      if (res.State === 0) {
        const row = findRequestRow(res);
        setRequestState(row?.RequestState ?? requestState);
        onSaved();
        await fetchDetailLines(savedRequestNo);
      } else {
        setError(res.Message || 'Failed to receive request');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setReceiving(false);
  }

  async function handleSave() {
    setError(null);

    if (!fromWarehouse || !toWarehouse) {
      setError('From Warehouse and To Warehouse are required.');
      return;
    }

    const itemLines = lines.filter(l => l.ItemID);
    if (itemLines.length === 0) {
      setError('Add at least one line with an Item selected.');
      return;
    }

    const zeroQtyLines = itemLines.filter(l => !(Number(l.Qty) > 0));
    if (zeroQtyLines.length > 0) {
      setError(`Cannot save: item(s) ${zeroQtyLines.map(l => l.ItemCode).join(', ')} have Qty = 0.`);
      return;
    }

    const overLines = itemLines.filter(l => Number(l.Qty) > (Number(l.OnHand) || 0));
    if (overLines.length > 0) {
      setError(`Cannot save: item(s) ${overLines.map(l => l.ItemCode).join(', ')} have Qty exceeding On Hand.`);
      return;
    }

    const missingLotLines = itemLines.filter(l => l.LotControl === 1 && !l.Lot.trim());
    if (missingLotLines.length > 0) {
      setError(`Cannot save: item(s) ${missingLotLines.map(l => l.ItemCode).join(', ')} require a Lot.`);
      return;
    }

    const isEdit = !!savedRequestNo;
    const payload = itemLines.map((l, idx) => ({
      line: idx + 1,
      itemid: Number(l.ItemID),
      lotnumber: l.Lot || '',
      qty: Number(l.Qty),
      requestdate: requestDate,
      requestedwarehouse: fromWarehouse,
      towarehouse: toWarehouse,
      requesttype: Number(requestType) || 1,
      note: note || '',
      ...(isEdit ? { requestno: savedRequestNo } : {})
    }));

    setSaving(true);
    try {
      const res = await apiCall(isEdit ? 'Edit Request' : 'New Request', payload, {}, 'warehouse_request');
      if (res.State === 0) {
        const row = findRequestRow(res);
        const rn = row?.RequestNo ?? savedRequestNo;
        if (isEdit && lockedRef.current) {
          // Release the Open-lock right away so the drawer immediately reflects
          // the saved state without requiring a separate Close click.
          await apiCall('Close', rn, {}, 'warehouse_request').catch(() => {});
          lockedRef.current = false;
        }
        setSavedRequestNo(rn);
        setRequestState(row?.RequestState ?? 0);
        setEditing(false);
        setJustSaved(true);
        onSaved();
        if (rn) await fetchDetailLines(rn);
      } else {
        setError(res.Message || 'Failed to save request');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setSaving(false);
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: 920, maxWidth: '95vw', background: 'var(--bg)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '20px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              {savedRequestNo ? `Transfer Request #${savedRequestNo}` : 'New Warehouse Transfer Request'}
            </h2>
            {savedRequestNo && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                background: requestState === 0 ? 'var(--amber-soft)' : requestState === 10 ? 'var(--orange-soft)' : requestState === 20 ? 'var(--green-soft)' : 'var(--red-soft)',
                color: requestState === 0 ? 'var(--amber)' : requestState === 10 ? 'var(--orange)' : requestState === 20 ? 'var(--green)' : 'var(--red)'
              }}>
                {STATE_LABELS[requestState] ?? requestState}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {editing ? (
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  height: 36, padding: '0 24px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px var(--orange-glow)'
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            ) : (
              requestState === 0 && (
                <>
                  <button
                    onClick={handleTransferClick}
                    disabled={transferring || opening}
                    style={{
                      height: 36, padding: '0 24px', background: 'var(--green)',
                      color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    {transferring ? 'Transferring...' : '⇄ Transfer'}
                  </button>
                  <button
                    onClick={handleEditClick}
                    disabled={opening || transferring}
                    style={{
                      height: 36, padding: '0 24px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                      color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                      boxShadow: '0 4px 12px var(--orange-glow)'
                    }}
                  >
                    {opening ? 'Opening...' : '✎ Edit'}
                  </button>
                </>
              )
            )}
            {!editing && requestState === 10 && (
              <button
                onClick={handleReceiveClick}
                disabled={receiving}
                style={{
                  height: 36, padding: '0 24px', background: 'var(--green)',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
                }}
              >
                {receiving ? 'Receiving...' : '📥 Receive'}
              </button>
            )}
            <button
              onClick={handleCloseClick}
              disabled={saving || opening || transferring || receiving}
              style={{ height: 36, padding: '0 16px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
            >
              {savedRequestNo ? 'Close' : 'Cancel'}
            </button>
            <button onClick={handleCloseClick} style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: 'var(--soft)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && (
            <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
              ⚠ {error}
            </div>
          )}

          {justSaved && !editing && (
            <div style={{ background: 'var(--green-soft)', border: '1px solid rgba(22,163,74,0.2)', color: 'var(--green)', padding: '10px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
              ✓ Saved successfully.
            </div>
          )}

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14, letterSpacing: 0.4 }}>
              Request Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Request Date
                </label>
                <input
                  type="date"
                  value={requestDate}
                  onChange={e => setRequestDate(e.target.value)}
                  disabled={!editing}
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', background: editing ? 'var(--bg)' : 'var(--soft)', outline: 'none', boxSizing: 'border-box', opacity: editing ? 1 : 0.7 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Request Type
                </label>
                <SearchableSelect
                  value={requestType}
                  onChange={setRequestType}
                  options={requestTypeOptions}
                  placeholder="Select type"
                  disabled={!editing}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  From Warehouse
                </label>
                <SearchableSelect
                  value={fromWarehouse}
                  onChange={setFromWarehouse}
                  options={warehouseOptions}
                  placeholder="Select warehouse"
                  disabled={!editing}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  To Warehouse
                </label>
                <SearchableSelect
                  value={toWarehouse}
                  onChange={setToWarehouse}
                  options={warehouseOptions}
                  placeholder="Select warehouse"
                  disabled={!editing}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Note
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Optional note..."
                disabled={!editing}
                style={{ width: '100%', height: 56, padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', background: editing ? 'var(--bg)' : 'var(--soft)', outline: 'none', resize: 'none', boxSizing: 'border-box', opacity: editing ? 1 : 0.7 }}
              />
            </div>
          </div>

          {editing ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Lines
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', background: 'var(--soft)', padding: '2px 8px', borderRadius: 999 }}>
                    {lines.length}
                  </span>
                </div>
                <button
                  onClick={addLine}
                  style={{ height: 30, padding: '0 14px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                >
                  + Add Line
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '32px 2fr 2fr 1fr 1fr 1fr 30px', gap: 10, padding: '0 12px', marginBottom: 8 }}>
                <div />
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Item Code</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Description</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Lot</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', textAlign: 'center' }}>On Hand</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Qty</div>
                <div />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lines.map((l, i) => {
                  const exceeds = Number(l.Qty) > (Number(l.OnHand) || 0);
                  return (
                    <div
                      key={i}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.shiftKey) {
                          e.preventDefault();
                          addLine();
                        }
                      }}
                      style={{
                        display: 'grid', gridTemplateColumns: '32px 2fr 2fr 1fr 1fr 1fr 30px', gap: 10, alignItems: 'center',
                        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12,
                        transition: 'border-color .15s'
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: 6, background: 'var(--soft)', color: 'var(--muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 800
                      }}>
                        {i + 1}
                      </div>
                      <SearchableSelect
                        value={l.ItemID}
                        onChange={v => updateLineItem(i, v)}
                        options={itemOptions}
                        placeholder="Item Code"
                      />
                      <input
                        type="text"
                        value={l.ItemDescription}
                        readOnly
                        placeholder="Item Description"
                        style={{ height: 32, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--muted)', background: 'var(--soft)', outline: 'none', boxSizing: 'border-box' }}
                      />
                      <input
                        type="text"
                        value={l.Lot}
                        onChange={e => updateLineField(i, 'Lot', e.target.value)}
                        onBlur={() => fetchOnHand(i, l.ItemID, l.Lot)}
                        disabled={l.LotControl === 0}
                        placeholder={l.LotControl === 1 ? 'Lot (required)' : 'Lot'}
                        style={{
                          height: 32, padding: '0 10px',
                          border: '1.5px solid ' + (l.LotControl === 1 && !l.Lot.trim() ? 'var(--amber)' : 'var(--border)'),
                          borderRadius: 7, fontSize: 12, color: 'var(--text)',
                          background: l.LotControl === 0 ? 'var(--soft)' : 'var(--surface)',
                          outline: 'none', boxSizing: 'border-box',
                          opacity: l.LotControl === 0 ? 0.6 : 1,
                          cursor: l.LotControl === 0 ? 'not-allowed' : 'text'
                        }}
                      />
                      <div>
                        <div style={{
                          textAlign: 'center', fontSize: 12, fontWeight: 800, borderRadius: 7, padding: '7px 0',
                          color: l.OnHand == null ? 'var(--muted)' : (Number(l.OnHand) > 0 ? 'var(--green)' : 'var(--red)'),
                          background: l.OnHand == null ? 'transparent' : (Number(l.OnHand) > 0 ? 'var(--green-soft)' : 'var(--red-soft)')
                        }}>
                          {l.OnHand == null ? '—' : Number(l.OnHand).toLocaleString()}
                        </div>
                        {l.OnHand != null && l.SellingConversion > 0 && (
                          <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 3, textAlign: 'center' }}>
                            Carton: {(Number(l.OnHand) / l.SellingConversion).toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div>
                        <input
                          type="number"
                          value={l.Qty}
                          onChange={e => updateLineField(i, 'Qty', e.target.value)}
                          placeholder="Qty"
                          min={0}
                          style={{
                            width: '100%', height: 32, padding: '0 10px',
                            border: '1.5px solid ' + (exceeds ? 'var(--red)' : 'var(--border)'),
                            borderRadius: 7, fontSize: 12, color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box'
                          }}
                        />
                        {exceeds && (
                          <div style={{ fontSize: 9, color: 'var(--red)', marginTop: 3, fontWeight: 600 }}>Exceeds On Hand</div>
                        )}
                        {!exceeds && l.SellingConversion > 0 && Number(l.Qty) > 0 && (
                          <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 3 }}>
                            Carton: {(Number(l.Qty) / l.SellingConversion).toFixed(2)}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeLine(i)}
                        title="Remove line"
                        style={{
                          width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--red-soft)',
                          color: 'var(--red)', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14, letterSpacing: 0.4 }}>
                Lines
              </div>
              {loadingDetail ? (
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Loading...</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {(requestState === 0
                        ? ['Line', 'Item Code', 'Description', 'Qty']
                        : requestState === 10
                        ? ['Line', 'Item Code', 'Description', 'Qty Transferred']
                        : requestState === 20
                        ? ['Line', 'Item Code', 'Description', 'Qty Received']
                        : ['Line', 'Item Code', 'Description', 'Qty Requested', 'Qty Received', 'Qty Transferred']
                      ).map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detailLines.map(d => {
                      const carton = v => d.SellingConversion > 0 ? (Number(v) / d.SellingConversion).toFixed(2) : null;
                      const qtyCell = (v) => (
                        <td style={{ padding: '8px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>
                          {v}
                          {carton(v) != null && (
                            <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 2 }}>Carton: {carton(v)}</div>
                          )}
                        </td>
                      );
                      return (
                        <tr key={d.Line}>
                          <td style={{ padding: '8px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{d.Line}</td>
                          <td style={{ padding: '8px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{d.ItemCode}</td>
                          <td style={{ padding: '8px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{d.ItemDescription}</td>
                          {requestState === 0 ? (
                            qtyCell(d.QuantityRequested)
                          ) : requestState === 10 ? (
                            qtyCell(d.QuanityTransfered)
                          ) : requestState === 20 ? (
                            qtyCell(d.QuantityRecieved)
                          ) : (
                            <>
                              {qtyCell(d.QuantityRequested)}
                              {qtyCell(d.QuantityRecieved)}
                              {qtyCell(d.QuanityTransfered)}
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
