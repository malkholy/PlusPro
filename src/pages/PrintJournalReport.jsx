import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiCall } from '../shared/api.js';

export default function PrintJournalReport({ user, row, onClose }) {
  const [header, setHeader] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const currentJournalNo = row?.JournalNumber || row?.JournalNo;
        const currentEventNo = row?.EventNumber || row?.EventNo;

        const res = await apiCall('Get Journal For View', {
          JournalNo: currentJournalNo,
          EventNo: currentEventNo
        }, { User: user?.Username }, 'journal');
        
        if (res.State === 0) {
          setHeader((res.List0 || [])[0]);
          setLines(res.List1 || []);
          
          // Wait for images/fonts to render, then trigger print
          setTimeout(() => {
            window.print();
            onClose();
          }, 500);
        } else {
          setError(res.Message);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [row, user, onClose]);

  const reportContent = (
    <div className="printable-report-container" style={{ 
      position: 'absolute', top: 0, left: 0, width: '100%', background: '#FFF', 
      zIndex: 999999, minHeight: '100vh', padding: '40px', fontFamily: 'Arial, sans-serif', color: '#000'
    }}>
      <style>{`
        @media print {
          #root { display: none !important; }
          body { margin: 0; padding: 0; background: #FFF; }
          .printable-report-container { display: block !important; padding: 0 !important; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>
      
      {loading && <div style={{ textAlign: 'center', marginTop: 100 }}>Loading Report...</div>}
      {error && <div style={{ color: 'red', textAlign: 'center', marginTop: 100 }}>{error}</div>}
      
      {!loading && !error && header && (
        <div style={{ maxWidth: '210mm', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: 20, marginBottom: 20 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>Company Name</h1>
              <div style={{ fontSize: 14, color: '#555', marginTop: 4 }}>Journal Voucher</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12 }}>
              <table style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '2px 8px', fontWeight: 'bold' }}>Journal No:</td>
                    <td style={{ padding: '2px 8px' }}>{header.JournalNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 8px', fontWeight: 'bold' }}>Date:</td>
                    <td style={{ padding: '2px 8px' }}>{header.JournalDate ? header.JournalDate.split('T')[0] : ''}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 8px', fontWeight: 'bold' }}>Currency:</td>
                    <td style={{ padding: '2px 8px' }}>{header.JournalCurrency} (Rate: {header.JournalExchangeRate})</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div style={{ marginBottom: 20, fontSize: 13 }}>
            <strong>Description:</strong> {header.JournalDescription}
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 40 }}>
            <thead>
              <tr style={{ background: '#F5F5F5' }}>
                <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', width: 50 }}>Line</th>
                <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Account / Name</th>
                <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Description</th>
                <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', width: 100 }}>Debit</th>
                <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', width: 100 }}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left' }}>{l.Line}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left' }}>
                    <div><strong>{l.Account}</strong></div>
                    <div style={{ color: '#444' }}>{l.AccountDescription || l.CustomerExtraName || l.VendorExtraName || l.BankAccountName}</div>
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left' }}>{l.LineDescription}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>
                    {Number(l.DebitBook || 0) > 0 ? Number(l.DebitBook).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>
                    {Number(l.CreditBook || 0) > 0 ? Number(l.CreditBook).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>TOTAL</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                  {lines.reduce((sum, l) => sum + (Number(l.DebitBook) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                  {lines.reduce((sum, l) => sum + (Number(l.CreditBook) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60, fontSize: 13 }}>
            <div style={{ textAlign: 'center', width: 200 }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: 5 }}></div>
              <div>Prepared By</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{header.JournalCreatedBy || user?.Username}</div>
            </div>
            <div style={{ textAlign: 'center', width: 200 }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: 5 }}></div>
              <div>Checked By</div>
            </div>
            <div style={{ textAlign: 'center', width: 200 }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: 5 }}></div>
              <div>Authorized By</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(reportContent, document.body);
}
