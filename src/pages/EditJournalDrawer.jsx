import React, { useEffect, useState, useRef } from 'react';
import { apiCall } from '../shared/api.js';
import SearchableSelect from '../shared/SearchableSelect.jsx';

function fmtAmt(v) {
  const n = Number(v || 0);
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(v) {
  if (!v) return '—';
  return v.split('T')[0];
}
function renderCodeAndDesc(code, desc) {
  if (!code) return '—';
  if (!desc) return <span style={{ fontFamily: "'Roboto Mono', monospace" }}>{code}</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontFamily: "'Roboto Mono', monospace", fontWeight: 600 }}>{code}</span>
      <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'normal', maxWidth: 180, lineHeight: 1.25 }}>{desc}</span>
    </div>
  );
}

export default function EditJournalDrawer({ row, user, onClose, onSaveSuccess }) {
  const [header, setHeader] = useState(null);
  const [lines, setLines] = useState([]);
  const [optAccounts, setOptAccounts] = useState([]);
  const [optCustomers, setOptCustomers] = useState([]);
  const [optVendors, setOptVendors] = useState([]);
  const [optBanks, setOptBanks] = useState([]);
  const [optDebtors, setOptDebtors] = useState([]);
  const [optTaxes, setOptTaxes] = useState([]);
  const [optSegs, setOptSegs] = useState({
    7: [], 8: [], 9: [], 10: [], 11: [], 12: [], 13: [], 14: [], 15: [], 16: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSegs, setExpandedSegs] = useState({});
  const [mode, setMode] = useState('view');   // 'view' | 'edit'
  const [closing, setClosing] = useState(false);
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  const savingRef = useRef(false);

  // ── View mode: loads from acc.JournalLine (no lock) ──
  const doView = async () => {
    setLoading(true);
    setError('');
    setHeader(null);
    setLines([]);
    setMode('view');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const currentJournalNo = row?.JournalNumber || header?.JournalNumber;
      const currentEventNo = row?.EventNumber || header?.EventNumber;
      if (!currentJournalNo) return;
      const d = await apiCall('Get Journal For View', {
        JournalNo: currentJournalNo,
        EventNo: currentEventNo
      }, { User: user?.Username }, 'journal');
      if (d.State !== 0) {
        setError(d.Message || 'Failed to load journal.');
      } else {
        setHeader((d.List0 || [])[0] || null);
        setLines(d.List1 || []);
      }
    } catch (e) {
      setError(e.name === 'AbortError' ? 'Request timed out. Check server connection.' : e.message);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  // ── Edit mode: acquires lock, loads from JournalLineWF ──
  const doEdit = async (forceReset = false) => {
    if (editingRef.current) return;
    editingRef.current = true;
    setEditing(true);
    setError('');
    const currentJournalNo = row?.JournalNumber || header?.JournalNumber;
    const currentEventNo = row?.EventNumber || header?.EventNumber;
    if (!currentJournalNo) return;

    try {
      if (forceReset) {
        await apiCall('Close Journal', {
          JournalNo: currentJournalNo,
          EventNo: currentEventNo
        }, { User: user?.Username }, 'journal');
      }
      const d = await apiCall('Open Journal', {
        JournalNo: currentJournalNo,
        EventNo: currentEventNo
      }, { User: user?.Username }, 'journal');

      if (d.State !== 0) {
        const inUseBySelf = d.Message && user?.Username &&
          d.Message.toLowerCase().includes(user.Username.toLowerCase());
        if (!forceReset && inUseBySelf) {
          doEdit(true);
          return;
        }
        setError(d.Message || 'Failed to open journal for edit.');
      } else {
        setHeader((d.List0 || [])[0] || null);
        setLines(d.List1 || []);
        setMode('edit');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      editingRef.current = false;
      setEditing(false);
    }
  };

  const updateLineField = (idx, field, val) => {
    setLines(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const addLine = () => {
    setLines(prev => [
      ...prev,
      {
        Line: prev.length + 1,
        LineType: 'GL Account',
        DebitBook: '',
        CreditBook: '',
        DebitTransaction: '',
        CreditTransaction: '',
        LineDescription: '',
        Reference1: '',
        Reference2: '',
        Account: '',
        DebitorCreditor: '',
        Customer: '',
        Vendor: '',
        Bank: '',
        Tax: '',
        Segment7: '',
        Segment8: '',
        Segment9: '',
        Segment10: '',
        Segment11: '',
        Segment12: '',
        Segment13: '',
        Segment14: '',
        Segment15: '',
        Segment16: '',
        IsLocked: 0,
        LineCurrency: header?.JournalCurrency || 'USD',
        LineExchangeRate: header?.JournalExchangeRate || 1
      }
    ]);
  };

  const deleteLine = (idx) => {
    setLines(prev => {
      const copy = prev.filter((_, i) => i !== idx);
      return copy.map((line, i) => ({ ...line, Line: i + 1 }));
    });
  };

  useEffect(() => {
    async function loadDropdowns() {
      try {
        const [accts, custs, vends, bnks, debs, txs, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16] = await Promise.all([
          apiCall('Accounts Master All').catch(() => ({ List0: [] })),
          apiCall('Customer Master All').catch(() => ({ List0: [] })),
          apiCall('Vendor Master All').catch(() => ({ List0: [] })),
          apiCall('Bank Accounts Master').catch(() => ({ List0: [] })),
          apiCall('DebtorCreditor Master All').catch(() => ({ List0: [] })),
          apiCall('Tax Master All').catch(() => ({ List0: [] })),
          apiCall('Segments Master List', { param1: 7 }).catch(() => ({ List0: [] })),
          apiCall('Segments Master List', { param1: 8 }).catch(() => ({ List0: [] })),
          apiCall('Segments Master List', { param1: 9 }).catch(() => ({ List0: [] })),
          apiCall('Segments Master List', { param1: 10 }).catch(() => ({ List0: [] })),
          apiCall('Segments Master List', { param1: 11 }).catch(() => ({ List0: [] })),
          apiCall('Segments Master List', { param1: 12 }).catch(() => ({ List0: [] })),
          apiCall('Segments Master List', { param1: 13 }).catch(() => ({ List0: [] })),
          apiCall('Segments Master List', { param1: 14 }).catch(() => ({ List0: [] })),
          apiCall('Segments Master List', { param1: 15 }).catch(() => ({ List0: [] })),
          apiCall('Segments Master List', { param1: 16 }).catch(() => ({ List0: [] })),
        ]);

        setOptAccounts((accts.List0 || []).map(x => ({ value: x.AccountNumber, label: `${x.AccountNumber} - ${x.AccountDescription}` })));
        setOptCustomers((custs.List0 || []).map(x => ({ value: x.CustomerNo, label: `${x.CustomerNo} - ${x.CustomerName}` })));
        setOptVendors((vends.List0 || []).map(x => ({ value: x.VendorNumber, label: `${x.VendorNumber} - ${x.VendorName}` })));
        setOptBanks((bnks.List0 || []).map(x => ({ value: x.BankAccountNumber, label: `${x.BankAccountNumber} - ${x.BankAccountName}` })));
        setOptDebtors((debs.List0 || []).map(x => ({ value: x.DRNumber, label: `${x.DRNumber} - ${x.DRName}` })));
        setOptTaxes((txs.List0 || []).map(x => ({ value: x.TaxAccount, label: `${x.TaxAccount} - ${x.TaxAccountDescription}` })));

        setOptSegs({
          7: (s7.List0 || []).map(x => ({ value: x.SegmentValue, label: `${x.SegmentValue} - ${x.ValueDescription}` })),
          8: (s8.List0 || []).map(x => ({ value: x.SegmentValue, label: `${x.SegmentValue} - ${x.ValueDescription}` })),
          9: (s9.List0 || []).map(x => ({ value: x.SegmentValue, label: `${x.SegmentValue} - ${x.ValueDescription}` })),
          10: (s10.List0 || []).map(x => ({ value: x.SegmentValue, label: `${x.SegmentValue} - ${x.ValueDescription}` })),
          11: (s11.List0 || []).map(x => ({ value: x.SegmentValue, label: `${x.SegmentValue} - ${x.ValueDescription}` })),
          12: (s12.List0 || []).map(x => ({ value: x.SegmentValue, label: `${x.SegmentValue} - ${x.ValueDescription}` })),
          13: (s13.List0 || []).map(x => ({ value: x.SegmentValue, label: `${x.SegmentValue} - ${x.ValueDescription}` })),
          14: (s14.List0 || []).map(x => ({ value: x.SegmentValue, label: `${x.SegmentValue} - ${x.ValueDescription}` })),
          15: (s15.List0 || []).map(x => ({ value: x.SegmentValue, label: `${x.SegmentValue} - ${x.ValueDescription}` })),
          16: (s16.List0 || []).map(x => ({ value: x.SegmentValue, label: `${x.SegmentValue} - ${x.ValueDescription}` })),
        });
      } catch (err) {
        console.error('Failed to load dropdown options:', err);
      }
    }
    loadDropdowns();
  }, []);

  const [optPrefixes, setOptPrefixes] = useState([]);

  const loadPrefixes = async (dateVal) => {
    if (!dateVal) return;
    try {
      const res = await apiCall('Get Journal Prefixes', { Date: dateVal.split('T')[0] });
      setOptPrefixes((res.List0 || []).map(x => ({ value: x.JournalPrefix, label: x.JournalPrefix })));
    } catch (e) {
      console.error('Failed to load prefixes:', e);
    }
  };

  useEffect(() => {
    if (!row) {
      const todayStr = new Date().toISOString().split('T')[0];
      setHeader({
        JournalNumber: '',
        JournalPrefix: '',
        JournalDate: todayStr,
        JournalDescription: '',
        JournalCurrency: 'USD',
        JournalExchangeRate: 1,
        OrginalDoucmentPrefix: '',
        OrginalDoucmentNumber: '',
        JournalSource: '',
        JournalModelID: 0,
        AttachmentID: 0
      });
      setLines([
        {
          Line: 1,
          LineType: 'GL Account',
          DebitBook: '',
          CreditBook: '',
          DebitTransaction: '',
          CreditTransaction: '',
          LineDescription: '',
          Reference1: '',
          Reference2: '',
          Account: '',
          DebitorCreditor: '',
          Customer: '',
          Vendor: '',
          Bank: '',
          Tax: '',
          Segment7: '',
          Segment8: '',
          Segment9: '',
          Segment10: '',
          Segment11: '',
          Segment12: '',
          Segment13: '',
          Segment14: '',
          Segment15: '',
          Segment16: '',
          IsLocked: 0,
          LineCurrency: 'USD',
          LineExchangeRate: 1
        },
        {
          Line: 2,
          LineType: 'GL Account',
          DebitBook: '',
          CreditBook: '',
          DebitTransaction: '',
          CreditTransaction: '',
          LineDescription: '',
          Reference1: '',
          Reference2: '',
          Account: '',
          DebitorCreditor: '',
          Customer: '',
          Vendor: '',
          Bank: '',
          Tax: '',
          Segment7: '',
          Segment8: '',
          Segment9: '',
          Segment10: '',
          Segment11: '',
          Segment12: '',
          Segment13: '',
          Segment14: '',
          Segment15: '',
          Segment16: '',
          IsLocked: 0,
          LineCurrency: 'USD',
          LineExchangeRate: 1
        }
      ]);
      setMode('edit');
      setLoading(false);
      loadPrefixes(todayStr);
    } else {
      doView();
    }
  }, [row]);

  useEffect(() => {
    if (!row && header && header.JournalDate) {
      loadPrefixes(header.JournalDate);
    }
  }, [header && header.JournalDate]);

  const [saving, setSaving] = useState(false);

  const doSave = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    // ── Frontend Validation ───────────────────────────────────────────────────
    const valErrors = [];

    // 1. Total DebitBook must equal Total CreditBook
    const totalDebitBook  = lines.reduce((s, l) => s + Number(l.DebitBook  || 0), 0);
    const totalCreditBook = lines.reduce((s, l) => s + Number(l.CreditBook || 0), 0);
    if (Math.abs(totalDebitBook - totalCreditBook) >= 0.01) {
      valErrors.push(
        `Book amounts are not balanced: Debit = ${totalDebitBook.toLocaleString('en-US', { minimumFractionDigits: 2 })} ≠ Credit = ${totalCreditBook.toLocaleString('en-US', { minimumFractionDigits: 2 })} (diff = ${(totalDebitBook - totalCreditBook).toLocaleString('en-US', { minimumFractionDigits: 2 })})`
      );
    }

    // 2. DebitTransaction must equal CreditTransaction per Currency
    const currTotals = {};
    lines.forEach(l => {
      const cur = l.LineCurrency || header?.JournalCurrency || 'BASE';
      if (!currTotals[cur]) currTotals[cur] = { debit: 0, credit: 0 };
      currTotals[cur].debit  += Number(l.DebitTransaction  || 0);
      currTotals[cur].credit += Number(l.CreditTransaction || 0);
    });
    Object.entries(currTotals).forEach(([cur, { debit, credit }]) => {
      if (Math.abs(debit - credit) >= 0.01) {
        valErrors.push(
          `Transaction amounts not balanced for currency [${cur}]: Debit = ${debit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ≠ Credit = ${credit.toLocaleString('en-US', { minimumFractionDigits: 2 })} (diff = ${(debit - credit).toLocaleString('en-US', { minimumFractionDigits: 2 })})`
        );
      }
    });

    // 3. Per-line: Debit & Credit cannot both be 0, and cannot both be non-zero
    lines.forEach((l, idx) => {
      const lineNo   = l.Line || (idx + 1);
      const debit    = Number(l.DebitBook  || 0);
      const credit   = Number(l.CreditBook || 0);

      // Both book amounts are zero
      if (debit === 0 && credit === 0) {
        valErrors.push(`Line ${lineNo}: Debit and Credit cannot both be 0.`);
      }
      // Both book amounts are non-zero
      if (debit !== 0 && credit !== 0) {
        valErrors.push(`Line ${lineNo}: Either Debit or Credit must be 0.`);
      }

      if (!l.Account) {
        valErrors.push(`Line ${lineNo}: Account must be selected.`);
      }
    });

    if (valErrors.length > 0) {
      setError(valErrors.join('\n'));
      savingRef.current = false;
      setSaving(false);
      return;
    }
    setError('');

    try {
      // ── Build LineData based on operation ──
      const headerData = row
        ? {
            // Edit Journal: SP only needs these 4 fields
            JournalNo:           header.JournalNumber || '',
            JournalDate:         header.JournalDate ? header.JournalDate.split('T')[0] : '',
            JournalDescription:  header.JournalDescription || '',
            EventNo:             Number(header.EventNumber || 0)
          }
        : {
            // New Journal: full header required
            JournalPrefix:          header.JournalPrefix || '',
            JournalDate:            header.JournalDate ? header.JournalDate.split('T')[0] : '',
            JournalDescription:     header.JournalDescription || '',
            JournalCurrency:        header.JournalCurrency || '',
            JournalExchangeRate:    Number(header.JournalExchangeRate || 0),
            OrginalDoucmentPrefix:  header.OrginalDoucmentPrefix || '',
            OrginalDoucmentNumber:  Number(header.OrginalDoucmentNumber || 0),
            JournalSource:          header.JournalSource || '',
            JournalModelID:         Number(header.JournalModelID || 0),
            AttachmentID:           Number(header.AttachmentID || 0)
          };

      const lineMembers = lines.map(line => ({
        Line:              Number(line.Line),
        LineType:          line.LineType || '',
        DebitBook:         Number(line.DebitBook || 0),
        CreditBook:        Number(line.CreditBook || 0),
        DebitTransaction:  Number(line.DebitTransaction || 0),
        CreditTransaction: Number(line.CreditTransaction || 0),
        LineDescription:   line.LineDescription || '',
        Reference1:        line.Reference1 || '',
        Reference2:        line.Reference2 || '',
        Account:           line.Account || '',
        DebitorCreditor:   line.DebitorCreditor || '',
        Customer:          line.Customer || '',
        Vendor:            line.Vendor || '',
        Bank:              line.Bank || '',
        Tax:               line.Tax || '',
        Segment7:          line.Segment7 || '',
        Segment8:          line.Segment8 || '',
        Segment9:          line.Segment9 || '',
        Segment10:         line.Segment10 || '',
        Segment11:         line.Segment11 || '',
        Segment12:         line.Segment12 || '',
        Segment13:         line.Segment13 || '',
        Segment14:         line.Segment14 || '',
        Segment15:         line.Segment15 || '',
        Segment16:         line.Segment16 || '',
        IsLocked:          Number(line.IsLocked || 0),
        LineCurrency:      line.LineCurrency || '',
        LineExchangeRate:  Number(line.LineExchangeRate || 1),
        IsDoucmentRelated: Number(line.IsDoucmentRelated || 0)
      }));

      const op = row ? 'Edit Journal Header' : 'New Journal Header';
      const d = await apiCall(op, headerData, {
        LineMember: JSON.stringify(lineMembers),
        User: user?.Username
      }, 'journal');

      if (d.State !== 0) {
        setError(d.Message || 'Failed to save journal.');
      } else {
        // SP now handles lock release and JournalLine commit internally.
        // It returns the committed header (List0) and lines (List1) directly.
        setHeader((d.List0 || [])[0] || null);
        setLines(d.List1 || []);
        setMode('view');
        if (onSaveSuccess) onSaveSuccess();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };


  const handleClose = async () => {
    const currentJournalNo = row?.JournalNumber || header?.JournalNumber;
    const currentEventNo = row?.EventNumber || header?.EventNumber;

    if (!currentJournalNo) { onClose(); return; }
    if (mode === 'edit') {
      setClosing(true);
      try {
        await apiCall('Close Journal', {
          JournalNo: currentJournalNo,
          EventNo: currentEventNo
        }, { User: user?.Username }, 'journal');
      } catch (_) { /* best-effort */ } finally {
        setClosing(false);
      }
    }
    onClose();
  };

  const toggleSeg = (idx) =>
    setExpandedSegs(prev => ({ ...prev, [idx]: !prev[idx] }));

  const totDebitBook   = lines.reduce((s, l) => s + Number(l.DebitBook || 0), 0);
  const totCreditBook  = lines.reduce((s, l) => s + Number(l.CreditBook || 0), 0);
  const totDebitTrans  = lines.reduce((s, l) => s + Number(l.DebitTransaction || 0), 0);
  const totCreditTrans = lines.reduce((s, l) => s + Number(l.CreditTransaction || 0), 0);
  const diff           = totDebitBook - totCreditBook;
  const isBalanced     = Math.abs(diff) < 0.005 && totDebitBook > 0;
  const max            = Math.max(totDebitBook, totCreditBook, 1);

  // Group by currency for transaction totals
  const currencyTotals = lines.reduce((acc, l) => {
    const cur = l.LineCurrency || l.JournalCurrency || 'BASE';
    if (!acc[cur]) acc[cur] = { debit: 0, credit: 0 };
    acc[cur].debit  += Number(l.DebitTransaction  || 0);
    acc[cur].credit += Number(l.CreditTransaction || 0);
    return acc;
  }, {});
  const currencyEntries = Object.entries(currencyTotals);

  const segCount = (line) =>
    [line.Segment7, line.Segment8, line.Segment9, line.Segment10, line.Segment11, line.Segment12, line.Segment13, line.Segment14, line.Segment15, line.Segment16].filter(Boolean).length;

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', justifyContent:'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div style={{
        width:'min(1500px, 99vw)', height:'100vh',
        background:'#EEF1F6', display:'flex', flexDirection:'column',
        boxShadow:'-8px 0 40px rgba(0,0,0,0.18)',
        fontFamily:"'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color:'#0F2038', overflow:'hidden'
      }}>

        {/* ── Top Bar ── */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 20px', background:'#fff', borderBottom:'1px solid #DCE1EA', flexShrink:0
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:30, height:30, borderRadius:7,
              background: mode === 'edit' ? '#1D4FB8' : '#0F2038',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontFamily:"'Roboto Mono', monospace", fontWeight:600, fontSize:12
            }}>JE</div>
            <div>
              <div style={{ fontSize:14, fontWeight:700 }}>
                Journal Entry
                {header && (
                  <span style={{ color:'#4A5A72', fontWeight:400, marginLeft:8, fontFamily:"'Roboto Mono', monospace", fontSize:13 }}>
                    {header.JournalNumber}
                  </span>
                )}
              </div>
              <div style={{ fontSize:11, color: mode === 'edit' ? '#1D4FB8' : '#4A5A72', marginTop:1, fontWeight: mode === 'edit' ? 600 : 400 }}>
                {mode === 'edit' ? '✏️ Edit Mode — Journal is locked' : 'View Mode'}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {header && (
              <span style={{
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                background: header.JournalState === 'Posted' ? '#E7F7EF' : '#FFF6EC',
                color:       header.JournalState === 'Posted' ? '#1B8F5A' : '#B5651D'
              }}>
                {header.JournalState}
              </span>
            )}
            {/* Edit button — only in view mode, and only for non-Posted journals */}
            {mode === 'view' && !loading && header?.JournalState !== 'Posted' && (
              <button
                onClick={() => doEdit(false)}
                disabled={editing}
                style={{
                  background: editing ? '#E8EFFE' : '#1D4FB8', border:'none', borderRadius:7,
                  padding:'7px 16px', cursor: editing ? 'default' : 'pointer', fontSize:12.5, fontWeight:600,
                  color: editing ? '#7A9AE0' : '#fff', fontFamily:'inherit',
                  display:'inline-flex', alignItems:'center', gap:6
                }}
              >
                {editing && (
                  <span style={{
                    width:10, height:10, border:'2px solid #7A9AE0', borderTopColor:'#1D4FB8',
                    borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite'
                  }} />
                )}
                {editing ? 'Opening…' : '✏️ Edit'}
              </button>
            )}
            {/* Save button — only in edit mode */}
            {mode === 'edit' && !loading && (
              <button
                onClick={doSave}
                disabled={saving}
                style={{
                  background: saving ? '#E8F5E9' : '#1B8F5A', border:'none', borderRadius:7,
                  padding:'7px 16px', cursor: saving ? 'default' : 'pointer', fontSize:12.5, fontWeight:600,
                  color: saving ? '#84C9A1' : '#fff', fontFamily:'inherit',
                  display:'inline-flex', alignItems:'center', gap:6
                }}
              >
                {saving && (
                  <span style={{
                    width:10, height:10, border:'2px solid #84C9A1', borderTopColor:'#1B8F5A',
                    borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite'
                  }} />
                )}
                {saving ? 'Saving…' : '💾 Save'}
              </button>
            )}
            <button
              onClick={handleClose}
              disabled={closing || saving}
              style={{
                background:'transparent', border:'1px solid #DCE1EA', borderRadius:7,
                padding:'7px 14px', cursor: (closing || saving) ? 'default' : 'pointer', fontSize:12.5, fontWeight:600,
                color: (closing || saving) ? '#9AA5B4' : '#4A5A72', fontFamily:'inherit',
                display:'inline-flex', alignItems:'center', gap:6, opacity: (closing || saving) ? 0.7 : 1
              }}
            >
              {closing && (
                <span style={{
                  width:10, height:10, border:'2px solid #DCE1EA', borderTopColor:'#4A5A72',
                  borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite'
                }} />
              )}
              {closing ? 'Closing…' : '✕ Close'}
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>

          {(loading || editing || saving) && (
            <div style={{ textAlign:'center', padding:'60px 48px', color:'#4A5A72', fontSize:13 }}>
              <div style={{
                width:28, height:28, border:'3px solid #DCE1EA',
                borderTopColor:'#6C4FCB', borderRadius:'50%',
                animation:'spin 0.7s linear infinite', margin:'0 auto 16px'
              }} />
              <div style={{ fontWeight:600 }}>
                {loading ? 'Loading journal…' : editing ? 'Opening journal and acquiring lock…' : 'Saving journal changes…'}
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background:'#FDECEA', border:'1.5px solid rgba(208,64,44,0.3)',
              borderRadius:10, padding:'14px 16px', color:'#D0402C', fontSize:13, marginBottom:14,
              display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12
            }}>
              <div style={{ flex: 1 }}>
                {error.includes('\n') ? (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      ⚠️ Validation Errors — please fix before saving:
                    </div>
                    <ul style={{ margin: '0 0 0 16px', padding: 0, lineHeight: 1.8 }}>
                      {error.split('\n').map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <span><strong>Error:</strong> {error}</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                {error.includes('\n') ? (
                  <button
                    onClick={() => setError('')}
                    style={{
                      background: 'transparent', border: '1.5px solid #D0402C', borderRadius: 6,
                      padding: '6px 14px', color: '#D0402C', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit'
                    }}
                  >✕ Cancel</button>
                ) : (
                  <button
                    onClick={() => doView()}
                    style={{
                      background: 'transparent', border: '1.5px solid #D0402C', borderRadius: 6,
                      padding: '6px 14px', color: '#D0402C', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit'
                    }}
                  >✕ Cancel</button>
                )}
              </div>
            </div>
          )}

          {!loading && !editing && !saving && (!error || error.includes('\n')) && header && (
            <>
              {/* ── Header Card ── */}
              <div style={{ background: '#fff', border: '1px solid #DCE1EA', borderRadius: 12, marginBottom: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #E9ECF2', background: '#FAFBFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6C4FCB' }}>Entry Details</span>
                  {mode === 'edit' && (
                    <span style={{ fontSize: 10.5, color: '#1B8F5A', fontWeight: 600, background: '#E7F7EF', padding: '3px 8px', borderRadius: 12 }}>
                      ✏️ Editing Header Fields
                    </span>
                  )}
                </div>

                <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                  
                  {/* Col 1: System Identifiers */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6C4FCB', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{!row ? 'Prefix (Journal No)' : 'Journal No'}</label>
                      {!row ? (
                        <SearchableSelect
                          value={header.JournalPrefix}
                          options={optPrefixes}
                          onChange={val => setHeader(prev => ({ ...prev, JournalPrefix: val }))}
                          placeholder="Select Prefix"
                        />
                      ) : (
                        <div style={{ width: '100%', border: '1px solid #E9ECF2', borderRadius: 6, padding: '8px 12px', fontSize: 12.5, color: '#0F2038', background: '#F8F9FA', minHeight: '34px', display: 'flex', alignItems: 'center', fontFamily: "'Roboto Mono', monospace" }}>{header.JournalNumber || '—'}</div>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6C4FCB', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Event No</label>
                      <div style={{ width: '100%', border: '1px solid #E9ECF2', borderRadius: 6, padding: '8px 12px', fontSize: 12.5, color: '#0F2038', background: '#F8F9FA', minHeight: '34px', display: 'flex', alignItems: 'center', fontFamily: "'Roboto Mono', monospace" }}>{header.EventNumber || '—'}</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6C4FCB', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Year</label>
                      <div style={{ width: '100%', border: '1px solid #E9ECF2', borderRadius: 6, padding: '8px 12px', fontSize: 12.5, color: '#0F2038', background: '#F8F9FA', minHeight: '34px', display: 'flex', alignItems: 'center', fontFamily: "'Roboto Mono', monospace" }}>{header.JournalYear || '—'}</div>
                    </div>
                  </div>

                  {/* Col 2: Date & Document Ref */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6C4FCB', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Journal Date</label>
                      {mode === 'edit' ? (
                        <input
                          type="date"
                          value={header.JournalDate ? header.JournalDate.split('T')[0] : ''}
                          onChange={e => setHeader(prev => ({ ...prev, JournalDate: e.target.value }))}
                          style={{ width: '100%', border: '1px solid #C4B5FD', borderRadius: 6, padding: '8px 12px', fontSize: 12.5, color: '#0F2038', background: '#fff', outline: 'none', boxSizing: 'border-box', minHeight: '34px' }}
                        />
                      ) : (
                        <div style={{ width: '100%', border: '1px solid #E9ECF2', borderRadius: 6, padding: '8px 12px', fontSize: 12.5, color: '#0F2038', background: '#F8F9FA', minHeight: '34px', display: 'flex', alignItems: 'center', fontFamily: "'Roboto Mono', monospace" }}>{fmtDate(header.JournalDate)}</div>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6C4FCB', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Doc Prefix</label>
                        <div style={{ width: '100%', border: '1px solid #E9ECF2', borderRadius: 6, padding: '8px 12px', fontSize: 12.5, color: '#0F2038', background: '#F8F9FA', minHeight: '34px', display: 'flex', alignItems: 'center', fontFamily: "'Roboto Mono', monospace" }}>{header.OrginalDoucmentPrefix || '—'}</div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6C4FCB', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Doc No</label>
                        <div style={{ width: '100%', border: '1px solid #E9ECF2', borderRadius: 6, padding: '8px 12px', fontSize: 12.5, color: '#0F2038', background: '#F8F9FA', minHeight: '34px', display: 'flex', alignItems: 'center', fontFamily: "'Roboto Mono', monospace" }}>{header.OrginalDoucmentNumber || '—'}</div>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6C4FCB', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source</label>
                      <div style={{ width: '100%', border: '1px solid #E9ECF2', borderRadius: 6, padding: '8px 12px', fontSize: 12.5, color: '#0F2038', background: '#F8F9FA', minHeight: '34px', display: 'flex', alignItems: 'center', fontFamily: "'Roboto Mono', monospace" }}>{header.JournalSource || '—'}</div>
                    </div>
                  </div>

                  {/* Col 3: Description & Model (Takes 2 Columns Width) */}
                  <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6C4FCB', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
                      {mode === 'edit' ? (
                        <textarea
                          value={header.JournalDescription || ''}
                          onChange={e => setHeader(prev => ({ ...prev, JournalDescription: e.target.value }))}
                          style={{ width: '100%', border: '1px solid #C4B5FD', borderRadius: 6, padding: '8px 12px', fontSize: 12.5, color: '#0F2038', background: '#fff', outline: 'none', boxSizing: 'border-box', flex: 1, resize: 'none', minHeight: '80px', fontFamily: 'inherit' }}
                        />
                      ) : (
                        <div style={{ width: '100%', border: '1px solid #E9ECF2', borderRadius: 6, padding: '8px 12px', fontSize: 12.5, color: '#0F2038', background: '#F8F9FA', flex: 1, whiteSpace: 'pre-wrap', minHeight: '80px', lineHeight: 1.4 }}>{header.JournalDescription || '—'}</div>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6C4FCB', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Model ID</label>
                        <div style={{ width: '100%', border: '1px solid #E9ECF2', borderRadius: 6, padding: '8px 12px', fontSize: 12.5, color: '#0F2038', background: '#F8F9FA', minHeight: '34px', display: 'flex', alignItems: 'center', fontFamily: "'Roboto Mono', monospace" }}>{header.JournalModelID || '—'}</div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6C4FCB', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Attachment ID</label>
                        <div style={{ width: '100%', border: '1px solid #E9ECF2', borderRadius: 6, padding: '8px 12px', fontSize: 12.5, color: '#0F2038', background: '#F8F9FA', minHeight: '34px', display: 'flex', alignItems: 'center', fontFamily: "'Roboto Mono', monospace" }}>{header.AttachmentID || '—'}</div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Audit footer */}
                {header.JournalCreatedBy && (
                  <div style={{ display: 'flex', gap: 24, padding: '12px 20px', background: '#FAFBFC', borderTop: '1px solid #E9ECF2', fontSize: 11, color: '#4A5A72' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#0F2038' }}>Created By: </span>
                      {header.JournalCreatedBy || '—'} on {fmtDate(header.JournalCreatedDate)}
                    </div>
                    {header.PostBy && (
                      <div>
                        <span style={{ fontWeight: 600, color: '#1B8F5A' }}>Posted By: </span>
                        {header.PostBy} on {fmtDate(header.PostDate)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Lines Grid ── */}
              <div style={{ background:'#fff', border:'1px solid #DCE1EA', borderRadius:8, marginBottom:14 }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #E9ECF2' }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4A5A72' }}>
                    Journal Lines · {lines.length} line{lines.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ overflowX:'auto', borderTop:'1px solid #E9ECF2' }}>
                  <table style={{ borderCollapse:'collapse', width:'100%', minWidth:1200, fontSize:12.5 }}>
                    <thead>
                      <tr>
                        {[
                          { label:'Line', cols:8, bg:'#F7F8FB', color:'#4A5A72' },
                          { label:'Currency', cols:2, bg:'#F7F8FB', color:'#4A5A72' },
                          { label:'Transaction Amount', cols:2, bg:'#FFFCF7', color:'#8A6A2E' },
                          { label:'Book Amount', cols:2, bg:'#EFF5FF', color:'#1D4FB8' },
                        ].map((g, i) => (
                          <th key={i} colSpan={g.cols} style={{
                            background:g.bg, color:g.color, fontSize:10, fontWeight:700,
                            textTransform:'uppercase', letterSpacing:'0.6px',
                            padding:'7px 8px', borderBottom:'1px solid #E9ECF2',
                            textAlign:'center', whiteSpace:'nowrap'
                          }}>{g.label}</th>
                        ))}
                      </tr>
                      <tr>
                        {['#','Account','Description','Debtor/Cred.','Customer','Vendor','Bank','Tax','Curr.','Rate','Debit (Tx)','Credit (Tx)','Debit (Bk)','Credit (Bk)'].map((col, i) => (
                          <th key={i} style={{
                            background:'#FBFBFD', color:'#0F2038', fontSize:11, fontWeight:600,
                            padding:'8px', borderBottom:'1px solid #DCE1EA',
                            textAlign: (i >= 10 && i <= 13) ? 'right' : 'left',
                            whiteSpace:'nowrap',
                            minWidth: i === 0 ? 36 : i === 1 ? 140 : i === 2 ? 160 : 90
                          }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => {
                        const segOpen = expandedSegs[idx];
                        const sCount = segCount(line);
                        return (
                          <React.Fragment key={idx}>
                            <tr style={{ background:'#fff' }}>
                              <td
                                onClick={() => toggleSeg(idx)}
                                style={{
                                  padding:'9px 8px', borderBottom:'1px solid #E9ECF2',
                                  background: segOpen ? '#EDE8FF' : '#FAFBFC',
                                  fontFamily:"'Roboto Mono', monospace", textAlign:'center',
                                  fontSize:12, fontWeight:700, width: mode === 'edit' ? 70 : 36,
                                  color: segOpen ? '#6C4FCB' : '#4A5A72',
                                  cursor:'pointer', userSelect:'none', position:'relative'
                                }}
                                title="Click to toggle details"
                              >
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                                  <span>{segOpen ? '▾' : '▸'} {line.Line ?? idx + 1}</span>
                                  {mode === 'edit' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteLine(idx);
                                      }}
                                      style={{
                                        background:'transparent', border:'none', color:'#D0402C',
                                        cursor:'pointer', fontSize:11, padding:'2px 4px',
                                        display:'inline-flex', alignItems:'center'
                                      }}
                                      title="Delete row"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                                {sCount > 0 && (
                                  <span style={{
                                    position:'absolute', top:4, right:3,
                                    width:6, height:6, borderRadius:'50%',
                                    background:'#6C4FCB', display:'block'
                                  }} />
                                )}
                              </td>
                              <td style={{ padding:'9px 8px', borderBottom:'1px solid #E9ECF2', minWidth:160 }}>
                                {mode === 'edit' ? (
                                  <SearchableSelect
                                    value={line.Account}
                                    options={optAccounts}
                                    onChange={val => updateLineField(idx, 'Account', val)}
                                    placeholder="Account"
                                  />
                                ) : (
                                  renderCodeAndDesc(line.Account, line.AccountDescription)
                                )}
                              </td>
                              <td style={{ padding:'9px 8px', borderBottom:'1px solid #E9ECF2', minWidth:180 }}>
                                {mode === 'edit' ? (
                                  <input
                                    value={line.LineDescription || ''}
                                    onChange={e => updateLineField(idx, 'LineDescription', e.target.value)}
                                    style={{ width:'100%', padding:'4px 6px', border:'1px solid #DCE1EA', borderRadius:4, fontFamily:'inherit', fontSize:12, outline:'none' }}
                                  />
                                ) : (
                                  <span style={{ whiteSpace:'normal' }}>{line.LineDescription || '—'}</span>
                                )}
                              </td>
                              <td style={{ padding:'9px 8px', borderBottom:'1px solid #E9ECF2', minWidth:130 }}>
                                {mode === 'edit' ? (
                                  <SearchableSelect
                                    value={line.DebitorCreditor}
                                    options={optDebtors}
                                    onChange={val => updateLineField(idx, 'DebitorCreditor', val)}
                                    placeholder="Debtor/Creditor"
                                  />
                                ) : (
                                  renderCodeAndDesc(line.DebitorCreditor, line.DRName)
                                )}
                              </td>
                              <td style={{ padding:'9px 8px', borderBottom:'1px solid #E9ECF2', minWidth:130 }}>
                                {mode === 'edit' ? (
                                  <SearchableSelect
                                    value={line.Customer}
                                    options={optCustomers}
                                    onChange={val => updateLineField(idx, 'Customer', val)}
                                    placeholder="Customer"
                                  />
                                ) : (
                                  renderCodeAndDesc(line.Customer, line.ManarahCustomerExtraName || line.CustomerExtraName)
                                )}
                              </td>
                              <td style={{ padding:'9px 8px', borderBottom:'1px solid #E9ECF2', minWidth:130 }}>
                                {mode === 'edit' ? (
                                  <SearchableSelect
                                    value={line.Vendor}
                                    options={optVendors}
                                    onChange={val => updateLineField(idx, 'Vendor', val)}
                                    placeholder="Vendor"
                                  />
                                ) : (
                                  renderCodeAndDesc(line.Vendor, line.VendorExtraName)
                                )}
                              </td>
                              <td style={{ padding:'9px 8px', borderBottom:'1px solid #E9ECF2', minWidth:130 }}>
                                {mode === 'edit' ? (
                                  <SearchableSelect
                                    value={line.Bank}
                                    options={optBanks}
                                    onChange={val => updateLineField(idx, 'Bank', val)}
                                    placeholder="Bank"
                                  />
                                ) : (
                                  renderCodeAndDesc(line.Bank, line.BankAccountName)
                                )}
                              </td>
                              <td style={{ padding:'9px 8px', borderBottom:'1px solid #E9ECF2', minWidth:130 }}>
                                {mode === 'edit' ? (
                                  <SearchableSelect
                                    value={line.Tax}
                                    options={optTaxes}
                                    onChange={val => updateLineField(idx, 'Tax', val)}
                                    placeholder="Tax"
                                  />
                                ) : (
                                  renderCodeAndDesc(line.Tax, line.TaxAccountDescription)
                                )}
                              </td>
                              <td style={{ padding:'9px 8px', borderBottom:'1px solid #E9ECF2', minWidth:70 }}>
                                {mode === 'edit' ? (
                                  <input
                                    value={line.LineCurrency || ''}
                                    onChange={e => updateLineField(idx, 'LineCurrency', e.target.value)}
                                    style={{ width:'100%', padding:'4px 6px', border:'1px solid #DCE1EA', borderRadius:4, fontFamily:"'Roboto Mono', monospace", fontSize:12, outline:'none' }}
                                  />
                                ) : (
                                  <span style={{ fontFamily:"'Roboto Mono', monospace" }}>{line.LineCurrency || line.JournalCurrency || '—'}</span>
                                )}
                              </td>
                              <td style={{ padding:'9px 8px', borderBottom:'1px solid #E9ECF2', minWidth:80 }}>
                                {mode === 'edit' ? (
                                  <input
                                    type="number"
                                    step="any"
                                    value={line.LineExchangeRate ?? ''}
                                    onChange={e => {
                                      const newRate = e.target.value === '' ? '' : Number(e.target.value);
                                      updateLineField(idx, 'LineExchangeRate', newRate);
                                      const rate = Number(newRate || line.JournalExchangeRate || 1);
                                      if (line.DebitTransaction) updateLineField(idx, 'DebitBook', Number(line.DebitTransaction) * rate);
                                      if (line.CreditTransaction) updateLineField(idx, 'CreditBook', Number(line.CreditTransaction) * rate);
                                    }}
                                    style={{ width:'100%', padding:'4px 6px', border:'1px solid #DCE1EA', borderRadius:4, textAlign:'right', fontFamily:"'Roboto Mono', monospace", fontSize:12, outline:'none' }}
                                  />
                                ) : (
                                  <span style={{ fontFamily:"'Roboto Mono', monospace" }}>{Number(line.LineExchangeRate || line.JournalExchangeRate || 1).toFixed(4)}</span>
                                )}
                              </td>
                              <td style={{ padding:'5px 8px', borderBottom:'1px solid #E9ECF2', background:'#FFFCF7', color:'#1D4FB8', textAlign:'right', width:110 }}>
                                {mode === 'edit' ? (
                                  <input
                                    type="number"
                                    step="any"
                                    value={line.DebitTransaction ?? ''}
                                    onChange={e => {
                                      const val = e.target.value === '' ? '' : Number(e.target.value);
                                      updateLineField(idx, 'DebitTransaction', val);
                                      const rate = Number(line.LineExchangeRate || line.JournalExchangeRate || 1);
                                      updateLineField(idx, 'DebitBook', val === '' ? '' : val * rate);
                                    }}
                                    style={{ width:'100%', padding:'4px 6px', border:'1px solid #DCE1EA', borderRadius:4, textAlign:'right', fontFamily:"'Roboto Mono', monospace", fontSize:12, outline:'none' }}
                                  />
                                ) : (
                                  <span style={{ fontFamily:"'Roboto Mono', monospace", fontWeight:600 }}>{fmtAmt(line.DebitTransaction || 0)}</span>
                                )}
                              </td>
                              <td style={{ padding:'5px 8px', borderBottom:'1px solid #E9ECF2', background:'#FFFCF7', color:'#B5651D', textAlign:'right', width:110 }}>
                                {mode === 'edit' ? (
                                  <input
                                    type="number"
                                    step="any"
                                    value={line.CreditTransaction ?? ''}
                                    onChange={e => {
                                      const val = e.target.value === '' ? '' : Number(e.target.value);
                                      updateLineField(idx, 'CreditTransaction', val);
                                      const rate = Number(line.LineExchangeRate || line.JournalExchangeRate || 1);
                                      updateLineField(idx, 'CreditBook', val === '' ? '' : val * rate);
                                    }}
                                    style={{ width:'100%', padding:'4px 6px', border:'1px solid #DCE1EA', borderRadius:4, textAlign:'right', fontFamily:"'Roboto Mono', monospace", fontSize:12, outline:'none' }}
                                  />
                                ) : (
                                  <span style={{ fontFamily:"'Roboto Mono', monospace", fontWeight:600 }}>{fmtAmt(line.CreditTransaction || 0)}</span>
                                )}
                              </td>
                              <td style={{ padding:'5px 8px', borderBottom:'1px solid #E9ECF2', background:'#EFF5FF', color:'#1D4FB8', textAlign:'right', width:110 }}>
                                {mode === 'edit' ? (
                                  <input
                                    type="number"
                                    step="any"
                                    value={line.DebitBook ?? ''}
                                    onChange={e => updateLineField(idx, 'DebitBook', e.target.value === '' ? '' : Number(e.target.value))}
                                    style={{ width:'100%', padding:'4px 6px', border:'1px solid #DCE1EA', borderRadius:4, textAlign:'right', fontFamily:"'Roboto Mono', monospace", fontSize:12, outline:'none' }}
                                  />
                                ) : (
                                  <span style={{ fontFamily:"'Roboto Mono', monospace", fontWeight:600 }}>{fmtAmt(line.DebitBook || 0)}</span>
                                )}
                              </td>
                              <td style={{ padding:'5px 8px', borderBottom:'1px solid #E9ECF2', background:'#FFF6EC', color:'#B5651D', textAlign:'right', width:110 }}>
                                {mode === 'edit' ? (
                                  <input
                                    type="number"
                                    step="any"
                                    value={line.CreditBook ?? ''}
                                    onChange={e => updateLineField(idx, 'CreditBook', e.target.value === '' ? '' : Number(e.target.value))}
                                    style={{ width:'100%', padding:'4px 6px', border:'1px solid #DCE1EA', borderRadius:4, textAlign:'right', fontFamily:"'Roboto Mono', monospace", fontSize:12, outline:'none' }}
                                  />
                                ) : (
                                  <span style={{ fontFamily:"'Roboto Mono', monospace", fontWeight:600 }}>{fmtAmt(line.CreditBook || 0)}</span>
                                )}
                              </td>
                            </tr>
                            <tr style={{ display: segOpen ? 'table-row' : 'none' }}>
                              <td colSpan={14} style={{ padding:0, background:'#F6F3FF', borderBottom:'1px solid #E9ECF2' }}>
                                <div style={{ display:'flex', gap:20, flexWrap:'wrap', padding:'10px 16px' }}>
                                  {/* Ref 1, Ref 2, and Segments 7 to 16 */}
                                  {[
                                    ['Ref 1', line.Reference1, null, 'Reference1'],
                                    ['Ref 2', line.Reference2, null, 'Reference2'],
                                    ['Asset (Seg 7)', line.Segment7, line.Segment7Description, 'Segment7', 7],
                                    ['Employee (Seg 8)', line.Segment8, line.Segment8Description, 'Segment8', 8],
                                    ['Expense (Seg 9)', line.Segment9, line.Segment9Description, 'Segment9', 9],
                                    ['Segment 10', line.Segment10, line.Segment10Description, 'Segment10', 10],
                                    ['Segment 11', line.Segment11, line.Segment11Description, 'Segment11', 11],
                                    ['Segment 12', line.Segment12, line.Segment12Description, 'Segment12', 12],
                                    ['Segment 13', line.Segment13, line.Segment13Description, 'Segment13', 13],
                                    ['Segment 14', line.Segment14, line.Segment14Description, 'Segment14', 14],
                                    ['Segment 15', line.Segment15, line.Segment15Description, 'Segment15', 15],
                                    ['Segment 16', line.Segment16, line.Segment16Description, 'Segment16', 16],
                                  ].filter(([, val, desc, field, segId]) => {
                                    // In edit mode, show all segments.
                                    // In view mode, show Ref 1, Ref 2, Seg 7-10, or any segment with a value.
                                    if (mode === 'edit') return true;
                                    if (field === 'Reference1' || field === 'Reference2' || (segId && segId <= 10)) return true;
                                    return Boolean(val);
                                  }).map(([lbl, val, desc, field, segId]) => (
                                    <div key={lbl} style={{ display:'flex', flexDirection:'column', gap:3, minWidth:140 }}>
                                      <span style={{ fontSize:9.5, fontWeight:700, color:'#6C4FCB', textTransform:'uppercase', letterSpacing:'0.5px' }}>{lbl}</span>
                                      {mode === 'edit' && segId ? (
                                        <SearchableSelect
                                          value={val}
                                          options={optSegs[segId] || []}
                                          onChange={newVal => updateLineField(idx, field, newVal)}
                                          placeholder={lbl}
                                          style={{ minWidth: 150 }}
                                        />
                                      ) : mode === 'edit' && (field === 'Reference1' || field === 'Reference2') ? (
                                        <input
                                          value={val || ''}
                                          onChange={e => updateLineField(idx, field, e.target.value)}
                                          style={{
                                            fontSize:12.5, color:'#0F2038', padding:'4px 8px',
                                            background:'#fff', border:'1px solid #E2D9FA', borderRadius:5,
                                            outline: 'none', width: '100%', boxSizing: 'border-box'
                                          }}
                                        />
                                      ) : (
                                        <div style={{ fontSize:12.5, color:'#0F2038', padding:'4px 8px', background:'#fff', border:'1px solid #E2D9FA', borderRadius:5, display:'flex', flexDirection:'column', gap:2, fontFamily:"'Roboto Mono', monospace" }}>
                                          <span style={{ fontWeight:600 }}>{val || '—'}</span>
                                          {val && desc && <span style={{ fontSize:11, color:'#4A5A72', whiteSpace:'normal', maxWidth:220, lineHeight:1.2, fontFamily:'inherit' }}>{desc}</span>}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={10} style={{ padding:'9px 8px', fontFamily:'inherit', fontWeight:600, fontSize:11, borderTop:'2px solid #DCE1EA', background:'#FAFBFC', color:'#4A5A72', textAlign:'right', textTransform:'uppercase' }}>Totals</td>
                        <td style={{ padding:'9px 8px', fontFamily:"'Roboto Mono', monospace", fontWeight:700, fontSize:12.5, borderTop:'2px solid #DCE1EA', background:'#FAFBFC', color:'#1D4FB8', textAlign:'right' }}>{fmtAmt(totDebitTrans)}</td>
                        <td style={{ padding:'9px 8px', fontFamily:"'Roboto Mono', monospace", fontWeight:700, fontSize:12.5, borderTop:'2px solid #DCE1EA', background:'#FAFBFC', color:'#B5651D', textAlign:'right' }}>{fmtAmt(totCreditTrans)}</td>
                        <td style={{ padding:'9px 8px', fontFamily:"'Roboto Mono', monospace", fontWeight:700, fontSize:12.5, borderTop:'2px solid #DCE1EA', background:'#FAFBFC', color:'#1D4FB8', textAlign:'right' }}>{fmtAmt(totDebitBook)}</td>
                        <td style={{ padding:'9px 8px', fontFamily:"'Roboto Mono', monospace", fontWeight:700, fontSize:12.5, borderTop:'2px solid #DCE1EA', background:'#FAFBFC', color:'#B5651D', textAlign:'right' }}>{fmtAmt(totCreditBook)}</td>
                        <td style={{ padding:'9px 8px', borderTop:'2px solid #DCE1EA', background:'#FAFBFC' }}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {mode === 'edit' && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #E9ECF2', background: '#FAFBFC', display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                      onClick={addLine}
                      style={{
                        background: '#fff', border: '1px solid #6C4FCB', color: '#6C4FCB',
                        borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                        outline: 'none'
                      }}
                    >
                      ➕ Add Line
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Currency Totals ── */}
        {!loading && lines.length > 0 && currencyEntries.length > 0 && (
          <div style={{
            flexShrink:0, background:'#fff', borderTop:'1px solid #DCE1EA',
            padding:'10px 20px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'
          }}>
            <span style={{ fontSize:10, fontWeight:700, color:'#4A5A72', textTransform:'uppercase', letterSpacing:'0.6px', marginRight:6 }}>Tx by Currency</span>
            {currencyEntries.map(([cur, { debit, credit }]) => {
              const txDiff = debit - credit;
              const txBalanced = Math.abs(txDiff) < 0.005 && debit > 0;
              return (
                <div key={cur} style={{
                  display:'flex', alignItems:'center', gap:8, padding:'5px 12px',
                  background:'#F7F8FB', border:'1px solid #DCE1EA', borderRadius:8
                }}>
                  <span style={{ fontFamily:"'Roboto Mono', monospace", fontSize:11, fontWeight:700, color:'#4A5A72', minWidth:34 }}>{cur}</span>
                  <span style={{ fontSize:10, color:'#4A5A72' }}>Dr</span>
                  <span style={{ fontFamily:"'Roboto Mono', monospace", fontSize:12, fontWeight:700, color:'#1D4FB8' }}>{fmtAmt(debit)}</span>
                  <span style={{ fontSize:10, color:'#4A5A72' }}>Cr</span>
                  <span style={{ fontFamily:"'Roboto Mono', monospace", fontSize:12, fontWeight:700, color:'#B5651D' }}>{fmtAmt(credit)}</span>
                  <span style={{
                    fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:12,
                    background: txBalanced ? '#E7F7EF' : '#FDECEA',
                    color:       txBalanced ? '#1B8F5A' : '#D0402C'
                  }}>
                    {txBalanced ? '✓ Balanced' : `Δ ${fmtAmt(Math.abs(txDiff))}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Balance Bar ── */}
        {!loading && header && (
          <div style={{
            flexShrink:0, background:'#fff', borderTop:'1px solid #DCE1EA',
            padding:'12px 20px', display:'flex', alignItems:'center', gap:22
          }}>
            {[
              ['Debit (Book)', fmtAmt(totDebitBook), '#1D4FB8'],
              ['Credit (Book)', fmtAmt(totCreditBook), '#B5651D'],
              ['Difference', fmtAmt(Math.abs(diff)), isBalanced ? '#1B8F5A' : '#D0402C'],
            ].map(([k, v, c]) => (
              <div key={k} style={{ textAlign:'right' }}>
                <div style={{ fontSize:10, color:'#4A5A72', textTransform:'uppercase', letterSpacing:'0.5px', fontWeight:700 }}>{k}</div>
                <div style={{ fontFamily:"'Roboto Mono', monospace", fontSize:14, fontWeight:700, color:c }}>{v}</div>
              </div>
            ))}
            <div style={{ flex:1, height:8, borderRadius:5, background:'#E9ECF2', overflow:'hidden', display:'flex' }}>
              <div style={{ background:'#1D4FB8', height:'100%', width:`${totDebitBook/max*50}%`, transition:'width 0.2s' }} />
              <div style={{ background:'#B5651D', height:'100%', width:`${totCreditBook/max*50}%`, transition:'width 0.2s' }} />
            </div>
            <div style={{
              display:'flex', alignItems:'center', gap:7, padding:'6px 14px',
              borderRadius:20, fontSize:11.5, fontWeight:700, whiteSpace:'nowrap',
              background: isBalanced ? '#E7F7EF' : '#FDECEA',
              color:       isBalanced ? '#1B8F5A' : '#D0402C'
            }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'currentColor', display:'inline-block' }} />
              {isBalanced ? 'Balanced' : 'Out of balance'}
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          input::-webkit-outer-spin-button,
          input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type=number] {
            -moz-appearance: textfield;
          }
        `}</style>
      </div>
    </div>
  );
}
