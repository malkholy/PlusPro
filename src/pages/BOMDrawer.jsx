import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

function formatQty(val) {
  if (val == null || val === '') return '0.00';
  const n = Number(val);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BOMDrawer({ parentItemCode, parentItemDescription, parentUnitCost = 0, prodRate = 35, onClose }) {
  const [lines, setLines] = useState([]);
  const [formula, setFormula] = useState([]);
  const [prices, setPrices] = useState([]);
  const [activeTab, setActiveTab] = useState('lines'); // 'lines', 'formula', or 'prices'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [discount, setDiscount] = useState(25); // Default discount 25%

  useEffect(() => {
    if (!parentItemCode) return;
    async function fetchBOMDetails() {
      setLoading(true);
      setError('');
      try {
        if (activeTab === 'lines') {
          const res = await apiCall('BOM L1 Line', { ParentItemCode: parentItemCode });
          if (res.State !== 0) {
            setError(res.Message || 'Failed to load BOM lines.');
            setLines([]);
          } else {
            setLines(res.List0 || []);
          }
        } else if (activeTab === 'formula') {
          const res = await apiCall('BOM L1 Formula', { ParentItemCode: parentItemCode });
          if (res.State !== 0) {
            setError(res.Message || 'Failed to load BOM formula.');
            setFormula([]);
          } else {
            setFormula(res.List0 || []);
          }
        } else if (activeTab === 'prices') {
          const res = await apiCall('BOM L1 Price Lists', { ParentItemCode: parentItemCode });
          if (res.State !== 0) {
            setError(res.Message || 'Failed to load price lists.');
            setPrices([]);
          } else {
            setPrices(res.List0 || []);
          }
        }
      } catch (err) {
        console.error(err);
        setError('Connection error: ' + err.message);
      }
      setLoading(false);
    }
    fetchBOMDetails();
  }, [parentItemCode, activeTab]);

  if (!parentItemCode) return null;

  const activeData = activeTab === 'lines' ? lines : activeTab === 'formula' ? formula : prices;
  const totalLines = activeData.length;
  const totalQty = activeTab !== 'prices' ? activeData.reduce((sum, item) => sum + Number(item.Quantity || 0), 0) : 0;
  const distinctChildTypes = activeTab !== 'prices' ? new Set(activeData.map(item => item.ChildItemType).filter(Boolean)).size : 0;

  const totalCostVal = activeTab === 'lines'
    ? lines.reduce((sum, item) => sum + Number(item.TotalCost || 0), 0)
    : 0;

  const totalFinalCostVal = totalCostVal * (1 + prodRate / 100);

  const highestPrice = activeTab === 'prices' && prices.length > 0
    ? Math.max(...prices.map(p => Number(p.UnitPrice || p.PriceSellingUnit || 0)))
    : 0;

  const lowestPrice = activeTab === 'prices' && prices.length > 0
    ? Math.min(...prices.map(p => Number(p.UnitPrice || p.PriceSellingUnit || 0)))
    : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose} 
        style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
          animation: 'fadeIn 0.2s ease-out'
        }}
      ></div>

      {/* Slide-out Drawer Panel */}
      <div 
        style={{
          position: 'relative', width: '100%', maxWidth: '1100px', height: '100%',
          background: 'var(--surface)', borderLeft: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column',
          padding: '24px', animation: 'slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden'
        }}
      >
        {/* CSS Animations */}
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
          .drawer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
          .drawer-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
          .drawer-grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 20px; }
          .drawer-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
          .drawer-val { font-size: 13px; font-weight: 600; color: var(--text); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .drawer-item { background: var(--soft); border: 1px solid var(--border); border-radius: var(--radius-xs); padding: 10px 14px; }
        `}</style>

        {/* Drawer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div 
              style={{ 
                width: 48, height: 48, borderRadius: '12px', 
                background: 'linear-gradient(135deg, var(--orange), var(--orange-dark))', 
                color: '#fff', fontSize: '18px', fontWeight: 800, 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow)'
              }}
            >
              BM
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                Bill of Materials Level 1
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div>Parent Item Code: <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--orange)' }}>{parentItemCode}</span></div>
                {parentItemDescription && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{parentItemDescription}</div>}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{
              width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)',
              background: 'var(--soft)', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text)',
              transition: 'background 0.2s'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 18, marginBottom: 20 }}>
          {[
            { id: 'lines', label: '📋 Component Lines' },
            { id: 'formula', label: '🧪 Formula Details' },
            { id: 'prices', label: '💰 Price Lists' }
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => setActiveTab(t.id)} 
              style={{
                background: 'none', border: 'none', padding: '8px 4px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', color: activeTab === t.id ? 'var(--orange)' : 'var(--muted)',
                borderBottom: activeTab === t.id ? '2.5px solid var(--orange)' : '2.5px solid transparent',
                transition: 'all 0.15s ease', fontFamily: 'var(--font)', marginBottom: -1
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* KPI Cards inside Drawer */}
        <div className={activeTab === 'lines' || activeTab === 'prices' ? "drawer-grid-5" : "drawer-grid"}>
          <div className="drawer-item">
            <div className="drawer-label">Total Records</div>
            <div className="drawer-val">{totalLines.toLocaleString()}</div>
          </div>
          <div className="drawer-item">
            <div className="drawer-label">{activeTab === 'prices' ? 'Primary Selling UM' : 'Child Item Types'}</div>
            <div className="drawer-val" style={{ color: 'var(--blue)' }}>
              {activeTab === 'prices' ? (prices[0]?.SellingUM || '—') : distinctChildTypes}
            </div>
          </div>
          {activeTab === 'lines' && (
            <>
              <div className="drawer-item">
                <div className="drawer-label">Sum Quantity</div>
                <div className="drawer-val" style={{ color: 'var(--orange)' }}>{formatQty(totalQty)}</div>
              </div>
              <div className="drawer-item">
                <div className="drawer-label">Total Cost</div>
                <div className="drawer-val" style={{ color: 'var(--hint)' }}>{formatQty(totalCostVal)}</div>
              </div>
              <div className="drawer-item" style={{ background: 'var(--orange-soft)', borderColor: 'rgba(249,115,22,0.2)' }}>
                <div className="drawer-label" style={{ color: 'var(--orange)' }}>Total Final Cost</div>
                <div className="drawer-val" style={{ color: 'var(--orange-dark)' }}>{formatQty(totalFinalCostVal)}</div>
              </div>
            </>
          )}
          {activeTab === 'formula' && (
            <div className="drawer-item">
              <div className="drawer-label">Sum Quantity</div>
              <div className="drawer-val" style={{ color: 'var(--orange)' }}>{formatQty(totalQty)}</div>
            </div>
          )}
          {activeTab === 'prices' && (
            <>
              <div className="drawer-item">
                <div className="drawer-label">Avg Selling Price</div>
                <div className="drawer-val" style={{ color: 'var(--orange)' }}>
                  {formatQty(prices.reduce((sum, p) => sum + Number(p.UnitPrice || 0), 0) / (prices.length || 1))}
                </div>
              </div>
              <div className="drawer-item">
                <div className="drawer-label">Highest Price</div>
                <div className="drawer-val" style={{ color: 'var(--green)' }}>{formatQty(highestPrice)}</div>
              </div>
              <div className="drawer-item">
                <div className="drawer-label">Lowest Price</div>
                <div className="drawer-val" style={{ color: 'var(--red)' }}>{formatQty(lowestPrice)}</div>
              </div>
            </>
          )}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner"></div></div>
          ) : error ? (
            <div className="err-page">{error}</div>
          ) : (
            <div className="table-panel" style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 0 }}>
              
              {/* Discount control input for Price Lists tab */}
              {activeTab === 'prices' && prices.length > 0 && (
                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Discount:</span>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px' }}>
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        style={{
                          width: '60px',
                          height: '30px',
                          border: 'none',
                          background: 'var(--surface)',
                          borderRadius: '7px',
                          textAlign: 'center',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: 'var(--text)',
                          outline: 'none',
                          fontFamily: 'var(--font)'
                        }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: '700', padding: '0 8px', color: 'var(--muted)' }}>%</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Parent Item Unit Cost: <strong style={{ color: 'var(--text)' }}>{formatQty(parentUnitCost)} EGP</strong>
                  </span>
                </div>
              )}

              <div className="table-wrap" style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    {activeTab === 'lines' ? (
                      <tr>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Line No</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Child Item Code</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Child Item Description</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Child Item Type</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Quantity</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Cost</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Cost</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Final Cost ({prodRate}%)</th>
                      </tr>
                    ) : activeTab === 'formula' ? (
                      <tr>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Formula ID</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Line No</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Child Item Code</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Child Description</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Child Type</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Quantity</th>
                      </tr>
                    ) : (
                      <tr>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Price Type ID</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Price Type Description</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Selling UM</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Selling Price</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Selling Conversion</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Unit Price</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Final Cost ({prodRate}%)</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Net Price ({discount}%)</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Profit</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Profit Margin</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {activeData.length === 0 ? (
                      <tr>
                        <td colSpan={activeTab === 'lines' ? 8 : activeTab === 'formula' ? 6 : 10} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                          No records found.
                        </td>
                      </tr>
                    ) : activeTab === 'lines' ? (
                      lines.map((item, idx) => (
                        <tr key={idx} className="hover-row" style={{ 
                          borderBottom: '1px solid var(--border)',
                          background: (item.LastCost == null || Number(item.LastCost) === 0) ? 'rgba(239, 68, 68, 0.08)' : 'transparent'
                        }}>
                          <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 700, color: 'var(--muted)' }}>{item.line || idx + 1}</td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', fontFamily: 'var(--mono)', color: 'var(--text)' }}>{item.ChildItemCode || '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text)', whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.ChildItemDescription || '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text)' }}>
                            <span style={{
                              padding: '2px 6px',
                              background: 'var(--soft)',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                              fontSize: '11px'
                            }}>{item.ChildItemType || '—'}</span>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 700, color: 'var(--orange)', textAlign: 'right' }}>
                            {formatQty(item.Quantity)}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text)', textAlign: 'right' }}>
                            {formatQty(item.LastCost)}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 700, color: 'var(--muted)', textAlign: 'right' }}>
                            {formatQty(item.TotalCost)}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 700, color: 'var(--green)', textAlign: 'right' }}>
                            {formatQty(Number(item.TotalCost || 0) * (1 + prodRate / 100))}
                          </td>
                        </tr>
                      ))
                    ) : activeTab === 'formula' ? (
                      formula.map((item, idx) => (
                        <tr key={idx} className="hover-row" style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{item.LineFormulaID || '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--muted)' }}>{item.Line || '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', fontFamily: 'var(--mono)', color: 'var(--text)' }}>{item.ChildItemCode || '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text)', whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.ChildItemDescription || '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text)' }}>
                            <span style={{
                              padding: '2px 6px',
                              background: 'var(--soft)',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                              fontSize: '11px'
                            }}>{item.ChildItemType || '—'}</span>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 700, color: 'var(--orange)', textAlign: 'right' }}>
                            {formatQty(item.Quantity)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      prices.map((item, idx) => {
                        const unitPrice = Number(item.UnitPrice || 0);
                        const parentFinalCost = parentUnitCost * (1 + prodRate / 100);
                        const netPrice = unitPrice * (1 - discount / 100);
                        const profit = netPrice - parentFinalCost;
                        const margin = netPrice > 0 ? (profit / netPrice) * 100 : 0;
                        const isProfitPositive = profit >= 0;

                        return (
                          <tr key={idx} className="hover-row" style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 700, color: 'var(--muted)' }}>{item.PriceTypeID || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{item.PriceTypeDescription || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text)' }}>{item.SellingUM || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text)', textAlign: 'right' }}>
                              {formatQty(item.PriceSellingUnit)}
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--muted)', textAlign: 'right' }}>
                              {formatQty(item.SellingConversion)}
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>
                              {formatQty(unitPrice)}
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 700, color: 'var(--orange-dark)', textAlign: 'right' }}>
                              {formatQty(parentFinalCost)}
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 700, color: 'var(--orange)', textAlign: 'right' }}>
                              {formatQty(netPrice)}
                            </td>
                            <td style={{ 
                              padding: '10px 12px', fontSize: '13px', fontWeight: 800, textAlign: 'right',
                              color: isProfitPositive ? 'var(--green)' : '#ef4444'
                            }}>
                              {formatQty(profit)}
                            </td>
                            <td style={{ 
                              padding: '10px 12px', fontSize: '13px', fontWeight: 800, textAlign: 'right',
                              color: isProfitPositive ? 'var(--green)' : '#ef4444'
                            }}>
                              {margin.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {activeData.length > 0 && (
                    <tfoot>
                      {activeTab === 'lines' ? (
                        <tr style={{ background: 'var(--soft)', borderTop: '2px solid var(--orange)', fontWeight: 800, position: 'sticky', bottom: 0, zIndex: 1 }}>
                          <td colSpan="4" style={{ padding: '12px 12px', fontSize: '13px', color: 'var(--text)' }}>Total</td>
                          <td style={{ padding: '12px 12px', fontSize: '13px', color: 'var(--orange)', textAlign: 'right', fontWeight: 800 }}>
                            {formatQty(totalQty)}
                          </td>
                          <td style={{ padding: '12px 12px', fontSize: '13px', color: 'var(--muted)', textAlign: 'right' }}>—</td>
                          <td style={{ padding: '12px 12px', fontSize: '13px', color: 'var(--muted)', textAlign: 'right', fontWeight: 800 }}>
                            {formatQty(totalCostVal)}
                          </td>
                          <td style={{ padding: '12px 12px', fontSize: '13px', color: 'var(--green)', textAlign: 'right', fontWeight: 800 }}>
                            {formatQty(totalFinalCostVal)}
                          </td>
                        </tr>
                      ) : activeTab === 'formula' ? (
                        <tr style={{ background: 'var(--soft)', borderTop: '2px solid var(--orange)', fontWeight: 800, position: 'sticky', bottom: 0, zIndex: 1 }}>
                          <td colSpan="5" style={{ padding: '12px 12px', fontSize: '13px', color: 'var(--text)' }}>Total</td>
                          <td style={{ padding: '12px 12px', fontSize: '13px', color: 'var(--orange)', textAlign: 'right', fontWeight: 800 }}>
                            {formatQty(totalQty)}
                          </td>
                        </tr>
                      ) : null}
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
