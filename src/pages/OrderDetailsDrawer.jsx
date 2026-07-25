import { useState, useEffect, useRef } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

function renderAllocatedCell(row, field) {
  const qty = Number(row[field]) || 0;
  const ordered = Number(row.QuantityOrdered) || 0;
  const badgeClass = qty === 0 ? 'badge-red' : qty < ordered ? 'badge-amber' : 'badge-green';
  return (
    <div>
      <span className={`badge ${badgeClass}`} style={{ fontSize: 13.5 }}>{qty.toLocaleString()}</span>
      {row.SellingConversion > 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
          Carton: {(qty / row.SellingConversion).toFixed(2)}
        </div>
      )}
    </div>
  );
}

function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime()) || d.getFullYear() < 1901) return '';
  return d.toLocaleDateString('en-GB');
}

const READY_TO_LOAD_STATE = 60;
const ALLOCATED_STATE = 65;
const CONFIRMED_STATE = 80;

const STATE_LABELS = {
  [READY_TO_LOAD_STATE]: 'Ready To Load',
  [ALLOCATED_STATE]: 'Allocated',
  [CONFIRMED_STATE]: 'Confirmed'
};

const REPORT_API_BASE = 'https://sila.silasystem.com:7102/api/reports';
// PLS.ReportsMaster ReportIDs (seeded by RegisterReportsMaster.sql / RegisterPickConfirmReport.sql)
const PICK_RELEASE_REPORT_ID = 1;
const PICK_CONFIRM_REPORT_ID = 2;

export default function OrderDetailsDrawer({ order, onClose }) {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tracks the order's release state locally, since `order` is a stale prop
  // owned by the Orders grid and never refreshes mid-drawer-session.
  const [effectiveOrderState, setEffectiveOrderState] = useState(order.OrderState);

  // Release flow (APIPlusLoadingOperation: Open -> enter Release Qty -> Close on exit)
  const [releaseMode, setReleaseMode] = useState(false);
  const [releaseOpening, setReleaseOpening] = useState(false);
  const [releaseError, setReleaseError] = useState(null);
  const [releaseQtys, setReleaseQtys] = useState({});

  // Pick Confirm flow (APIPlusLoadingOperation: Open -> enter Confirmed Qty -> Confirm Order on Save)
  const [pickConfirmMode, setPickConfirmMode] = useState(false);
  const [pickConfirmOpening, setPickConfirmOpening] = useState(false);
  const [pickConfirmError, setPickConfirmError] = useState(null);
  // Rows where Confirmed Qty <> Ordered Qty -- shown for review before Confirm Order actually runs
  const [confirmMismatchRows, setConfirmMismatchRows] = useState(null);
  const [confirmQtys, setConfirmQtys] = useState({});
  const [confirmDate, setConfirmDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [reportPreviewUrl, setReportPreviewUrl] = useState(null);
  const [reportPreviewTitle, setReportPreviewTitle] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    loadLines();
  }, [order?.OrderNumber]);

  // Tracks releaseMode for the unmount-only cleanup below, without making that
  // effect re-run (and re-fire its cleanup) on every releaseMode change --
  // the explicit Close button already handles the "still mounted" case.
  const releaseModeRef = useRef(false);
  useEffect(() => { releaseModeRef.current = releaseMode; }, [releaseMode]);
  const pickConfirmModeRef = useRef(false);
  useEffect(() => { pickConfirmModeRef.current = pickConfirmMode; }, [pickConfirmMode]);

  useEffect(() => {
    return () => {
      if (releaseModeRef.current || pickConfirmModeRef.current) {
        apiCall('Close', order.OrderNumber, {}, 'loading').catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLines() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiCall('GetGridData', { PageGroupID: 'orders_lines', orderNumber: order.OrderNumber }, {}, 'plus');
      if (res.State === 0) {
        setLines(res.List0 || []);
      } else {
        setError(res.Message || 'Failed to load order lines');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setLoading(false);
  }

  async function handleReleaseClick() {
    setReleaseOpening(true);
    setReleaseError(null);
    try {
      const res = await apiCall('Open', order.OrderNumber, {}, 'loading');
      if (res.State === 0) {
        setReleaseMode(true);
        const defaults = {};
        lines.forEach(row => {
          defaults[row.LineNumber] = Math.max(0, Math.min(Number(row.QuantityOrdered) || 0, Number(row.OnHand) || 0));
        });
        setReleaseQtys(defaults);
      } else {
        setReleaseError(res.Message || 'Failed to open order for release');
      }
    } catch (err) {
      setReleaseError('Connection error: ' + err.message);
    }
    setReleaseOpening(false);
  }

  async function handleCloseClick() {
    const closingRelease = releaseMode;
    const closingConfirm = pickConfirmMode;
    if (closingRelease) setReleaseOpening(true);
    if (closingConfirm) setPickConfirmOpening(true);
    setReleaseError(null);
    setPickConfirmError(null);
    try {
      const res = await apiCall('Close', order.OrderNumber, {}, 'loading');
      if (res.State !== 0) {
        const msg = res.Message || 'Failed to close order';
        if (closingRelease) setReleaseError(msg);
        if (closingConfirm) setPickConfirmError(msg);
      }
    } catch (err) {
      const msg = 'Connection error: ' + err.message;
      if (closingRelease) setReleaseError(msg);
      if (closingConfirm) setPickConfirmError(msg);
    }
    setReleaseMode(false);
    setReleaseQtys({});
    setReleaseOpening(false);
    setPickConfirmMode(false);
    setPickConfirmOpening(false);
    setConfirmQtys({});
  }

  async function handlePickConfirmClick() {
    setPickConfirmOpening(true);
    setPickConfirmError(null);
    try {
      const res = await apiCall('Open', order.OrderNumber, {}, 'loading');
      if (res.State === 0) {
        setPickConfirmMode(true);
        const defaults = {};
        lines.forEach(row => { defaults[row.LineNumber] = 0; });
        setConfirmQtys(defaults);
      } else {
        setPickConfirmError(res.Message || 'Failed to open order for confirm');
      }
    } catch (err) {
      setPickConfirmError('Connection error: ' + err.message);
    }
    setPickConfirmOpening(false);
  }

  async function handleSaveConfirmClick() {
    setPickConfirmError(null);

    const hasNonZero = lines.some(row => Number(confirmQtys[row.LineNumber]) > 0);
    if (!hasNonZero) {
      setPickConfirmError('Enter at least one Confirmed Qty greater than 0.');
      return;
    }

    const mismatches = lines.filter(row => (Number(confirmQtys[row.LineNumber]) || 0) !== (Number(row.QuantityOrdered) || 0));
    if (mismatches.length > 0) {
      setConfirmMismatchRows(mismatches);
      return;
    }

    await performConfirmSave();
  }

  async function performConfirmSave() {
    const payload = lines.map(row => ({
      orderno: order.OrderNumber,
      line: row.LineNumber,
      itemid: row.ItemID,
      qty: Number(confirmQtys[row.LineNumber]) || 0,
      unloadedid: 0,
      confirmdate: confirmDate,
      shiftid: 0,
      truckid: 0,
      driverid: 0,
      loadingdockid: 0
    }));

    setPickConfirmOpening(true);
    try {
      const res = await apiCall('Confirm Order', payload, {}, 'loading');
      if (res.State === 0) {
        // Same auto-close pattern as Save Release: release the Open-lock right away
        // so the drawer immediately reflects the new order state.
        await apiCall('Close', order.OrderNumber, {}, 'loading').catch(() => {});
        setPickConfirmMode(false);
        setConfirmQtys({});
        setEffectiveOrderState(CONFIRMED_STATE);
        await loadLines();
      } else {
        setPickConfirmError(res.Message || 'Failed to confirm order');
      }
    } catch (err) {
      setPickConfirmError('Connection error: ' + err.message);
    }
    setPickConfirmOpening(false);
  }

  async function handleConfirmMismatchProceed() {
    setConfirmMismatchRows(null);
    await performConfirmSave();
  }

  async function handleSaveReleaseClick() {
    setReleaseError(null);

    const payload = lines
      .filter(row => Number(releaseQtys[row.LineNumber]) > 0)
      .map(row => ({
        orderno: order.OrderNumber,
        warehouse: order.Warehouse,
        line: row.LineNumber,
        itemid: row.ItemID,
        qty: Number(releaseQtys[row.LineNumber])
      }));

    if (payload.length === 0) {
      setReleaseError('Enter at least one Release Qty greater than 0.');
      return;
    }

    const invalidLines = lines.filter(row => {
      const qty = Number(releaseQtys[row.LineNumber]) || 0;
      const onHand = Number(row.OnHand) || 0;
      return qty > 0 && (onHand <= 0 || qty > onHand);
    });

    if (invalidLines.length > 0) {
      setReleaseError(`Cannot save release: line(s) ${invalidLines.map(r => r.LineNumber).join(', ')} have Release Qty exceeding On Hand.`);
      return;
    }

    setReleaseOpening(true);
    try {
      const res = await apiCall('New Release', payload, {}, 'loading');
      if (res.State === 0) {
        // Release the Open-lock right away so the drawer immediately shows the
        // ALLOCATED_STATE button set (Delete Release / Pick Confirm) without
        // requiring the user to close and reopen the drawer.
        await apiCall('Close', order.OrderNumber, {}, 'loading').catch(() => {});
        setReleaseMode(false);
        setReleaseQtys({});
        setEffectiveOrderState(ALLOCATED_STATE);
        await loadLines();
      } else {
        setReleaseError(res.Message || 'Failed to save release');
      }
    } catch (err) {
      setReleaseError('Connection error: ' + err.message);
    }
    setReleaseOpening(false);
  }

  async function handleDeleteReleaseClick() {
    setReleaseError(null);
    setReleaseOpening(true);
    try {
      const res = await apiCall('Delete Release', { orderno: order.OrderNumber, warehouse: order.Warehouse }, {}, 'loading');
      if (res.State === 0) {
        setReleaseQtys({});
        setEffectiveOrderState(READY_TO_LOAD_STATE);
        await loadLines();
      } else {
        setReleaseError(res.Message || 'Failed to delete release');
      }
    } catch (err) {
      setReleaseError('Connection error: ' + err.message);
    }
    setReleaseOpening(false);
  }

  function setReleaseQty(lineNumber, value) {
    setReleaseQtys(prev => ({ ...prev, [lineNumber]: value }));
  }

  function setConfirmQty(lineNumber, value) {
    setConfirmQtys(prev => ({ ...prev, [lineNumber]: value }));
  }

  function clearReleaseQty(lineNumber) {
    setReleaseQtys(prev => ({ ...prev, [lineNumber]: 0 }));
  }

  function handleSetAllReleaseQty() {
    const defaults = {};
    lines.forEach(row => {
      defaults[row.LineNumber] = Math.max(0, Math.min(Number(row.QuantityOrdered) || 0, Number(row.OnHand) || 0));
    });
    setReleaseQtys(defaults);
  }

  function handleResetAllReleaseQty() {
    const zeros = {};
    lines.forEach(row => {
      zeros[row.LineNumber] = 0;
    });
    setReleaseQtys(zeros);
  }

  const lineColumns = [
    { key: 'LineNumber', label: 'Line', width: 70, numeric: true },
    { key: 'ItemCode', label: 'Item Code', width: 120 },
    { key: 'ItemDescription', label: 'Description', width: 280 },
    {
      key: 'QuantityOrdered', label: 'Ordered', width: 100, numeric: true,
      render: (v, row) => {
        if (!releaseMode && !pickConfirmMode && effectiveOrderState <= ALLOCATED_STATE) return v;
        const carton = row.Carton;
        return (
          <div>
            <div>{v}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
              Conv: {row.SellingConversion ?? '—'} | Carton: {carton == null ? '—' : Number(carton).toFixed(2)}
            </div>
          </div>
        );
      }
    },
    { key: 'StockingUnitofMeasure', label: 'UOM', width: 90 },
    { key: 'OnHand', label: 'On Hand', width: 100, numeric: true, render: v => (Number(v) || 0).toLocaleString() },
    ...(effectiveOrderState === ALLOCATED_STATE ? [
      { key: 'QuantityAllocated', label: 'Allocated Qty', width: 110, numeric: true, render: (_v, row) => renderAllocatedCell(row, 'QuantityAllocated') }
    ] : effectiveOrderState > ALLOCATED_STATE ? [
      { key: 'QuantityShipped', label: 'Confirmed Qty', width: 110, numeric: true, render: (_v, row) => renderAllocatedCell(row, 'QuantityShipped') }
    ] : []),
    ...(pickConfirmMode ? [{
      key: 'ConfirmQtyInput',
      label: 'Confirmed Qty',
      width: 110,
      render: (_v, row) => {
        const val = confirmQtys[row.LineNumber] ?? 0;
        const allocated = Number(row.QuantityAllocated) || 0;
        const invalid = Number(val) > allocated;
        return (
          <div onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="text"
                inputMode="decimal"
                value={val}
                onChange={e => setConfirmQty(row.LineNumber, e.target.value === '' ? '' : Number(e.target.value))}
                style={{
                  width: 80, height: 30, padding: '0 8px',
                  border: '1.5px solid ' + (invalid ? 'var(--red)' : 'var(--border)'),
                  borderRadius: 6, fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none'
                }}
              />
              <button
                onClick={() => setConfirmQty(row.LineNumber, allocated)}
                title="Set to Allocated Qty"
                style={{
                  width: 22, height: 22, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--soft)',
                  color: 'var(--muted)', fontSize: 12, fontWeight: 700, lineHeight: 1, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0
                }}
              >
                =
              </button>
            </div>
            {invalid && (
              <div style={{ fontSize: 9.5, color: 'var(--red)', marginTop: 2 }}>Exceeds Allocated</div>
            )}
            {row.SellingConversion > 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                Carton: {(Number(val) / row.SellingConversion).toFixed(2)}
              </div>
            )}
          </div>
        );
      }
    }] : []),
    ...(releaseMode ? [{
      key: 'ReleaseQty',
      label: 'Release Qty',
      width: 130,
      render: (_v, row) => {
        const val = releaseQtys[row.LineNumber] ?? 0;
        const onHand = Number(row.OnHand) || 0;
        const invalid = Number(val) > onHand;
        return (
          <div onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="text"
                inputMode="decimal"
                value={val}
                onChange={e => setReleaseQty(row.LineNumber, e.target.value === '' ? '' : Number(e.target.value))}
                style={{
                  width: 80, height: 30, padding: '0 8px',
                  border: '1.5px solid ' + (invalid ? 'var(--red)' : 'var(--border)'),
                  borderRadius: 6, fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none'
                }}
              />
              <button
                onClick={() => clearReleaseQty(row.LineNumber)}
                title="Clear"
                style={{
                  width: 22, height: 22, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--soft)',
                  color: 'var(--muted)', fontSize: 12, lineHeight: 1, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0
                }}
              >
                ×
              </button>
            </div>
            {invalid && (
              <div style={{ fontSize: 9.5, color: 'var(--red)', marginTop: 2 }}>Exceeds On Hand</div>
            )}
            {row.SellingConversion > 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                Carton: {(Number(val) / row.SellingConversion).toFixed(2)}
              </div>
            )}
          </div>
        );
      }
    }] : [])
  ];

  const summaryFields = [
    { label: 'Status', value: STATE_LABELS[effectiveOrderState] || order.OrderStateDescription },
    { label: 'Ship To', value: order.ShipToName },
    { label: 'Ship To Address', value: order.ShipToAddress },
    { label: 'Salesperson', value: order.Salesperson },
    { label: 'Warehouse', value: order.Warehouse },
    { label: 'Carrier', value: order.OrderCarrier },
    { label: 'Scheduled Ship Date', value: fmtDate(order.ScheduledShipDate) }
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: 1500, maxWidth: '96vw', background: 'var(--bg)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.15)' }}>

        <div style={{ padding: '20px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>📦 Order {order.OrderNumber}</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{order.CustomerName}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {effectiveOrderState === ALLOCATED_STATE && (
            <button
              onClick={() => { setReportLoading(true); setReportPreviewTitle('New Release Report'); setReportPreviewUrl(`${REPORT_API_BASE}/${PICK_RELEASE_REPORT_ID}/${order.OrderNumber}`); }}
              style={{
                height: 36, padding: '0 20px', background: 'var(--soft)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
              }}
            >
              🖨️ Print Release
            </button>
            )}
            {effectiveOrderState === CONFIRMED_STATE && (
            <button
              onClick={() => { setReportLoading(true); setReportPreviewTitle('Pick Confirm Report'); setReportPreviewUrl(`${REPORT_API_BASE}/${PICK_CONFIRM_REPORT_ID}/${order.OrderNumber}`); }}
              style={{
                height: 36, padding: '0 20px', background: 'var(--soft)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
              }}
            >
              🖨️ Print Pick Confirm
            </button>
            )}
            {effectiveOrderState === READY_TO_LOAD_STATE && !releaseMode && (
              <button
                onClick={handleReleaseClick}
                disabled={releaseOpening}
                style={{
                  height: 36, padding: '0 20px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px var(--orange-glow)'
                }}
              >
                {releaseOpening ? 'Opening...' : '🔓 Release'}
              </button>
            )}
            {effectiveOrderState === ALLOCATED_STATE && !releaseMode && !pickConfirmMode && (
              <button
                onClick={handleDeleteReleaseClick}
                disabled={releaseOpening}
                style={{
                  height: 36, padding: '0 20px', background: 'var(--red)',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
                }}
              >
                {releaseOpening ? 'Deleting...' : '🗑 Delete Release'}
              </button>
            )}
            {effectiveOrderState === ALLOCATED_STATE && !releaseMode && !pickConfirmMode && (
              <button
                onClick={handlePickConfirmClick}
                disabled={pickConfirmOpening}
                style={{
                  height: 36, padding: '0 20px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px var(--orange-glow)'
                }}
              >
                {pickConfirmOpening ? 'Opening...' : '✅ Pick Confirm'}
              </button>
            )}
            {pickConfirmMode && (
              <input
                type="date"
                value={confirmDate}
                onChange={e => setConfirmDate(e.target.value)}
                title="Confirm Date"
                style={{
                  height: 36, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8,
                  fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none'
                }}
              />
            )}
            {pickConfirmMode && (
              <button
                onClick={handleSaveConfirmClick}
                disabled={pickConfirmOpening}
                style={{
                  height: 36, padding: '0 20px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px var(--orange-glow)'
                }}
              >
                {pickConfirmOpening ? 'Saving...' : '💾 Save Confirm'}
              </button>
            )}
            {releaseMode && (
              <button
                onClick={handleSaveReleaseClick}
                disabled={releaseOpening}
                style={{
                  height: 36, padding: '0 20px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px var(--orange-glow)'
                }}
              >
                {releaseOpening ? 'Saving...' : '💾 Save Release'}
              </button>
            )}
            {(releaseMode || pickConfirmMode) && (
              <button
                onClick={handleCloseClick}
                disabled={releaseOpening || pickConfirmOpening}
                style={{
                  height: 36, padding: '0 20px', background: 'var(--soft)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
                }}
              >
                {(releaseOpening || pickConfirmOpening) ? 'Closing...' : 'Close'}
              </button>
            )}
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: 'var(--soft)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && (
            <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--red)', padding: 10, borderRadius: 8, fontSize: 12.5 }}>
              {error}
            </div>
          )}
          {releaseError && (
            <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--red)', padding: 10, borderRadius: 8, fontSize: 12.5 }}>
              {releaseError}
            </div>
          )}
          {pickConfirmError && (
            <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--red)', padding: 10, borderRadius: 8, fontSize: 12.5 }}>
              {pickConfirmError}
            </div>
          )}

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>Order Summary</div>
            <div style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: 24 }}>
              {summaryFields.map(f => (
                <div key={f.label} style={{ flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3, whiteSpace: 'nowrap' }}>{f.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{f.value || '—'}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 400, display: 'flex', flexDirection: 'column' }}>
            <DataGrid
              title="Order Lines"
              subtitle={`Line items for order ${order.OrderNumber}`}
              columns={lineColumns}
              rows={lines}
              loading={loading}
              onRefresh={loadLines}
              extraButtons={releaseMode ? [
                { label: 'Set All', className: 'green', onClick: handleSetAllReleaseQty },
                { label: 'Reset All', onClick: handleResetAllReleaseQty }
              ] : []}
            />
          </div>
        </div>
      </div>

      {confirmMismatchRows && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 520, maxHeight: '80vh', background: 'var(--bg)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '14px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>⚠️ Confirmed Qty Differs From Ordered Qty</h3>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {confirmMismatchRows.length} line{confirmMismatchRows.length === 1 ? '' : 's'} below don't match the ordered quantity. Review before confirming.
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--soft)' }}>
                    <th style={{ padding: '8px 20px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Item</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Ordered</th>
                    <th style={{ padding: '8px 20px', textAlign: 'right', fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Confirmed</th>
                  </tr>
                </thead>
                <tbody>
                  {confirmMismatchRows.map(row => (
                    <tr key={row.LineNumber} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 20px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{row.ItemCode}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{row.ItemDescription}</div>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text)' }}>{Number(row.QuantityOrdered) || 0}</td>
                      <td style={{ padding: '8px 20px', textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>{Number(confirmQtys[row.LineNumber]) || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setConfirmMismatchRows(null)}
                style={{ height: 36, padding: '0 16px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMismatchProceed}
                style={{ height: 36, padding: '0 20px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Confirm Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {reportPreviewUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '90vw', height: '92vh', background: 'var(--bg)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '14px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{reportPreviewTitle} — Order {order.OrderNumber}</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <a
                  href={`${reportPreviewUrl}/download`}
                  download={`NewReleaseReport_${order.OrderNumber}.pdf`}
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
                title="New Release Report Preview"
                onLoad={() => setReportLoading(false)}
                style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
