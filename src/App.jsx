import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { apiCall } from './shared/api.js';

// Error Boundary to catch render crashes and display error info instead of blank page
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, color: '#dc2626', background: '#fef2f2', borderRadius: 12, margin: 16, fontFamily: 'monospace' }}>
          <h3 style={{ margin: '0 0 12px' }}>⚠️ Something went wrong</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{this.state.error?.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#888', marginTop: 8 }}>{this.state.errorInfo?.componentStack}</pre>
          <button onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            style={{ marginTop: 16, padding: '8px 20px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import Expenses from './pages/Expenses.jsx';
import Projects from './pages/Projects.jsx';
import HR from './pages/HR.jsx';
import Cash from './pages/Cash.jsx';
import RawPacking from './pages/RawPacking.jsx';
import ExpressDetail from './pages/ExpressDetail.jsx';
import ClientMaster from './pages/ClientMaster.jsx';
import ClientRequest from './pages/ClientRequest.jsx';
import BOMHeader from './pages/BOMHeader.jsx';
import PriceListCost from './pages/PriceListCost.jsx';
import ItemCostSummary from './pages/ItemCostSummary.jsx';
import AccountsMaster from './pages/AccountsMaster.jsx';
import AccountStatement from './pages/AccountStatement.jsx';
import TrialBalance from './pages/TrialBalance.jsx';
import SegmentDefinition from './pages/SegmentDefinition.jsx';
import JournalEntry from './pages/JournalEntry.jsx';
import JournalModel from './pages/JournalModel.jsx';
import SmartJournal from './pages/SmartJournal.jsx';
import UserPermissions from './pages/UserPermissions.jsx';
import QueryMaster from './pages/QueryMaster.jsx';
import LookupQueries from './pages/LookupQueries.jsx';
import AccountingFunctions from './pages/AccountingFunctions.jsx';
import AccountingMacros from './pages/AccountingMacros.jsx';
import CashReceive from './pages/CashReceive.jsx';
import AccountingEvents from './pages/AccountingEvents.jsx';
import PageBuilder from './pages/PageBuilder.jsx';
import PageMaster from './pages/PageMaster.jsx';
import GenericMasterPage from './shared/GenericMasterPage.jsx';
import ReportsMaster from './pages/ReportsMaster.jsx';
import ItemBalance from './pages/ItemBalance.jsx';
import WarehouseTransfer from './pages/WarehouseTransfer.jsx';
import ItemMaster from './pages/ItemMaster.jsx';
import Orders from './pages/Orders.jsx';
import RMA from './pages/RMA.jsx';



// ─── Styles ──────────────────────────────────────────────────────────────────

const css = `
  :root {
    --bg: #f1f5f9;
    --surface: #ffffff;
    --soft: #f8fafc;
    --sidebar: #121b2b;
    --sidebar-surface: #1b2638;
    --sidebar-surface-hover: #243146;
    --sidebar-border: rgba(255, 255, 255, 0.10);
    --sidebar-text-primary: #f7f8fa;
    --sidebar-text-secondary: #aeb7c6;
    --sidebar-text-muted: #747f91;
    --brand-orange: #ff650f;
    --brand-orange-hover: #ff7a28;
    --brand-orange-soft: rgba(255, 101, 15, 0.14);
    --text: #0f172a;
    --muted: #64748b;
    --hint: #94a3b8;
    --border: #e2e8f0;
    --border2: #cbd5e1;
    --orange: #f97316;
    --orange2: #ea580c;
    --orange-dark: #c2410c;
    --orange-glow: rgba(249,115,22,.18);
    --orange-soft: #fff7ed;
    --green: #16a34a;
    --green-soft: #f0fdf4;
    --red: #dc2626;
    --red-soft: #fef2f2;
    --amber: #d97706;
    --amber-soft: #fffbeb;
    --blue: #2563eb;
    --blue-soft: #eff6ff;
    --radius: 14px;
    --radius-sm: 10px;
    --radius-xs: 7px;
    --font: 'Plus Jakarta Sans', sans-serif;
    --mono: 'JetBrains Mono', monospace;
    --shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.05);
    --shadow-lg: 0 8px 28px rgba(0,0,0,.1);
  }
  .dark {
    --bg: #0d1117;
    --surface: #161b22;
    --soft: #1c2333;
    --text: #e6edf3;
    --muted: #8b949e;
    --hint: #484f58;
    --border: #30363d;
    --border2: #21262d;
    --orange: #fb923c;
    --orange2: #f97316;
    --orange-dark: #ea580c;
    --orange-soft: rgba(251,146,60,.1);
    --green-soft: rgba(22,163,74,.12);
    --red-soft: rgba(220,38,38,.12);
    --amber-soft: rgba(217,119,6,.12);
    --blue-soft: rgba(37,99,235,.12);
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--font); background: var(--bg); color: var(--text); font-size: 14px; line-height: 1.5; }

  /* ── LOGIN ── */
  .login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 24px; }
  .login-card { width: 100%; max-width: 400px; background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 36px; box-shadow: var(--shadow-lg); }
  .login-logo { width: 52px; height: 52px; border-radius: 16px; background: linear-gradient(135deg, var(--orange), var(--orange2)); color: #fff; font-size: 20px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
  .login-title { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  .login-sub { color: var(--muted); font-size: 13px; margin-bottom: 28px; }
  .login-api { text-align: center; margin-top: 16px; font-size: 11px; color: var(--hint); font-family: var(--mono); }
  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: 11px; font-weight: 700; color: var(--muted); margin-bottom: 7px; letter-spacing: .08em; text-transform: uppercase; }
  .field input { width: 100%; height: 46px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); padding: 0 14px; background: var(--soft); color: var(--text); font-family: var(--font); font-size: 14px; outline: none; transition: border-color .2s; }
  .field input:focus { border-color: var(--orange); }
  .btn-login { width: 100%; height: 48px; border: none; border-radius: var(--radius-sm); background: linear-gradient(135deg, var(--orange), var(--orange2)); color: #fff; font-family: var(--font); font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 8px; transition: opacity .2s, transform .15s; }
  .btn-login:hover { opacity: .92; }
  .btn-login:active { transform: scale(.98); }
  .btn-login:disabled { opacity: .6; cursor: not-allowed; }
  .err-box { background: var(--red-soft); color: var(--red); border: 1px solid rgba(220,38,38,.2); border-radius: var(--radius-xs); padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }

  /* ── LAYOUT ── */
  .app { display: flex; min-height: 100vh; }
  .sidebar { width: 256px; min-width: 256px; background: var(--sidebar); display: flex; flex-direction: column; position: fixed; inset: 0 auto 0 0; overflow: hidden; font-family: var(--font); }
  .sb-head { flex-shrink: 0; padding: 16px 14px 14px; border-bottom: 1px solid var(--sidebar-border); }
  .sb-brand { display: flex; align-items: center; gap: 11px; cursor: pointer; user-select: none; }
  .sb-logo { width: 38px; height: 38px; border-radius: 11px; background: linear-gradient(135deg, var(--brand-orange), var(--brand-orange-hover)); color: #fff; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sb-name { font-size: 15.5px; font-weight: 800; color: var(--sidebar-text-primary); letter-spacing: -.01em; line-height: 1.25; }
  .sb-ver { font-size: 10px; font-weight: 500; color: var(--sidebar-text-muted); font-family: var(--mono); margin-top: 1px; }
  .sb-collapse-btn { background: var(--sidebar-surface); border: 1px solid var(--sidebar-border); color: var(--sidebar-text-secondary); cursor: pointer; font-size: 11px; width: 28px; height: 28px; border-radius: 10px; display: flex; align-items: center; justify-content: center; transition: all .18s; flex-shrink: 0; }
  .sb-collapse-btn:hover { background: var(--sidebar-surface-hover); color: var(--brand-orange-hover); border-color: rgba(255,101,15,.3); }
  .sb-collapse-btn:focus-visible { outline: 2px solid var(--brand-orange); outline-offset: 2px; }

  .sb-nav { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 12px 10px; display: flex; flex-direction: column; scrollbar-width: thin; scrollbar-color: var(--sidebar-surface-hover) transparent; }
  .sb-nav::-webkit-scrollbar { width: 6px; }
  .sb-nav::-webkit-scrollbar-track { background: transparent; }
  .sb-nav::-webkit-scrollbar-thumb { background: var(--sidebar-surface-hover); border-radius: 999px; }
  .sb-nav::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.18); }

  .sb-item, .sb-sub-item { position: relative; display: flex; align-items: center; gap: 11px; min-height: 48px; padding: 8px 12px; border-radius: 12px; cursor: pointer; color: var(--sidebar-text-secondary); font-size: 13.5px; font-weight: 600; letter-spacing: .01em; transition: background .18s, color .18s; margin-bottom: 3px; border: none; background: none; width: 100%; text-align: left; font-family: var(--font); }
  .sb-sub-item { padding-left: 20px; }
  .sb-item:hover, .sb-sub-item:hover { background: var(--sidebar-surface-hover); color: var(--sidebar-text-primary); }
  .sb-item:hover .sb-icon, .sb-sub-item:hover .sb-icon { color: var(--brand-orange-hover); border-color: rgba(255,101,15,.28); }
  .sb-item:focus-visible, .sb-sub-item:focus-visible, .sb-group-title:focus-visible { outline: 2px solid var(--brand-orange); outline-offset: -2px; }
  .sb-item.active, .sb-sub-item.active { background: var(--brand-orange); color: #fff; font-weight: 700; box-shadow: 0 3px 10px var(--brand-orange-soft); }
  .sb-item.active::before, .sb-sub-item.active::before { content: ''; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 999px; background: rgba(255,255,255,.85); }
  .sb-item.active .sb-icon, .sb-sub-item.active .sb-icon { background: rgba(255,255,255,.22); border-color: rgba(255,255,255,.35); color: #fff; }

  .sb-icon { width: 30px; height: 30px; border-radius: 9px; background: var(--sidebar-surface); border: 1px solid var(--sidebar-border); display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; color: var(--sidebar-text-secondary); transition: all .18s; }

  .sb-group { margin-bottom: 10px; }
  .sb-group-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; margin-bottom: 4px; background: var(--sidebar-surface); border: 1px solid var(--sidebar-border); border-left: 3px solid transparent; color: var(--sidebar-text-muted); font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; user-select: none; cursor: pointer; border-radius: 10px; width: 100%; font-family: var(--font); transition: background .18s, color .18s; }
  .sb-group-title:hover { background: var(--sidebar-surface-hover); color: var(--sidebar-text-secondary); }
  .sb-group-chevron { font-size: 9px; color: inherit; transition: transform .18s; flex-shrink: 0; }

  .sb-foot { flex-shrink: 0; padding: 12px 10px; border-top: 1px solid var(--sidebar-border); }
  .sb-profile { display: flex; align-items: center; gap: 10px; padding: 10px; margin-bottom: 10px; background: var(--sidebar-surface); border: 1px solid var(--sidebar-border); border-radius: 12px; }
  .sb-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, var(--brand-orange), var(--brand-orange-hover)); color: #fff; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sb-uname { font-size: 13px; font-weight: 700; color: var(--sidebar-text-primary); }
  .sb-urole { font-size: 11px; color: var(--sidebar-text-muted); margin-top: 1px; }
  .sb-actions { display: flex; gap: 8px; }
  .sb-btn { flex: 1; height: 36px; border: 1px solid var(--sidebar-border); border-radius: 10px; background: var(--sidebar-surface); color: var(--sidebar-text-secondary); font-family: var(--font); font-size: 11.5px; font-weight: 600; cursor: pointer; transition: all .18s; display: flex; align-items: center; justify-content: center; gap: 5px; }
  .sb-btn:hover { background: var(--sidebar-surface-hover); color: var(--sidebar-text-primary); }
  .sb-btn:focus-visible { outline: 2px solid var(--brand-orange); outline-offset: 2px; }
  .sb-btn.danger { border-color: rgba(255,101,15,.35); background: transparent; color: var(--brand-orange-hover); }
  .sb-btn.danger:hover { background: var(--brand-orange-soft); color: var(--brand-orange-hover); border-color: var(--brand-orange); }

  /* ── COLLAPSIBLE SIDEBAR ── */
  .sidebar { transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
  .main { transition: margin-left 0.2s cubic-bezier(0.4, 0, 0.2, 1); }

  .sidebar.collapsed { width: 68px; min-width: 68px; }
  .sidebar.collapsed:hover { width: 256px; min-width: 256px; z-index: 50; box-shadow: 4px 0 24px rgba(0,0,0,.28); }
  .sidebar.collapsed:not(:hover) .sb-logo { margin: 0 auto; }
  .sidebar.collapsed:not(:hover) .sb-name,
  .sidebar.collapsed:not(:hover) .sb-ver,
  .sidebar.collapsed:not(:hover) .sb-uname,
  .sidebar.collapsed:not(:hover) .sb-urole,
  .sidebar.collapsed:not(:hover) .sb-actions,
  .sidebar.collapsed:not(:hover) .sb-brand-text,
  .sidebar.collapsed:not(:hover) .sb-group-title span span:last-child,
  .sidebar.collapsed:not(:hover) .sb-group-chevron,
  .sidebar.collapsed:not(:hover) .sb-item span:last-child,
  .sidebar.collapsed:not(:hover) .sb-sub-item span:last-child { display: none; }

  .sidebar.collapsed:not(:hover) .sb-sub-item { padding: 8px 0; justify-content: center; }
  .sidebar.collapsed:not(:hover) .sb-item { padding: 8px 0; justify-content: center; }
  .sidebar.collapsed:not(:hover) .sb-group-title { justify-content: center; padding: 8px 0; border-left-width: 0; }
  .sidebar.collapsed:not(:hover) .sb-foot { display: flex; flex-direction: column; align-items: center; justify-content: center; }

  .main.collapsed { margin-left: 68px; }

  /* ── MAIN ── */
  .main { margin-left: 256px; flex: 1; display: flex; flex-direction: column; height: 100vh; background: var(--bg); overflow: hidden; }
  .topbar { height: 50px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: flex-end; padding: 0 22px; position: sticky; top: 0; z-index: 10; overflow-x: auto; }
  .tabs { display: flex; gap: 3px; align-items: flex-end; height: 100%; }
  .tab-item { height: 36px; display: flex; align-items: center; gap: 7px; padding: 0 12px; border: 1px solid var(--border); border-bottom: none; border-radius: 9px 9px 0 0; background: var(--soft); color: var(--muted); font-size: 12.5px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; position: relative; transition: all .15s; font-family: var(--font); }
  .tab-item:hover { background: var(--surface); color: var(--text); }
  .tab-item.active { background: var(--surface); color: var(--text); }
  .tab-item.active::after { content: ''; position: absolute; top: 0; left: 12px; right: 12px; height: 2.5px; background: linear-gradient(90deg, var(--orange), var(--orange2)); border-radius: 999px; }
  .tab-close { font-size: 10px; color: var(--hint); margin-left: 2px; padding: 2px 4px; border-radius: 3px; border: none; background: none; cursor: pointer; font-family: var(--font); }
  .tab-close:hover { background: var(--border); color: var(--muted); }
  .page-area { flex: 1; padding: 24px; display: flex; flex-direction: column; overflow: hidden; }
  .page-area > div { display: flex; flex-direction: column; flex: 1; min-height: 0; height: 100%; }
  .flex-row-layout { display: flex; flex-direction: row; }

  /* ── SHARED PAGE ── */
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
  .page-title { font-size: 20px; font-weight: 800; }
  .page-sub { font-size: 13px; color: var(--muted); margin-top: 3px; }
  .page-actions { display: flex; gap: 8px; align-items: center; }
  .btn-primary { height: 36px; padding: 0 16px; border: none; border-radius: var(--radius-xs); background: linear-gradient(135deg, var(--orange), var(--orange2)); color: #fff; font-family: var(--font); font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity .15s; }
  .btn-primary:hover { opacity: .9; }
  .btn-secondary { height: 36px; padding: 0 14px; border: 1px solid var(--border); border-radius: var(--radius-xs); background: var(--surface); color: var(--text); font-family: var(--font); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s; }
  .btn-secondary:hover { border-color: var(--border2); background: var(--soft); }
  .loading-wrap { text-align: center; padding: 48px; color: var(--muted); }
  .spinner { display: inline-block; width: 22px; height: 22px; border: 2.5px solid var(--border); border-top-color: var(--orange); border-radius: 50%; animation: spin .7s linear infinite; margin-bottom: 10px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .err-page { background: var(--red-soft); color: var(--red); border: 1px solid rgba(220,38,38,.2); border-radius: var(--radius-xs); padding: 12px 16px; font-size: 13px; margin-bottom: 16px; }
`;

// ─── Inject styles ────────────────────────────────────────────────────────────
const styleEl = document.createElement('style');
styleEl.textContent = css;
document.head.appendChild(styleEl);

// Muted per-group accent colors (left-edge stripe only -- orange stays reserved for the active state)
// First group (Accounting) uses the brand orange; the rest keep muted secondary tones.
const GROUP_ACCENTS = ['#ff650f', '#34d399', '#a78bfa', '#38bdf8', '#f472b6', '#94a3b8'];

// ─── Page map ─────────────────────────────────────────────────────────────────
const PAGE_COMPONENTS = {
  expenses: Expenses,
  projects: Projects,
  hr: HR,
  cash: Cash,
  rawpacking: RawPacking,
  express: ExpressDetail,
  client_master: ClientMaster,
  client_request: ClientRequest,
  bom_header: BOMHeader,
  price_list_cost: PriceListCost,
  item_cost_summary: ItemCostSummary,
  accounts_master: AccountsMaster,
  account_statement: AccountStatement,
  trial_balance: TrialBalance,
  segment_definition: SegmentDefinition,
  journal_entry: JournalEntry,
  journal_model: JournalModel,
  smart_journal: SmartJournal,
  user_permissions: UserPermissions,
  query_master: QueryMaster,
  lookup_queries: LookupQueries,
  accounting_functions: AccountingFunctions,
  accounting_macros: AccountingMacros,
  page_builder: PageBuilder,
  page_master: PageMaster,
  reports_master: ReportsMaster,
  accounting_events: AccountingEvents,
  item_balance: ItemBalance,
  warehouse_transfer: WarehouseTransfer,
  item_master: ItemMaster,
  orders: Orders,
  rma: RMA
};

// The sidebar is built live from PLS.PagesAndGroups at login instead of a
// static nav.js -- so registering a new page (bespoke or Simple CRUD) via
// PageBuilder.jsx makes it appear automatically, no code change needed.
//
// A leaf page only ever becomes a clickable nav item if it's actually
// renderable: either it has a hand-written entry in PAGE_COMPONENTS above, or
// it's a Simple CRUD page (its PageGroupID appears in the GetCrudPages
// result). This one check also quietly hides internal "virtual" PageGroupIDs
// (e.g. warehouse_transfer_lines, orders_lines -- lookup keys for detail
// queries, never meant to be sidebar pages) and abandoned/broken registration
// attempts, since neither has a component to render.
function buildNavTree(rows, crudPageIds) {
  const isRenderable = (id) => !!PAGE_COMPONENTS[id] || crudPageIds.has(id);

  const topLevel = rows
    .filter(r => !r.ParentID)
    .slice()
    .sort((a, b) => a.SortOrder - b.SortOrder);

  return topLevel
    .map(r => {
      if (r.IsGroup) {
        const children = rows
          .filter(c => !c.IsGroup && c.ParentID === r.PageGroupID && isRenderable(c.PageGroupID))
          .sort((a, b) => a.SortOrder - b.SortOrder)
          .map(c => ({ id: c.PageGroupID, label: c.Label, icon: c.Icon, desc: c.Description }));
        return {
          id: r.PageGroupID, label: r.Label, icon: r.Icon, desc: r.Description,
          isGroup: true, isSettings: r.PageGroupID === 'system_admin_group', children
        };
      }
      return isRenderable(r.PageGroupID)
        ? { id: r.PageGroupID, label: r.Label, icon: r.Icon, desc: r.Description }
        : null;
    })
    .filter(Boolean);
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [dark, setDark] = useState(false);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [allowedPages, setAllowedPages] = useState([]);
  // Sidebar tree built live from PLS.PagesAndGroups at login (see buildNavTree above)
  const [nav, setNav] = useState([]);
  // PageGroupIDs with Simple CRUD metadata registered -- these route to GenericMasterPage
  const [crudPageIds, setCrudPageIds] = useState(new Set());
  const sidebarGroups = useMemo(() => nav.filter(n => n.isGroup && !n.isSettings), [nav]);

  // login
  const [un, setUn] = useState('');
  const [pw, setPw] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const toggleDark = () => {
    setDark(d => {
      document.body.classList.toggle('dark', !d);
      return !d;
    });
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!un || !pw) { setLoginErr('Enter username and password'); return; }
    setLoginLoading(true); setLoginErr('');
    try {

      const d = await apiCall('Login', { Username: un, Password: pw });
      if (d.State === 0 && d.List0?.length) {
        const u = d.List0[0];
        sessionStorage.setItem('FullName', u.Username || un);
        
        let allowed = [];
        let builtNav = [];
        let crudIds = new Set();
        try {
          const [allowedRes, pagesRes, crudRes] = await Promise.all([
            apiCall('GetUserAllowedPages', {}, {}, 'plus'),
            apiCall('GetPagesAndGroups', {}, {}, 'plus'),
            apiCall('GetCrudPages', {}, {}, 'plus')
          ]);
          if (allowedRes.State === 0) allowed = allowedRes.List0 || [];
          if (crudRes.State === 0) crudIds = new Set((crudRes.List0 || []).map(r => r.PageGroupID));
          if (pagesRes.State === 0) builtNav = buildNavTree(pagesRes.List0 || [], crudIds);
        } catch (err) {
          console.error('Failed to load user allowed pages / sidebar:', err);
        }

        const loggedUser = { Username: u.Username || un, Name: u.Name || un, IsAdmin: u.IsAdmin };
        setAllowedPages(allowed);
        setNav(builtNav);
        setCrudPageIds(crudIds);
        setUser(loggedUser);

        const isPageAllowed = (id) => {
          if (loggedUser.IsAdmin === 1 || loggedUser.IsAdmin === true || (loggedUser.Username || '').toLowerCase() === 'sysadmin') return true;
          return allowed.some(ap => ap.PageGroupID.toLowerCase() === id.toLowerCase());
        };

        let firstPage = null;
        for (const n of builtNav) {
          if (n.isGroup) {
            const firstAllowedChild = n.children?.find(c => isPageAllowed(c.id));
            if (firstAllowedChild) {
              firstPage = firstAllowedChild.id;
              break;
            }
          } else if (isPageAllowed(n.id)) {
            firstPage = n.id;
            break;
          }
        }

        if (firstPage) {
          openPage(firstPage, allowed, loggedUser, builtNav);
        }
      } else {
        setLoginErr(d.Message || 'Invalid username or password');
      }
    } catch (e) {
      setLoginErr('Connection error: ' + e.message);
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('FullName');
    setUser(null); setOpenTabs([]); setActiveTab(null);
    setAllowedPages([]);
  };

  const openPage = useCallback((id, currentAllowed = allowedPages, currentUser = user, currentNav = nav) => {
    if (id === 'hr') {
      const usernameLower = (currentUser?.Username || '').toLowerCase();
      const canAccessHR = usernameLower === 'mhd' || usernameLower === 'm.a.elhout';
      if (!canAccessHR) return;
    }
    if (currentUser) {
      const isAdmin = currentUser.IsAdmin === 1 || currentUser.IsAdmin === true || (currentUser.Username || '').toLowerCase() === 'sysadmin';
      if (!isAdmin) {
        const isAllowed = currentAllowed.some(ap => ap.PageGroupID.toLowerCase() === id.toLowerCase());
        if (!isAllowed) return;
      }
    }
    setActiveTab(id);
    setOpenTabs(prev => {
      if (prev.find(t => t.id === id)) return prev;
      let tabDef = currentNav.find(n => n.id === id);
      if (!tabDef) {
        for (const n of currentNav) {
          if (n.isGroup && n.children) {
            const child = n.children.find(c => c.id === id);
            if (child) {
              tabDef = child;
              break;
            }
          }
        }
      }
      return [...prev, { id, ...(tabDef || {}) }];
    });
  }, [allowedPages, user, nav]);

  const closeTab = (id, e) => {
    e.stopPropagation();
    setOpenTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (activeTab === id) setActiveTab(next.length ? next[next.length - 1].id : null);
      return next;
    });
  };

  const getDefForId = (id) => {
    let def = nav.find(n => n.id === id);
    if (!def) {
      for (const n of nav) {
        if (n.isGroup && n.children) {
          const child = n.children.find(c => c.id === id);
          if (child) return child;
        }
      }
    }
    return def;
  };

  if (!user) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">PP</div>
          <div className="login-title">Plus Pro</div>
          {loginErr && <div className="err-box">{loginErr}</div>}
          <div className="field">
            <label>Username</label>
            <input value={un} onChange={e => setUn(e.target.value)} placeholder="Enter username" autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)}
              placeholder="Enter password" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <button className="btn-login" onClick={handleLogin} disabled={loginLoading}>
            {loginLoading ? 'Signing in…' : 'Sign In'}
          </button>
          <div className="login-api">sila.silasystem.com:7103</div>
        </div>
      </div>
    );
  }

  const initials = (user.Name || user.Username).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const isUserAdmin = user.IsAdmin === 1 || user.IsAdmin === true || (user.Username || '').toLowerCase() === 'sysadmin';
  const settingsGroup = nav.find(n => n.isSettings);
  const allowedSettingsChildren = settingsGroup
    ? settingsGroup.children.filter(c => isUserAdmin || allowedPages.some(ap => ap.PageGroupID.toLowerCase() === c.id.toLowerCase()))
    : [];

  return (
    <div className={`app${dark ? ' dark' : ''}`}>
      {/* Sidebar */}
      <aside className={`sidebar${isSidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="sb-head" style={{ display: 'flex', flexDirection: isSidebarCollapsed ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: isSidebarCollapsed ? 8 : 0 }}>
          <div className="sb-brand" onClick={() => openPage('client_master')} title="Plus Pro">
            <div className="sb-logo">PP</div>
            <div className="sb-brand-text">
              <div className="sb-name">Plus Pro</div>
              <div className="sb-ver">GLC Paints · v1.0.1</div>
            </div>
          </div>
          <button
            className="sb-collapse-btn"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            style={{ marginLeft: isSidebarCollapsed ? 0 : 8 }}
          >
            {isSidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>
        <nav className="sb-nav">
          {nav.map(n => {
            const isAdmin = user.IsAdmin === 1 || user.IsAdmin === true || (user.Username || '').toLowerCase() === 'sysadmin';
            if (n.isSettings) return null; // rendered as the Settings button in the footer instead
            if (n.isGroup) {
              const allowedChildren = n.children.filter(c => {
                return isAdmin || allowedPages.some(ap => ap.PageGroupID.toLowerCase() === c.id.toLowerCase());
              });
              if (allowedChildren.length === 0) return null;
              const isGroupCollapsed = !!collapsedGroups[n.id];
              const groupAccent = GROUP_ACCENTS[sidebarGroups.indexOf(n) % GROUP_ACCENTS.length];
              return (
                <div key={n.id} className="sb-group">
                  <button
                    type="button"
                    className="sb-group-title"
                    style={{ borderLeftColor: groupAccent }}
                    onClick={() => setCollapsedGroups(prev => ({ ...prev, [n.id]: !prev[n.id] }))}
                    aria-expanded={!isGroupCollapsed}
                    title={n.label}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 14 }}>{n.icon}</span>
                      <span>{n.label}</span>
                    </span>
                    <span className="sb-group-chevron" style={{ transform: isGroupCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▾</span>
                  </button>
                  {!isGroupCollapsed && (
                  <div className="sb-group-items">
                    {allowedChildren.map(c => (
                      <button key={c.id} className={`sb-sub-item${activeTab === c.id ? ' active' : ''}`} onClick={() => openPage(c.id)} title={c.label}>
                        <span className="sb-icon">{c.icon}</span>
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                  )}
                </div>
              );
            }
            if (n.id === 'hr') {
              const usernameLower = (user?.Username || '').toLowerCase();
              const canAccessHR = usernameLower === 'mhd' || usernameLower === 'm.a.elhout';
              if (!canAccessHR) return null;
            }
            const isItemAllowed = isAdmin || allowedPages.some(ap => ap.PageGroupID.toLowerCase() === n.id.toLowerCase());
            if (!isItemAllowed) return null;
            return (
              <button key={n.id} className={`sb-item${activeTab === n.id ? ' active' : ''}`} onClick={() => openPage(n.id)} title={n.label}>
                <span className="sb-icon">{n.icon}</span>
                <span>{n.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sb-foot">
          <div className="sb-profile">
            <div className="sb-avatar">{initials}</div>
            <div>
              <div className="sb-uname">{user.Name || user.Username}</div>
              <div className="sb-urole">
                {isUserAdmin ? 'System Admin' : 'System User'}
              </div>
            </div>
          </div>
          {allowedSettingsChildren.length > 0 && (
            <div ref={settingsRef} className="sb-actions" style={{ position: 'relative', marginBottom: 8 }}>
              {isSettingsOpen && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 6,
                  background: 'var(--sidebar-surface)', border: '1px solid var(--sidebar-border)', borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,.35)', overflow: 'hidden', zIndex: 20
                }}>
                  {allowedSettingsChildren.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { openPage(c.id); setIsSettingsOpen(false); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '9px 12px', border: 'none', background: activeTab === c.id ? 'var(--brand-orange-soft)' : 'transparent',
                        color: activeTab === c.id ? 'var(--brand-orange-hover)' : 'var(--sidebar-text-secondary)', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 600,
                        cursor: 'pointer', textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = activeTab === c.id ? 'var(--brand-orange-soft)' : 'var(--sidebar-surface-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = activeTab === c.id ? 'var(--brand-orange-soft)' : 'transparent'}
                    >
                      <span>{c.icon}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              )}
              <button className="sb-btn" style={{ width: '100%' }} onClick={() => setIsSettingsOpen(o => !o)} aria-expanded={isSettingsOpen} title={settingsGroup.label}>
                {settingsGroup.icon} {settingsGroup.label}
              </button>
            </div>
          )}
          <div className="sb-actions">
            <button className="sb-btn" onClick={toggleDark}>{dark ? '☀️' : '🌙'} Theme</button>
            <button className="sb-btn danger" onClick={handleLogout}>↩ Logout</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <section className={`main${isSidebarCollapsed ? ' collapsed' : ''}`}>
        {openTabs.length > 0 && (
          <header className="topbar">
            <div className="tabs">
              {openTabs.map(t => (
                <div key={t.id} className={`tab-item${t.id === activeTab ? ' active' : ''}`} onClick={() => openPage(t.id)}>
                  <span>{t.icon || '📝'}</span> {t.label || 'Tab'}
                  <button className="tab-close" onClick={e => closeTab(t.id, e)}>✕</button>
                </div>
              ))}
            </div>
          </header>
        )}
        <div className="page-area">
          {openTabs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>Select a page from the sidebar</div>
          )}
          {openTabs.map(t => {
            const TabPage = PAGE_COMPONENTS[t.id] || (crudPageIds.has(t.id) ? GenericMasterPage : null);
            if (!TabPage) return null;
            return (
              <div
                key={t.id}
                style={{ display: t.id === activeTab ? 'flex' : 'none' }}
              >
                <ErrorBoundary>
                  <TabPage user={user} def={getDefForId(t.id)} onBack={() => openPage('purchasing')} />
                </ErrorBoundary>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
