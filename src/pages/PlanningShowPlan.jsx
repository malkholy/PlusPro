import React, { useState, useEffect, useRef } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';
import ShopOrderProductionDrawer from './ShopOrderProductionDrawer.jsx';

// Local (not UTC) date/time helpers -- toISOString() would shift the
// calendar date backward for any timezone ahead of UTC (Egypt, UTC+2).
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toLocalDateTimeStr(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${toLocalDateStr(date)}T${h}:${mi}:${s}`;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDayName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

// Shift 1: 07:00-19:00. Shift 2: 19:00-07:00 (next day).
const SHIFT_SECONDS = 12 * 3600;
function shiftStartHour(shiftNo) {
  return Number(shiftNo) === 2 ? 19 : 7;
}

// "8h 30m" from a qty, a formula's batch qty, and per-batch production
// time (seconds) -- null when there isn't enough info to compute it
// (e.g. manually-assigned slots, which don't carry a production time).
function formatDuration(qty, formulaBatch, productionTime) {
  const batchQty = Number(formulaBatch || 0);
  const prodTime = Number(productionTime || 0);
  if (batchQty <= 0 || prodTime <= 0 || !qty) return null;
  const totalSeconds = (qty / batchQty) * prodTime;
  const totalMinutes = Math.round(totalSeconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const inputStyle = {
  padding: '8px 12px', border: '1px solid var(--border2)', borderRadius: 'var(--radius-xs)',
  boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 13
};
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: 0.4
};

const SHIFT_ACCENT = {
  1: { fg: 'var(--orange2)', soft: 'var(--orange-soft)', bar: 'var(--orange)' },
  2: { fg: 'var(--blue)', soft: 'var(--blue-soft)', bar: 'var(--blue)' }
};

export default function PlanningShowPlan({ user, onClose }) {
  const todayStr = toLocalDateStr(new Date());
  const [startDate, setStartDate] = useState(() => todayStr);
  const [endDate, setEndDate] = useState(() => addDays(todayStr, 6));
  const [machines, setMachines] = useState([]);
  const [cellMap, setCellMap] = useState({});
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState(false);

  // Manual "select empty slots, then assign an item" flow.
  const [selectedSlots, setSelectedSlots] = useState({});
  // Separate "select already-assigned slots, then combine into one Shop
  // Order" flow -- e.g. Shift 1 + Shift 2 + Shift 1 (same item/machine,
  // different dates/shifts) all covered by a single Shop Order. Keyed by
  // ShiftPlanID.
  const [selectedAssignedSlots, setSelectedAssignedSlots] = useState({});
  const [itemOptions, setItemOptions] = useState([]);
  const [formulaOptions, setFormulaOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignItemID, setAssignItemID] = useState('');
  const [assignItemCode, setAssignItemCode] = useState('');
  const [assignItemDescription, setAssignItemDescription] = useState('');
  const [assignFormulaID, setAssignFormulaID] = useState('');
  const [assignWarehouse, setAssignWarehouse] = useState('');
  const [assignQty, setAssignQty] = useState('');
  const [assignProductionTime, setAssignProductionTime] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');

  // "+ Assign" -- pick a Machine + Date Range, list several items with
  // their own Qty/Production Time, and let the save distribute each one
  // across however many empty slots its Qty actually needs (packed in
  // sequence across the range's empty slots). Separate from the existing
  // click-empty-cells-then-assign flow above, which stays for quick
  // single-item assignment.
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [bulkMachineID, setBulkMachineID] = useState('');
  const [bulkFromDate, setBulkFromDate] = useState('');
  const [bulkToDate, setBulkToDate] = useState('');
  const [bulkWarehouse, setBulkWarehouse] = useState('');
  const [bulkLines, setBulkLines] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [planningItemRows, setPlanningItemRows] = useState([]);
  const [bulkAvailableSlots, setBulkAvailableSlots] = useState(null);
  const [bulkCheckingSlots, setBulkCheckingSlots] = useState(false);
  const bulkLineKeyRef = useRef(0);

  // Right-click on an assigned slot -> "Show Formula" / "Create Shop Order".
  const [contextMenu, setContextMenu] = useState(null);
  const [formulaModal, setFormulaModal] = useState(null);
  const [creatingShopOrder, setCreatingShopOrder] = useState(false);
  const [shopOrderNotice, setShopOrderNotice] = useState(null);
  const [editSlotModal, setEditSlotModal] = useState(null);
  const [productionRow, setProductionRow] = useState(null);
  const [openingProduction, setOpeningProduction] = useState(false);
  // Custom in-app confirm dialog -- native window.confirm() can silently
  // no-op inside some embedded/webview hosts (returns immediately without
  // blocking), which would skip straight past the delete every time.
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    // Loaded here (not just inside handleGenerate) so the "+ Assign"
    // modal's Machine combo works even before the main calendar has ever
    // been generated.
    apiCall('Machine Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) setMachines(d.List0 || []);
    });
    apiCall('Item Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setItemOptions((d.List0 || []).map(i => ({
          label: `${i.ItemCode} - ${i.ItemName}`,
          value: i.ItemID,
          itemCode: i.ItemCode,
          itemName: i.ItemName
        })));
      }
    });
    apiCall('Formula Master All', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setFormulaOptions((d.List0 || []).map(f => ({
          label: `${f.ParentItemCode} (Formula ${f.FormulaID})`,
          value: f.FormulaID,
          parentItemID: f.ParentItemID,
          batchQuantity: f.BatchQuantity
        })));
      }
    });
    apiCall('xx', null, { User: user?.Username }, 'lookup').then(d => {
      if (d.State === 0) {
        setWarehouseOptions((d.List0 || []).map(w => ({ label: `${w.Warehouse} - ${w.WarhouseDescription}`, value: w.Warehouse })));
      }
    });
    // For the "+ Assign" grid's per-item Default Formula resolution.
    apiCall('GetGridData', { PageGroupID: 'planning_item_master' }, { User: user?.Username }, 'plus').then(d => {
      if (d.State === 0) setPlanningItemRows(d.List0 || []);
    });
  }, [user]);

  const handleGenerate = async () => {
    setError('');
    if (!startDate || !endDate) {
      setError('Please select both Start Date and End Date.');
      return;
    }
    if (startDate > endDate) {
      setError('Start Date must be before End Date.');
      return;
    }

    const dayCount = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
    if (dayCount > 62) {
      setError('Range too large -- please pick 62 days or fewer.');
      return;
    }

    setLoading(true);
    try {
      const [machinesRes, planRes] = await Promise.all([
        apiCall('Machine Master All', null, { User: user?.Username }, 'lookup'),
        apiCall('Get Planning Shift Calendar', { FromDate: startDate, ToDate: endDate }, { User: user?.Username }, 'planning')
      ]);

      if (machinesRes.State !== 0) {
        setError(machinesRes.Message || 'Failed to load machines.');
        setLoading(false);
        return;
      }
      if (planRes.State !== 0) {
        setError(planRes.Message || 'Failed to load plan.');
        setLoading(false);
        return;
      }

      const rows = planRes.List0 || [];
      const map = {};
      rows.forEach(r => {
        const dateStr = r.ShiftDate ? r.ShiftDate.split('T')[0] : '';
        const key = `${r.MachineID}|${dateStr}|${r.ShiftNo}`;
        if (!map[key]) map[key] = [];
        map[key].push({
          itemID: r.ItemID || null, itemCode: r.ItemCode, itemDescription: r.ItemDescription || '', qty: Number(r.PlannedQty || 0),
          formulaID: r.FormulaID || null, formulaCode: r.FormulaCode || '',
          formulaBatch: Number(r.FormulaBatch || 0), productionTime: Number(r.ProductionTime || 0),
          warehouse: r.Warehouse || '', machineID: r.MachineID, shiftDate: dateStr, shiftNo: r.ShiftNo,
          shiftPlanID: r.ShiftPlanID, shopOrderNo: r.ShopOrderNo || null
        });
      });

      const dayList = [];
      for (let i = 0; i < dayCount; i++) {
        dayList.push(addDays(startDate, i));
      }

      setMachines(machinesRes.List0 || []);
      setCellMap(map);
      setDays(dayList);
      setGenerated(true);
      setSelectedSlots({});
      setSelectedAssignedSlots({});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSlot = (machine, date, shiftNo) => {
    const key = `${machine.MachineID}|${date}|${shiftNo}`;
    if ((cellMap[key] || []).length > 0) return;
    setSelectedSlots(prev => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { machineID: machine.MachineID, machineCode: machine.MachineCode, date, shiftNo };
      }
      return next;
    });
  };

  const selectedList = Object.entries(selectedSlots);

  // Toggle an already-assigned slot in/out of the "combine into one Shop
  // Order" selection. Slots that already have a linked Shop Order can't be
  // added -- they're already covered.
  const toggleAssignedSlot = (item) => {
    if (!item.shiftPlanID || item.shopOrderNo) return;
    setSelectedAssignedSlots(prev => {
      const next = { ...prev };
      if (next[item.shiftPlanID]) delete next[item.shiftPlanID];
      else next[item.shiftPlanID] = item;
      return next;
    });
  };
  const selectedCount = selectedList.length;
  const selectedMachineCount = new Set(selectedList.map(([, s]) => s.machineID)).size;

  // ============================================================
  // "+ Assign" -- Machine + Date Range + multi-item grid
  // ============================================================
  const openBulkAssignModal = () => {
    setBulkError('');
    setBulkMachineID('');
    setBulkFromDate(startDate || todayStr);
    setBulkToDate(endDate || addDays(todayStr, 6));
    setBulkWarehouse('');
    setBulkLines([]);
    setBulkAvailableSlots(null);
    setBulkAssignModalOpen(true);
  };

  const resolveDefaultFormula = (itemID) => {
    const planRow = planningItemRows.find(r => String(r.ItemID) === String(itemID));
    const defaultFormulaID = planRow?.DefaultFormula;
    if (!defaultFormulaID) return null;
    const formula = formulaOptions.find(f => String(f.value) === String(defaultFormulaID));
    if (!formula) return null;
    return { formulaID: defaultFormulaID, formulaCode: formula.label, batchQuantity: Number(formula.batchQuantity || 0) };
  };

  const addBulkLine = () => {
    bulkLineKeyRef.current -= 1;
    setBulkLines(prev => [...prev, { key: bulkLineKeyRef.current, itemID: '', itemCode: '', itemDescription: '', formulaID: '', qty: '', productionTime: '' }]);
  };
  const removeBulkLine = (idx) => setBulkLines(prev => prev.filter((_, i) => i !== idx));
  const updateBulkLineItem = (idx, itemID) => {
    const opt = itemOptions.find(o => String(o.value) === String(itemID));
    // Defaults to the item's Default Formula as a starting point -- still
    // editable per line via its own combo below.
    const defaultFormula = resolveDefaultFormula(itemID);
    setBulkLines(prev => prev.map((l, i) => i === idx ? {
      ...l, itemID, itemCode: opt?.itemCode || '', itemDescription: opt?.itemName || '',
      formulaID: defaultFormula?.formulaID || ''
    } : l));
  };
  const updateBulkLineFormula = (idx, formulaID) => setBulkLines(prev => prev.map((l, i) => i === idx ? { ...l, formulaID } : l));
  const updateBulkLineQty = (idx, val) => setBulkLines(prev => prev.map((l, i) => i === idx ? { ...l, qty: val } : l));
  const updateBulkLineProdTime = (idx, val) => setBulkLines(prev => prev.map((l, i) => i === idx ? { ...l, productionTime: val } : l));

  // Live per-line capacity math, same formula as the single-item modal.
  const bulkLineComputed = bulkLines.map(l => {
    const formula = l.formulaID ? formulaOptions.find(f => String(f.value) === String(l.formulaID)) : null;
    const batchQuantity = Number(formula?.batchQuantity || 0);
    const qty = Number(l.qty || 0);
    const prodTime = Number(l.productionTime || 0);
    const unitsPerShift = batchQuantity > 0 && prodTime > 0 ? (SHIFT_SECONDS / prodTime) * batchQuantity : 0;
    const slotsNeeded = unitsPerShift > 0 && qty > 0 ? Math.ceil(qty / unitsPerShift) : 0;
    return { ...l, batchQuantity, qty, prodTime, slotsNeeded };
  });
  const bulkTotalSlotsNeeded = bulkLineComputed.reduce((sum, l) => sum + (l.slotsNeeded || 0), 0);

  // Fetches every empty (Machine, Date, Shift) slot in the chosen range,
  // live, as Machine/dates change -- so the grid can show "needs X / Y
  // available" before the user even tries to save.
  useEffect(() => {
    if (!bulkAssignModalOpen || !bulkMachineID || !bulkFromDate || !bulkToDate || bulkFromDate > bulkToDate) {
      setBulkAvailableSlots(null);
      return;
    }
    let cancelled = false;
    setBulkCheckingSlots(true);
    apiCall('Get Planning Shift Calendar', { FromDate: bulkFromDate, ToDate: bulkToDate }, { User: user?.Username }, 'planning')
      .then(d => {
        if (cancelled) return;
        if (d.State !== 0) { setBulkAvailableSlots(null); return; }
        const occupied = new Set(
          (d.List0 || [])
            .filter(r => String(r.MachineID) === String(bulkMachineID))
            .map(r => `${r.ShiftDate.split('T')[0]}|${r.ShiftNo}`)
        );
        const dayCount = Math.round((new Date(bulkToDate) - new Date(bulkFromDate)) / 86400000) + 1;
        const slots = [];
        for (let i = 0; i < dayCount; i++) {
          const date = addDays(bulkFromDate, i);
          for (const shiftNo of [1, 2]) {
            if (!occupied.has(`${date}|${shiftNo}`)) slots.push({ date, shiftNo });
          }
        }
        slots.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.shiftNo - b.shiftNo));
        setBulkAvailableSlots(slots);
      })
      .catch(() => setBulkAvailableSlots(null))
      .finally(() => { if (!cancelled) setBulkCheckingSlots(false); });
    return () => { cancelled = true; };
  }, [bulkAssignModalOpen, bulkMachineID, bulkFromDate, bulkToDate, user]);

  const handleBulkAssignSave = async () => {
    setBulkError('');
    if (!bulkMachineID) { setBulkError('Please select a machine.'); return; }
    if (!bulkFromDate || !bulkToDate || bulkFromDate > bulkToDate) { setBulkError('Please select a valid date range.'); return; }
    if (!bulkWarehouse) { setBulkError('Please select a warehouse.'); return; }
    if (bulkLines.length === 0) { setBulkError('Add at least one item line.'); return; }
    if (bulkLines.some(l => !l.itemID)) { setBulkError('Every line needs an item selected.'); return; }
    if (bulkLines.some(l => !l.formulaID)) { setBulkError('Every line needs a formula selected.'); return; }
    if (bulkLines.some(l => !l.qty || Number(l.qty) <= 0)) { setBulkError('Every line needs a Qty greater than 0.'); return; }
    if (bulkLines.some(l => !l.productionTime || Number(l.productionTime) <= 0)) { setBulkError('Every line needs a Production Time greater than 0.'); return; }

    const resolvedLines = [];
    for (const l of bulkLines) {
      const formula = formulaOptions.find(f => String(f.value) === String(l.formulaID));
      const formulaBatch = Number(formula?.batchQuantity || 0);
      if (formulaBatch <= 0) { setBulkError(`"${l.itemCode}"'s selected formula has no Batch Quantity set.`); return; }
      const qty = Number(l.qty);
      const prodTime = Number(l.productionTime);
      const unitsPerShift = (SHIFT_SECONDS / prodTime) * formulaBatch;
      const slotsNeeded = Math.max(1, Math.ceil(qty / unitsPerShift));
      resolvedLines.push({ ...l, formulaID: l.formulaID, formulaBatch, qty, prodTime, slotsNeeded });
    }

    if (!bulkAvailableSlots) { setBulkError('Could not verify slot availability -- try again.'); return; }
    const totalNeeded = resolvedLines.reduce((sum, l) => sum + l.slotsNeeded, 0);
    if (totalNeeded > bulkAvailableSlots.length) {
      setBulkError(`Need ${totalNeeded} empty shift${totalNeeded > 1 ? 's' : ''} total for this Qty at these rates, but only ${bulkAvailableSlots.length} ${bulkAvailableSlots.length === 1 ? 'is' : 'are'} empty for this machine in this date range. Widen the range, trim Qty, or shorten Production Time.`);
      return;
    }

    setBulkSaving(true);
    try {
      let cursor = 0;
      for (const l of resolvedLines) {
        const mySlots = bulkAvailableSlots.slice(cursor, cursor + l.slotsNeeded);
        cursor += l.slotsNeeded;
        const qtyPerSlot = l.qty / l.slotsNeeded;

        let cumulative = 0;
        const lineMember = mySlots.map((s, idx) => {
          const shiftStart = new Date(s.date + 'T00:00:00');
          shiftStart.setHours(shiftStartHour(s.shiftNo), 0, 0, 0);
          const shiftEnd = new Date(shiftStart.getTime() + SHIFT_SECONDS * 1000);
          cumulative += qtyPerSlot;
          return {
            ShiftIndex: idx + 1,
            ShiftDate: s.date,
            ShiftNo: Number(s.shiftNo),
            StartTime: toLocalDateTimeStr(shiftStart),
            EndTime: toLocalDateTimeStr(shiftEnd),
            PlannedQty: qtyPerSlot,
            CumulativeQty: cumulative
          };
        });

        const dates = mySlots.map(s => s.date);
        const payload = {
          ItemID: Number(l.itemID),
          ItemCode: l.itemCode,
          StartDate: dates.reduce((a, b) => (a < b ? a : b)),
          EndDate: dates.reduce((a, b) => (a > b ? a : b)),
          PlannedQty: l.qty,
          FormulaID: Number(l.formulaID),
          MachineID: Number(bulkMachineID),
          FormulaBatch: l.formulaBatch,
          ProductionTime: l.prodTime,
          Warehouse: bulkWarehouse
        };

        const res = await apiCall('New Planning History', payload, { User: user?.Username, LineMember: JSON.stringify(lineMember) }, 'planning');
        if (res.State !== 0) throw new Error(`"${l.itemCode}": ${res.Message || 'Failed to assign.'}`);
      }

      setBulkAssignModalOpen(false);
      setBulkLines([]);
      setBulkMachineID('');
      setBulkWarehouse('');
      setBulkAvailableSlots(null);
      await handleGenerate();
    } catch (e) {
      setBulkError(e.message);
    } finally {
      setBulkSaving(false);
    }
  };

  const handleAssignItemChange = (id) => {
    setAssignItemID(id);
    const opt = itemOptions.find(o => String(o.value) === String(id));
    setAssignItemCode(opt?.itemCode || '');
    setAssignItemDescription(opt?.itemName || '');
    setAssignFormulaID('');
  };

  const assignItemFormulaOptions = formulaOptions.filter(f => String(f.parentItemID) === String(assignItemID));
  const selectedAssignFormula = formulaOptions.find(f => String(f.value) === String(assignFormulaID));
  const qtyPerSlot = selectedCount > 0 && Number(assignQty) > 0 ? Number(assignQty) / selectedCount : 0;

  // How many 12h shifts this Qty actually needs at this batch size/production
  // rate, vs. how many empty slots were selected -- catches "not enough
  // slots selected" (need to pick more) and "more slots than needed" (some
  // will sit underfilled) before saving.
  const assignBatchQty = Number(selectedAssignFormula?.batchQuantity || 0);
  const assignProdTime = Number(assignProductionTime || 0);
  const unitsPerShift = assignBatchQty > 0 && assignProdTime > 0 ? (SHIFT_SECONDS / assignProdTime) * assignBatchQty : 0;
  const slotsNeeded = unitsPerShift > 0 && Number(assignQty) > 0 ? Math.ceil(Number(assignQty) / unitsPerShift) : 0;
  // Total production time for the full Qty (independent of how many 12h
  // shifts that spans) -- e.g. 30h needed vs. 3 x 12h shifts to fit it in.
  const totalTimeSeconds = assignBatchQty > 0 && assignProdTime > 0 && Number(assignQty) > 0
    ? (Number(assignQty) / assignBatchQty) * assignProdTime
    : 0;
  const totalTimeLabel = formatDuration(Number(assignQty), assignBatchQty, assignProdTime);
  const totalTimeHoursExact = totalTimeSeconds > 0 ? totalTimeSeconds / 3600 : 0;

  const handleAssignSave = async () => {
    setAssignError('');
    if (!assignItemID) { setAssignError('Please select an item.'); return; }
    if (!assignFormulaID) { setAssignError('Please select a formula.'); return; }
    if (!assignWarehouse) { setAssignError('Please select a warehouse.'); return; }
    if (!assignProductionTime || Number(assignProductionTime) <= 0) { setAssignError('Enter a Production Time greater than 0.'); return; }
    const totalQty = Number(assignQty);
    if (!totalQty || totalQty <= 0) { setAssignError('Enter a Planned Qty greater than 0.'); return; }
    if (selectedCount === 0) { setAssignError('No slots selected.'); return; }

    setAssignSaving(true);
    try {
      const byMachine = {};
      selectedList.forEach(([, s]) => {
        if (!byMachine[s.machineID]) byMachine[s.machineID] = [];
        byMachine[s.machineID].push(s);
      });

      for (const machineID of Object.keys(byMachine)) {
        const slots = byMachine[machineID].slice().sort((a, b) => {
          if (a.date !== b.date) return a.date < b.date ? -1 : 1;
          return Number(a.shiftNo) - Number(b.shiftNo);
        });

        let cumulative = 0;
        const lines = slots.map((s, idx) => {
          const shiftStart = new Date(s.date + 'T00:00:00');
          shiftStart.setHours(shiftStartHour(s.shiftNo), 0, 0, 0);
          const shiftEnd = new Date(shiftStart.getTime() + SHIFT_SECONDS * 1000);
          cumulative += qtyPerSlot;
          return {
            ShiftIndex: idx + 1,
            ShiftDate: s.date,
            ShiftNo: Number(s.shiftNo),
            StartTime: toLocalDateTimeStr(shiftStart),
            EndTime: toLocalDateTimeStr(shiftEnd),
            PlannedQty: qtyPerSlot,
            CumulativeQty: cumulative
          };
        });

        const dates = slots.map(s => s.date);
        const machineStartDate = dates.reduce((a, b) => (a < b ? a : b));
        const machineEndDate = dates.reduce((a, b) => (a > b ? a : b));

        const payload = {
          ItemID: Number(assignItemID),
          ItemCode: assignItemCode,
          StartDate: machineStartDate,
          EndDate: machineEndDate,
          PlannedQty: qtyPerSlot * slots.length,
          FormulaID: Number(assignFormulaID),
          MachineID: Number(machineID),
          FormulaBatch: selectedAssignFormula?.batchQuantity ?? 0,
          ProductionTime: Number(assignProductionTime) || 0,
          Warehouse: assignWarehouse
        };

        const res = await apiCall('New Planning History', payload, { User: user?.Username, LineMember: JSON.stringify(lines) }, 'planning');
        if (res.State !== 0) throw new Error(res.Message || 'Failed to assign.');
      }

      setAssignModalOpen(false);
      setAssignItemID(''); setAssignItemCode(''); setAssignItemDescription('');
      setAssignFormulaID(''); setAssignWarehouse(''); setAssignQty(''); setAssignProductionTime('');
      setSelectedSlots({});
      await handleGenerate();
    } catch (e) {
      setAssignError(e.message);
    } finally {
      setAssignSaving(false);
    }
  };

  const handleShowFormula = async (item) => {
    setContextMenu(null);
    if (!item.formulaID) {
      setFormulaModal({ item, lines: [], loading: false, error: 'No formula linked to this slot.' });
      return;
    }
    setFormulaModal({ item, lines: [], loading: true, error: '' });
    try {
      const d = await apiCall('BOM L1 Formula', { ParentItemCode: item.itemCode }, { User: user?.Username }, 'plus');
      if (d.State !== 0) {
        setFormulaModal({ item, lines: [], loading: false, error: d.Message || 'Failed to load formula.' });
        return;
      }
      const lines = (d.List0 || []).filter(l => String(l.LineFormulaID) === String(item.formulaID));

      const balances = await Promise.all(lines.map(l =>
        apiCall('GetGridData', { PageGroupID: 'item_balance', fromItem: l.ChildItemCode, toItem: l.ChildItemCode }, { User: user?.Username }, 'plus')
          .then(bd => (bd.State === 0 ? (bd.List0 || []) : []))
          .catch(() => [])
      ));

      const linesWithBalance = lines.map((l, i) => {
        const row = balances[i].find(b => String(b.Warehouse || '').trim().toUpperCase() === String(item.warehouse || '').trim().toUpperCase());
        return { ...l, balance: row ? Number(row.ItemBalance || 0) : null };
      });

      setFormulaModal({ item, lines: linesWithBalance, loading: false, error: '' });
    } catch (e) {
      setFormulaModal({ item, lines: [], loading: false, error: e.message });
    }
  };

  // Creates a Shop Order using the exact same item/formula/machine/qty/
  // warehouse/date/shift as the right-clicked slot, then stamps the new
  // ShopOrderNumber back onto that shift-plan row so the calendar knows it's
  // covered.
  const handleCreateShopOrder = async (item) => {
    setContextMenu(null);
    if (item.shopOrderNo) {
      setShopOrderNotice({ type: 'error', message: `This slot already has Shop Order ${item.shopOrderNo}.` });
      return;
    }
    if (!item.itemID || !item.formulaID || !item.machineID || !item.warehouse || !item.qty) {
      setShopOrderNotice({ type: 'error', message: 'This slot is missing item/formula/machine/warehouse/qty -- cannot create a Shop Order from it.' });
      return;
    }

    setCreatingShopOrder(true);
    setShopOrderNotice(null);
    try {
      const createRes = await apiCall('New Shop Order', {
        ShopOrderDate: item.shiftDate,
        Warehouse: item.warehouse,
        // Same case-sensitive OPENJSON key casing as ShopOrderFormDrawer.jsx.
        ParentITemID: Number(item.itemID),
        FormulaID: Number(item.formulaID),
        MAchineID: Number(item.machineID),
        Qty: Number(item.qty),
        ShiftNo: Number(item.shiftNo)
      }, { User: user?.Username }, 'shop_order');

      if (createRes.State !== 0) {
        setShopOrderNotice({ type: 'error', message: createRes.Message || 'Failed to create Shop Order.' });
        return;
      }

      const shopOrderNumber = createRes.List0?.[0]?.ShopOrderNumber;

      if (shopOrderNumber && item.shiftPlanID) {
        const linkRes = await apiCall('Link Shop Order To Shift', {
          ShiftPlanID: item.shiftPlanID, ShopOrderNo: shopOrderNumber
        }, { User: user?.Username }, 'planning');
        if (linkRes.State !== 0) {
          setShopOrderNotice({ type: 'error', message: `Shop Order ${shopOrderNumber} created, but couldn't link it to the slot: ${linkRes.Message}` });
          await handleGenerate();
          return;
        }
      }

      setShopOrderNotice({ type: 'success', message: `Shop Order ${shopOrderNumber} created and linked to this slot.` });
      await handleGenerate();
    } catch (e) {
      setShopOrderNotice({ type: 'error', message: e.message });
    } finally {
      setCreatingShopOrder(false);
    }
  };

  // Combines selected assigned slots into ONE Shop Order -- e.g. Shift 1 +
  // Shift 2 + Shift 1 across two dates, same item/machine, all covered by a
  // single order sized to their combined Qty. All selected slots must share
  // the same item/machine/formula/warehouse (a Shop Order has exactly one of
  // each); the earliest slot (by date, then shift) supplies the order's
  // date/shift. If the combined Qty's production rate only needs fewer
  // shifts than were selected, only the earliest ones actually needed get
  // linked -- the rest are left alone (not consumed by this order).
  const handleCreateShopOrderBulk = async () => {
    setContextMenu(null);
    const items = Object.values(selectedAssignedSlots);
    if (items.length < 2) return;

    if (items.some(it => it.shopOrderNo)) {
      setShopOrderNotice({ type: 'error', message: 'One or more selected slots already have a linked Shop Order.' });
      return;
    }
    if (items.some(it => !it.itemID || !it.formulaID || !it.machineID || !it.warehouse || !it.qty)) {
      setShopOrderNotice({ type: 'error', message: 'One or more selected slots are missing item/formula/machine/warehouse/qty.' });
      return;
    }

    const first = items[0];
    const mismatch = items.some(it =>
      String(it.itemID) !== String(first.itemID) ||
      String(it.machineID) !== String(first.machineID) ||
      String(it.formulaID) !== String(first.formulaID) ||
      String(it.warehouse).trim().toUpperCase() !== String(first.warehouse).trim().toUpperCase()
    );
    if (mismatch) {
      setShopOrderNotice({ type: 'error', message: 'Selected slots must all be the same item, machine, formula, and warehouse to combine into one Shop Order.' });
      return;
    }

    const totalQty = items.reduce((sum, it) => sum + Number(it.qty || 0), 0);
    const sortedItems = [...items].sort((a, b) => {
      if (a.shiftDate !== b.shiftDate) return a.shiftDate < b.shiftDate ? -1 : 1;
      return Number(a.shiftNo) - Number(b.shiftNo);
    });

    // If the combined Qty's own production rate (batch size / production
    // time) only needs fewer 12h shifts than were selected, only link the
    // earliest ones that are actually needed -- the order's Qty stays the
    // full combined total either way (that's still how much to produce),
    // it just doesn't need every selected slot's worth of shift time.
    // Excess slot(s) are simply left unlinked, not folded into the order.
    const unitsPerShift = Number(first.formulaBatch || 0) > 0 && Number(first.productionTime || 0) > 0
      ? (SHIFT_SECONDS / Number(first.productionTime)) * Number(first.formulaBatch)
      : 0;
    const slotsNeeded = unitsPerShift > 0
      ? Math.min(sortedItems.length, Math.max(1, Math.ceil(totalQty / unitsPerShift)))
      : sortedItems.length;
    const usedItems = sortedItems.slice(0, slotsNeeded);
    const droppedItems = sortedItems.slice(slotsNeeded);
    const earliest = usedItems[0];

    setCreatingShopOrder(true);
    setShopOrderNotice(null);
    try {
      const createRes = await apiCall('New Shop Order', {
        ShopOrderDate: earliest.shiftDate,
        Warehouse: first.warehouse,
        // Same case-sensitive OPENJSON key casing as ShopOrderFormDrawer.jsx.
        ParentITemID: Number(first.itemID),
        FormulaID: Number(first.formulaID),
        MAchineID: Number(first.machineID),
        Qty: totalQty,
        ShiftNo: Number(earliest.shiftNo)
      }, { User: user?.Username }, 'shop_order');

      if (createRes.State !== 0) {
        setShopOrderNotice({ type: 'error', message: createRes.Message || 'Failed to create Shop Order.' });
        return;
      }

      const shopOrderNumber = createRes.List0?.[0]?.ShopOrderNumber;

      for (const it of usedItems) {
        if (!it.shiftPlanID) continue;
        const linkRes = await apiCall('Link Shop Order To Shift', {
          ShiftPlanID: it.shiftPlanID, ShopOrderNo: shopOrderNumber
        }, { User: user?.Username }, 'planning');
        if (linkRes.State !== 0) {
          setShopOrderNotice({ type: 'error', message: `Shop Order ${shopOrderNumber} created, but couldn't link one or more slots: ${linkRes.Message}` });
          setSelectedAssignedSlots({});
          await handleGenerate();
          return;
        }
      }

      setShopOrderNotice({
        type: 'success',
        message: droppedItems.length > 0
          ? `Shop Order ${shopOrderNumber} created (Qty ${totalQty.toLocaleString(undefined, { maximumFractionDigits: 3 })}) and linked to ${usedItems.length} of ${items.length} selected slots -- the rest weren't needed for this Qty at this rate and were left unlinked.`
          : `Shop Order ${shopOrderNumber} created and linked to ${items.length} selected slots.`
      });
      setSelectedAssignedSlots({});
      await handleGenerate();
    } catch (e) {
      setShopOrderNotice({ type: 'error', message: e.message });
    } finally {
      setCreatingShopOrder(false);
    }
  };

  // Right-click "Delete Slot" -- blocked (server-side too) once a Shop
  // Order's been created from this slot.
  const handleDeleteSlot = (item) => {
    setContextMenu(null);
    if (item.shopOrderNo) {
      setShopOrderNotice({ type: 'error', message: `Cannot delete -- Shop Order ${item.shopOrderNo} is already linked to this slot.` });
      return;
    }
    setConfirmDialog({
      title: 'Delete Slot',
      message: `Remove ${item.itemCode} from this time slot? This deletes the shift-plan row entirely.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await apiCall('Delete Shift Plan Slot', item.shiftPlanID, { User: user?.Username }, 'planning');
          if (res.State === 0) {
            setShopOrderNotice({ type: 'success', message: `Removed ${item.itemCode} from this slot.` });
            await handleGenerate();
          } else {
            setShopOrderNotice({ type: 'error', message: res.Message || 'Failed to delete slot.' });
          }
        } catch (e) {
          setShopOrderNotice({ type: 'error', message: e.message });
        }
      }
    });
  };

  // Right-click "Edit Shift Plan" -- blocked once a Shop Order's been
  // created from this slot, same as Delete.
  const handleOpenEditSlot = (item) => {
    setContextMenu(null);
    if (item.shopOrderNo) {
      setShopOrderNotice({ type: 'error', message: `Cannot edit -- Shop Order ${item.shopOrderNo} is already linked to this slot.` });
      return;
    }
    setEditSlotModal({ item, qty: item.qty, saving: false, error: '' });
  };

  const handleSaveEditSlot = async () => {
    if (!editSlotModal) return;
    const qtyNum = Number(editSlotModal.qty);
    if (!editSlotModal.qty || qtyNum < 0) {
      setEditSlotModal(prev => ({ ...prev, error: 'Enter a Qty of 0 or more.' }));
      return;
    }
    setEditSlotModal(prev => ({ ...prev, saving: true, error: '' }));
    try {
      const res = await apiCall('Edit Shift Plan Slot', {
        ShiftPlanID: editSlotModal.item.shiftPlanID, PlannedQty: qtyNum
      }, { User: user?.Username }, 'planning');
      if (res.State === 0) {
        setEditSlotModal(null);
        setShopOrderNotice({ type: 'success', message: `Updated Qty for ${editSlotModal.item.itemCode} on this slot.` });
        await handleGenerate();
      } else {
        setEditSlotModal(prev => ({ ...prev, saving: false, error: res.Message || 'Failed to save.' }));
      }
    } catch (e) {
      setEditSlotModal(prev => ({ ...prev, saving: false, error: e.message }));
    }
  };

  // Right-click "Producation" -- opens the same production/issue drawer used
  // on the Shop Orders page, scoped to whichever Shop Order this slot is
  // linked to. Requires "Create Shop Order" to have been run on the slot first.
  const handleOpenProduction = async (item) => {
    setContextMenu(null);
    if (!item.shopOrderNo) {
      setShopOrderNotice({ type: 'error', message: 'No Shop Order linked to this slot yet -- use "Create Shop Order" first.' });
      return;
    }
    setOpeningProduction(true);
    try {
      const res = await apiCall('GetGridData', { PageGroupID: 'shop_orders' }, { User: user?.Username }, 'plus');
      if (res.State !== 0) {
        setShopOrderNotice({ type: 'error', message: res.Message || 'Failed to load Shop Order.' });
        return;
      }
      const shopOrderRow = (res.List0 || []).find(r => String(r.ShopOrderNumber) === String(item.shopOrderNo));
      if (!shopOrderRow) {
        setShopOrderNotice({ type: 'error', message: `Shop Order ${item.shopOrderNo} not found.` });
        return;
      }
      setProductionRow(shopOrderRow);
    } catch (e) {
      setShopOrderNotice({ type: 'error', message: e.message });
    } finally {
      setOpeningProduction(false);
    }
  };

  const renderCell = (m, d, shiftNo) => {
    const key = `${m.MachineID}|${d}|${shiftNo}`;
    const items = cellMap[key] || [];
    const accent = SHIFT_ACCENT[shiftNo];
    const isToday = d === todayStr;
    const isEmpty = items.length === 0;
    const isSelected = !!selectedSlots[key];

    const baseBg = isSelected ? 'var(--orange-glow)' : (isToday ? 'var(--orange-glow)' : 'transparent');

    return (
      <td
        key={shiftNo}
        onClick={isEmpty ? () => toggleSlot(m, d, shiftNo) : undefined}
        onMouseEnter={isEmpty ? (e) => { if (!isSelected) e.currentTarget.style.background = 'var(--soft)'; } : undefined}
        onMouseLeave={isEmpty ? (e) => { if (!isSelected) e.currentTarget.style.background = baseBg; } : undefined}
        style={{
          padding: '6px 8px', fontSize: 11.5, verticalAlign: 'top', minHeight: 34,
          borderBottom: '1px solid var(--border)',
          borderLeft: shiftNo === 1 ? '1px solid var(--border)' : '1px solid var(--soft)',
          background: baseBg,
          boxShadow: isSelected ? 'inset 0 0 0 2px var(--orange)' : 'none',
          cursor: isEmpty ? 'pointer' : 'default'
        }}
      >
        {items.map((c, i) => {
          const isAssignedSelected = !!selectedAssignedSlots[c.shiftPlanID];
          return (
          <div
            key={i}
            onClick={() => toggleAssignedSlot(c)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, item: c }); }}
            title={c.shopOrderNo ? undefined : 'Click to select -- combine multiple selected slots into one Shop Order via right-click'}
            style={{
              marginBottom: 4, padding: '4px 6px 4px 8px', borderRadius: 'var(--radius-xs)',
              borderLeft: `3px solid ${accent.bar}`, background: accent.soft,
              cursor: c.shopOrderNo ? 'context-menu' : 'pointer',
              boxShadow: isAssignedSelected ? 'inset 0 0 0 2px var(--orange)' : 'none'
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{c.itemCode}</div>
            {c.itemDescription && (
              <div style={{
                color: 'var(--hint)', fontSize: 10.5, whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110
              }}>
                {c.itemDescription}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                {c.qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              {formatDuration(c.qty, c.formulaBatch, c.productionTime) && (
                <span style={{ color: accent.fg, fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)' }}>
                  {formatDuration(c.qty, c.formulaBatch, c.productionTime)}
                </span>
              )}
            </div>
            {c.shopOrderNo && (
              <div style={{
                marginTop: 3, fontSize: 9.5, fontWeight: 700, color: 'var(--green)',
                display: 'inline-flex', alignItems: 'center', gap: 3
              }}>
                🏭 SO {c.shopOrderNo}
              </div>
            )}
          </div>
          );
        })}
        {isEmpty && isSelected && (
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--orange2)', textAlign: 'center' }}>✓ selected</div>
        )}
      </td>
    );
  };

  return (
    <>
      <div style={{
        position: 'fixed', top: '3vh', left: '3vw', right: '3vw', bottom: '3vh',
        background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius)',
        zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: '1px solid var(--border)', fontFamily: 'var(--font)'
      }}>
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)'
        }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 'var(--radius-xs)', background: 'var(--orange-soft)', fontSize: 16
            }}>📅</span>
            Show Plan
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: 22, lineHeight: 1, cursor: 'pointer',
              color: 'var(--muted)', width: 32, height: 32, borderRadius: '999px', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--red)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)'; }}
          >×</button>
        </div>

        <div style={{
          padding: '14px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', background: 'var(--soft)'
        }}>
          <div>
            <label style={labelStyle}>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              padding: '9px 22px', borderRadius: 'var(--radius-xs)', border: 'none',
              background: loading ? 'var(--hint)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 14px var(--orange-glow)'
            }}
          >
            {loading ? 'Loading...' : 'Generate'}
          </button>
          <button
            onClick={openBulkAssignModal}
            style={{
              padding: '9px 20px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)',
              background: 'var(--surface)', color: 'var(--text)', fontWeight: 700, fontSize: 13, cursor: 'pointer'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.color = 'var(--orange2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)'; }}
          >
            + Assign
          </button>
          {error && (
            <div style={{
              color: 'var(--red)', background: 'var(--red-soft)', fontSize: 12.5, fontWeight: 600,
              padding: '7px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(220,38,38,0.15)'
            }}>
              {error}
            </div>
          )}
          {generated && (
            <div style={{ fontSize: 11.5, color: 'var(--hint)', maxWidth: 260 }}>
              Click empty slots to select them, then assign an item to fill them.
            </div>
          )}
          <div style={{ display: 'flex', gap: 14, marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--orange)', display: 'inline-block' }} />
              Shift 1
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--blue)', display: 'inline-block' }} />
              Shift 2
            </span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 16, background: 'var(--bg)' }}>
          {!generated ? (
            <div style={{ fontSize: 13, color: 'var(--hint)', padding: 20, textAlign: 'center' }}>Pick a date range and click Generate.</div>
          ) : machines.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--hint)', padding: 20, textAlign: 'center' }}>No machines found.</div>
          ) : (
            <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>
              <thead>
                <tr>
                  <th style={{
                    position: 'sticky', left: 0, top: 0, zIndex: 3, background: 'var(--surface)',
                    textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--muted)',
                    textTransform: 'uppercase', letterSpacing: 0.4,
                    borderBottom: '2px solid var(--border)', borderRight: '2px solid var(--border)', minWidth: 160
                  }}>
                    Machine
                  </th>
                  {days.map(d => {
                    const isToday = d === todayStr;
                    return (
                      <th key={d} colSpan={2} style={{
                        position: 'sticky', top: 0, zIndex: 2,
                        background: isToday ? 'var(--orange-soft)' : 'var(--soft)',
                        textAlign: 'center', padding: '8px 6px', fontSize: 12, fontWeight: 700,
                        color: isToday ? 'var(--orange2)' : 'var(--text)',
                        borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)'
                      }}>
                        {formatDateLabel(d)}
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: isToday ? 'var(--orange2)' : 'var(--hint)',
                          textTransform: 'uppercase', marginTop: 1
                        }}>
                          {formatDayName(d)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  <th style={{
                    position: 'sticky', left: 0, top: 46, zIndex: 3, background: 'var(--surface)',
                    borderBottom: '2px solid var(--border)', borderRight: '2px solid var(--border)'
                  }}></th>
                  {days.map(d => (
                    <React.Fragment key={d}>
                      <th style={{
                        position: 'sticky', top: 46, zIndex: 2, background: 'var(--bg)',
                        padding: '4px 8px', fontSize: 10, fontWeight: 700, color: 'var(--orange2)',
                        borderBottom: '2px solid var(--border)', borderLeft: '1px solid var(--border)', minWidth: 110
                      }}>Shift 1</th>
                      <th style={{
                        position: 'sticky', top: 46, zIndex: 2, background: 'var(--bg)',
                        padding: '4px 8px', fontSize: 10, fontWeight: 700, color: 'var(--blue)',
                        borderBottom: '2px solid var(--border)', minWidth: 110
                      }}>Shift 2</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {machines.map((m, mi) => (
                  <tr key={m.MachineID} style={{ background: mi % 2 === 0 ? 'var(--surface)' : 'var(--soft)' }}>
                    <td style={{
                      position: 'sticky', left: 0, zIndex: 1, background: mi % 2 === 0 ? 'var(--surface)' : 'var(--soft)',
                      padding: '10px 12px', fontSize: 12.5, fontWeight: 700, color: 'var(--text)',
                      borderBottom: '1px solid var(--border)', borderRight: '2px solid var(--border)', whiteSpace: 'nowrap'
                    }}>
                      {m.MachineCode}
                    </td>
                    {days.map(d => (
                      <React.Fragment key={d}>
                        {renderCell(m, d, 1)}
                        {renderCell(m, d, 2)}
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedCount > 0 && (
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 60
          }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
              {selectedCount} slot{selectedCount > 1 ? 's' : ''} selected
              {selectedMachineCount > 1 ? ` · ${selectedMachineCount} machines` : ''}
            </span>
            <button
              onClick={() => setSelectedSlots({})}
              style={{
                padding: '7px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)',
                background: 'var(--surface)', color: 'var(--muted)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer'
              }}
            >
              Clear
            </button>
            <button
              onClick={() => { setAssignError(''); setAssignModalOpen(true); }}
              style={{
                padding: '7px 16px', borderRadius: 'var(--radius-xs)', border: 'none',
                background: 'linear-gradient(135deg, var(--orange), var(--orange2))', color: '#fff',
                fontWeight: 700, fontSize: 12.5, cursor: 'pointer', boxShadow: '0 4px 14px var(--orange-glow)'
              }}
            >
              Assign Item
            </button>
          </div>
        )}

        {selectedCount === 0 && Object.keys(selectedAssignedSlots).length > 0 && (
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 60
          }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
              {Object.keys(selectedAssignedSlots).length} slot{Object.keys(selectedAssignedSlots).length > 1 ? 's' : ''} selected
              {Object.keys(selectedAssignedSlots).length >= 2 ? ' -- right-click one to combine into one Shop Order' : ' -- select at least one more to combine'}
            </span>
            <button
              onClick={() => setSelectedAssignedSlots({})}
              style={{
                padding: '7px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)',
                background: 'var(--surface)', color: 'var(--muted)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        )}

        {shopOrderNotice && (
          <div style={{
            position: 'absolute', top: 90, right: 20, zIndex: 70, maxWidth: 340,
            background: shopOrderNotice.type === 'success' ? 'var(--green-soft)' : 'var(--red-soft)',
            color: shopOrderNotice.type === 'success' ? 'var(--green)' : 'var(--red)',
            border: `1px solid ${shopOrderNotice.type === 'success' ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
            borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-lg)', padding: '10px 14px',
            display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5, fontWeight: 600
          }}>
            <span style={{ flex: 1 }}>{shopOrderNotice.message}</span>
            <button
              onClick={() => setShopOrderNotice(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', fontSize: 16, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}
            >×</button>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }} onClick={onClose} />

      {assignModalOpen && (
        <>
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 460, maxWidth: '92vw', background: 'var(--surface)', borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', zIndex: 1200,
            fontFamily: 'var(--font)', overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Assign Item to Selected Slots</h3>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {selectedCount} slot{selectedCount > 1 ? 's' : ''} selected across {selectedMachineCount} machine{selectedMachineCount > 1 ? 's' : ''}
              </div>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {assignError && (
                <div style={{
                  color: 'var(--red)', background: 'var(--red-soft)', fontSize: 12.5, fontWeight: 600,
                  padding: '8px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(220,38,38,0.15)'
                }}>
                  {assignError}
                </div>
              )}

              <div>
                <label style={labelStyle}>Item</label>
                <SearchableSelect
                  value={assignItemID}
                  onChange={handleAssignItemChange}
                  options={itemOptions}
                  placeholder="Search item code / description..."
                />
                {assignItemDescription && (
                  <div style={{ fontSize: 11.5, color: 'var(--hint)', marginTop: 4 }}>{assignItemDescription}</div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Formula</label>
                <SearchableSelect
                  value={assignFormulaID}
                  onChange={setAssignFormulaID}
                  options={assignItemFormulaOptions}
                  placeholder={assignItemID ? 'Search formula...' : 'Select an item first'}
                  disabled={!assignItemID}
                />
                {assignItemID && assignItemFormulaOptions.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--hint)', marginTop: 4 }}>No BOM formula found for this item.</div>
                )}
                {selectedAssignFormula && (
                  <div style={{ fontSize: 11.5, color: 'var(--hint)', marginTop: 4 }}>
                    Batch Qty: {Number(selectedAssignFormula.batchQuantity || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Warehouse</label>
                <SearchableSelect
                  value={assignWarehouse}
                  onChange={setAssignWarehouse}
                  options={warehouseOptions}
                  placeholder="Search warehouse..."
                />
              </div>

              <div>
                <label style={labelStyle}>Total Planned Qty</label>
                <input
                  type="number" step="0.00001" value={assignQty}
                  onChange={e => setAssignQty(e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                />
                {qtyPerSlot > 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--hint)', marginTop: 4 }}>
                    = {qtyPerSlot.toLocaleString(undefined, { maximumFractionDigits: 3 })} per slot, split evenly across {selectedCount} slot{selectedCount > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Production Time (seconds / batch)</label>
                <input
                  type="number" value={assignProductionTime}
                  onChange={e => setAssignProductionTime(e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                />
                {totalTimeLabel && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      Total Time
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--mono)' }}>
                      {totalTimeLabel}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--hint)' }}>
                      ({totalTimeHoursExact.toLocaleString(undefined, { maximumFractionDigits: 2 })} h)
                    </span>
                  </div>
                )}
                {slotsNeeded > 0 && (
                  <div style={{
                    fontSize: 11.5, fontWeight: 600, marginTop: 6, padding: '6px 10px', borderRadius: 'var(--radius-xs)',
                    color: slotsNeeded > selectedCount ? 'var(--red)' : (slotsNeeded < selectedCount ? 'var(--orange2)' : 'var(--green)'),
                    background: slotsNeeded > selectedCount ? 'var(--red-soft)' : (slotsNeeded < selectedCount ? 'var(--orange-soft)' : 'var(--green-soft)')
                  }}>
                    {slotsNeeded > selectedCount
                      ? `${totalTimeLabel} needed -- that's ${slotsNeeded} shift${slotsNeeded > 1 ? 's' : ''} at 12h each. Select ${slotsNeeded - selectedCount} more empty slot${slotsNeeded - selectedCount > 1 ? 's' : ''}.`
                      : slotsNeeded < selectedCount
                      ? `${totalTimeLabel} needed -- that's only ${slotsNeeded} shift${slotsNeeded > 1 ? 's' : ''} at 12h each. ${selectedCount - slotsNeeded} of the ${selectedCount} selected will sit underfilled.`
                      : `${totalTimeLabel} needed -- fits exactly across ${slotsNeeded} shift${slotsNeeded > 1 ? 's' : ''} at 12h each.`}
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--soft)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setAssignModalOpen(false)}
                disabled={assignSaving}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)',
                  background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSave}
                disabled={assignSaving}
                style={{
                  padding: '8px 20px', borderRadius: 'var(--radius-xs)', border: 'none',
                  background: assignSaving ? 'var(--hint)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', fontWeight: 700, fontSize: 13, cursor: assignSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {assignSaving ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1150 }} onClick={() => !assignSaving && setAssignModalOpen(false)} />
        </>
      )}

      {bulkAssignModalOpen && (
        <>
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 920, maxWidth: '95vw', maxHeight: '88vh', background: 'var(--surface)', borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', zIndex: 1200,
            fontFamily: 'var(--font)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Assign Items to Machine</h3>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                Pick a machine and date range, list the items to produce, and each one is scheduled across as many empty shifts as its Qty needs.
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {bulkError && (
                <div style={{
                  color: 'var(--red)', background: 'var(--red-soft)', fontSize: 12.5, fontWeight: 600,
                  padding: '8px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(220,38,38,0.15)'
                }}>
                  {bulkError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Machine</label>
                  <SearchableSelect
                    value={bulkMachineID}
                    onChange={setBulkMachineID}
                    options={machines.map(m => ({ label: `${m.MachineCode} - ${m.MachineDescription || ''}`, value: m.MachineID }))}
                    placeholder="Search machine..."
                  />
                </div>
                <div>
                  <label style={labelStyle}>From Date</label>
                  <input type="date" value={bulkFromDate} onChange={e => setBulkFromDate(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                </div>
                <div>
                  <label style={labelStyle}>To Date</label>
                  <input type="date" value={bulkToDate} onChange={e => setBulkToDate(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                </div>
                <div>
                  <label style={labelStyle}>Warehouse</label>
                  <SearchableSelect value={bulkWarehouse} onChange={setBulkWarehouse} options={warehouseOptions} placeholder="Search warehouse..." />
                </div>
              </div>

              {bulkMachineID && bulkFromDate && bulkToDate && (
                <div style={{
                  fontSize: 11.5, fontWeight: 600, padding: '6px 10px', borderRadius: 'var(--radius-xs)',
                  color: bulkCheckingSlots ? 'var(--muted)' : (bulkAvailableSlots == null ? 'var(--muted)' : bulkTotalSlotsNeeded > bulkAvailableSlots.length ? 'var(--red)' : 'var(--green)'),
                  background: bulkCheckingSlots ? 'var(--soft)' : (bulkAvailableSlots == null ? 'var(--soft)' : bulkTotalSlotsNeeded > bulkAvailableSlots.length ? 'var(--red-soft)' : 'var(--green-soft)')
                }}>
                  {bulkCheckingSlots
                    ? 'Checking availability...'
                    : bulkAvailableSlots == null
                    ? 'Could not check availability.'
                    : `${bulkAvailableSlots.length} empty shift${bulkAvailableSlots.length === 1 ? '' : 's'} available for this machine in this range -- ${bulkTotalSlotsNeeded} needed across the grid below.`}
                </div>
              )}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Items
                  </h4>
                  <button
                    onClick={addBulkLine}
                    style={{ padding: '6px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}
                  >
                    + Add Line
                  </button>
                </div>

                {bulkLineComputed.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--hint)' }}>No items yet -- click "Add Line" to add one.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 6px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Item</th>
                        <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Qty</th>
                        <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Prod. Time (s/batch)</th>
                        <th style={{ textAlign: 'left', padding: '8px 6px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Formula</th>
                        <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Shifts Needed</th>
                        <th style={{ borderBottom: '1px solid var(--border)' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkLineComputed.map((l, idx) => (
                        <tr key={l.key} style={{ background: idx % 2 === 1 ? 'var(--soft)' : 'transparent' }}>
                          <td style={{ padding: '8px 6px', minWidth: 220 }}>
                            <SearchableSelect
                              value={l.itemID}
                              onChange={(id) => updateBulkLineItem(idx, id)}
                              options={itemOptions}
                              placeholder="Search item..."
                            />
                          </td>
                          <td style={{ padding: '8px 6px', width: 110 }}>
                            <input
                              type="number" step="0.00001" value={l.qty === 0 ? '' : l.qty || ''}
                              onChange={e => updateBulkLineQty(idx, e.target.value)}
                              style={{ ...inputStyle, textAlign: 'right', width: '100%' }}
                            />
                          </td>
                          <td style={{ padding: '8px 6px', width: 130 }}>
                            <input
                              type="number" value={l.prodTime === 0 ? '' : l.prodTime || ''}
                              onChange={e => updateBulkLineProdTime(idx, e.target.value)}
                              style={{ ...inputStyle, textAlign: 'right', width: '100%' }}
                            />
                          </td>
                          <td style={{ padding: '8px 6px', minWidth: 180 }}>
                            <SearchableSelect
                              value={l.formulaID}
                              onChange={(id) => updateBulkLineFormula(idx, id)}
                              options={formulaOptions.filter(f => String(f.parentItemID) === String(l.itemID))}
                              placeholder={l.itemID ? 'Search formula...' : 'Select an item first'}
                              disabled={!l.itemID}
                            />
                          </td>
                          <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: l.slotsNeeded > 0 ? 'var(--text)' : 'var(--hint)' }}>
                            {l.slotsNeeded > 0 ? l.slotsNeeded : '—'}
                          </td>
                          <td style={{ padding: '8px 6px', width: 40 }}>
                            <button
                              onClick={() => removeBulkLine(idx)}
                              style={{
                                background: 'none', border: 'none', color: 'var(--muted)', fontSize: 16, lineHeight: 1,
                                cursor: 'pointer', width: 26, height: 26, borderRadius: '999px', display: 'flex',
                                alignItems: 'center', justifyContent: 'center'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-soft)'; e.currentTarget.style.color = 'var(--red)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)'; }}
                            >×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--soft)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setBulkAssignModalOpen(false)}
                disabled={bulkSaving}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)',
                  background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssignSave}
                disabled={bulkSaving}
                style={{
                  padding: '8px 20px', borderRadius: 'var(--radius-xs)', border: 'none',
                  background: bulkSaving ? 'var(--hint)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', fontWeight: 700, fontSize: 13, cursor: bulkSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {bulkSaving ? 'Assigning...' : 'Save'}
              </button>
            </div>
          </div>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1150 }} onClick={() => !bulkSaving && setBulkAssignModalOpen(false)} />
        </>
      )}

      {contextMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 1250 }}
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div style={{
            position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 1260,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
            boxShadow: 'var(--shadow-lg)', minWidth: 170, overflow: 'hidden', fontFamily: 'var(--font)'
          }}>
            <button
              onClick={() => handleShowFormula(contextMenu.item)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none',
                background: 'none', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', cursor: 'pointer'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--orange2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text)'; }}
            >
              Show Formula
            </button>
            <button
              onClick={() => handleOpenEditSlot(contextMenu.item)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none',
                borderTop: '1px solid var(--border)', background: 'none', fontSize: 12.5, fontWeight: 600,
                color: 'var(--text)', cursor: 'pointer'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--orange2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text)'; }}
            >
              ✏ Edit Shift Plan
            </button>
            {(() => {
              const bulkEligible = !!selectedAssignedSlots[contextMenu.item.shiftPlanID] && Object.keys(selectedAssignedSlots).length >= 2;
              return (
                <button
                  onClick={() => bulkEligible ? handleCreateShopOrderBulk() : handleCreateShopOrder(contextMenu.item)}
                  disabled={creatingShopOrder}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none',
                    borderTop: '1px solid var(--border)', background: 'none', fontSize: 12.5, fontWeight: 600,
                    color: 'var(--text)', cursor: creatingShopOrder ? 'not-allowed' : 'pointer', opacity: creatingShopOrder ? 0.6 : 1
                  }}
                  onMouseEnter={e => { if (!creatingShopOrder) { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--orange2)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text)'; }}
                >
                  {creatingShopOrder
                    ? 'Creating...'
                    : bulkEligible
                    ? `🏭 Create Shop Order for ${Object.keys(selectedAssignedSlots).length} Selected Slots`
                    : '🏭 Create Shop Order'}
                </button>
              );
            })()}
            <button
              onClick={() => handleOpenProduction(contextMenu.item)}
              disabled={openingProduction}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none',
                borderTop: '1px solid var(--border)', background: 'none', fontSize: 12.5, fontWeight: 600,
                color: 'var(--text)', cursor: openingProduction ? 'not-allowed' : 'pointer', opacity: openingProduction ? 0.6 : 1
              }}
              onMouseEnter={e => { if (!openingProduction) { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--orange2)'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text)'; }}
            >
              {openingProduction ? 'Opening...' : '📋 Producation'}
            </button>
            <button
              onClick={() => handleDeleteSlot(contextMenu.item)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none',
                borderTop: '1px solid var(--border)', background: 'none', fontSize: 12.5, fontWeight: 600,
                color: 'var(--red)', cursor: 'pointer'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-soft)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              🗑 Delete Slot
            </button>
          </div>
        </>
      )}

      {formulaModal && (() => {
        const batchQty = Number(formulaOptions.find(f => String(f.value) === String(formulaModal.item.formulaID))?.batchQuantity || 0);
        const totalBatches = batchQty > 0 ? formulaModal.item.qty / batchQty : 0;
        return (
          <>
            <div style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 920, maxWidth: '95vw', maxHeight: '80vh', background: 'var(--surface)', borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', zIndex: 1300,
              fontFamily: 'var(--font)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                    Formula for {formulaModal.item.itemCode}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {formulaModal.item.formulaCode ? `${formulaModal.item.formulaCode} · ` : ''}
                    Batch Qty {batchQty ? batchQty.toLocaleString(undefined, { maximumFractionDigits: 5 }) : '—'}
                    {totalBatches > 0 ? ` · ${totalBatches.toLocaleString(undefined, { maximumFractionDigits: 3 })} batches for this shift` : ''}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--hint)', marginTop: 2 }}>
                    Balance shown for production warehouse: {formulaModal.item.warehouse
                      ? <span style={{ fontWeight: 700, color: 'var(--orange2)' }}>{formulaModal.item.warehouse}</span>
                      : <span style={{ fontStyle: 'italic' }}>none set on this plan</span>}
                  </div>
                </div>
                <button
                  onClick={() => setFormulaModal(null)}
                  style={{
                    background: 'none', border: 'none', fontSize: 20, lineHeight: 1, cursor: 'pointer',
                    color: 'var(--muted)', width: 28, height: 28, borderRadius: '999px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.color = 'var(--red)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)'; }}
                >×</button>
              </div>

              <div style={{ padding: 20, overflowY: 'auto' }}>
                {formulaModal.error ? (
                  <div style={{
                    color: 'var(--red)', background: 'var(--red-soft)', fontSize: 12.5, fontWeight: 600,
                    padding: '8px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(220,38,38,0.15)'
                  }}>
                    {formulaModal.error}
                  </div>
                ) : formulaModal.loading ? (
                  <div style={{ fontSize: 13, color: 'var(--hint)' }}>Loading...</div>
                ) : formulaModal.lines.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--hint)' }}>No BOM lines found for this formula.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>#</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Item Code</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Description</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Qty / Batch</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Total Required</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formulaModal.lines.map(l => {
                        const required = Number(l.Quantity || 0) * totalBatches;
                        const short = l.balance !== null && l.balance < required;
                        return (
                          <tr key={l.BLID || l.Line}>
                            <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{l.Line}</td>
                            <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{l.ChildItemCode}</td>
                            <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{l.ChildItemDescription}</td>
                            <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--mono)', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
                              {Number(l.Quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })}
                            </td>
                            <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--mono)', fontWeight: 700, textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
                              {required.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                            </td>
                            <td style={{
                              padding: '8px 10px', fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 700, textAlign: 'right',
                              borderBottom: '1px solid var(--border)', color: l.balance === null ? 'var(--hint)' : (short ? 'var(--red)' : 'var(--green)')
                            }}>
                              {l.balance === null ? '—' : l.balance.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1290 }} onClick={() => setFormulaModal(null)} />
          </>
        );
      })()}

      {editSlotModal && (
        <>
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 400, maxWidth: '92vw', background: 'var(--surface)', borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', zIndex: 1300,
            fontFamily: 'var(--font)', overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Edit Shift Plan</h3>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {editSlotModal.item.itemCode} · {editSlotModal.item.shiftDate} · Shift {editSlotModal.item.shiftNo}
              </div>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {editSlotModal.error && (
                <div style={{
                  color: 'var(--red)', background: 'var(--red-soft)', fontSize: 12.5, fontWeight: 600,
                  padding: '8px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(220,38,38,0.15)'
                }}>
                  {editSlotModal.error}
                </div>
              )}
              <div>
                <label style={labelStyle}>Planned Qty</label>
                <input
                  type="number" step="0.00001" value={editSlotModal.qty}
                  onChange={e => setEditSlotModal(prev => ({ ...prev, qty: e.target.value }))}
                  style={{ ...inputStyle, width: '100%' }}
                />
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--soft)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setEditSlotModal(null)}
                disabled={editSlotModal.saving}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)',
                  background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditSlot}
                disabled={editSlotModal.saving}
                style={{
                  padding: '8px 20px', borderRadius: 'var(--radius-xs)', border: 'none',
                  background: editSlotModal.saving ? 'var(--hint)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
                  color: '#fff', fontWeight: 700, fontSize: 13, cursor: editSlotModal.saving ? 'not-allowed' : 'pointer'
                }}
              >
                {editSlotModal.saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1290 }} onClick={() => !editSlotModal.saving && setEditSlotModal(null)} />
        </>
      )}

      {productionRow && (
        <ShopOrderProductionDrawer
          user={user}
          row={productionRow}
          onClose={() => setProductionRow(null)}
          onSaveSuccess={() => { setProductionRow(null); handleGenerate(); }}
        />
      )}

      {confirmDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
    </>
  );
}
