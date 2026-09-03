import React, { useState } from 'react';
import PlanningShowPlan from './PlanningShowPlan.jsx';
import FGInquiryModal from './FGInquiryModal.jsx';
import PrintPlanModal from './PrintPlanModal.jsx';

// Production planning is now driven entirely off PRO.PrdItemPlanningShiftPlan
// -- the old "Planning History" list + New/Edit drawer (backed by the
// now-dropped PrdItemPlanningHistory table) is gone. This page is just the
// launcher for the three tools that operate on the shift plan directly.
export default function PlanningItemHistory({ user }) {
  const [showPlanOpen, setShowPlanOpen] = useState(false);
  const [fgInquiryOpen, setFgInquiryOpen] = useState(false);
  const [printPlanOpen, setPrintPlanOpen] = useState(false);

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ margin: '0 0 4px 0', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Production Planning</h2>
      <p style={{ margin: '0 0 20px 0', fontSize: 13, color: 'var(--muted)' }}>
        Manage the shift plan calendar, look up finished-goods requirements, and print shift plans.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => setShowPlanOpen(true)}
          style={{ padding: '10px 20px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.color = 'var(--orange2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)'; }}
        >
          📅 Show Plan
        </button>
        <button
          onClick={() => setFgInquiryOpen(true)}
          style={{ padding: '10px 20px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.color = 'var(--orange2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)'; }}
        >
          📦 FG Inquery
        </button>
        <button
          onClick={() => setPrintPlanOpen(true)}
          style={{ padding: '10px 20px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--soft)'; e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.color = 'var(--orange2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)'; }}
        >
          🖨️ Print Plan
        </button>
      </div>

      {showPlanOpen && (
        <PlanningShowPlan
          user={user}
          onClose={() => setShowPlanOpen(false)}
        />
      )}

      {fgInquiryOpen && (
        <FGInquiryModal
          user={user}
          onClose={() => setFgInquiryOpen(false)}
        />
      )}

      {printPlanOpen && (
        <PrintPlanModal
          user={user}
          onClose={() => setPrintPlanOpen(false)}
        />
      )}
    </div>
  );
}
