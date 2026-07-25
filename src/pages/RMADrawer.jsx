import { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';

const EMPTY_LINE = { ItemID: '', ItemCode: '', ItemDescription: '', Warehouse: '', Qty: '', ReasonID: '' };

// From COR.RmaStateMaster (live): 0=New, 10=Confirmed, 20=Transfered, 30=Ordered, 99=Deleted.
// This drawer only ever creates/edits/deletes records at state 0 (New) -- Confirm/Transfer/
// Order transitions involve real inventory movement (each RMAReasonMaster row carries a
// ReturnedWarehouse) and are explicitly out of scope for this build. RMAs already past New
// (created by the existing legacy process) are shown here read-only, with no Edit/Delete.
const STATE_LABELS = { 0: 'New', 10: 'Confirmed', 20: 'Transfered', 30: 'Ordered', 99: 'Deleted' };

// PLS.ReportsMaster ReportID (seeded by RegisterRMAReport.sql) -- same FastReport
// service used by the Order Details drawer's Print buttons.
const REPORT_API_BASE = 'https://sila.silasystem.com:7102/api/reports';
const RMA_REPORT_ID = 3;

export default function RMADrawer({ user, onClose, onSaved, rma }) {
  const [returnedDate, setReturnedDate] = useState(() => rma?.ReturnedDate ? rma.ReturnedDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [customer, setCustomer] = useState(rma?.ReturnedCustomer != null ? String(rma.ReturnedCustomer) : '');
  const [facility, setFacility] = useState(rma?.Facility || '');
  const [orderType, setOrderType] = useState(rma?.OrderType != null ? String(rma.OrderType) : '');
  const [note, setNote] = useState(rma?.Note || '');
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);

  const [customerOptions, setCustomerOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);
  const [facilityOptions, setFacilityOptions] = useState([]);
  const [orderTypeOptions, setOrderTypeOptions] = useState([]);
  const [reasonOptions, setReasonOptions] = useState([]);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  // Post-save state: once saved, the drawer stays open in a read-only "view" mode
  // showing the saved RMA (via the RMA Line Detail query), with an Edit button to
  // resume editing while still at state 0 (New). Opening an existing RMA (double-click
  // from the grid) starts directly in this same view mode instead of a blank form.
  const [savedRMANumber, setSavedRMANumber] = useState(rma?.RMANumber ?? null);
  const [rmaState, setRmaState] = useState(rma?.RMAState ?? null);
  const [editing, setEditing] = useState(!rma);
  const [detailLines, setDetailLines] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Confirm RMA (RMAState 0 -> 10): reviews/adjusts QuantityConfirmed per line,
  // no inventory movement happens at this step (that's Transfer/Order, still
  // out of scope) -- APIPlusRMAOperation's 'Confirm RMA' just writes
  // QuantityConfirmed and advances the header state.
  const [confirming, setConfirming] = useState(false);
  const [confirmQtys, setConfirmQtys] = useState({});
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [transacting, setTransacting] = useState(false);

  // Custom in-app confirm dialog for Delete/Undo Confirm/Transaction -- native
  // window.confirm() can silently no-op inside some embedded/webview hosts
  // (returns immediately without blocking), which would skip straight past
  // the action every time. { title, message, confirmLabel, danger, onConfirm }
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [reportPreviewUrl, setReportPreviewUrl] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (rma?.RMANumber) fetchDetailLines(rma.RMANumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    apiCall('Customer Master All', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) {
        setCustomerOptions((d.List0 || []).map(c => ({ label: `${c.CustomerNo} - ${c.CustomerName}`, value: c.CustomerNo })));
      }
    });
    apiCall('xx', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setWarehouseOptions((d.List0 || []).map(w => ({ label: `${w.Warehouse} - ${w.WarhouseDescription}`, value: w.Warehouse })));
      }
    });
    apiCall('Item Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setItemOptions((d.List0 || []).map(i => ({ label: `${i.ItemCode} - ${i.ItemName}`, value: i.ItemID, itemCode: i.ItemCode, itemName: i.ItemName })));
      }
    });
    apiCall('RMA Facility', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) {
        const opts = (d.List0 || []).map(f => ({ label: f.FacilityDescription, value: f.FacilityCode }));
        setFacilityOptions(opts);
        setFacility(prev => prev || (opts[0]?.value ?? ''));
      }
    });
    apiCall('RMA Order Type', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) {
        const opts = (d.List0 || []).map(t => ({ label: t.TypeDescription, value: t.OrderTypeID }));
        setOrderTypeOptions(opts);
        setOrderType(prev => prev || (opts[0]?.value ?? ''));
      }
    });
    apiCall('RMA Reason', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) {
        setReasonOptions((d.List0 || []).map(r => ({ label: r.ReasonDescription, value: r.ReasonID })));
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
    setLines(prev => prev.map((l, i) => i === index
      ? { ...l, ItemID: itemID, ItemCode: opt?.itemCode || '', ItemDescription: opt?.itemName || '' }
      : l
    ));
  }

  function updateLineField(index, field, value) {
    setLines(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  }

  async function fetchDetailLines(rmaNumber) {
    setLoadingDetail(true);
    try {
      const res = await apiCall('GetGridData', { PageGroupID: 'rma_lines', rmaNumber }, {}, 'plus');
      if (res.State === 0) setDetailLines(res.List0 || []);
    } catch {
      // non-fatal: the drawer still shows the save succeeded, just without the detail table
    }
    setLoadingDetail(false);
  }

  function handleEditClick() {
    const rehydrated = detailLines.map(d => ({
      ItemID: d.ItemID,
      ItemCode: d.ItemCode,
      ItemDescription: d.ItemExtraDescription,
      Warehouse: d.Warehouse,
      Qty: d.QuantityReturned,
      ReasonID: d.RMAReasonID
    }));
    setLines(rehydrated.length ? rehydrated : [{ ...EMPTY_LINE }]);
    setEditing(true);
    setJustSaved(false);
  }

  function handleConfirmClick() {
    setError(null);
    const defaults = {};
    detailLines.forEach(d => { defaults[d.RCL] = d.QuantityReturned; });
    setConfirmQtys(defaults);
    setConfirming(true);
  }

  async function handleConfirmSubmit() {
    setError(null);
    setConfirmSaving(true);
    try {
      const payload = detailLines.map(d => ({
        line: d.Line,
        itemid: d.ItemID,
        qty: Number(confirmQtys[d.RCL]) || 0,
        warehouse: d.Warehouse,
        rmanumber: savedRMANumber
      }));
      const res = await apiCall('Confirm RMA', payload, {}, 'rma');
      if (res.State === 0) {
        setRmaState(10);
        setConfirming(false);
        onSaved();
        await fetchDetailLines(savedRMANumber);
      } else {
        setError(res.Message || 'Failed to confirm RMA');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setConfirmSaving(false);
  }

  function handleUndoConfirmClick() {
    setConfirmDialog({
      title: 'Undo Confirm',
      message: 'Undo confirmation and move this RMA back to New? All confirmed quantities will be reset to 0.',
      confirmLabel: 'Undo Confirm',
      onConfirm: performUndoConfirm
    });
  }

  async function performUndoConfirm() {
    setConfirmDialog(null);
    setError(null);
    setUndoing(true);
    try {
      const res = await apiCall('Undo Confirm', [{ rmanumber: savedRMANumber }], {}, 'rma');
      if (res.State === 0 && (res.List0 || [])[0]?.RMANumber) {
        setRmaState(0);
        onSaved();
        await fetchDetailLines(savedRMANumber);
      } else {
        setError(res.Message || 'Failed to undo confirm (RMA is not in Confirmed state).');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setUndoing(false);
  }

  // Posts the real inventory transaction (INV.ItemTransactionSystemHistory) for every
  // confirmed line and advances RMAState to 20 (Transfered) -- this is the one step in
  // this drawer that actually moves inventory, so it gets its own explicit confirm dialog.
  function handleTransactionClick() {
    setConfirmDialog({
      title: 'Process Transaction',
      message: `This will post an inventory transaction for RMA #${savedRMANumber} and cannot be undone via "Undo Confirm" afterward. Continue?`,
      confirmLabel: 'Process Transaction',
      danger: true,
      onConfirm: performTransaction
    });
  }

  async function performTransaction() {
    setConfirmDialog(null);
    setError(null);
    setTransacting(true);
    try {
      const res = await apiCall('Transaction', [{ rmanumber: savedRMANumber, returneddate: returnedDate, note: note || '' }], {}, 'rma');
      if (res.State === 0 && (res.List0 || [])[0]?.RMANumber) {
        setRmaState(20);
        onSaved();
        await fetchDetailLines(savedRMANumber);
      } else {
        setError(res.Message || 'Failed to process the transaction (RMA is not in Confirmed state).');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setTransacting(false);
  }

  function handleDeleteClick() {
    setConfirmDialog({
      title: 'Delete RMA',
      message: 'Are you sure you want to delete this RMA?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: performDelete
    });
  }

  async function performDelete() {
    setConfirmDialog(null);
    setError(null);
    setDeleting(true);
    try {
      const res = await apiCall('Delete RMA', [{ rmanumber: savedRMANumber }], {}, 'rma');
      if (res.State === 0) {
        onSaved();
        onClose();
      } else {
        setError(res.Message || 'Failed to delete RMA');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setDeleting(false);
  }

  async function handleSave() {
    setError(null);

    if (!customer) {
      setError('Customer is required.');
      return;
    }
    if (!facility) {
      setError('Facility is required.');
      return;
    }
    if (!orderType) {
      setError('Order Type is required.');
      return;
    }
    if (!returnedDate) {
      setError('Returned Date is required.');
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

    const missingWarehouseLines = itemLines.filter(l => !l.Warehouse);
    if (missingWarehouseLines.length > 0) {
      setError(`Cannot save: item(s) ${missingWarehouseLines.map(l => l.ItemCode).join(', ')} require a Warehouse.`);
      return;
    }

    const missingReasonLines = itemLines.filter(l => !l.ReasonID);
    if (missingReasonLines.length > 0) {
      setError(`Cannot save: item(s) ${missingReasonLines.map(l => l.ItemCode).join(', ')} require a Reason.`);
      return;
    }

    const isEdit = !!savedRMANumber;
    const payload = itemLines.map((l, idx) => ({
      line: idx + 1,
      itemid: Number(l.ItemID),
      qty: Number(l.Qty),
      warehouse: l.Warehouse,
      linenote: l.LineNote || '',
      reasonid: Number(l.ReasonID),
      returneddate: returnedDate,
      ordertype: Number(orderType),
      customer: Number(customer),
      facility: facility,
      note: note || '',
      ...(isEdit ? { rmanumber: savedRMANumber } : {})
    }));

    setSaving(true);
    try {
      const res = await apiCall(isEdit ? 'Edit RMA' : 'New RMA', payload, {}, 'rma');
      if (res.State === 0) {
        const rn = (res.List0 || [])[0]?.RMANumber ?? savedRMANumber;
        setSavedRMANumber(rn);
        setRmaState(0);
        setEditing(false);
        setJustSaved(true);
        onSaved();
        if (rn) await fetchDetailLines(rn);
      } else {
        setError(res.Message || 'Failed to save RMA');
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
              {savedRMANumber ? `RMA #${savedRMANumber}` : 'New RMA'}
            </h2>
            {savedRMANumber && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                background: rmaState === 0 ? 'var(--amber-soft)' : rmaState === 99 ? 'var(--red-soft)' : rmaState === 10 ? 'var(--orange-soft)' : 'var(--green-soft)',
                color: rmaState === 0 ? 'var(--amber)' : rmaState === 99 ? 'var(--red)' : rmaState === 10 ? 'var(--orange)' : 'var(--green)'
              }}>
                {STATE_LABELS[rmaState] ?? rmaState}
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
              rmaState === 0 && (
                <>
                  <button
                    onClick={handleDeleteClick}
                    disabled={deleting}
                    style={{ height: 36, padding: '0 20px', background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={handleEditClick}
                    style={{ height: 36, padding: '0 24px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✎ Edit
                  </button>
                  <button
                    onClick={handleConfirmClick}
                    disabled={!detailLines.length}
                    style={{
                      height: 36, padding: '0 24px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                      color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                      boxShadow: '0 4px 12px var(--orange-glow)'
                    }}
                  >
                    ✓ Confirm
                  </button>
                </>
              )
            )}
            {!editing && (rmaState === 10 || rmaState === 20 || rmaState === 30) && (
              <button
                onClick={() => { setReportLoading(true); setReportPreviewUrl(`${REPORT_API_BASE}/${RMA_REPORT_ID}/${savedRMANumber}`); }}
                style={{ height: 36, padding: '0 20px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                🖨️ Print
              </button>
            )}
            {!editing && rmaState === 10 && (
              <>
                <button
                  onClick={handleUndoConfirmClick}
                  disabled={undoing || transacting}
                  style={{ height: 36, padding: '0 20px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                >
                  {undoing ? 'Undoing...' : '↺ Undo Confirm'}
                </button>
                <button
                  onClick={handleTransactionClick}
                  disabled={undoing || transacting}
                  style={{ height: 36, padding: '0 24px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                >
                  {transacting ? 'Processing...' : '⇄ Process Transaction'}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              disabled={saving || deleting || undoing || transacting}
              style={{ height: 36, padding: '0 16px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
            >
              {savedRMANumber ? 'Close' : 'Cancel'}
            </button>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: 'var(--soft)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
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
              RMA Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Returned Date
                </label>
                <input
                  type="date"
                  value={returnedDate}
                  onChange={e => setReturnedDate(e.target.value)}
                  disabled={!editing}
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', background: editing ? 'var(--bg)' : 'var(--soft)', outline: 'none', boxSizing: 'border-box', opacity: editing ? 1 : 0.7 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Customer
                </label>
                <SearchableSelect
                  value={customer}
                  onChange={setCustomer}
                  options={customerOptions}
                  placeholder="Select customer"
                  disabled={!editing}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Facility
                </label>
                <SearchableSelect
                  value={facility}
                  onChange={setFacility}
                  options={facilityOptions}
                  placeholder="Select facility"
                  disabled={!editing}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Order Type
                </label>
                <SearchableSelect
                  value={orderType}
                  onChange={setOrderType}
                  options={orderTypeOptions}
                  placeholder="Select type"
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

              <div style={{ display: 'grid', gridTemplateColumns: '32px 2fr 2fr 1.4fr 1fr 2fr 30px', gap: 10, padding: '0 12px', marginBottom: 8 }}>
                <div />
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Item Code</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Description</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Warehouse</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Qty</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Reason</div>
                <div />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lines.map((l, i) => (
                  <div
                    key={i}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && e.shiftKey) {
                        e.preventDefault();
                        addLine();
                      }
                    }}
                    style={{
                      display: 'grid', gridTemplateColumns: '32px 2fr 2fr 1.4fr 1fr 2fr 30px', gap: 10, alignItems: 'center',
                      background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12
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
                    <SearchableSelect
                      value={l.Warehouse}
                      onChange={v => updateLineField(i, 'Warehouse', v)}
                      options={warehouseOptions}
                      placeholder="Warehouse"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={l.Qty}
                      onChange={e => updateLineField(i, 'Qty', e.target.value)}
                      placeholder="Qty"
                      style={{ width: '100%', height: 32, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <SearchableSelect
                      value={l.ReasonID}
                      onChange={v => updateLineField(i, 'ReasonID', v)}
                      options={reasonOptions}
                      placeholder="Reason"
                    />
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
                ))}
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
                      {(rmaState >= 10
                        ? ['Line', 'Item Code', 'Description', 'Warehouse', 'Qty Returned', 'Qty Confirmed', 'Reason', 'Note']
                        : ['Line', 'Item Code', 'Description', 'Warehouse', 'Qty Returned', 'Reason', 'Note']
                      ).map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detailLines.map(d => (
                      <tr key={d.RCL}>
                        <td style={{ padding: '8px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{d.Line}</td>
                        <td style={{ padding: '8px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{d.ItemCode}</td>
                        <td style={{ padding: '8px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{d.ItemExtraDescription}</td>
                        <td style={{ padding: '8px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{d.Warehouse}</td>
                        <td style={{ padding: '8px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{d.QuantityReturned}</td>
                        {rmaState >= 10 && (
                          <td style={{ padding: '8px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{d.QuantityConfirmed}</td>
                        )}
                        <td style={{ padding: '8px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{d.ReasonDescription}</td>
                        <td style={{ padding: '8px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{d.LineNote}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {confirming && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 640, maxWidth: '92vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', borderRadius: 14, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Confirm RMA #{savedRMANumber}</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--muted)' }}>Review/adjust the confirmed quantity for each line, then confirm.</p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Line', 'Item Code', 'Description', 'Qty Returned', 'Qty Confirmed'].map(h => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detailLines.map(d => (
                    <tr key={d.RCL}>
                      <td style={{ padding: '8px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{d.Line}</td>
                      <td style={{ padding: '8px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{d.ItemCode}</td>
                      <td style={{ padding: '8px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{d.ItemExtraDescription}</td>
                      <td style={{ padding: '8px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{d.QuantityReturned}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={confirmQtys[d.RCL] ?? ''}
                          onChange={e => setConfirmQtys(prev => ({ ...prev, [d.RCL]: e.target.value }))}
                          style={{ width: 100, height: 30, padding: '0 8px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setConfirming(false)}
                disabled={confirmSaving}
                style={{ height: 36, padding: '0 20px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={confirmSaving}
                style={{
                  height: 36, padding: '0 24px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px var(--orange-glow)'
                }}
              >
                {confirmSaving ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportPreviewUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '90vw', height: '92vh', background: 'var(--bg)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '14px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>RMA Report — #{savedRMANumber}</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <a
                  href={`${reportPreviewUrl}/download`}
                  download={`RMA_${savedRMANumber}.pdf`}
                  style={{
                    height: 32, padding: '0 16px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                    color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', textDecoration: 'none'
                  }}
                >
                  ⬇ Download
                </a>
                <button
                  onClick={() => { setReportPreviewUrl(null); setReportLoading(false); }}
                  style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: 'var(--soft)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              {reportLoading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#fff', zIndex: 1 }}>
                  <div className="spinner"></div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>Generating report…</div>
                </div>
              )}
              <iframe
                src={reportPreviewUrl}
                title="RMA Report Preview"
                onLoad={() => setReportLoading(false)}
                style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
              />
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 420, maxWidth: '90vw', background: 'var(--bg)', borderRadius: 14, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '20px 22px' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{confirmDialog.title}</h3>
              <p style={{ margin: '10px 0 0 0', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{confirmDialog.message}</p>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setConfirmDialog(null)}
                style={{ height: 36, padding: '0 20px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                style={{
                  height: 36, padding: '0 24px',
                  background: confirmDialog.danger ? 'var(--red)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
                }}
              >
                {confirmDialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
