import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import DataGrid from '../shared/DataGrid.jsx';

// Helper formatting utilities
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatAmount(val, currency) {
  if (val == null || val === '') return '—';
  const num = Number(val);
  const formatted = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${formatted} ${currency}` : formatted;
}

function formatQty(val) {
  if (val == null || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return val;
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function getFirstDayOfCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function getLastDayOfCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, '0');
  return `${year}-${monthStr}-${lastDay}`;
}

function highlightText(text, highlight) {
  if (!highlight) return <span>{text}</span>;
  const str = String(text || '');
  const parts = str.split(new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() 
          ? <mark key={i} style={{ background: 'rgba(249,115,22,0.25)', color: 'inherit', padding: '1px 2px', borderRadius: 2 }}>{part}</mark>
          : part
      )}
    </span>
  );
}

// Searchable Vendor Select Dropdown ComboBox
function SearchableVendorSelect({ value, onChange, options, placeholder = "Select Vendor" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const selectedOption = options.find(opt => opt.VendorNumber === value);
  const triggerLabel = selectedOption 
    ? `${selectedOption.VendorName} (${selectedOption.VendorNumber})` 
    : placeholder;

  const filteredOptions = options.filter(opt => 
    String(opt.VendorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(opt.VendorNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".searchable-select-container")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="searchable-select-container" style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm("");
        }}
        style={{
          height: 32,
          padding: '0 12px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--soft)',
          color: 'var(--text)',
          fontSize: 12.5,
          fontFamily: 'var(--font)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'all 0.15s'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: value ? 600 : 500 }}>{triggerLabel}</span>
        <span style={{ fontSize: 9, color: 'var(--orange)', marginLeft: 6 }}>▼</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 36,
          left: 0,
          right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
          zIndex: 1000,
          maxHeight: 260,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--border)', background: 'var(--soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12 }}>🔍</span>
            <input 
              type="text"
              placeholder="Search by vendor name or code..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
              style={{
                height: 30,
                width: '100%',
                padding: '0 8px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--surface)',
                color: 'var(--text)',
                outline: 'none',
                fontSize: 12,
                fontFamily: 'var(--font)'
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: 220 }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 12.5, textAlign: 'center' }}>No vendors found</div>
            ) : (
              <>
                {value && (
                  <div 
                    onClick={() => {
                      onChange('');
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: 12.5,
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--orange)',
                      fontWeight: 600,
                      background: 'rgba(249,115,22,0.04)'
                    }}
                  >
                    ✕ Clear Selection
                  </div>
                )}
                {filteredOptions.map((opt, i) => (
                  <div 
                    key={i}
                    onClick={() => {
                      onChange(opt.VendorNumber);
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '10px 12px',
                      fontSize: 12.5,
                      cursor: 'pointer',
                      background: value === opt.VendorNumber ? 'var(--orange-soft)' : 'transparent',
                      color: value === opt.VendorNumber ? 'var(--orange2)' : 'var(--text)',
                      fontWeight: value === opt.VendorNumber ? 700 : 500,
                      borderBottom: '1px solid rgba(0,0,0,0.02)',
                      transition: 'background .12s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--soft)'}
                    onMouseLeave={e => e.currentTarget.style.background = value === opt.VendorNumber ? 'var(--orange-soft)' : 'transparent'}
                  >
                    <div style={{ fontWeight: 600 }}>{opt.VendorName}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>Code: {opt.VendorNumber}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Searchable Item Select Dropdown ComboBox
function SearchableItemSelect({ value, onChange, options, placeholder = "Select Item" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const selectedOption = options.find(opt => opt.ItemCode === value);
  const triggerLabel = selectedOption 
    ? `${selectedOption.ItemDescription} (${selectedOption.ItemCode})` 
    : placeholder;

  const filteredOptions = options.filter(opt => 
    String(opt.ItemDescription || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(opt.ItemCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".searchable-item-container")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="searchable-item-container" style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm("");
        }}
        style={{
          height: 32,
          padding: '0 12px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--soft)',
          color: 'var(--text)',
          fontSize: 12.5,
          fontFamily: 'var(--font)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'all 0.15s'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: value ? 600 : 500 }}>{triggerLabel}</span>
        <span style={{ fontSize: 9, color: 'var(--orange)', marginLeft: 6 }}>▼</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 36,
          left: 0,
          right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
          zIndex: 1000,
          maxHeight: 260,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--border)', background: 'var(--soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12 }}>🔍</span>
            <input 
              type="text"
              placeholder="Search by description or code..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
              style={{
                height: 30,
                width: '100%',
                padding: '0 8px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--surface)',
                color: 'var(--text)',
                outline: 'none',
                fontSize: 12,
                fontFamily: 'var(--font)'
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: 220 }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 12.5, textAlign: 'center' }}>No items found</div>
            ) : (
              <>
                {value && (
                  <div 
                    onClick={() => {
                      onChange('');
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: 12.5,
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--orange)',
                      fontWeight: 600,
                      background: 'rgba(249,115,22,0.04)'
                    }}
                  >
                    ✕ Clear Selection
                  </div>
                )}
                {filteredOptions.map((opt, i) => (
                  <div 
                    key={i}
                    onClick={() => {
                      onChange(opt.ItemCode);
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '10px 12px',
                      fontSize: 12.5,
                      cursor: 'pointer',
                      background: value === opt.ItemCode ? 'var(--orange-soft)' : 'transparent',
                      color: value === opt.ItemCode ? 'var(--orange2)' : 'var(--text)',
                      fontWeight: value === opt.ItemCode ? 700 : 500,
                      borderBottom: '1px solid rgba(0,0,0,0.02)',
                      transition: 'background .12s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--soft)'}
                    onMouseLeave={e => e.currentTarget.style.background = value === opt.ItemCode ? 'var(--orange-soft)' : 'transparent'}
                  >
                    <div style={{ fontWeight: 600 }}>{opt.ItemDescription}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>Code: {opt.ItemCode}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Component definition
export default function PurchaseOrderLinePage({ user }) {
  const cache = window.__poLineCache = window.__poLineCache || {};
  const [rows, setRows] = useState(cache.rows || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [fromDate, setFromDate] = useState(cache.fromDate || getFirstDayOfCurrentMonth());
  const [toDate, setToDate] = useState(cache.toDate || getLastDayOfCurrentMonth());
  const [selectedVendor, setSelectedVendor] = useState(cache.selectedVendor || '');
  const [selectedItem, setSelectedItem] = useState(cache.selectedItem || '');
  const [vendorsList, setVendorsList] = useState(cache.vendorsList || []);
  const [itemsList, setItemsList] = useState(cache.itemsList || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('none');
  const [selectedItemType, setSelectedItemType] = useState(cache.selectedItemType || '');

  // Drawer States
  const [selectedPO, setSelectedPO] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [poLines, setPoLines] = useState([]);
  const [poExtras, setPoExtras] = useState([]);
  const [poHistory, setPoHistory] = useState([]);
  const [poReceiving, setPoReceiving] = useState([]);
  const [expandedLines, setExpandedLines] = useState({});
  const [linesLoading, setLinesLoading] = useState(false);
  const [linesError, setLinesError] = useState('');
  const [activeDrawerTab, setActiveDrawerTab] = useState('lines');

  // Fetch PO Lines drawer content
  useEffect(() => {
    if (!selectedPO) {
      setPoLines([]);
      setPoExtras([]);
      setPoHistory([]);
      setPoReceiving([]);
      setExpandedLines({});
      return;
    }
    
    async function loadPOLines() {
      setLinesLoading(true);
      setLinesError('');
      try {
        const lineData = { OrderNumber: selectedPO.OrderNumber };
        const d = await apiCall('GetPurchaseOrderLines', lineData, {}, 'plus');
        if (d.State !== 0) {
          setLinesError(d.Message || 'Failed to load purchase lines.');
          setPoLines([]);
          setPoExtras([]);
          setPoHistory([]);
          setPoReceiving([]);
          setExpandedLines({});
        } else {
          setPoLines(d.List0 || []);
          setPoExtras(d.List1 || []);
          setPoHistory(d.List2 || []);
          setPoReceiving(d.List3 || []);
          setExpandedLines({});
        }
      } catch (e) {
        setLinesError('Connection error: ' + e.message);
        setPoLines([]);
        setPoExtras([]);
        setPoHistory([]);
        setPoReceiving([]);
        setExpandedLines({});
      }
      setLinesLoading(false);
    }
    
    loadPOLines();
  }, [selectedPO]);

  // Fetch vendors and items on mount
  useEffect(() => {
    async function loadVendors() {
      if (cache.vendorsList) return;
      try {
        const d = await apiCall('GetVendors', null, {}, 'plus');
        if (d.State === 0) {
          const list = d.List0 || [];
          setVendorsList(list);
          cache.vendorsList = list;
        }
      } catch (e) {
        console.error('Failed to load vendors list:', e);
      }
    }
    async function loadItems() {
      if (cache.itemsList) return;
      try {
        const d = await apiCall('GetItems', null, {}, 'plus');
        if (d.State === 0) {
          const list = d.List0 || [];
          setItemsList(list);
          cache.itemsList = list;
        }
      } catch (e) {
        console.error('Failed to load items list:', e);
      }
    }
    loadVendors();
    loadItems();
  }, []);

  // Fetch purchase order lines
  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const lineData = {
        FromDate: fromDate || null,
        ToDate: toDate || null,
        VendorNumber: selectedVendor || null,
        ItemCode: selectedItem || null
      };
      const d = await apiCall('GetPurchaseOrderLinesAll', lineData, {}, 'plus');
      if (d.State !== 0) {
        setError(d.Message || 'Failed to retrieve purchase order lines.');
        setRows([]);
      } else {
        const list = d.List0 || [];
        setRows(list);
        cache.rows = list;
        cache.fromDate = fromDate;
        cache.toDate = toDate;
        cache.selectedVendor = selectedVendor;
        cache.selectedItem = selectedItem;
        cache.selectedItemType = selectedItemType;
      }
    } catch (e) {
      setError('Connection error: ' + e.message);
      setRows([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    const filtersChanged = 
      fromDate !== cache.fromDate ||
      toDate !== cache.toDate ||
      selectedVendor !== cache.selectedVendor ||
      selectedItem !== cache.selectedItem ||
      selectedItemType !== cache.selectedItemType;

    if (!cache.rows || filtersChanged) {
      loadData();
    }
  }, [fromDate, toDate, selectedVendor, selectedItem, selectedItemType]);

  // Columns definition for the Item Line grid
  const columns = [
    {
      key: 'LineStateDescription',
      label: 'Line Status',
      width: 120,
      render: (val) => {
        const status = (val || 'Active').trim();
        const statusLower = status.toLowerCase();
        
        let color = '#71717a'; 
        let bg = 'rgba(113, 113, 122, 0.1)';
        
        if (statusLower.includes('approve') || statusLower.includes('release') || statusLower.includes('invoice') || statusLower === 'closed') {
          color = '#16a34a'; 
          bg = 'var(--green-soft)';
        } else if (statusLower.includes('pending') || statusLower.includes('progress') || statusLower.includes('posted')) {
          color = '#ea580c'; 
          bg = 'var(--orange-soft)';
        } else if (statusLower.includes('draft') || statusLower.includes('hold')) {
          color = '#d97706'; 
          bg = 'var(--amber-soft)';
        } else if (statusLower.includes('cancel') || statusLower.includes('reject') || statusLower.includes('fail')) {
          color = '#dc2626'; 
          bg = 'var(--red-soft)';
        }

        return (
          <span style={{
            color,
            background: bg,
            padding: '4px 10px',
            borderRadius: 99,
            fontSize: 11.5,
            fontWeight: 700,
            display: 'inline-block',
            border: `1px solid ${color}1e`
          }}>
            {status}
          </span>
        );
      }
    },
    {
      key: 'OrderNumber',
      label: 'PO Number',
      width: 120,
      render: (val, row) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPO(row);
            setIsDrawerOpen(true);
          }}
          style={{ 
            color: 'var(--orange2)', 
            fontWeight: 700, 
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          {highlightText(val, searchQuery)}
        </span>
      )
    },
    {
      key: 'Line',
      label: 'Line',
      width: 60,
      render: (val) => highlightText(val, searchQuery)
    },
    {
      key: 'PurchasedCode',
      label: 'Item Code',
      width: 120,
      render: (val, row) => (
        <span style={{ fontWeight: 700 }}>
          {highlightText(val || row.PurchasedID, searchQuery)}
        </span>
      )
    },
    {
      key: 'CodeDescription',
      label: 'Description',
      width: 120,
      render: (val) => (
        <div style={{ whiteSpace: 'normal', fontSize: '11px', lineHeight: '1.3' }}>
          {highlightText(val || 'No description', searchQuery)}
        </div>
      )
    },
    {
      key: 'QuantityOrdered',
      label: 'Qty Ordered',
      width: 110,
      render: (val, row) => (
        <span style={{ fontWeight: 600 }}>
          {formatQty(val)} {row.PurchaseUnitOfMeasure}
        </span>
      )
    },
    {
      key: 'QuantityReceived',
      label: 'Qty Received',
      width: 110,
      render: (val) => formatQty(val)
    },
    {
      key: 'Price',
      label: 'Price',
      width: 100,
      render: (val, row) => (
        <span style={{ fontFamily: 'monospace' }}>
          {formatAmount(val, row.OrderCurrency)}
        </span>
      )
    },
    {
      key: 'LineAmount',
      label: 'Amount',
      width: 120,
      render: (val, row) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--orange)' }}>
          {formatAmount(val, row.OrderCurrency)}
        </span>
      )
    },
    {
      key: 'VendorName',
      label: 'Vendor',
      width: 200,
      render: (val) => highlightText(val, searchQuery)
    },
    {
      key: 'OrderCreatedDate',
      label: 'PO Date',
      width: 110,
      render: (val) => formatDate(val)
    },
    {
      key: 'ETA',
      label: 'ETA',
      width: 110,
      render: (val) => formatDate(val)
    }
  ];

  // Search filter
  const filteredRows = rows.filter(row => {
    if (selectedItem) {
      const code = row.PurchasedCode;
      const id = row.PurchasedID;
      if (code !== selectedItem && id !== selectedItem) {
        return false;
      }
    }
    if (selectedItemType) {
      if ((row.ItemType || '').trim() !== selectedItemType) {
        return false;
      }
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(row.OrderNumber || '').toLowerCase().includes(q) ||
      String(row.PurchasedCode || '').toLowerCase().includes(q) ||
      String(row.PurchasedID || '').toLowerCase().includes(q) ||
      String(row.CodeDescription || '').toLowerCase().includes(q) ||
      String(row.VendorName || '').toLowerCase().includes(q) ||
      String(row.LineStateDescription || '').toLowerCase().includes(q)
    );
  });

  const getColumns = () => {
    if (groupBy === 'none') {
      return columns;
    }

    if (groupBy === 'item') {
      return [
        {
          key: 'PurchasedCode',
          label: 'Item Code',
          width: 120,
          render: (val) => <span style={{ fontWeight: 700 }}>{val}</span>
        },
        {
          key: 'CodeDescription',
          label: 'Description',
          width: 360,
          render: (val) => (
            <div style={{ whiteSpace: 'normal', fontSize: '11px', lineHeight: '1.3' }}>
              {val}
            </div>
          )
        },
        {
          key: 'QuantityOrdered',
          label: 'Qty Ordered',
          width: 130,
          render: (val, row) => (
            <strong style={{ fontWeight: 700 }}>
              {formatQty(val)} {row.PurchaseUnitOfMeasure}
            </strong>
          )
        },
        {
          key: 'QuantityReceived',
          label: 'Qty Received',
          width: 130,
          render: (val) => formatQty(val)
        },
        {
          key: 'QuantityCosted',
          label: 'Qty Invoiced',
          width: 130,
          render: (val) => formatQty(val)
        },
        {
          key: 'RecvRatio',
          label: 'Recv %',
          width: 90,
          numeric: true,
          render: (val, row) => {
            const qtyOrd = Number(row.QuantityOrdered || 0);
            const qtyRec = Number(row.QuantityReceived || 0);
            if (qtyOrd === 0) return '0.0%';
            const pct = (qtyRec / qtyOrd) * 100;
            return (
              <span style={{ 
                color: pct >= 100 ? 'var(--green)' : pct > 0 ? 'var(--blue)' : 'var(--muted)',
                fontWeight: pct > 0 ? 700 : 500
              }}>
                {pct.toFixed(1)}%
              </span>
            );
          }
        },
        {
          key: 'InvRatio',
          label: 'Inv %',
          width: 90,
          numeric: true,
          render: (val, row) => {
            const qtyOrd = Number(row.QuantityOrdered || 0);
            const qtyInv = Number(row.QuantityCosted || 0);
            if (qtyOrd === 0) return '0.0%';
            const pct = (qtyInv / qtyOrd) * 100;
            return (
              <span style={{ 
                color: pct >= 100 ? 'var(--green)' : pct > 0 ? 'var(--blue)' : 'var(--muted)',
                fontWeight: pct > 0 ? 700 : 500
              }}>
                {pct.toFixed(1)}%
              </span>
            );
          }
        },
        {
          key: 'LineAmount',
          label: 'Amount',
          width: 150,
          render: (val, row) => (
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--orange)' }}>
              {formatAmount(val, row.OrderCurrency)}
            </span>
          )
        }
      ];
    }

    if (groupBy === 'item-vendor') {
      return [
        {
          key: 'PurchasedCode',
          label: 'Item Code',
          width: 120,
          render: (val) => <span style={{ fontWeight: 700 }}>{val}</span>
        },
        {
          key: 'CodeDescription',
          label: 'Description',
          width: 250,
          render: (val) => (
            <div style={{ whiteSpace: 'normal', fontSize: '11px', lineHeight: '1.3' }}>
              {val}
            </div>
          )
        },
        {
          key: 'VendorName',
          label: 'Vendor',
          width: 220
        },
        {
          key: 'QuantityOrdered',
          label: 'Qty Ordered',
          width: 130,
          render: (val, row) => (
            <strong style={{ fontWeight: 700 }}>
              {formatQty(val)} {row.PurchaseUnitOfMeasure}
            </strong>
          )
        },
        {
          key: 'QuantityReceived',
          label: 'Qty Received',
          width: 130,
          render: (val) => formatQty(val)
        },
        {
          key: 'QuantityCosted',
          label: 'Qty Invoiced',
          width: 130,
          render: (val) => formatQty(val)
        },
        {
          key: 'RecvRatio',
          label: 'Recv %',
          width: 90,
          numeric: true,
          render: (val, row) => {
            const qtyOrd = Number(row.QuantityOrdered || 0);
            const qtyRec = Number(row.QuantityReceived || 0);
            if (qtyOrd === 0) return '0.0%';
            const pct = (qtyRec / qtyOrd) * 100;
            return (
              <span style={{ 
                color: pct >= 100 ? 'var(--green)' : pct > 0 ? 'var(--blue)' : 'var(--muted)',
                fontWeight: pct > 0 ? 700 : 500
              }}>
                {pct.toFixed(1)}%
              </span>
            );
          }
        },
        {
          key: 'InvRatio',
          label: 'Inv %',
          width: 90,
          numeric: true,
          render: (val, row) => {
            const qtyOrd = Number(row.QuantityOrdered || 0);
            const qtyInv = Number(row.QuantityCosted || 0);
            if (qtyOrd === 0) return '0.0%';
            const pct = (qtyInv / qtyOrd) * 100;
            return (
              <span style={{ 
                color: pct >= 100 ? 'var(--green)' : pct > 0 ? 'var(--blue)' : 'var(--muted)',
                fontWeight: pct > 0 ? 700 : 500
              }}>
                {pct.toFixed(1)}%
              </span>
            );
          }
        },
        {
          key: 'LineAmount',
          label: 'Amount',
          width: 150,
          render: (val, row) => (
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--orange)' }}>
              {formatAmount(val, row.OrderCurrency)}
            </span>
          )
        }
      ];
    }

    return columns;
  };

  const getGroupedRows = () => {
    if (groupBy === 'none') return filteredRows;

    const grouped = {};
    filteredRows.forEach(row => {
      let groupKey = '';
      if (groupBy === 'item') {
        groupKey = row.PurchasedCode || 'Unknown';
      } else if (groupBy === 'item-vendor') {
        groupKey = `${row.PurchasedCode || 'Unknown'}_${row.Vendor || 'Unknown'}`;
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          id: groupKey,
          PurchasedCode: row.PurchasedCode,
          CodeDescription: row.CodeDescription || row.ItemDescription || 'No description',
          VendorName: row.VendorName || 'Unknown Vendor',
          Vendor: row.Vendor,
          QuantityOrdered: 0,
          QuantityReceived: 0,
          QuantityCosted: 0,
          LineAmount: 0,
          PurchaseUnitOfMeasure: row.PurchaseUnitOfMeasure || '',
          OrderCurrency: row.OrderCurrency || 'USD'
        };
      }

      const g = grouped[groupKey];
      g.QuantityOrdered += Number(row.QuantityOrdered || 0);
      g.QuantityReceived += Number(row.QuantityReceived || 0);
      g.QuantityCosted += Number(row.QuantityCosted || 0);
      g.LineAmount += Number(row.LineAmount || 0);
    });

    return Object.values(grouped);
  };

  const groupPanel = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 16px',
      marginBottom: 16,
      minHeight: 46,
      flexWrap: 'wrap'
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>
        📂 Group by:
      </span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setGroupBy('none')}
          style={{
            height: 28,
            padding: '0 12px',
            border: '1px solid ' + (groupBy === 'none' ? 'var(--primary)' : 'var(--border)'),
            borderRadius: 'var(--radius-xs)',
            background: groupBy === 'none' ? 'var(--primary-soft)' : 'var(--surface)',
            color: groupBy === 'none' ? 'var(--primary-dark)' : 'var(--text)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            transition: 'all 0.15s'
          }}
        >
          None (Default)
        </button>
        <button
          onClick={() => setGroupBy('item')}
          style={{
            height: 28,
            padding: '0 12px',
            border: '1px solid ' + (groupBy === 'item' ? 'var(--primary)' : 'var(--border)'),
            borderRadius: 'var(--radius-xs)',
            background: groupBy === 'item' ? 'var(--primary-soft)' : 'var(--surface)',
            color: groupBy === 'item' ? 'var(--primary-dark)' : 'var(--text)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            transition: 'all 0.15s'
          }}
        >
          Item
        </button>
        <button
          onClick={() => setGroupBy('item-vendor')}
          style={{
            height: 28,
            padding: '0 12px',
            border: '1px solid ' + (groupBy === 'item-vendor' ? 'var(--primary)' : 'var(--border)'),
            borderRadius: 'var(--radius-xs)',
            background: groupBy === 'item-vendor' ? 'var(--primary-soft)' : 'var(--surface)',
            color: groupBy === 'item-vendor' ? 'var(--primary-dark)' : 'var(--text)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            transition: 'all 0.15s'
          }}
        >
          Item & Vendor
        </button>
      </div>
    </div>
  );

  const getDisplayItems = () => {
    if (itemsList.length > 0) return itemsList;
    const distinct = {};
    rows.forEach(r => {
      const code = r.PurchasedCode || r.PurchasedID;
      const desc = r.CodeDescription || 'No description';
      if (code && !distinct[code]) {
        distinct[code] = {
          ItemCode: code,
          ItemDescription: desc
        };
      }
    });
    return Object.values(distinct).sort((a, b) => a.ItemDescription.localeCompare(b.ItemDescription));
  };

  const getItemTypesList = () => {
    const distinct = new Set();
    rows.forEach(r => {
      if (r.ItemType) {
        distinct.add(r.ItemType.trim());
      }
    });
    return Array.from(distinct).sort();
  };

  // Filters Panel
  const filterPanel = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 16px',
      marginBottom: 16,
      flexWrap: 'wrap',
      minHeight: 46
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
        {/* From Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', whiteSpace: 'nowrap' }}>From</span>
          <input 
            type="date" 
            value={fromDate} 
            onChange={e => setFromDate(e.target.value)} 
            style={{
              height: 30,
              padding: '0 8px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xs)',
              background: 'var(--soft)',
              color: 'var(--text)',
              outline: 'none',
              fontSize: 12,
              fontFamily: 'var(--font)'
            }} 
          />
        </div>
        
        {/* To Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', whiteSpace: 'nowrap' }}>To</span>
          <input 
            type="date" 
            value={toDate} 
            onChange={e => setToDate(e.target.value)} 
            style={{
              height: 30,
              padding: '0 8px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xs)',
              background: 'var(--soft)',
              color: 'var(--text)',
              outline: 'none',
              fontSize: 12,
              fontFamily: 'var(--font)'
            }} 
          />
        </div>

        {/* Vendor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 200px', minWidth: 0, maxWidth: 300 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', whiteSpace: 'nowrap' }}>Vendor</span>
          <SearchableVendorSelect 
            value={selectedVendor} 
            onChange={setSelectedVendor}
            options={vendorsList}
            placeholder="All"
          />
        </div>

        {/* Item Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 240px', minWidth: 0, maxWidth: 320 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', whiteSpace: 'nowrap' }}>Item</span>
          <SearchableItemSelect 
            value={selectedItem} 
            onChange={setSelectedItem}
            options={getDisplayItems()}
            placeholder="All"
          />
        </div>

        {/* Item Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', whiteSpace: 'nowrap' }}>Type</span>
          <select
            value={selectedItemType}
            onChange={e => setSelectedItemType(e.target.value)}
            style={{
              height: 30,
              padding: '0 8px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xs)',
              background: 'var(--soft)',
              color: 'var(--text)',
              outline: 'none',
              fontSize: 12,
              fontFamily: 'var(--font)',
              cursor: 'pointer'
            }}
          >
            <option value="">All</option>
            {getItemTypesList().map(t => {
              let label = t;
              if (t === 'R') label = 'Raw Material (R)';
              else if (t === 'P') label = 'Packaging (P)';
              return <option key={t} value={t}>{label}</option>;
            })}
          </select>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 200px', minWidth: 0, maxWidth: 300 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', whiteSpace: 'nowrap' }}>Search</span>
          <input 
            type="text"
            placeholder="Type to filter..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              height: 30,
              padding: '0 8px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xs)',
              background: 'var(--soft)',
              color: 'var(--text)',
              outline: 'none',
              fontSize: 12,
              fontFamily: 'var(--font)',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button 
          onClick={loadData}
          style={{
            height: 30,
            padding: '0 12px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xs)',
            background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'var(--font)',
            boxShadow: '0 1px 4px var(--orange-glow)'
          }}
        >
          ↻ Refresh
        </button>
        <button 
          onClick={() => {
            setFromDate(getFirstDayOfCurrentMonth());
            setToDate(getLastDayOfCurrentMonth());
            setSelectedVendor('');
            setSelectedItem('');
            setSearchQuery('');
            setSelectedItemType('');
          }}
          style={{
            height: 30,
            padding: '0 12px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xs)',
            background: 'var(--surface)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'var(--font)'
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );

  // Drawer Tabs render helper methods
  const renderLinesTab = () => {
    if (poLines.length === 0) {
      return <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '36px 12px' }}>No items found in this purchase order.</div>;
    }

    const totalQtyOrdered = poLines.reduce((sum, line) => sum + Number(line.QuantityOrdered || 0), 0);
    const totalQtyReceived = poLines.reduce((sum, line) => sum + Number(line.QuantityReceived || 0), 0);
    const totalQtyCosted = poLines.reduce((sum, line) => sum + Number(line.QuantityCosted || 0), 0);
    const totalLineAmount = poLines.reduce((sum, line) => sum + Number(line.LineAmount || 0), 0);
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>Items in Purchase Order</h4>
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--soft)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ width: 40 }}></th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Line</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Item Code</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Description</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Price</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {poLines.map((line, idx) => {
                const currency = line.OrderCurrency || selectedPO.OrderCurrency;
                const lineReceiving = poReceiving.filter(r => Number(r.PurchaseOrderLine) === Number(line.Line));
                const hasReceiving = lineReceiving.length > 0;
                const isExpanded = !!expandedLines[line.Line];
                return (
                  <React.Fragment key={idx}>
                    <tr style={{ borderBottom: '1px solid var(--border)', transition: 'background .15s' }}>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {hasReceiving ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedLines(prev => ({ ...prev, [line.Line]: !prev[line.Line] }));
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--orange)',
                              cursor: 'pointer',
                              fontSize: 10,
                              padding: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'transform 0.15s',
                              transform: isExpanded ? 'rotate(90deg)' : 'none'
                            }}
                          >
                            ▶
                          </button>
                        ) : null}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{line.Line}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{line.PurchasedCode || line.PurchasedID}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{line.CodeDescription || line.ItemDescription || 'No description'}</div>
                        {line.ItemPurchasingDescription && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{line.ItemPurchasingDescription}</div>}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 600 }}>{formatQty(line.QuantityOrdered)} {line.PurchaseUnitOfMeasure}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                          Recv: {formatQty(line.QuantityReceived)} | Costed: {formatQty(line.QuantityCosted)}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {formatAmount(line.Price, currency)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--orange)' }}>
                        {formatAmount(line.LineAmount, currency)}
                      </td>
                    </tr>
                    {isExpanded && hasReceiving && (
                      <tr style={{ background: 'rgba(255,255,255,0.015)' }}>
                        <td colSpan={7} style={{ padding: '8px 24px 16px 48px', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em' }}>
                              📥 Line {line.Line} Receiving History ({lineReceiving.length} transactions)
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                              <thead>
                                <tr style={{ background: 'var(--soft)', borderBottom: '1px solid var(--border)' }}>
                                  <th style={{ padding: '6px 10px', fontWeight: 700 }}>Receiving Order #</th>
                                  <th style={{ padding: '6px 10px', fontWeight: 700, textAlign: 'right' }}>Received Quantity</th>
                                  <th style={{ padding: '6px 10px', fontWeight: 700 }}>Receiving Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lineReceiving.map((rec, rIdx) => (
                                  <tr key={rIdx} style={{ borderBottom: rIdx === lineReceiving.length - 1 ? 'none' : '1px solid var(--border)' }}>
                                    <td style={{ padding: '6px 10px', fontWeight: 600 }}>{rec.ReceivingNumber}</td>
                                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{formatQty(rec.RecievedQty)}</td>
                                    <td style={{ padding: '6px 10px', color: 'var(--muted)' }}>{formatDate(rec.ReceivingDate)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            {poLines.length > 1 && (
              <tfoot>
                <tr style={{ background: 'var(--soft)', borderTop: '2px solid var(--border)', fontWeight: 'bold' }}>
                  <td colSpan={4} style={{ padding: '10px 12px', fontWeight: 800 }}>Total</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div style={{ fontWeight: 800 }}>{formatQty(totalQtyOrdered)}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                      Recv: {formatQty(totalQtyReceived)} | Costed: {formatQty(totalQtyCosted)}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: 'var(--orange)' }}>
                    {formatAmount(totalLineAmount, selectedPO.OrderCurrency)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    );
  };

  const renderExtrasTab = () => {
    if (poExtras.length === 0) {
      return <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '36px 12px' }}>No extra charges (Insurance, Discounts, or Freight) found for this order.</div>;
    }
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>Additional PO Charges</h4>
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--soft)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Type</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Line</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Description</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Invoiced</th>
              </tr>
            </thead>
            <tbody>
              {poExtras.map((item, idx) => {
                let badgeColor = '#3b82f6';
                let badgeBg = 'rgba(59, 130, 246, 0.12)';
                let typeLabel = 'Insurance';
                
                if (item.Type === 'Dis') {
                  badgeColor = '#10b981';
                  badgeBg = 'rgba(16, 185, 129, 0.12)';
                  typeLabel = 'Discount';
                } else if (item.Type === 'Frg') {
                  badgeColor = '#f59e0b';
                  badgeBg = 'rgba(245, 158, 11, 0.12)';
                  typeLabel = 'Freight';
                }

                const currency = selectedPO.OrderCurrency;
                
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        color: badgeColor,
                        background: badgeBg,
                        padding: '3px 8px',
                        borderRadius: '99px',
                        fontSize: '10.5px',
                        fontWeight: '700',
                        display: 'inline-block'
                      }}>
                        {typeLabel}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{item.Line || '—'}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{item.Description || 'No description'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                      {formatAmount(item.Amount, currency)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--orange)', fontWeight: 600 }}>
                      {formatAmount(item.Invoiced, currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderHistoryTab = () => {
    if (poHistory.length === 0) {
      return <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '36px 12px' }}>No release history found for this order.</div>;
    }
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>Purchase Order Release Logs</h4>
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--soft)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Operation</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Date</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>By User</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {poHistory.map((item, idx) => {
                let badgeColor = '#71717a';
                let badgeBg = 'rgba(113, 113, 122, 0.1)';
                const op = (item.operation || '').trim().toLowerCase();
                
                if (op.includes('approve') || op.includes('release') || op.includes('verify')) {
                  badgeColor = '#16a34a';
                  badgeBg = 'rgba(22, 163, 74, 0.12)';
                } else if (op.includes('create') || op.includes('submit')) {
                  badgeColor = '#ea580c';
                  badgeBg = 'rgba(234, 88, 12, 0.12)';
                } else if (op.includes('reject') || op.includes('cancel')) {
                  badgeColor = '#dc2626';
                  badgeBg = 'rgba(220, 38, 38, 0.12)';
                }
                
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        color: badgeColor,
                        background: badgeBg,
                        padding: '3px 8px',
                        borderRadius: '99px',
                        fontSize: '10.5px',
                        fontWeight: '700',
                        display: 'inline-block'
                      }}>
                        {item.operation || 'Unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{formatDate(item.OperationDate)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.ByUser || '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{item.Reason || 'No reason provided'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderReceivingTab = () => {
    if (poReceiving.length === 0) {
      return <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '36px 12px' }}>No receiving history found for this order.</div>;
    }
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>Receiving Transaction Logs</h4>
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--soft)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>PO Line</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Receiving #</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Item Code</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Received Qty</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Receiving Date</th>
              </tr>
            </thead>
            <tbody>
              {poReceiving.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{item.PurchaseOrderLine}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.ReceivingNumber}</td>
                  <td style={{ padding: '10px 12px' }}>{item.ItemCode || item.ItemID}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>
                    {formatQty(item.RecievedQty)}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{formatDate(item.ReceivingDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDeliveryTab = () => {
    const firstLine = poLines[0] || {};
    const fields = [
      { label: 'ETA', value: formatDate(firstLine.ETA || selectedPO.ETA) },
      { label: 'ETD', value: formatDate(firstLine.ETD || selectedPO.ETD) },
      { label: 'Release Date', value: formatDate(selectedPO.ReleaseDate) },
      { label: 'Delivery Term', value: firstLine.DeliveryTermDescription || selectedPO.DeliveryTermDescription || '—' },
      { label: 'Origin Description', value: firstLine.OriginDescription || '—' },
      { label: 'Packing Type', value: firstLine.PackingDescription || '—' },
      { label: 'Closed Status', value: firstLine.IsClosed ? `Yes (Closed By: ${firstLine.ClosedBy || 'System'} on ${formatDate(firstLine.ClosedDate)})` : 'Open' },
      { label: 'Closed Quantity', value: firstLine.ClosedQty ? `${formatQty(firstLine.ClosedQty)} Units` : '—' }
    ];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>Delivery Logs & Terms</h4>
        <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
            {fields.map((f, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em' }}>{f.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderVendorTab = () => {
    const firstLine = poLines[0] || {};
    const fields = [
      { label: 'Vendor Name', value: firstLine.VendorName || selectedPO.VendorName || '—' },
      { label: 'Vendor Extra Name', value: firstLine.VendorExtraName || '—' },
      { label: 'Vendor Number', value: firstLine.Vendor || selectedPO.VendorNumber || '—' },
      { label: 'Vendor Type', value: firstLine.VendorType || selectedPO.VendorType || '—' },
      { label: 'Payment Term', value: firstLine.TermDescription || selectedPO.TermDescription || '—' },
      { label: 'Accountant ID', value: firstLine.AccountantID || '—' },
      { label: 'Created By', value: selectedPO.OrderCreatedBy || firstLine.LineCreatedBy || '—' },
      { label: 'Created Date', value: formatDate(selectedPO.OrderCreatedDate || firstLine.LineCreatedDate) }
    ];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>Vendor & Administrative Details</h4>
        <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
            {fields.map((f, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em' }}>{f.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Inline CSS animations injection
  useEffect(() => {
    if (document.getElementById('drawer-styles')) return;
    const style = document.createElement('style');
    style.id = 'drawer-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
      .spinner {
        width: 24px;
        height: 24px;
        border: 3px solid var(--border);
        border-top: 3px solid var(--orange);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {error && <div className="err-page">⚠ {error}</div>}

      {filterPanel}
      {groupPanel}

      <DataGrid
        title="Purchase Order Lines"
        subtitle="Track, filter, and inspect detailed item quantities, unit prices, and status across all purchase orders"
        columns={getColumns()}
        rows={getGroupedRows()}
        loading={loading}
        onRefresh={loadData}
        onRowClick={groupBy === 'none' ? (row) => {
          setSelectedPO(row);
          setIsDrawerOpen(true);
        } : undefined}
        hideSearch={true}
        hideRefresh={true}
        hideHeader={true}
      />

      {/* Slide-out Details Drawer */}
      {isDrawerOpen && selectedPO && (
        <>
          {/* Backdrop Overlay */}
          <div 
            onClick={() => setIsDrawerOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999
            }}
          />
          
          {/* Drawer Body */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '880px',
              maxWidth: '95vw',
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.25)',
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideIn 0.25s ease-out',
              fontFamily: 'var(--font)'
            }}
          >
            {/* Drawer Header with Prev/Next buttons */}
            {(() => {
              const currentIndex = filteredRows.findIndex(row => row.OrderNumber === selectedPO.OrderNumber);
              const hasPrev = currentIndex > 0;
              const hasNext = currentIndex < filteredRows.length - 1 && currentIndex !== -1;

              const handlePrev = () => {
                if (hasPrev) {
                  setSelectedPO(filteredRows[currentIndex - 1]);
                }
              };

              const handleNext = () => {
                if (hasNext) {
                  setSelectedPO(filteredRows[currentIndex + 1]);
                }
              };

              const orderNumVal = selectedPO.OrderNumber || selectedPO.PurchaseOrderNumber;

              return (
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--soft)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                        PO #{orderNumVal}
                      </span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 99,
                        color: selectedPO.OrderState === 4 ? '#16a34a' : 'var(--orange)',
                        background: selectedPO.OrderState === 4 ? 'rgba(22, 163, 74, 0.12)' : 'var(--orange-glow)'
                      }}>
                        {selectedPO.OrderStateDescription || 'Active'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      Facility: {selectedPO.Facility} · Type: {selectedPO.OrderTypeDescription} · Vendor: {selectedPO.VendorName}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      disabled={!hasPrev}
                      onClick={handlePrev}
                      title="Previous Purchase Order"
                      style={{
                        background: 'var(--soft)',
                        border: '1px solid var(--border)',
                        color: hasPrev ? 'var(--text)' : 'var(--muted)',
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        cursor: hasPrev ? 'pointer' : 'not-allowed',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: hasPrev ? 1 : 0.5,
                        transition: 'all 0.2s'
                      }}
                    >
                      ◀
                    </button>
                    
                    <button
                      disabled={!hasNext}
                      onClick={handleNext}
                      title="Next Purchase Order"
                      style={{
                        background: 'var(--soft)',
                        border: '1px solid var(--border)',
                        color: hasNext ? 'var(--text)' : 'var(--muted)',
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        cursor: hasNext ? 'pointer' : 'not-allowed',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: hasNext ? 1 : 0.5,
                        transition: 'all 0.2s'
                      }}
                    >
                      ▶
                    </button>

                    <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />

                    <button 
                      onClick={() => setIsDrawerOpen(false)}
                      style={{
                        background: 'var(--soft)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Drawer Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--soft)', padding: '0 12px' }}>
              {[
                { id: 'lines', label: '🛒 Items List' },
                { id: 'extras', label: '💰 Extra Charges' },
                { id: 'history', label: '⏳ Release History' },
                { id: 'receiving', label: '📥 Receiving History' },
                { id: 'delivery', label: '📅 Dates & Delivery' },
                { id: 'vendor', label: '🏢 Vendor Details' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDrawerTab(tab.id)}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    background: 'none',
                    color: activeDrawerTab === tab.id ? 'var(--orange)' : 'var(--muted)',
                    fontWeight: activeDrawerTab === tab.id ? 700 : 500,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    position: 'relative',
                    borderBottom: activeDrawerTab === tab.id ? '2px solid var(--orange)' : 'none',
                    fontFamily: 'var(--font)'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Drawer Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {linesLoading ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                  <div style={{ fontSize: 13 }}>Retrieving purchase order lines…</div>
                </div>
              ) : linesError ? (
                <div className="err-page">⚠ {linesError}</div>
              ) : (
                <>
                  {activeDrawerTab === 'lines' && renderLinesTab()}
                  {activeDrawerTab === 'extras' && renderExtrasTab()}
                  {activeDrawerTab === 'history' && renderHistoryTab()}
                  {activeDrawerTab === 'receiving' && renderReceivingTab()}
                  {activeDrawerTab === 'delivery' && renderDeliveryTab()}
                  {activeDrawerTab === 'vendor' && renderVendorTab()}
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--soft)', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="btn-secondary"
                style={{ height: 36, padding: '0 18px', borderRadius: 8, fontSize: 13 }}
              >
                Close Details
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
