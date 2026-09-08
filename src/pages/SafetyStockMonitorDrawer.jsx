import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';

const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 };

// Last 12 calendar months ending with the current month, oldest first.
function last12MonthBuckets() {
  const now = new Date();
  const buckets = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      key: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' })
    });
  }
  return buckets;
}

export default function SafetyStockMonitorDrawer({ user, editRow, onClose, onSaveSuccess }) {
  const isEditMode = !!editRow;

  const [activeTab, setActiveTab] = useState('details');

  const [itemOptions, setItemOptions] = useState([]);
  const [itemID, setItemID] = useState(editRow?.ItemID || '');
  const [itemCode, setItemCode] = useState(editRow?.ItemCode || '');
  const [itemDescription, setItemDescription] = useState(editRow?.ItemDescription || '');
  const [leadTime, setLeadTime] = useState(editRow?.LeadTime ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState('');
  const [salesLoadedForItemID, setSalesLoadedForItemID] = useState(null);
  const [salesBuckets, setSalesBuckets] = useState([]);

  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState('');
  const [balanceLoadedForItemID, setBalanceLoadedForItemID] = useState(null);
  const [balanceRows, setBalanceRows] = useState([]);

  useEffect(() => {
    apiCall('Item Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setItemOptions((d.List0 || []).map(i => ({
          label: `${i.ItemCode} - ${i.ItemName}`,
          value: i.ItemID,
          itemCode: i.ItemCode,
          itemName: i.ItemName,
          sellingUM: i.SellingUM
        })));
      }
    });
  }, [user]);

  const handleItemChange = (id) => {
    setItemID(id);
    const opt = itemOptions.find(o => String(o.value) === String(id));
    if (opt) {
      setItemCode(opt.itemCode || '');
      setItemDescription(opt.itemName || '');
    }
  };

  async function loadSales() {
    if (!itemID) return;
    setSalesLoading(true);
    setSalesError('');
    try {
      const buckets = last12MonthBuckets();
      const years = [...new Set(buckets.map(b => b.year))];
      const results = await Promise.all(years.map(y => apiCall(
        'GetItemCustomerMonthlySales',
        { Period: 'yearly', Months: '', Quarter: 0, Year: y, Customer: '', ItemID: itemID, SalesPerson: '' },
        { User: user?.Username },
        'plus'
      )));
      const totals = new Map();
      for (const res of results) {
        if (res.State !== 0) throw new Error(res.Message || 'Failed to load sales data.');
        for (const r of (res.List0 || [])) {
          const key = `${r.InvoiceYear}-${r.InvoiceMonth}`;
          totals.set(key, (totals.get(key) || 0) + (Number(r.QtyBox) || 0));
        }
      }
      setSalesBuckets(buckets.map(b => ({ ...b, qty: totals.get(b.key) || 0 })));
      setSalesLoadedForItemID(itemID);
    } catch (e) {
      setSalesError(e.message || 'Connection error.');
    } finally {
      setSalesLoading(false);
    }
  }

  useEffect(() => {
    if (itemID && salesLoadedForItemID !== itemID) {
      loadSales();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemID]);

  async function loadBalance() {
    if (!itemID || !itemCode) return;
    setBalanceLoading(true);
    setBalanceError('');
    try {
      const res = await apiCall('GetGridData', { PageGroupID: 'item_balance', fromItem: itemCode, toItem: itemCode }, { User: user?.Username }, 'plus');
      if (res.State !== 0) throw new Error(res.Message || 'Failed to load balance data.');
      setBalanceRows((res.List0 || []).filter(r => r.Warehouse === '2FG'));
      setBalanceLoadedForItemID(itemID);
    } catch (e) {
      setBalanceError(e.message || 'Connection error.');
    } finally {
      setBalanceLoading(false);
    }
  }

  useEffect(() => {
    if (itemID && balanceLoadedForItemID !== itemID) {
      loadBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemID]);

  // Shared derived KPI figures, shown in the header and reused by the
  // Sales/Balance/Safty Stock tabs -- loaded as soon as an item is picked
  // (not gated by which tab is active).
  const boxQty = (r) => (Number(r.ItemBalance) || 0) / (Number(r.SellingConversion) || 1);
  const avgMonthlySales = salesBuckets.length > 0 ? salesBuckets.reduce((sum, b) => sum + b.qty, 0) / salesBuckets.length : 0;
  const totalBalance = balanceRows.reduce((sum, r) => sum + boxQty(r), 0);
  const avgDailyUsage = avgMonthlySales / 30;
  const leadTimeDays = Number(leadTime) || 0;
  const safetyStockQty = avgDailyUsage * leadTimeDays;
  const reorderPoint = safetyStockQty + (avgDailyUsage * leadTimeDays);
  const stockState = totalBalance < safetyStockQty ? 'Critical' : totalBalance < reorderPoint ? 'Reorder' : 'OK';
  const stockStateColors = {
    OK: { bg: '#DCFCE7', border: '#86EFAC', text: '#15803D' },
    Reorder: { bg: '#FEF3C7', border: '#FCD34D', text: '#B45309' },
    Critical: { bg: '#FEE2E2', border: '#FCA5A5', text: '#B91C1C' }
  };
  const safetyDataReady = salesLoadedForItemID === itemID && balanceLoadedForItemID === itemID;
  const sellingUM = itemOptions.find(o => String(o.value) === String(itemID))?.sellingUM || '';
  const fmtQty = (n, digits = 2) => `${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: digits })}${sellingUM ? ' ' + sellingUM : ''}`;

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!itemID) {
      setError('Please select an item.');
      return;
    }

    setSaving(true);

    const payload = {
      PageGroupID: 'safety_stock_monitor',
      ItemID: Number(itemID),
      ItemCode: itemCode,
      LeadTime: leadTime === '' ? null : Number(leadTime)
    };

    try {
      const res = await apiCall('GenericRecordSave', payload, { User: user?.Username }, 'plus');
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
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '560px', backgroundColor: '#fff', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>
            {isEditMode ? `Edit Safety Stock: ${editRow.ItemCode}` : 'New Safety Stock Monitor'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748B' }}>×</button>
        </div>

        {itemID && (
          <div style={{ display: 'flex', gap: 10, padding: '14px 24px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', overflowX: 'auto' }}>
            {(salesLoading || balanceLoading) && !safetyDataReady && (
              <div style={{ fontSize: 12, color: '#94A3B8', alignSelf: 'center' }}>Loading KPIs...</div>
            )}
            {safetyDataReady && (
              <>
                <div style={{ background: stockStateColors[stockState].bg, border: `1px solid ${stockStateColors[stockState].border}`, borderRadius: 8, padding: '8px 14px', minWidth: 92, flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: stockStateColors[stockState].text, textTransform: 'uppercase', letterSpacing: 0.3 }}>Stock State</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: stockStateColors[stockState].text }}>{stockState}</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 14px', minWidth: 92, flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.3 }}>Avg / Month</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>{fmtQty(avgMonthlySales, 1)}</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 14px', minWidth: 92, flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.3 }}>Balance</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>{fmtQty(totalBalance, 1)}</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 14px', minWidth: 92, flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.3 }}>Safety Stock</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>{fmtQty(safetyStockQty, 1)}</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 14px', minWidth: 92, flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.3 }}>Re-Order Pt</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>{fmtQty(reorderPoint, 1)}</div>
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, padding: '0 24px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#fff' }}>
          {[{ id: 'details', label: 'Details' }, { id: 'sales', label: 'Sales' }, { id: 'balance', label: 'Balance' }, { id: 'safety', label: 'Safty Stock' }].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                color: activeTab === t.id ? '#2563EB' : '#64748B',
                borderBottom: activeTab === t.id ? '2px solid #2563EB' : '2px solid transparent',
                marginBottom: -1
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, backgroundColor: '#F8FAFC' }}>
          {activeTab === 'details' && (
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
                  <div>
                    <label style={labelStyle}>Item Code</label>
                    <input value={itemCode} readOnly style={{ ...inputStyle, background: '#F1F5F9', color: '#64748B' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Item Description</label>
                    <input value={itemDescription} readOnly style={{ ...inputStyle, background: '#F1F5F9', color: '#64748B' }} />
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#334155' }}>Safety Stock</h3>
                <div>
                  <label style={labelStyle}>Lead Time (days)</label>
                  <input type="number" value={leadTime} onChange={e => setLeadTime(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sales' && (
            <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: 16, color: '#334155' }}>Sales -- Last 12 Months</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: 12, color: '#94A3B8' }}>Sum(Invoiced Qty) / Selling Conversion, per month</p>

              {!itemID && <div style={{ fontSize: 13, color: '#94A3B8' }}>Select an item first.</div>}
              {itemID && salesLoading && <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading...</div>}
              {itemID && salesError && <div style={{ padding: 12, backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 6, fontSize: 13 }}>{salesError}</div>}

              {itemID && !salesLoading && !salesError && salesBuckets.length > 0 && (() => {
                const maxQty = Math.max(...salesBuckets.map(b => b.qty), 0.0001);
                const avgQty = salesBuckets.reduce((sum, b) => sum + b.qty, 0) / salesBuckets.length;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 2, alignSelf: 'flex-start', minWidth: 160 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', textTransform: 'uppercase', letterSpacing: 0.3 }}>Average / Month</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#1E3A8A' }}>
                        {fmtQty(avgQty)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {salesBuckets.map(b => (
                      <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 52, fontSize: 12, color: '#64748B', flexShrink: 0 }}>{b.label}</div>
                        <div style={{ flex: 1, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden', height: 18 }}>
                          <div style={{ width: `${(b.qty / maxQty) * 100}%`, background: '#2563EB', height: '100%', borderRadius: 4 }} />
                        </div>
                        <div style={{ width: 90, textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: '#1E293B', flexShrink: 0 }}>
                          {fmtQty(b.qty)}
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'balance' && (
            <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: 16, color: '#334155' }}>Item Balance</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: 12, color: '#94A3B8' }}>Current on-hand balance -- Warehouse 2FG</p>

              {!itemID && <div style={{ fontSize: 13, color: '#94A3B8' }}>Select an item first.</div>}
              {itemID && balanceLoading && <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading...</div>}
              {itemID && balanceError && <div style={{ padding: 12, backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 6, fontSize: 13 }}>{balanceError}</div>}

              {itemID && !balanceLoading && !balanceError && (() => {
                const boxQty = (r) => (Number(r.ItemBalance) || 0) / (Number(r.SellingConversion) || 1);
                const totalBalance = balanceRows.reduce((sum, r) => sum + boxQty(r), 0);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 2, alignSelf: 'flex-start', minWidth: 160 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', textTransform: 'uppercase', letterSpacing: 0.3 }}>Total Balance</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#1E3A8A' }}>
                        {fmtQty(totalBalance)}
                      </div>
                    </div>

                    {balanceRows.length === 0 ? (
                      <div style={{ fontSize: 13, color: '#94A3B8' }}>No balance records found.</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Warehouse</th>
                            <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {balanceRows.map((r, i) => (
                            <tr key={i}>
                              <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', color: '#1E293B' }}>{r.Warehouse}</td>
                              <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', textAlign: 'right', fontWeight: 600, color: '#1E293B' }}>
                                {fmtQty(boxQty(r))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'safety' && (
            <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: 16, color: '#334155' }}>Safty Stock</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: 12, color: '#94A3B8' }}>Based on average daily usage (last 12 months) &times; lead time</p>

              {!itemID && <div style={{ fontSize: 13, color: '#94A3B8' }}>Select an item first.</div>}
              {itemID && !leadTime && <div style={{ padding: 12, backgroundColor: '#FEF3C7', color: '#B45309', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>Set a Lead Time on the Details tab to compute Safety Stock Qty and Re-Order Point.</div>}
              {itemID && (salesLoading || balanceLoading) && <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading...</div>}
              {itemID && (salesError || balanceError) && <div style={{ padding: 12, backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 6, fontSize: 13 }}>{salesError || balanceError}</div>}

              {itemID && safetyDataReady && !salesLoading && !balanceLoading && !salesError && !balanceError && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{
                    background: stockStateColors[stockState].bg, border: `1px solid ${stockStateColors[stockState].border}`,
                    borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 2, alignSelf: 'flex-start', minWidth: 160
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: stockStateColors[stockState].text, textTransform: 'uppercase', letterSpacing: 0.3 }}>Stock State</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: stockStateColors[stockState].text }}>{stockState}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.3 }}>Safety Stock Qty</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#1E293B' }}>{fmtQty(safetyStockQty)}</div>
                    </div>
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.3 }}>Re-Order Point</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#1E293B' }}>{fmtQty(reorderPoint)}</div>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px 10px', color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>Current Balance</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#1E293B', borderBottom: '1px solid #F1F5F9' }}>{fmtQty(totalBalance)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 10px', color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>Average Monthly Sales</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#1E293B', borderBottom: '1px solid #F1F5F9' }}>{fmtQty(avgMonthlySales)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 10px', color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>Average Daily Usage</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#1E293B', borderBottom: '1px solid #F1F5F9' }}>{fmtQty(avgDailyUsage, 3)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 10px', color: '#64748B' }}>Lead Time (days)</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#1E293B' }}>{leadTimeDays}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
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
