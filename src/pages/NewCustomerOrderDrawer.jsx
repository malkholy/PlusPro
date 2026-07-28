import { useState, useEffect, useRef, useMemo } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';
import { hasOperation } from '../shared/permissions.js';

// Create-only drawer for Customer Order, calling the existing, already-live
// APIPlusCustomerOrderOperation SP directly. As soon as a line has both an
// Item and a Qty, it's committed right away: Generate Order No (first line
// only) -> Get Price (via APIPlusCustomerOrderPricePromotionOperation, which
// also calculates promotions/free goods) -> New Line. The final Save button
// only has to submit New Header once all lines are committed. This is a
// first-cut MVP of order entry: it covers the fields needed to get a valid
// order created, but leaves out promotions UI, price/line reason codes,
// back-order handling, and truck/scheduling details -- those can be added
// once this core flow is confirmed working.
const EMPTY_LINE = { ItemID: '', ItemCode: '', ItemDescription: '', SellingUM: '', ItemSellingUM: '', ItemStockUM: '', Qty: '', Price: '', ListPrice: '', Tax: 0, committed: false, processing: false, lineError: null };

// Converts whatever date format the API returns (e.g. "7/26/2026 12:00:00 AM",
// not necessarily ISO) into the exact YYYY-MM-DD an <input type="date">
// requires -- using local getters (not toISOString) so timezone offset can't
// shift the day.
function toDateInputValue(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function NewCustomerOrderDrawer({ user, onClose, onSaved, editOrderNumber }) {
  const today = new Date().toISOString().slice(0, 10);

  const [customer, setCustomer] = useState('');
  const [shipToId, setShipToId] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [orderType, setOrderType] = useState('');
  const [priceType, setPriceType] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [currency, setCurrency] = useState('');
  const [rate, setRate] = useState('1');
  const [carrier, setCarrier] = useState('');
  const [facility, setFacility] = useState('');
  const [orderDate, setOrderDate] = useState(today);
  const [scheduleDate, setScheduleDate] = useState(today);
  const [customerPO, setCustomerPO] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);

  const [customerOptions, setCustomerOptions] = useState([]);
  const [shipToOptions, setShipToOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [orderTypeOptions, setOrderTypeOptions] = useState([]);
  const [priceTypeOptions, setPriceTypeOptions] = useState([]);
  const [paymentTermOptions, setPaymentTermOptions] = useState([]);
  const [taxCodeOptions, setTaxCodeOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [facilityOptions, setFacilityOptions] = useState([]);
  const [carrierOptions, setCarrierOptions] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [savedOrderNumber, setSavedOrderNumber] = useState(null);

  // Edit-mode: Open locks the real order and copies it into the WF tables,
  // then we read the WF back to pre-fill the form. lockedRef tracks whether
  // we actually hold the lock, so Close only fires when it should (on
  // Cancel/unmount before a successful save, and once more right after a
  // successful Edit Header, since Edit Header itself never touches InUse).
  const [opening, setOpening] = useState(!!editOrderNumber);
  const [openError, setOpenError] = useState(null);
  const lockedRef = useRef(false);
  const suppressCustomerDefaultsRef = useRef(false);

  // Refs mirroring state so the async commit chain (Generate Order No -> Get
  // Price -> New Line) always reads the latest values, even when several
  // lines are committed in quick succession.
  const linesRef = useRef(lines);
  useEffect(() => { linesRef.current = lines; }, [lines]);
  const savedOrderNumberRef = useRef(null);
  const orderNoPromiseRef = useRef(null);

  // Auto-focuses the newly added row's Item picker (Shift+Enter / Tab off
  // the last row's Qty both add a line -- this keeps keyboard entry moving
  // forward without needing the mouse).
  const rowRefs = useRef([]);
  const prevLinesLengthRef = useRef(lines.length);
  useEffect(() => {
    if (lines.length > prevLinesLengthRef.current) {
      const row = rowRefs.current[lines.length - 1];
      row?.querySelector('.searchable-trigger')?.focus();
    }
    prevLinesLengthRef.current = lines.length;
  }, [lines.length]);

  // Debug popup: shows the exact Get Price payload before it's sent, for
  // testing -- pauses the commit chain until the user clicks Continue/Cancel.
  const [debugSqlPreview, setDebugSqlPreview] = useState(null);
  const debugResolverRef = useRef(null);

  function currentSqlUser() {
    return (sessionStorage.getItem('Username') || sessionStorage.getItem('FullName') || 'system').replace(/'/g, "''");
  }

  // Builds the exact T-SQL EXEC for the given Get Price payload, matching
  // COR.APIPlusCustomerOrderPricePromotionOperation's real parameter list --
  // run it directly in SSMS to test the SP without going through the API.
  function buildGetPriceSql(payload) {
    const lineDataLiteral = JSON.stringify(payload, null, 4).replace(/'/g, "''");
    return `DECLARE @Operation nvarchar(500) = 'Get Price';
DECLARE @LineData nvarchar(max) = N'${lineDataLiteral}';
DECLARE @User nvarchar(50) = '${currentSqlUser()}';
DECLARE @State int;
DECLARE @Message nvarchar(500);

EXEC [COR].[APIPlusCustomerOrderPricePromotionOperation]
    @Operation = @Operation,
    @LineData = @LineData,
    @User = @User,
    @State = @State OUTPUT,
    @Message = @Message OUTPUT;

SELECT @State AS [State], @Message AS [Message];`;
  }

  // Builds the exact T-SQL EXEC for a dbo.APIPlusCustomerOrderOperation call
  // (New Header / New Line / Edit Line / Delete Line all share this SP) --
  // @LineMember is a separate top-level param, not nested in @LineData.
  function buildCustomerOrderSql(operation, lineData, lineMember) {
    const lineDataLiteral = JSON.stringify(lineData, null, 4).replace(/'/g, "''");
    const lineMemberLiteral = lineMember != null ? JSON.stringify(lineMember, null, 4).replace(/'/g, "''") : '';
    return `DECLARE @Operation nvarchar(100) = '${operation.replace(/'/g, "''")}';
DECLARE @LineData nvarchar(max) = N'${lineDataLiteral}';
DECLARE @LineMember nvarchar(max) = N'${lineMemberLiteral}';
DECLARE @Order int = ${Number(lineData.order) || 0};
DECLARE @User nvarchar(100) = '${currentSqlUser()}';
DECLARE @State int;
DECLARE @Message nvarchar(500);

EXEC [dbo].[APIPlusCustomerOrderOperation]
    @Operation = @Operation,
    @LineData = @LineData,
    @LineMember = @LineMember,
    @Order = @Order,
    @User = @User,
    @State = @State OUTPUT,
    @Message = @Message OUTPUT;

SELECT @State AS [State], @Message AS [Message];`;
  }

  function confirmSql(sqlText) {
    return new Promise(resolve => {
      debugResolverRef.current = resolve;
      setDebugSqlPreview(sqlText);
    });
  }

  function confirmDebugPayload(payload) {
    return confirmSql(buildGetPriceSql(payload));
  }

  function resolveDebugPayload(proceed) {
    setDebugSqlPreview(null);
    if (debugResolverRef.current) {
      debugResolverRef.current(proceed);
      debugResolverRef.current = null;
    }
  }

  useEffect(() => {
    apiCall('Customer Master All', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) setCustomerOptions((d.List0 || []).map(c => ({ label: `${c.CustomerNo} - ${c.CustomerName}`, value: c.CustomerNo, customerNo: c.CustomerNo, customerName: c.CustomerName })));
    });
    apiCall('xx', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) setWarehouseOptions((d.List0 || []).map(w => ({ label: `${w.Warehouse} - ${w.WarhouseDescription}`, value: w.Warehouse })));
    });
    apiCall('Customer Order Type', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) {
        const opts = (d.List0 || []).map(t => ({ label: t.TypeDescription, value: t.OrderTypeID }));
        setOrderTypeOptions(opts);
        setOrderType(prev => prev || (opts[0]?.value ?? ''));
      }
    });
    apiCall('Price Type Master All', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) setPriceTypeOptions((d.List0 || []).map(t => ({ label: t.PriceTypeDescription, value: t.PriceTypeID })));
    });
    apiCall('Payment Term Master All', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) setPaymentTermOptions((d.List0 || []).map(t => ({ label: `${t.PaymentTerm} - ${t.TermDescription}`, value: t.PaymentTerm })));
    });
    apiCall('Tax Code Master All', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) setTaxCodeOptions((d.List0 || []).map(t => ({ label: `${t.TaxCode} - ${t.TaxCodeDescription}`, value: t.TaxCode })));
    });
    apiCall('Currency Master All', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) {
        const opts = (d.List0 || []).map(c => ({ label: `${c.Currency} - ${c.CurrencyDescription}`, value: c.Currency }));
        setCurrencyOptions(opts);
        setCurrency(prev => prev || (opts[0]?.value ?? ''));
      }
    });
    apiCall('Facility Master All', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) {
        const opts = (d.List0 || []).map(f => ({ label: f.FacilityDescription, value: f.FacilityCode }));
        setFacilityOptions(opts);
        setFacility(prev => prev || (opts[0]?.value ?? ''));
      }
    });
    apiCall('Carrier Master All', null, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) setCarrierOptions((d.List0 || []).map(c => ({ label: c.Carrier, value: c.Carrier })));
    });
    apiCall('Item Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setItemOptions((d.List0 || []).map(i => ({
          label: `${i.ItemCode} - ${i.ItemName}`, optionLabel: i.ItemCode, sublabel: i.ItemName, meta: i.SellingUM, value: i.ItemID,
          itemCode: i.ItemCode, itemName: i.ItemName, sellingUM: i.SellingUM, stockUM: i.StockUM
        })));
      }
    });
  }, [user]);

  // ShipTo options + the customer's default Price Type/ShipTo/Warehouse/
  // Payment Term/Tax Code/Carrier all depend on Customer -- refetch both
  // together whenever it changes, so the ShipTo default can be matched
  // against the freshly-loaded ShipTo options.
  useEffect(() => {
    if (!customer) { setShipToOptions([]); setShipToId(''); return; }

    Promise.all([
      apiCall('Customer ShipTo By Customer', { param1: customer }, {}, 'plus'),
      apiCall('Customer Defaults By Customer', { param1: customer }, {}, 'plus')
    ]).then(([shipRes, defRes]) => {
      const opts = shipRes.State === 0
        ? (shipRes.List0 || []).map(s => ({ label: `${s.ShipToName} - ${s.ShipToAddress || ''}`, value: s.ShipToID, shipToName: s.ShipToName, shipToAddress: s.ShipToAddress || '' }))
        : [];
      setShipToOptions(opts);

      if (suppressCustomerDefaultsRef.current) {
        // Edit mode just loaded the order's actual saved values -- this
        // effect only needed to run to populate shipToOptions above, don't
        // clobber ShipTo/Warehouse/PriceType/PaymentTerm/TaxCode/Carrier
        // with the customer's master-record defaults.
        suppressCustomerDefaultsRef.current = false;
        return;
      }

      const def = defRes.State === 0 ? (defRes.List0 || [])[0] : null;
      const matchesOption = def?.DefaultShipToID != null && opts.some(o => String(o.value) === String(def.DefaultShipToID));
      setShipToId(matchesOption ? def.DefaultShipToID : (opts[0]?.value ?? ''));

      if (def) {
        if (def.DefaultPriceType != null) setPriceType(def.DefaultPriceType);
        if (def.DefaultWarehouse) setWarehouse(def.DefaultWarehouse);
        if (def.PaymentTerm != null) setPaymentTerm(def.PaymentTerm);
        if (def.CustomerTaxCode) setTaxCode(def.CustomerTaxCode);
        if (def.DefaultCarrier != null) setCarrier(def.DefaultCarrier);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  // Edit mode: lock the order (Open copies the real header/lines into the WF
  // tables) then read that WF back to pre-fill the form.
  useEffect(() => {
    if (!editOrderNumber) return;
    (async () => {
      try {
        const openRes = await apiCall('Open', { order: editOrderNumber }, {}, 'customer_order');
        if (openRes.State !== 0) {
          setOpenError(openRes.Message || 'Failed to open order for editing.');
          setOpening(false);
          return;
        }
        lockedRef.current = true;
        savedOrderNumberRef.current = editOrderNumber;
        setSavedOrderNumber(editOrderNumber);

        const [headerRes, linesRes] = await Promise.all([
          apiCall('Customer Order Header By Order', { param1: editOrderNumber }, {}, 'plus'),
          apiCall('Customer Order Line By Order', { param1: editOrderNumber }, {}, 'plus')
        ]);

        if (headerRes.State === 0 && headerRes.List0?.[0]) {
          const h = headerRes.List0[0];
          suppressCustomerDefaultsRef.current = true;
          setCustomer(h.CustomerNumber ?? '');
          setShipToId(h.ShipToID ?? '');
          setWarehouse(h.Warehouse ?? '');
          setOrderType(h.OrderType ?? '');
          setPriceType(h.PriceType ?? '');
          setPaymentTerm(h.TermsCode ?? '');
          setTaxCode(h.CustomerTaxCode ?? '');
          setFacility(h.Facility ?? '');
          setCurrency(h.Currency ?? '');
          setRate(String(h.ExchangeRate ?? '1'));
          setCarrier(h.OrderCarrier ?? '');
          setOrderDate(toDateInputValue(h.DateOrderEntered) || today);
          setScheduleDate(toDateInputValue(h.ScheduledShipDate) || today);
          setCustomerPO(h.CustomerPurchaseOrder ?? '');
          setNote(h.InternalNote ?? '');
        }

        if (linesRes.State === 0 && (linesRes.List0 || []).length > 0) {
          const mapped = linesRes.List0.map(row => ({
            ItemID: row.ItemID, ItemCode: row.ItemCode, ItemDescription: '',
            SellingUM: row.SellingUnitOfMeasure || '', ItemSellingUM: row.SellingUnitOfMeasure || '', ItemStockUM: row.StockingUnitofMeasure || '',
            Qty: row.OriginalOrderedQuantity, Price: row.NetPriceTransSelling, ListPrice: row.ListPriceTransSelling,
            Tax: row.LineTax, committed: true, processing: false, lineError: null
          }));
          setLines(mapped);
        }
      } catch (err) {
        setOpenError('Connection error: ' + err.message);
      }
      setOpening(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOrderNumber]);

  // Backfills Item Description/UM options on edit-loaded lines once the item
  // catalog has arrived (the header WF/line WF lookups don't carry it).
  useEffect(() => {
    if (itemOptions.length === 0) return;
    setLines(prev => prev.map(l => {
      if (!l.ItemID || l.ItemDescription) return l;
      const opt = itemOptions.find(o => String(o.value) === String(l.ItemID));
      if (!opt) return l;
      return {
        ...l,
        ItemCode: l.ItemCode || opt.itemCode,
        ItemDescription: opt.itemName,
        ItemSellingUM: l.ItemSellingUM || opt.sellingUM,
        ItemStockUM: l.ItemStockUM || opt.stockUM
      };
    }));
  }, [itemOptions]);

  async function releaseLock() {
    if (lockedRef.current) {
      lockedRef.current = false;
      try { await apiCall('Close', { order: editOrderNumber }, {}, 'customer_order'); } catch { /* best-effort */ }
    }
  }

  useEffect(() => {
    return () => { releaseLock(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCancel() {
    releaseLock();
    onClose();
  }

  function addLine() {
    setLines(prev => [...prev, { ...EMPTY_LINE }]);
  }

  async function removeLine(index) {
    const line = linesRef.current[index];
    if (!line?.committed) {
      setLines(prev => prev.filter((_, i) => i !== index));
      return;
    }
    setLines(prev => prev.map((l, i) => i === index ? { ...l, processing: true, lineError: null } : l));
    try {
      const orderNo = savedOrderNumberRef.current;
      const lineData = { ...headerLineData(), order: orderNo };
      const res = await apiCall('Delete Line', lineData, { LineMember: JSON.stringify([{ line: index + 1 }]) }, 'customer_order');
      if (res.State !== 0) throw new Error(res.Message || 'Failed to delete order line.');
      setLines(prev => prev.filter((_, i) => i !== index));
      await refreshLinesFromWF(orderNo);
    } catch (err) {
      setLines(prev => prev.map((l, i) => i === index ? { ...l, processing: false, lineError: err.message } : l));
    }
  }

  function updateLineField(index, field, value) {
    setLines(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  }

  function updateLineItem(index, itemID) {
    const opt = itemOptions.find(o => String(o.value) === String(itemID));
    setLines(prev => prev.map((l, i) => i === index
      ? { ...l, ItemID: itemID, ItemCode: opt?.itemCode || '', ItemDescription: opt?.itemName || '', SellingUM: opt?.sellingUM || '', ItemSellingUM: opt?.sellingUM || '', ItemStockUM: opt?.stockUM || '' }
      : l
    ));
    // If Qty was already entered first, this item pick is what completes the
    // line -- commit it now. Otherwise jump focus straight to Qty so the
    // user can type it immediately without reaching for Tab/mouse.
    if (itemID && Number(linesRef.current[index]?.Qty) > 0) {
      processLineEntry(index);
    } else if (itemID) {
      setTimeout(() => {
        rowRefs.current[index]?.querySelector('input[placeholder="Qty"]')?.focus();
      }, 0);
    }
  }

  // Generates the order number exactly once per drawer session (memoized so
  // concurrent line commits don't race and generate two order numbers).
  function ensureOrderNumber() {
    if (savedOrderNumberRef.current) return Promise.resolve(savedOrderNumberRef.current);
    if (!orderNoPromiseRef.current) {
      orderNoPromiseRef.current = apiCall('Gnerate Order No', { customer: Number(customer) }, {}, 'customer_order')
        .then(genRes => {
          if (genRes.State !== 0) throw new Error(genRes.Message || 'Failed to generate order number.');
          const orderNo = (genRes.List0 || [])[0]?.OrderNo;
          if (!orderNo) throw new Error('Order number was not returned.');
          savedOrderNumberRef.current = orderNo;
          setSavedOrderNumber(orderNo);
          return orderNo;
        })
        .catch(err => {
          orderNoPromiseRef.current = null; // allow retry on next commit attempt
          throw err;
        });
    }
    return orderNoPromiseRef.current;
  }

  async function getLinePrice(orderNo, index, line) {
    const payload = {
      order: orderNo,
      pricebookdate: orderDate,
      defaultpricetype: Number(priceType) || 0,
      line: index + 1,
      itemid: line.ItemID,
      customer: Number(customer),
      currency: currency,
      rate: Number(rate) || 1,
      warehouse: warehouse,
      ship_to: Number(shipToId),
      qty: Number(line.Qty),
      um: line.SellingUM,
      promontionno: 0,
      promontionline: 0,
      manualpromotiontype: 0,
      manualdiscountpercentage: 0,
      manualpromotionamount: 0,
      manualpromotiondescription: ''
    };
    const proceed = await confirmDebugPayload(payload);
    if (!proceed) throw new Error('Get Price cancelled.');
    const res = await apiCall('Get Price', payload, {}, 'customer_order_price');
    if (res.State !== 0) throw new Error(res.Message || 'Failed to get price.');
    return (res.List0 || [])[0] || {};
  }

  async function commitLine(orderNo, index, line, price, listPrice) {
    const lineData = { ...headerLineData(), order: orderNo };
    const lineMember = [{
      line: index + 1,
      itemid: Number(line.ItemID),
      qty: Number(line.Qty),
      um: line.SellingUM,
      price: Number(price),
      listprice: Number(listPrice) || Number(price),
      promotionflag: 0,
      relatedline: 0,
      orderlinereasonid: 0,
      pricereasonid: 0
    }];
    const res = await apiCall('New Line', lineData, { LineMember: JSON.stringify(lineMember) }, 'customer_order');
    if (res.State !== 0) throw new Error(res.Message || 'Failed to save order line.');
  }

  async function editLine(orderNo, index, line, price, listPrice) {
    const lineData = { ...headerLineData(), order: orderNo };
    const lineMember = [{
      line: index + 1,
      itemid: Number(line.ItemID),
      qty: Number(line.Qty),
      um: line.SellingUM,
      price: Number(price),
      listprice: Number(listPrice) || Number(price),
      promotionflag: 0,
      relatedline: 0,
      orderlinereasonid: 0,
      pricereasonid: 0
    }];
    const res = await apiCall('Edit Line', lineData, { LineMember: JSON.stringify(lineMember) }, 'customer_order');
    if (res.State !== 0) throw new Error(res.Message || 'Failed to update order line.');
  }

  // Re-reads COR.CustomerOrderLineWF (the SP's own working-file table) and
  // refreshes the lines grid with the server-computed values -- this is the
  // only source that has a real per-line Tax figure (Get Price doesn't
  // return it), so it's what makes Total Tax in the summary bar accurate.
  async function refreshLinesFromWF(orderNo) {
    const res = await apiCall('Customer Order Line WF By Order', { param1: orderNo }, {}, 'plus');
    if (res.State !== 0) return;
    const rows = res.List0 || [];
    setLines(prev => prev.map((l, i) => {
      const row = rows.find(r => Number(r.LineNumber) === i + 1);
      if (!row) return l;
      return {
        ...l,
        ItemID: row.ItemID,
        ItemCode: row.ItemCode,
        SellingUM: row.SellingUnitOfMeasure || l.SellingUM,
        Qty: row.OriginalOrderedQuantity,
        Price: row.NetPriceTransSelling,
        ListPrice: row.ListPriceTransSelling,
        Tax: row.LineTax
      };
    }));
  }

  // Runs the full Generate Order No -> Get Price -> New/Edit Line chain for
  // one line, the moment it has both an Item and a Qty. Lines stay editable
  // even after being committed -- re-running this on an already-committed
  // line calls Edit Line instead of New Line. Only mid-flight calls are
  // skipped (to avoid double-submits from rapid edits).
  async function processLineEntry(index) {
    const line = linesRef.current[index];
    if (!line || !line.ItemID || !(Number(line.Qty) > 0) || line.processing) return;
    if (!customer || !warehouse || !priceType || !shipToId) {
      setLines(prev => prev.map((l, i) => i === index ? { ...l, lineError: 'Fill Customer, Ship To, Warehouse & Price Type first.' } : l));
      return;
    }

    setLines(prev => prev.map((l, i) => i === index ? { ...l, processing: true, lineError: null } : l));

    try {
      const orderNo = await ensureOrderNumber();
      const priceRow = await getLinePrice(orderNo, index, line);
      const price = priceRow.Price != null ? priceRow.Price : line.Price;
      const listPrice = priceRow.ListPrice != null ? priceRow.ListPrice : price;
      if (line.committed) {
        await editLine(orderNo, index, line, price, listPrice);
      } else {
        await commitLine(orderNo, index, line, price, listPrice);
      }
      setLines(prev => prev.map((l, i) => i === index ? { ...l, Price: price, ListPrice: listPrice, committed: true, processing: false } : l));
      await refreshLinesFromWF(orderNo);
    } catch (err) {
      setLines(prev => prev.map((l, i) => i === index ? { ...l, processing: false, lineError: err.message } : l));
    }
  }

  const selectedCustomer = customerOptions.find(o => String(o.value) === String(customer));
  const selectedShipTo = shipToOptions.find(o => String(o.value) === String(shipToId));

  // Running totals from the lines entered so far. Amount/Discount are a live
  // client-side estimate (Qty x List Price, Qty x (List Price - Price));
  // Tax comes from COR.CustomerOrderLineWF via refreshLinesFromWF (the SP's
  // own tax-code/rate calc) once a line has been committed at least once --
  // it reads 0 for lines not yet saved.
  const totals = useMemo(() => {
    return lines.reduce((acc, l) => {
      const qty = Number(l.Qty) || 0;
      const price = Number(l.Price) || 0;
      const listPrice = Number(l.ListPrice) || 0;
      acc.amount += qty * listPrice;
      acc.discount += qty * (listPrice - price);
      acc.tax += Number(l.Tax) || 0;
      return acc;
    }, { amount: 0, discount: 0, tax: 0 });
  }, [lines]);
  const totalFinalAmount = totals.amount - totals.discount + totals.tax;

  function headerLineData() {
    return {
      order: savedOrderNumber || 0,
      customer: Number(customer),
      orderdate: orderDate,
      pricebookdate: orderDate,
      pricetype: Number(priceType),
      taxcode: taxCode,
      paymentterm: paymentTerm,
      ordertype: Number(orderType),
      requestdate: orderDate,
      warehouse: warehouse,
      shiptoid: Number(shipToId),
      currency: currency,
      rate: Number(rate) || 1,
      carrier: carrier || '',
      scheduledate: scheduleDate,
      customernote: '',
      salesnote: '',
      companynote: '',
      accountingnote: '',
      logisticnote: '',
      ordernote: note || '',
      trucktypeid: 0,
      deletereasonid: 0,
      facility: facility,
      rma: 0,
      offernumber: 0,
      orderref: 0,
      customerpo: customerPO || '',
      customerpodescription: '',
      nationalid: '',
      projectid: 0,
      allowbackorder: 0
    };
  }

  async function handleSave() {
    setError(null);

    if (!customer) { setError('Customer is required.'); return; }
    if (!shipToId) { setError('Ship To is required.'); return; }
    if (!warehouse) { setError('Warehouse is required.'); return; }
    if (!orderType) { setError('Order Type is required.'); return; }
    if (!priceType) { setError('Price Type is required.'); return; }
    if (!paymentTerm) { setError('Payment Term is required.'); return; }
    if (!taxCode) { setError('Tax Code is required.'); return; }
    if (!currency) { setError('Currency is required.'); return; }
    if (!facility) { setError('Facility is required.'); return; }

    const itemLines = lines.filter(l => l.ItemID);
    if (itemLines.length === 0) { setError('Add at least one line with an Item selected.'); return; }
    const zeroQtyLines = itemLines.filter(l => !(Number(l.Qty) > 0));
    if (zeroQtyLines.length > 0) { setError(`Cannot save: item(s) ${zeroQtyLines.map(l => l.ItemCode).join(', ')} have Qty = 0.`); return; }

    setSaving(true);
    try {
      // Every complete line should already be committed (Generate Order No /
      // Get Price / New Line ran as soon as its Item+Qty were entered) --
      // this just catches any that haven't fired yet or need a retry.
      for (let i = 0; i < linesRef.current.length; i++) {
        const l = linesRef.current[i];
        if (l.ItemID && Number(l.Qty) > 0 && !l.committed) {
          await processLineEntry(i);
        }
      }
      const uncommitted = linesRef.current.filter(l => l.ItemID && Number(l.Qty) > 0 && !l.committed);
      if (uncommitted.length > 0) {
        setError(`Cannot save: line(s) ${uncommitted.map(l => l.ItemCode).join(', ')} failed to save -- check the error under each line and retry.`);
        setSaving(false);
        return;
      }

      const orderNo = await ensureOrderNumber();
      const lineData = { ...headerLineData(), order: orderNo };
      const operation = editOrderNumber ? 'Edit Header' : 'New Header';

      const proceed = await confirmSql(buildCustomerOrderSql(operation, lineData, null));
      if (!proceed) { setSaving(false); return; }

      const headerRes = await apiCall(operation, lineData, {}, 'customer_order');
      if (headerRes.State !== 0) { setError(headerRes.Message || `Failed to save order header.`); setSaving(false); return; }

      // Both New Header and Edit Header promote the WF rows into the real
      // order tables and delete the WF rows -- nothing left to re-fetch.
      // Edit Header never touches InUse/InUseBy itself, so release the lock
      // explicitly now that the edit is done.
      if (editOrderNumber) await releaseLock();

      setSaved(true);
      onSaved();
    } catch (err) {
      setError('Connection error: ' + err.message);
    }
    setSaving(false);
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: 1550, maxWidth: '98vw', background: 'var(--bg)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '20px 28px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🧾</span>
              {savedOrderNumber ? `${editOrderNumber ? 'Editing ' : ''}Order #${savedOrderNumber}` : 'New Customer Order'}
            </h2>
            {selectedCustomer && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px', marginTop: 6, paddingLeft: 30 }}>
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}><b style={{ color: 'var(--text)' }}>Customer No:</b> {selectedCustomer.customerNo}</span>
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}><b style={{ color: 'var(--text)' }}>Customer Name:</b> {selectedCustomer.customerName}</span>
                {selectedShipTo && (
                  <>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)' }}><b style={{ color: 'var(--text)' }}>Ship To Name:</b> {selectedShipTo.shipToName}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)' }}><b style={{ color: 'var(--text)' }}>Ship To Address:</b> {selectedShipTo.shipToAddress}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!saved && (
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
            )}
            <button
              onClick={handleCancel}
              disabled={saving}
              style={{ height: 36, padding: '0 16px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
            >
              {saved ? 'Close' : 'Cancel'}
            </button>
            <button onClick={handleCancel} style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: 'var(--soft)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        {opening ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--muted)' }}>
            <span style={{ width: 26, height: 26, border: '3px solid var(--border)', borderTopColor: 'var(--orange)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            Opening order #{editOrderNumber} for editing...
          </div>
        ) : openError ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}>
            <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--red)', padding: '12px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, maxWidth: 480, textAlign: 'center' }}>
              ⚠ {openError}
            </div>
            <button onClick={onClose} style={{ height: 36, padding: '0 20px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Close</button>
          </div>
        ) : (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '20px 28px', display: 'flex', flexDirection: 'row', gap: 20 }}>
          <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          {error && (
            <div style={{ flexShrink: 0, background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
              ⚠ {error}
            </div>
          )}
          {saved ? (
            <div style={{ flexShrink: 0, background: 'var(--green-soft, #16a34a22)', border: '1px solid rgba(22,163,74,0.25)', color: 'var(--green, #16a34a)', padding: '10px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
              ✓ Order #{savedOrderNumber} {editOrderNumber ? 'updated' : 'saved'} successfully. This form is now locked -- close it and re-open the order from the grid to make further changes.
            </div>
          ) : editOrderNumber ? (
            <div style={{ flexShrink: 0, background: 'var(--amber-soft)', border: '1px solid rgba(217,119,6,0.2)', color: 'var(--amber)', padding: '10px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
              Editing Order #{savedOrderNumber} -- line edits save automatically. Click Save once everything looks correct to finalize.
            </div>
          ) : savedOrderNumber && (
            <div style={{ flexShrink: 0, background: 'var(--amber-soft)', border: '1px solid rgba(217,119,6,0.2)', color: 'var(--amber)', padding: '10px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
              Order #{savedOrderNumber} created -- lines save automatically as you enter Item + Qty. Click Save once all lines look correct to finalize the header.
            </div>
          )}

          <div style={{ flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.4 }}>
              Order Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Customer</label>
                <SearchableSelect value={customer} onChange={setCustomer} options={customerOptions} placeholder="Select customer" disabled={saved || !!savedOrderNumber} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Ship To</label>
                <SearchableSelect value={shipToId} onChange={setShipToId} options={shipToOptions} placeholder="Select ship to" disabled={saved} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Warehouse</label>
                <SearchableSelect value={warehouse} onChange={setWarehouse} options={warehouseOptions} placeholder="Select warehouse" disabled={saved || (!!editOrderNumber && !hasOperation(user, 'customer_order.edit_order.change_warehouse'))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Order Type</label>
                <SearchableSelect value={orderType} onChange={setOrderType} options={orderTypeOptions} placeholder="Select type" disabled={saved} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Price Type</label>
                <SearchableSelect value={priceType} onChange={setPriceType} options={priceTypeOptions} placeholder="Select price type" disabled={saved} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Payment Term</label>
                <SearchableSelect value={paymentTerm} onChange={setPaymentTerm} options={paymentTermOptions} placeholder="Select term" disabled={saved} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Tax Code</label>
                <SearchableSelect value={taxCode} onChange={setTaxCode} options={taxCodeOptions} placeholder="Select tax code" disabled={saved} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Facility</label>
                <SearchableSelect value={facility} onChange={setFacility} options={facilityOptions} placeholder="Select facility" disabled={saved} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Currency</label>
                <SearchableSelect value={currency} onChange={setCurrency} options={currencyOptions} placeholder="Select currency" disabled={saved} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Rate</label>
                <input type="text" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} disabled={saved}
                  style={{ width: '100%', height: 32, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Carrier</label>
                <SearchableSelect value={carrier} onChange={setCarrier} options={carrierOptions} placeholder="Optional" disabled={saved} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Order Date</label>
                <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} disabled={saved}
                  style={{ width: '100%', height: 32, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Scheduled Ship Date</label>
                <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} disabled={saved}
                  style={{ width: '100%', height: 32, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Customer PO</label>
                <input type="text" value={customerPO} onChange={e => setCustomerPO(e.target.value)} disabled={saved}
                  style={{ width: '100%', height: 32, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>Note</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note..." disabled={saved}
                style={{ width: '100%', height: 40, padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)', background: 'var(--surface)', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22 }}>
            <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>Total Amount</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{totals.amount.toFixed(2)}</div>
              </div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>Total Discount</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{totals.discount.toFixed(2)}</div>
              </div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>Total Tax</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{totals.tax.toFixed(2)}</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, var(--orange), var(--orange2))', borderRadius: 10, padding: '8px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', marginBottom: 2 }}>Total Final Amount</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{totalFinalAmount.toFixed(2)}</div>
              </div>
            </div>

            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Lines</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', background: 'var(--soft)', padding: '2px 8px', borderRadius: 999 }}>{lines.length}</span>
              </div>
              {!saved && <button onClick={addLine} style={{ height: 30, padding: '0 14px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>+ Add Line</button>}
            </div>

            <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '32px 1.6fr 1.8fr 0.7fr 0.9fr 1fr 1fr 1.2fr 34px', gap: 10, padding: '0 12px', marginBottom: 8 }}>
              <div />
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Item Code</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Description</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>UM</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Qty</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Price</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>List Price</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Line Amount</div>
              <div />
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lines.map((l, i) => (
                <div key={i}>
                  <div
                    ref={el => rowRefs.current[i] = el}
                    onKeyDown={e => {
                      const onQty = e.target === e.currentTarget.querySelector('input[placeholder="Qty"]');
                      if (e.key === 'Enter' && e.shiftKey) {
                        e.preventDefault();
                        addLine();
                      } else if (e.key === 'Enter' && !e.shiftKey && onQty) {
                        e.preventDefault();
                        if (i === lines.length - 1) {
                          addLine();
                        } else {
                          rowRefs.current[i + 1]?.querySelector('.searchable-trigger')?.focus();
                        }
                      } else if (e.key === 'Tab' && !e.shiftKey && i === lines.length - 1 && onQty) {
                        e.preventDefault();
                        addLine();
                      }
                    }}
                    style={{ display: 'grid', gridTemplateColumns: '32px 1.6fr 1.8fr 0.7fr 0.9fr 1fr 1fr 1.2fr 34px', gap: 10, alignItems: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}
                  >
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: l.committed ? 'var(--green-soft, #16a34a22)' : 'var(--soft)', color: l.committed ? 'var(--green, #16a34a)' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 800 }}>
                      {l.processing
                        ? <span style={{ width: 12, height: 12, border: '2px solid var(--border)', borderTopColor: 'var(--orange)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                        : (l.committed ? '✓' : i + 1)}
                    </div>
                    <SearchableSelect value={l.ItemID} onChange={v => updateLineItem(i, v)} options={itemOptions} placeholder="Item Code" disabled={l.processing || saved} style={{ minWidth: 0 }} openOnFocus />
                    <input type="text" value={l.ItemDescription} readOnly tabIndex={-1} placeholder="Item Description"
                      style={{ width: '100%', minWidth: 0, height: 32, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--muted)', background: 'var(--soft)', outline: 'none', boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis' }} />
                    <select value={l.SellingUM} disabled={l.processing || !l.ItemID || saved}
                      onChange={e => {
                        updateLineField(i, 'SellingUM', e.target.value);
                        if (Number(linesRef.current[i]?.Qty) > 0) processLineEntry(i);
                      }}
                      style={{ width: '100%', minWidth: 0, height: 32, padding: '0 8px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }}
                    >
                      {l.ItemSellingUM && <option value={l.ItemSellingUM}>{l.ItemSellingUM} (Selling)</option>}
                      {l.ItemStockUM && l.ItemStockUM !== l.ItemSellingUM && <option value={l.ItemStockUM}>{l.ItemStockUM} (Stock)</option>}
                    </select>
                    <input type="text" inputMode="decimal" value={l.Qty} disabled={l.processing || saved}
                      onChange={e => updateLineField(i, 'Qty', e.target.value)}
                      onBlur={() => processLineEntry(i)}
                      placeholder="Qty"
                      style={{ width: '100%', minWidth: 0, height: 32, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }} />
                    <input type="text" inputMode="decimal" value={l.processing ? '...' : l.Price} readOnly tabIndex={-1} placeholder="Price"
                      style={{ width: '100%', minWidth: 0, height: 32, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--muted)', background: 'var(--soft)', outline: 'none', boxSizing: 'border-box' }} />
                    <input type="text" inputMode="decimal" value={l.processing ? '...' : l.ListPrice} readOnly tabIndex={-1} placeholder="List Price"
                      style={{ width: '100%', minWidth: 0, height: 32, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--muted)', background: 'var(--soft)', outline: 'none', boxSizing: 'border-box' }} />
                    <input type="text" value={l.processing ? '...' : ((Number(l.Qty) || 0) * (Number(l.Price) || 0)).toFixed(2)} readOnly tabIndex={-1} placeholder="Line Amount"
                      style={{ width: '100%', minWidth: 0, height: 32, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, fontWeight: 700, color: 'var(--text)', background: 'var(--soft)', outline: 'none', boxSizing: 'border-box' }} />
                    {saved
                      ? <div />
                      : <button onClick={() => removeLine(i)} title="Remove line" disabled={l.processing} tabIndex={-1}
                          style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', background: l.processing ? 'var(--soft)' : 'var(--red-soft)', color: l.processing ? 'var(--muted)' : 'var(--red)', fontSize: 14, fontWeight: 700, cursor: l.processing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>}
                  </div>
                  {l.lineError && (
                    <div style={{ color: 'var(--red)', fontSize: 11, fontWeight: 600, padding: '4px 12px' }}>⚠ {l.lineError}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>

      {debugSqlPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 620, maxWidth: '92vw', background: 'var(--bg)', borderRadius: 14, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '20px 22px' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>SP Execution Preview</h3>
              <p style={{ margin: '8px 0 12px 0', fontSize: 12, color: 'var(--muted)' }}>This is the exact SP call about to be made -- paste it into SSMS to test directly, or click Continue to actually send it.</p>
              <pre style={{ margin: 0, padding: 14, background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11.5, color: 'var(--text)', maxHeight: 320, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {debugSqlPreview}
              </pre>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => navigator.clipboard.writeText(debugSqlPreview)}
                style={{ height: 36, padding: '0 20px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Copy
              </button>
              <button
                onClick={() => resolveDebugPayload(false)}
                style={{ height: 36, padding: '0 20px', background: 'var(--soft)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => resolveDebugPayload(true)}
                style={{ height: 36, padding: '0 24px', background: 'linear-gradient(135deg, var(--orange), var(--orange2))', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
