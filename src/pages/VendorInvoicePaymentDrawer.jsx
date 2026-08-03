import { useState, useEffect, useMemo } from 'react';
import DataGrid from '../shared/DataGrid';
import { apiCall } from '../shared/api.js';

function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime()) || d.getFullYear() < 1901) return '';
  return d.toLocaleDateString('en-GB');
}

function fmtMoney(v) {
  const n = Number(v) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Read-only drill-down: unpaid/partially-paid invoices for a given Vendor +
// Year, opened from a Vendor Invoice Payment header row.
export default function VendorInvoicePaymentDrawer({ header, onClose }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [availableCredit, setAvailableCredit] = useState(null);
  const [creditLoading, setCreditLoading] = useState(false);

  // Client-side preview only -- both Auto Pay and manual Paid Amount edits
  // write into this same map (InternalID -> paid amount), overriding the
  // displayed Paid/Unpaid Amount columns. Nothing is written to the backend.
  const [paidOverrides, setPaidOverrides] = useState(null);
  const [validationMsg, setValidationMsg] = useState(null);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    fetchInvoices();
    fetchAvailableCredit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAvailableCredit() {
    setCreditLoading(true);
    try {
      const res = await apiCall('Available Credit', {
        VendorNo: header.VendorNo,
        InvoiceYear: header.InvoiceYear
      }, {}, 'acp');
      if (res.State === 0) {
        setAvailableCredit((res.List0 || [])[0]?.AvaliableCredit ?? 0);
      }
    } catch {
      // Non-critical -- header stat, drawer stays usable without it.
    }
    setCreditLoading(false);
  }

  async function fetchInvoices() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiCall('GetGridData', {
        PageGroupID: 'vendor_invoice_payment_details',
        vendorNo: header.VendorNo,
        invoiceYear: header.InvoiceYear
      }, {}, 'plus');
      if (res.State === 0) {
        setInvoices(res.List0 || []);
      } else {
        setError(res.Message || 'Failed to load invoices.');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setLoading(false);
  }

  function originalPaid(inv) { return Number(inv.PaidAmount) || 0; }
  function currentPaid(inv) {
    const override = paidOverrides && paidOverrides[inv.InternalID];
    return override != null ? override : originalPaid(inv);
  }

  // Available Credit is only consumed by NEW allocation (the delta above each
  // invoice's own already-recorded Paid Amount) -- not by the baseline itself,
  // which the backend's Available Credit figure already accounts for.
  const allocatedFromCredit = useMemo(() =>
    invoices.reduce((sum, inv) => sum + (currentPaid(inv) - originalPaid(inv)), 0)
  , [invoices, paidOverrides]);

  const remainingCredit = (Number(availableCredit) || 0) - allocatedFromCredit;

  function handleAutoPay() {
    setValidationMsg(null);
    const sorted = [...invoices].sort((a, b) => new Date(a.InvoiceDueDate) - new Date(b.InvoiceDueDate));
    let remaining = Number(availableCredit) || 0;
    const allocations = {};
    for (const inv of sorted) {
      const existingPaid = Number(inv.PaidAmount) || 0;
      const unpaid = Number(inv.UnPaidAmount) || 0;
      const pay = remaining > 0 ? Math.min(unpaid, remaining) : 0;
      allocations[inv.InternalID] = existingPaid + pay;
      remaining -= pay;
    }
    setPaidOverrides(allocations);
  }

  const displayInvoices = useMemo(() => {
    if (!paidOverrides) return invoices;
    return invoices.map(inv => {
      const paid = paidOverrides[inv.InternalID];
      if (paid == null) return inv;
      return { ...inv, PaidAmount: paid, UnPaidAmount: (Number(inv.TotalFinalAmount) || 0) - paid };
    });
  }, [invoices, paidOverrides]);

  // Manual edit of a single invoice's Paid Amount -- clamped by both rules:
  // cannot exceed that invoice's own Total Amount, and cannot push the sum of
  // all Paid Amounts past Available Credit.
  function handlePaidAmountChange(internalId, rawValue) {
    const invoice = invoices.find(inv => inv.InternalID === internalId);
    if (!invoice) return;

    let value = Number(rawValue);
    if (!isFinite(value) || value < 0) value = 0;

    let msg = null;
    const invoiceTotal = Number(invoice.TotalFinalAmount) || 0;
    if (value > invoiceTotal) {
      value = invoiceTotal;
      msg = 'Paid amount cannot exceed the invoice amount.';
    }

    const baseline = originalPaid(invoice);
    const othersAllocated = invoices.reduce((sum, inv) =>
      inv.InternalID === internalId ? sum : sum + (currentPaid(inv) - originalPaid(inv)), 0);
    const credit = Number(availableCredit) || 0;
    const newDelta = value - baseline;
    if (othersAllocated + newDelta > credit) {
      value = baseline + Math.max(0, credit - othersAllocated);
      msg = 'Total paid amount cannot exceed available credit.';
    }

    setValidationMsg(msg);
    setPaidOverrides(prev => ({ ...(prev || {}), [internalId]: value }));
  }

  // Only invoices with a newly-allocated amount (Auto Pay or manual edit)
  // above their already-recorded baseline get sent -- 'Pay Vendor Invoices'
  // adds PaidAmount to the invoice's existing PaidAmount, so this must be the
  // delta, not the absolute displayed value.
  const pendingLines = useMemo(() =>
    invoices
      .map(inv => ({ inv, delta: currentPaid(inv) - originalPaid(inv) }))
      .filter(({ delta }) => delta > 0)
  , [invoices, paidOverrides]);

  async function handleSavePayment() {
    if (pendingLines.length === 0) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const lines = pendingLines.map(({ inv, delta }) => ({
        HeaderInternalID: header.InternalID,
        InvoiceInternalID: inv.InternalID,
        PaidAmount: delta,
        Note: ''
      }));
      const res = await apiCall('Pay Vendor Invoices', lines, {}, 'acp');
      if (res.State !== 0) {
        setError(res.Message || 'Failed to save payment.');
      } else {
        setSuccessMsg('Payment saved.');
        setPaidOverrides(null);
        await Promise.all([fetchInvoices(), fetchAvailableCredit()]);
      }
    } catch (err) {
      setError(err.message || 'Connection error.');
    }
    setSaving(false);
  }

  const totals = useMemo(() => displayInvoices.reduce((acc, r) => {
    acc.TotalFinalAmount += Number(r.TotalFinalAmount) || 0;
    acc.PaidAmount += Number(r.PaidAmount) || 0;
    acc.UnPaidAmount += Number(r.UnPaidAmount) || 0;
    return acc;
  }, { TotalFinalAmount: 0, PaidAmount: 0, UnPaidAmount: 0 }), [displayInvoices]);

  const columns = [
    { key: 'InternalID', label: 'ID', width: 90, numeric: true, render: v => String(Number(v) || 0) },
    { key: 'InvoiceDate', label: 'Invoice Date', width: 120, render: fmtDate },
    { key: 'InvoiceDueDate', label: 'Due Date', width: 120, render: fmtDate },
    { key: 'TotalFinalAmount', label: 'Total Amount', width: 140, numeric: true, render: fmtMoney },
    {
      key: 'PaidAmount', label: 'Paid Amount', width: 150, numeric: true,
      render: (v, row) => (
        <input
          type="number"
          min={0}
          max={Number(row.TotalFinalAmount) || 0}
          step="0.01"
          value={v ?? 0}
          onChange={e => handlePaidAmountChange(row.InternalID, e.target.value)}
          style={{
            width: '100%', height: 28, textAlign: 'right', border: '1px solid var(--border)',
            borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5, padding: '0 8px'
          }}
        />
      )
    },
    { key: 'UnPaidAmount', label: 'Unpaid Amount', width: 140, numeric: true, render: fmtMoney }
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: 900, maxWidth: '96vw', background: 'var(--bg)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '20px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
            💰 {header.VendorName || `Vendor ${header.VendorNo}`} — {header.InvoiceYear}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={onClose}
              style={{ height: 36, padding: '0 16px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
            >
              Close
            </button>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: 'var(--soft)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 24, gap: 16, overflow: 'hidden' }}>
          {error && (
            <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
              ⚠ {error}
            </div>
          )}

          <div style={{
            background: 'linear-gradient(135deg, var(--orange), var(--orange2))', borderRadius: 14, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', color: '#fff', boxShadow: '0 4px 16px var(--orange-glow)'
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.85 }}>Invoices</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{invoices.length}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.85 }}>Total Amount</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{fmtMoney(totals.TotalFinalAmount)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.85 }}>Paid</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{fmtMoney(totals.PaidAmount)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.85 }}>Unpaid</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{fmtMoney(totals.UnPaidAmount)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.85 }}>Available Credit</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{creditLoading ? '…' : fmtMoney(remainingCredit)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: validationMsg ? 'var(--red)' : 'var(--green, #16a34a)' }}>
              {validationMsg ? <>⚠ {validationMsg}</> : successMsg ? <>✓ {successMsg}</> : null}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleAutoPay}
                disabled={creditLoading || !availableCredit || invoices.length === 0 || saving}
                style={{
                  height: 34, padding: '0 20px', background: 'var(--soft)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                  cursor: (creditLoading || !availableCredit || invoices.length === 0 || saving) ? 'default' : 'pointer',
                  opacity: (creditLoading || !availableCredit || invoices.length === 0 || saving) ? 0.6 : 1
                }}
              >
                ⚡ Auto Pay
              </button>
              <button
                onClick={handleSavePayment}
                disabled={saving || pendingLines.length === 0}
                style={{
                  height: 34, padding: '0 20px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                  cursor: (saving || pendingLines.length === 0) ? 'default' : 'pointer',
                  opacity: (saving || pendingLines.length === 0) ? 0.6 : 1,
                  boxShadow: '0 4px 12px var(--orange-glow)'
                }}
              >
                {saving ? 'Saving...' : '💾 Save Payment'}
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <DataGrid
              rows={displayInvoices}
              columns={columns}
              loading={loading}
              hideSearch
            />
          </div>
        </div>
      </div>
    </div>
  );
}
