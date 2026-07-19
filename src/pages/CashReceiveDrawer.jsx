import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

export default function CashReceiveDrawer({ row, user, onClose, onSaveSuccess }) {
  const isEditMode = !!row;

  const [header, setHeader] = useState({
    InternalID: 0,
    RequestDate: new Date().toISOString().split('T')[0],
    RecievedDate: new Date().toISOString().split('T')[0],
    Note: '',
    Contact: '',
    TreasureyCode: '',
    Currency: 'USD',
    ExchangeRate: 1,
    RequestFlag: 1,
    RecievedFlag: 0
  });

  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode && row.InternalID) {
      loadFullData(row.InternalID);
    } else {
      setLines([createNewLine(1)]);
    }
  }, [isEditMode, row]);

  async function loadFullData(id) {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('Get Cash Receive For Edit', { InternalID: id }, { User: user?.Username }, 'journal');
      if (res.State === 0) {
        if (res.List0 && res.List0.length > 0) {
          const h = res.List0[0];
          setHeader({
            InternalID: h.InternalID,
            RequestDate: h.RequestDate ? h.RequestDate.split('T')[0] : '',
            RecievedDate: h.RecievedDate ? h.RecievedDate.split('T')[0] : '',
            Note: h.Note || '',
            Contact: h.Contact || '',
            TreasureyCode: h.TreasureyCode || '',
            Currency: h.Currency || '',
            ExchangeRate: h.ExchangeRate || 1,
            RequestFlag: h.RequestFlag || 0,
            RecievedFlag: h.DoucmentState >= 10 ? 1 : 0
          });
        }
        if (res.List1) {
          setLines(res.List1.map((l, i) => ({ ...l, _key: Date.now() + i })));
        } else {
          setLines([createNewLine(1)]);
        }
      } else {
        setError(res.Message || 'Failed to load details.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function createNewLine(lineNum) {
    return {
      _key: Date.now() + Math.random(),
      Line: lineNum,
      AmountTransaction: 0,
      Account: '',
      CredtorDebitor: '',
      Customer: '',
      Vendor: '',
      Bank: '',
      TaxCode: '',
      TaxRate: 0,
      Segment7: '', Segment8: '', Segment9: '', Segment10: '',
      Segment11: '', Segment12: '', Segment13: '', Segment14: '',
      Segment15: '', Segment16: ''
    };
  }

  const handleSave = async () => {
    if (!header.RequestDate) {
      setError('Request Date is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        InternalID: header.InternalID,
        RequestDate: header.RequestDate,
        RecievedDate: header.RecievedDate,
        Note: header.Note,
        Contact: header.Contact,
        TreasureyCode: header.TreasureyCode,
        Currency: header.Currency,
        ExchangeRate: parseFloat(header.ExchangeRate) || 1,
        RequestFlag: header.RequestFlag ? 1 : 0,
        RecievedFlag: header.RecievedFlag ? 1 : 0,
        RecievedBy: user?.Username
      };

      const lineMember = JSON.stringify(lines.map((l, i) => ({
        Line: i + 1,
        AmountTransaction: parseFloat(l.AmountTransaction) || 0,
        Account: l.Account || '',
        CredtorDebitor: l.CredtorDebitor || '',
        Customer: l.Customer || '',
        Vendor: l.Vendor || '',
        Bank: l.Bank || '',
        TaxCode: l.TaxCode || '',
        TaxRate: parseFloat(l.TaxRate) || 0,
        Segment7: l.Segment7 || '',
        Segment8: l.Segment8 || '',
        Segment9: l.Segment9 || '',
        Segment10: l.Segment10 || '',
        Segment11: l.Segment11 || '',
        Segment12: l.Segment12 || '',
        Segment13: l.Segment13 || '',
        Segment14: l.Segment14 || '',
        Segment15: l.Segment15 || '',
        Segment16: l.Segment16 || ''
      })));

      const res = await apiCall('Save Cash Receive', payload, { User: user?.Username, LineMember: lineMember }, 'journal');
      
      if (res.State === 0) {
        onSaveSuccess();
        onClose();
      } else {
        setError(res.Message || 'Failed to save.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateLine = (index, field, value) => {
    const next = [...lines];
    next[index][field] = value;
    setLines(next);
  };

  const addLine = () => {
    setLines([...lines, createNewLine(lines.length + 1)]);
  };

  const removeLine = (index) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const totalAmount = lines.reduce((acc, l) => acc + (parseFloat(l.AmountTransaction) || 0), 0);

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)',
        zIndex: 99998, animation: 'fadeIn 0.2s ease'
      }} onClick={onClose} />
      
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '900px',
        background: '#f8fafc', zIndex: 99999, boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
        display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              {isEditMode ? `Edit Cash Receive #${row.InternalID}` : 'New Cash Receive'}
            </h2>
            {isEditMode && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Total: {totalAmount.toFixed(2)} {header.Currency}</div>}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Document'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ margin: '16px 24px 0', padding: '12px 16px', background: '#fef2f2', color: '#b91c1c', borderRadius: 6, fontSize: 13, border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Loading document...</div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Document Header</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Request Date</label>
                  <input type="date" value={header.RequestDate} onChange={e => setHeader({...header, RequestDate: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Currency</label>
                  <input type="text" value={header.Currency} onChange={e => setHeader({...header, Currency: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Exchange Rate</label>
                  <input type="number" step="0.01" value={header.ExchangeRate} onChange={e => setHeader({...header, ExchangeRate: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Treasury Code</label>
                  <input type="text" value={header.TreasureyCode} onChange={e => setHeader({...header, TreasureyCode: e.target.value})} style={inputStyle} />
                </div>
                
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Note</label>
                  <input type="text" value={header.Note} onChange={e => setHeader({...header, Note: e.target.value})} style={inputStyle} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Contact</label>
                  <input type="text" value={header.Contact} onChange={e => setHeader({...header, Contact: e.target.value})} style={inputStyle} />
                </div>

                <div style={{ gridColumn: 'span 4', display: 'flex', gap: 24, padding: '12px 16px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', marginTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
                    <input type="checkbox" checked={header.RecievedFlag === 1} onChange={e => setHeader({...header, RecievedFlag: e.target.checked ? 1 : 0})} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    Mark as Received & Post
                  </label>
                  {header.RecievedFlag === 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Received Date:</label>
                      <input type="date" value={header.RecievedDate} onChange={e => setHeader({...header, RecievedDate: e.target.value})} style={{...inputStyle, padding: '4px 8px', width: 140 }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Transaction Lines</h3>
                <button onClick={addLine} style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Line
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ width: 40, ...thStyle }}>#</th>
                      <th style={{ width: 100, ...thStyle }}>Amount</th>
                      <th style={{ width: 120, ...thStyle }}>Account</th>
                      <th style={{ width: 120, ...thStyle }}>Customer</th>
                      <th style={{ width: 120, ...thStyle }}>Vendor</th>
                      <th style={{ width: 120, ...thStyle }}>Bank</th>
                      <th style={{ width: 100, ...thStyle }}>Tax Code</th>
                      <th style={{ width: 100, ...thStyle }}>Tax Rate</th>
                      <th style={{ width: 120, ...thStyle }}>Creditor/Debtor</th>
                      <th style={{ width: 40, ...thStyle }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={l._key} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                        <td style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>{i + 1}</td>
                        <td style={tdStyle}><input type="number" step="0.01" value={l.AmountTransaction || ''} onChange={e => updateLine(i, 'AmountTransaction', e.target.value)} style={cellInputStyle} placeholder="0.00" /></td>
                        <td style={tdStyle}><input type="text" value={l.Account || ''} onChange={e => updateLine(i, 'Account', e.target.value)} style={cellInputStyle} /></td>
                        <td style={tdStyle}><input type="text" value={l.Customer || ''} onChange={e => updateLine(i, 'Customer', e.target.value)} style={cellInputStyle} /></td>
                        <td style={tdStyle}><input type="text" value={l.Vendor || ''} onChange={e => updateLine(i, 'Vendor', e.target.value)} style={cellInputStyle} /></td>
                        <td style={tdStyle}><input type="text" value={l.Bank || ''} onChange={e => updateLine(i, 'Bank', e.target.value)} style={cellInputStyle} /></td>
                        <td style={tdStyle}><input type="text" value={l.TaxCode || ''} onChange={e => updateLine(i, 'TaxCode', e.target.value)} style={cellInputStyle} /></td>
                        <td style={tdStyle}><input type="number" value={l.TaxRate || ''} onChange={e => updateLine(i, 'TaxRate', e.target.value)} style={cellInputStyle} placeholder="0" /></td>
                        <td style={tdStyle}><input type="text" value={l.CredtorDebitor || ''} onChange={e => updateLine(i, 'CredtorDebitor', e.target.value)} style={cellInputStyle} /></td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <button onClick={() => removeLine(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Remove line">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {lines.length === 0 && (
                      <tr>
                        <td colSpan="10" style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No transaction lines added.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}

const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, 
  color: '#0f172a', background: '#fff', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s'
};

const thStyle = {
  padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em'
};

const tdStyle = {
  padding: '4px 6px', verticalAlign: 'middle'
};

const cellInputStyle = {
  width: '100%', padding: '6px 8px', border: '1px solid transparent', borderRadius: 4, fontSize: 13,
  color: '#0f172a', background: 'transparent', outline: 'none', transition: 'all 0.15s'
};
