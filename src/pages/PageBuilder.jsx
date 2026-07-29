import React, { useState, useEffect, useRef } from 'react';
import { apiCall } from '../shared/api.js';

// Phase statuses: 'idle' | 'running' | 'done' | 'error' | 'skipped'
// Phase 5/6 labels differ in "Simple CRUD" mode, since that mode registers
// the generic engine's metadata instead of generating copy-paste text.
// Order matters here -- it must match actual execution order in runSave().
// Register Page/Group runs BEFORE Create View because CreateQueryView's SP
// inserts into PLS.PageQueries(PageGroupID, ...), which has a real FK to
// PLS.PagesAndGroups(PageGroupID) -- that row has to exist first.
function getPhases(pageMode) {
  return [
    { id: 'page',   label: 'Register Page / Group',      icon: '📁',  status: 'idle', detail: '' },
    { id: 'view',   label: 'Create View',               icon: '🗂️',  status: 'idle', detail: '' },
    { id: 'query',  label: 'Register Query in Master',   icon: '📋',  status: 'idle', detail: '' },
    { id: 'link',   label: 'Link Query → Page',          icon: '🔗',  status: 'idle', detail: '' },
    { id: 'sp',     label: pageMode === 'crud' ? 'Register CRUD Fields' : 'SP Operations Snippet', icon: '⚙️',  status: 'idle', detail: '' },
    { id: 'prompt', label: pageMode === 'crud' ? 'Wire-Up Instructions' : 'AI React Scaffold Prompt', icon: pageMode === 'crud' ? '🔌' : '🤖', status: 'idle', detail: '' },
  ];
}

// In "Simple CRUD" mode, the target schema/table are parsed from the View SQL
// Body's FROM clause instead of asked for as separate inputs (that SQL already
// has to name the real table, so asking twice would just be duplicate typing).
// Matches: FROM [schema].[table] | FROM schema.table | FROM table (schema -> dbo)
function parseTargetTable(sql) {
  const m = (sql || '').match(/FROM\s+\[?(\w+)\]?(?:\s*\.\s*\[?(\w+)\]?)?/i);
  if (!m) return { schema: 'dbo', table: '' };
  return m[2] ? { schema: m[1], table: m[2] } : { schema: 'dbo', table: m[1] };
}

export default function PageBuilder({ user, def }) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [lookupQueries, setLookupQueries] = useState([]);

  const [pageName, setPageName] = useState('');
  const [pageId, setPageId] = useState('');
  const [icon, setIcon] = useState('📄');
  const [description, setDescription] = useState('');
  const [parentGroup, setParentGroup] = useState('');
  const [mainQuerySql, setMainQuerySql] = useState('');   // actual SQL for the view body

  const [isNewGroup, setIsNewGroup] = useState(false);
  const [newGroupId, setNewGroupId] = useState('');
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const [newGroupIcon, setNewGroupIcon] = useState('📁');

  const [mainQuery, setMainQuery] = useState('');          // operation name
  const [spName, setSpName] = useState('APIPlusOperation');
  // filterMappings: { [operation]: { selected, fromParam, toParam, gridColumn } }
  const [filterMappings, setFilterMappings] = useState({});
  const [customLookupInput, setCustomLookupInput] = useState('');
  const [customLookups, setCustomLookups] = useState([]);
  const [filterSearch, setFilterSearch] = useState('');

  // "Simple CRUD" mode -- generic engine, no hand-written SQL or React file.
  // Target schema/table are parsed from the View SQL Body's FROM clause below
  // (parseTargetTable) rather than asked for twice.
  const [pageMode, setPageMode] = useState('bespoke'); // 'bespoke' | 'crud'
  // crudFields: [{ columnName, jsonKey, label, dataType, isRequired, isKey, isIdentity }]
  const [crudFields, setCrudFields] = useState([]);
  // Simple CRUD mode is a one-step-at-a-time wizard: 1 Page Details, 2 Data Setup, 3 Fields, 4 Review & Run
  const [wizardStep, setWizardStep] = useState(1);
  const [creatingView, setCreatingView] = useState(false);
  // Set once Create View succeeds -- lets the Fields step auto-load the view's real columns via GetQueryFields
  const [viewQueryId, setViewQueryId] = useState(null);
  const [loadingFields, setLoadingFields] = useState(false);
  const [registeringFields, setRegisteringFields] = useState(false);

  // Execution panel
  const [phases, setPhases] = useState(getPhases('bespoke'));
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [spSnippet, setSpSnippet] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [rightTab, setRightTab] = useState('prompt'); // 'prompt' | 'execution'
  const logRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await apiCall('GetPagesAndGroups', {}, {}, 'plus');
        if (res.State === 0 && res.List0) {
          const grps = res.List0.filter(i => i.IsGroup === true || i.IsGroup === 1 || i.IsGroup === '1');
          setGroups(grps);
          if (grps.length > 0) setParentGroup(grps[0].PageGroupID);
        }
        const qRes = await apiCall('GetQueryMaster', {}, {}, 'plus');
        if (qRes.State === 0 && qRes.List0) {
          const seen = new Set();
          const uniq = [{ QueryID: null, Operation: '📅 Date Filter', isDateFilter: true }];
          for (const l of qRes.List0.filter(q => q.QueryType === 'Lookup')) {
            if (!seen.has(l.Operation)) { seen.add(l.Operation); uniq.push(l); }
          }
          uniq.sort((a, b) => a.Operation === '📅 Date Filter' ? -1 : b.Operation === '📅 Date Filter' ? 1 : a.Operation.localeCompare(b.Operation));
          setLookupQueries(uniq);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Helpers
  const handleNameChange = (e) => {
    const val = e.target.value;
    setPageName(val);
    setPageId(val.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    setMainQuery(prev => prev || val + ' Grid');
  };

  const guessParams = (op) => {
    const lower = op.toLowerCase();
    if (lower.includes('date')) {
      return { filterType: 'range', fromParam: 'startDate', toParam: 'endDate', singleParam: 'asOfDate', gridColumn: 'TxnDate', defaultPreset: 'year_start', isDateFilter: true };
    }
    if (lower.includes('item'))     return { filterType: 'range', fromParam: 'fromItem',     toParam: 'toItem',     singleParam: 'itemCode',     gridColumn: 'ItemCode' };
    if (lower.includes('customer')) return { filterType: 'range', fromParam: 'fromCustomer', toParam: 'toCustomer', singleParam: 'customerNo',   gridColumn: 'CustomerNo' };
    if (lower.includes('vendor'))   return { filterType: 'range', fromParam: 'fromVendor',   toParam: 'toVendor',   singleParam: 'vendorNumber', gridColumn: 'VendorNumber' };
    if (lower.includes('account'))  return { filterType: 'range', fromParam: 'fromAccount',  toParam: 'toAccount',  singleParam: 'accountNumber',gridColumn: 'AccountNumber' };
    if (lower.includes('employee')) return { filterType: 'range', fromParam: 'fromEmployee', toParam: 'toEmployee', singleParam: 'employeeID',   gridColumn: 'EmployeeID' };
    if (lower.includes('bank'))     return { filterType: 'range', fromParam: 'fromBank',     toParam: 'toBank',     singleParam: 'bankAccount',  gridColumn: 'BankAccountNumber' };
    if (lower.includes('asset'))    return { filterType: 'range', fromParam: 'fromAsset',    toParam: 'toAsset',    singleParam: 'assetID',      gridColumn: 'AssetID' };
    if (lower.includes('expense'))  return { filterType: 'range', fromParam: 'fromExpense',  toParam: 'toExpense',  singleParam: 'expenseCode',  gridColumn: 'ExpenseCode' };
    const tag = op.split(' ')[0].toLowerCase();
    const cap = tag.charAt(0).toUpperCase() + tag.slice(1);
    return { filterType: 'range', fromParam: 'from' + cap, toParam: 'to' + cap, singleParam: tag + 'Code', gridColumn: cap + 'Code' };
  };

  const toggleLookup = (op) => {
    setFilterMappings(prev => {
      if (prev[op]?.selected) {
        // deselect — keep config so it can be re-added later
        return { ...prev, [op]: { ...prev[op], selected: false } };
      }
      // select — restore previous config if any, then force selected: true last
      const defaults = guessParams(op);
      return { ...prev, [op]: { ...defaults, ...(prev[op] || {}), selected: true } };
    });
  };

  const setFilterField = (op, field, value) => {
    setFilterMappings(prev => ({ ...prev, [op]: { ...prev[op], [field]: value } }));
  };

  const addCustomLookup = () => {
    if (customLookupInput.trim() && !customLookups.includes(customLookupInput.trim())) {
      setCustomLookups(prev => [...prev, customLookupInput.trim()]);
      setCustomLookupInput('');
    }
  };
  const activeLookups = [
    ...Object.entries(filterMappings).filter(([, v]) => v?.selected).map(([op]) => op),
    ...customLookups
  ];
  const activeFilterDefs = Object.entries(filterMappings).filter(([, v]) => v?.selected).map(([op, v]) => ({ op, ...v }));

  // ── CRUD field helpers (Simple CRUD mode only) ──────────────────
  const addCrudField = () => {
    setCrudFields(prev => [...prev, {
      columnName: '', jsonKey: '', label: '', dataType: 'string',
      isRequired: true, isKey: prev.length === 0, isIdentity: false
    }]);
  };
  const updateCrudField = (idx, patch) => {
    setCrudFields(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f));
  };
  const updateCrudFieldColumnName = (idx, value) => {
    setCrudFields(prev => prev.map((f, i) => {
      if (i !== idx) return f;
      const jsonKey = f.jsonKey || (value.charAt(0).toLowerCase() + value.slice(1));
      const label = f.label || value.replace(/([A-Z])/g, ' $1').trim();
      return { ...f, columnName: value, jsonKey, label };
    }));
  };
  const removeCrudField = (idx) => setCrudFields(prev => prev.filter((_, i) => i !== idx));
  const setCrudFieldKey = (idx) => setCrudFields(prev => prev.map((f, i) => ({ ...f, isKey: i === idx })));

  const guessFieldDataType = (name) => {
    if (/date/i.test(name)) return 'date';
    if (/^(is|has)[A-Z]/.test(name) || /^(active|enabled|isactive|isenabled)$/i.test(name)) return 'bool';
    if (/(id|qty|quantity|amount|price|total|count)$/i.test(name)) return 'number';
    return 'string';
  };

  // "Load Fields from View" (Simple CRUD, Fields step) -- reads the view's
  // actual columns via the existing GetQueryFields operation, so the user
  // doesn't have to hand-type every Column Name.
  const loadFieldsFromView = async () => {
    if (!viewQueryId) {
      alert('Create the View first (Step 2) before loading fields from it!');
      return;
    }
    setLoadingFields(true);
    try {
      const res = await apiCall('GetQueryFields', { QueryID: viewQueryId }, {}, 'plus');
      if (res.State === 0) {
        const existing = new Set(crudFields.map(f => f.columnName));
        const newFields = (res.List0 || [])
          .map(r => r.FieldName)
          .filter(name => name && !existing.has(name))
          .map(name => ({
            columnName: name,
            jsonKey: name.charAt(0).toLowerCase() + name.slice(1),
            label: name.replace(/([A-Z])/g, ' $1').trim(),
            dataType: guessFieldDataType(name),
            isRequired: true,
            isKey: false,
            isIdentity: false
          }));
        if (newFields.length === 0) {
          alert('No new columns found — all view columns are already listed.');
        } else {
          setCrudFields(prev => {
            const merged = [...prev, ...newFields];
            // If nothing is marked as the key yet, default it to the first field
            return merged.some(f => f.isKey) ? merged : merged.map((f, i) => i === 0 ? { ...f, isKey: true } : f);
          });
        }
      } else {
        alert(res.Message || 'Failed to load fields from the view.');
      }
    } catch (e) {
      alert('Connection error: ' + e.message);
    }
    setLoadingFields(false);
  };

  const setPhaseStatus = (id, status, detail = '') => {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, status, detail } : p));
  };

  // Shared by runSave() and the standalone "Create View" wizard button.
  // Must run BEFORE createViewPhase(): CreateQueryView's SP inserts into
  // PLS.PageQueries(PageGroupID, ...), which has a real FK to
  // PLS.PagesAndGroups(PageGroupID) -- that row has to exist first, or the
  // insert fails with "FK_PageQueries_PagesAndGroups" conflict.
  async function registerPageGroupPhase() {
    setPhaseStatus('page', 'running');
    try {
      if (isNewGroup) {
        const rg = await apiCall('SavePageOrGroup', {
          PageGroupID: newGroupId, ParentGroupID: null, SortOrder: 90,
          Label: newGroupLabel, Icon: newGroupIcon,
          Description: 'Generated Group', IsGroup: 1
        }, {}, 'plus');
        if (rg.State !== 0) throw new Error('Group: ' + (rg.Message || 'Unknown error'));
      }
      const finalGroupId = isNewGroup ? newGroupId : parentGroup;
      const rp = await apiCall('SavePageOrGroup', {
        PageGroupID: pageId, ParentGroupID: finalGroupId, SortOrder: 1,
        Label: pageName, Icon: icon, Description: description, IsGroup: 0
      }, {}, 'plus');
      if (rp.State === 0) {
        setPhaseStatus('page', 'done',
          isNewGroup
            ? `Group "${newGroupLabel}" and page "${pageName}" registered.`
            : `Page "${pageName}" registered under group "${finalGroupId}".`
        );
        return true;
      }
      setPhaseStatus('page', 'error', rp.Message || 'Unknown error registering page.');
      return false;
    } catch (e) {
      setPhaseStatus('page', 'error', e.message);
      return false;
    }
  }

  // Shared by runSave()'s Phase 2 and the standalone "Create View" wizard
  // button, so there's one implementation of view creation, not two.
  async function createViewPhase() {
    if (!mainQuerySql.trim()) {
      setPhaseStatus('view', 'skipped', 'No SQL body provided — view creation skipped.');
      return null;
    }
    setPhaseStatus('view', 'running');
    const viewName = 'Q' + pageName.replace(/\s+/g, '') + 'Grid';
    try {
      // The ExecuteScript/CreateQueryView gateway mangles single quotes in
      // SqlStatement text unless they're pre-doubled (same convention already
      // used in scratch/run_sql.js for raw SQL sent through this proxy) --
      // otherwise a view body with any 'literal' would silently fail to create
      // while CreateQueryView still reports success.
      const ddl = `CREATE OR ALTER VIEW [PLS].[${viewName}] AS\n${mainQuerySql.trim()}`.replace(/'/g, "''");
      const r = await apiCall('CreateQueryView', {
        PageGroupID: pageId,
        QueryName: mainQuery || pageName + ' Grid',
        QueryOperation: mainQuery || pageName + ' Grid',
        Description: 'Main Grid for ' + pageName,
        QuerySQL: `SELECT * FROM [PLS].[${viewName}];`,
        QueryType: 'Grid'
      }, { SqlStatement: ddl }, 'query');
      if (r.State === 0) {
        setPhaseStatus('view', 'done', `View [PLS].[${viewName}] created/altered successfully.`);
        // CreateQueryView's SP doesn't return the QueryID directly, so look it
        // up by Operation name -- needed by the Fields step's "Load from View".
        let qId = r.QueryID || r.List0?.[0]?.QueryID || null;
        if (!qId) {
          try {
            const qRes = await apiCall('GetQueryMaster', {}, {}, 'plus');
            const match = (qRes.List0 || []).find(q => q.Operation === (mainQuery || pageName + ' Grid'));
            qId = match?.QueryID || null;
          } catch { /* non-fatal -- Fields step will just show the manual add UI */ }
        }
        setViewQueryId(qId);
        return qId;
      }
      setPhaseStatus('view', 'error', r.Message || 'Unknown error creating view.');
      return null;
    } catch (e) {
      setPhaseStatus('view', 'error', e.message);
      return null;
    }
  }

  // "Create View" wizard button (Simple CRUD, Data Setup step) -- runs just
  // this one phase immediately, instead of waiting for "Run All Phases".
  // Silently registers Page/Group first if needed (see registerPageGroupPhase's
  // comment for why that has to happen before the view is created).
  const handleCreateViewClick = async () => {
    if (!pageId || !pageName) { alert('Fill in Page Name first (Step 1)!'); return; }
    if (!parentGroup && (!isNewGroup || !newGroupId)) { alert('Select or create a parent group first (Step 1)!'); return; }
    const parsed = parseTargetTable(mainQuerySql);
    if (!mainQuerySql.trim() || !parsed.table) {
      alert("Enter View SQL Body with a FROM [schema].[table] clause first!");
      return;
    }
    setCreatingView(true);
    setRightTab('execution');
    setPhases(getPhases(pageMode).map(p => ({ ...p, status: 'idle', detail: '' })));
    const pageRegistered = await registerPageGroupPhase();
    if (pageRegistered) await createViewPhase();
    setCreatingView(false);
  };

  // Shared by runSave()'s Phase 5 (CRUD mode) and the standalone "Register
  // CRUD Fields" wizard button -- registers PLS.CrudTableMaster/CrudFieldMappings,
  // the metadata GenericRecordSave/GenericRecordDelete read at runtime.
  async function registerCrudFieldsPhase() {
    setPhaseStatus('sp', 'running');
    try {
      const parsedTarget = parseTargetTable(mainQuerySql);
      const rt = await apiCall('SaveCrudTableMaster', {
        PageGroupID: pageId, TargetSchema: parsedTarget.schema, TargetTable: parsedTarget.table, AllowDelete: 1
      }, {}, 'plus');
      if (rt.State !== 0) throw new Error(rt.Message || 'Failed to register CRUD table');

      const rf = await apiCall('SaveCrudFieldMappings', {
        PageGroupID: pageId,
        Fields: crudFields.map((f, i) => ({
          ColumnName: f.columnName, JsonKey: f.jsonKey, Label: f.label || f.columnName,
          DataType: f.dataType, IsRequired: f.isRequired ? 1 : 0,
          IsKey: f.isKey ? 1 : 0, IsIdentity: f.isIdentity ? 1 : 0, SortOrder: i + 1
        }))
      }, {}, 'plus');
      if (rf.State !== 0) throw new Error(rf.Message || 'Failed to register CRUD fields');

      setPhaseStatus('sp', 'done', 'No SQL needed — GenericRecordSave/GenericRecordDelete registered for this page.');
      return true;
    } catch (e) {
      setPhaseStatus('sp', 'error', e.message);
      return false;
    }
  }

  // "Register CRUD Fields" wizard button (Simple CRUD, Fields step) -- runs
  // just this one phase immediately, instead of waiting for "Run All Phases".
  const handleRegisterCrudFieldsClick = async () => {
    if (!pageId || !pageName) { alert('Fill in Page Name first (Step 1)!'); return; }
    if (!parseTargetTable(mainQuerySql).table) { alert('Create the View first (Step 2) so a target table can be detected!'); return; }
    if (crudFields.length === 0) { alert('Add at least one field first!'); return; }
    if (crudFields.filter(f => f.isKey).length !== 1) { alert('Exactly one field must be marked as the Key!'); return; }
    setRegisteringFields(true);
    setRightTab('execution');
    setPhases(getPhases(pageMode).map(p => ({ ...p, status: 'idle', detail: '' })));
    await registerCrudFieldsPhase();
    setRegisteringFields(false);
  };

  // ─────────────────────────────────────────────────────────────
  // MAIN SAVE RUNNER
  // ─────────────────────────────────────────────────────────────
  const runSave = async () => {
    if (!pageId || !pageName) { alert('Page ID and Name are required!'); return; }
    if (!parentGroup && (!isNewGroup || !newGroupId)) { alert('Select or create a parent group!'); return; }
    const parsedTarget = parseTargetTable(mainQuerySql);
    if (pageMode === 'crud') {
      if (!parsedTarget.table) { alert("Couldn't find a table name in the View SQL Body -- it needs a FROM [schema].[table] clause for Simple CRUD pages!"); return; }
      if (crudFields.length === 0) { alert('Add at least one field for Simple CRUD pages!'); return; }
      if (crudFields.filter(f => f.isKey).length !== 1) { alert('Exactly one field must be marked as the Key!'); return; }
    }

    setIsRunning(true);
    setIsDone(false);
    setRightTab('execution');
    setPhases(getPhases(pageMode).map(p => ({ ...p, status: 'idle', detail: '' })));
    setSpSnippet('');
    setAiPrompt('');

    const viewName = 'Q' + pageName.replace(/\s+/g, '') + 'Grid';
    const finalGroupId = isNewGroup ? newGroupId : parentGroup;
    let registeredQueryId = null;

    // ── Phase 1: Register Page / Group ────────────────────────
    // Runs BEFORE Create View: CreateQueryView's SP inserts into
    // PLS.PageQueries(PageGroupID, ...), which has a real FK to
    // PLS.PagesAndGroups(PageGroupID) -- that row must exist first.
    const pageRegistered = await registerPageGroupPhase();

    // ── Phase 2: Create View ──────────────────────────────────
    if (pageRegistered) {
      registeredQueryId = await createViewPhase();
    } else {
      setPhaseStatus('view', 'skipped', 'Skipped -- Register Page/Group failed above.');
    }

    // ── Phase 3: Register Query ───────────────────────────────
    setPhaseStatus('query', 'running');
    try {
      const r = await apiCall('SaveQueryMaster', {
        QueryName: mainQuery || pageName + ' Grid',
        Operation: mainQuery || pageName + ' Grid',
        Description: 'Main Grid for ' + pageName,
        QuerySQL: mainQuerySql.trim() ? `SELECT * FROM [PLS].[${viewName}];` : '',
        QueryType: 'Grid',
        ApiUrl: ''
      }, {}, 'plus');
      if (r.State === 0) {
        registeredQueryId = registeredQueryId || r.QueryID || r.List0?.[0]?.QueryID;
        setPhaseStatus('query', 'done', `Query "${mainQuery || pageName + ' Grid'}" registered in QueryMaster. ID: ${registeredQueryId || '(returned by server)'}`);
      } else {
        setPhaseStatus('query', 'error', r.Message || 'Unknown error registering query.');
      }
    } catch (e) {
      setPhaseStatus('query', 'error', e.message);
    }

    // ── Phase 4: Link Queries → Page ─────────────────────────
    setPhaseStatus('link', 'running');
    try {
      const toLink = Object.entries(filterMappings)
        .filter(([op, v]) => v?.selected && !v?.isDateFilter && op !== '📅 Date Filter')
        .map(([op]) => op);
      if (toLink.length === 0 && customLookups.length === 0) {
        setPhaseStatus('link', 'skipped', 'No lookup queries to link (Date filter is built-in UI).');
      } else {
        const results = [];
        for (const op of toLink) {
          const filterDef = lookupQueries.find(q => q.Operation === op);
          if (filterDef?.QueryID) {
            const r = await apiCall('SaveQueryPageRelation', {
              QueryID: filterDef.QueryID, PageGroupID: pageId, IsLinked: 1
            }, {}, 'plus');
            results.push({ op, ok: r.State === 0, msg: r.Message });
          }
        }
        const failed = results.filter(r => !r.ok);
        if (failed.length === 0) {
          setPhaseStatus('link', 'done', `Linked ${results.length} lookup filter(s) to page "${pageId}".`);
        } else {
          setPhaseStatus('link', 'error', `${failed.length} link(s) failed: ${failed.map(f => f.op).join(', ')}`);
        }
      }
    } catch (e) {
      setPhaseStatus('link', 'error', e.message);
    }

    const opName = mainQuery || pageName + ' Grid';

    if (pageMode === 'crud') {
      // ── Phase 5 (CRUD mode): Register CRUD Fields — no hand-written SQL ──
      await registerCrudFieldsPhase();

      // ── Phase 6 (CRUD mode): Wire-Up Instructions — no new React file ──
      setPhaseStatus('prompt', 'running');
      const wireUp = [
        `src/nav.js  (inside the target group's children[]):`,
        `  { id: '${pageId}', label: '${pageName}', icon: '${icon}', desc: '${description || pageName}' }`,
        ``,
        `src/App.jsx PAGE_COMPONENTS map:`,
        `  ${pageId}: GenericMasterPage,`,
        ``,
        `Note: GenericMasterPage is imported into App.jsx once, ever -- not per page.`,
        `It reads its columns/fields at runtime from what was just registered above.`,
      ].join('\n');
      setAiPrompt(wireUp);
      setPhaseStatus('prompt', 'done', 'No new React file needed — just wire up these 2 lines.');
    } else {
      // ── Phase 5 (bespoke mode): SP Operations Snippet ───────────────────
      setPhaseStatus('sp', 'running');
      const currentFilterDefs = Object.entries(filterMappings)
        .filter(([, v]) => v?.selected)
        .map(([op, v]) => ({ op, ...v }));

      const declareLines = currentFilterDefs.flatMap(f => {
        const isDate = f.isDateFilter || f.op.includes('Date');
        const dataType = isDate ? 'DATE' : 'NVARCHAR(200)';
        if (f.filterType === 'range') {
          return [
            `\t\tDECLARE @${f.fromParam} ${dataType} = JSON_VALUE(@LineData, '$.${f.fromParam}') -- ${f.op}`,
            `\t\tDECLARE @${f.toParam}   ${dataType} = JSON_VALUE(@LineData, '$.${f.toParam}')`,
          ];
        }
        return [`\t\tDECLARE @${f.singleParam || f.fromParam} ${dataType} = JSON_VALUE(@LineData, '$.${f.singleParam || f.fromParam}') -- ${f.op}`];
      });

      const whereLines = currentFilterDefs.map((f, i) => {
        const pfx = i === 0 ? 'WHERE ' : '  AND ';
        const isDate = f.isDateFilter || f.op.includes('Date');
        const emptyCheck = isDate
          ? `CAST(@\${PARAM} AS VARCHAR) = ''`
          : `@\${PARAM} = ''`;

        if (f.filterType === 'range') {
          return `\t\t${pfx}(@${f.fromParam} IS NULL OR ${emptyCheck.replace('${PARAM}', f.fromParam)} OR ${f.gridColumn} >= @${f.fromParam})\n\t\t  AND (@${f.toParam}   IS NULL OR ${emptyCheck.replace('${PARAM}', f.toParam)} OR ${f.gridColumn} <= @${f.toParam})`;
        }
        if (f.filterType === 'asOf') {
          return `\t\t${pfx}(@${f.singleParam || f.toParam || 'asOfDate'} IS NULL OR ${emptyCheck.replace('${PARAM}', f.singleParam || f.toParam || 'asOfDate')} OR ${f.gridColumn} <= @${f.singleParam || f.toParam || 'asOfDate'})`;
        }
        if (f.filterType === 'like') {
          return `\t\t${pfx}(@${f.singleParam || f.fromParam} IS NULL OR ${emptyCheck.replace('${PARAM}', f.singleParam || f.fromParam)} OR ${f.gridColumn} LIKE '%' + @${f.singleParam || f.fromParam} + '%')`;
        }
        // exact
        return `\t\t${pfx}(@${f.singleParam || f.fromParam} IS NULL OR ${emptyCheck.replace('${PARAM}', f.singleParam || f.fromParam)} OR ${f.gridColumn} = @${f.singleParam || f.fromParam})`;
      });

      const snippet = [
        `-- ═══════════════════════════════════════════════════`,
        `-- ADD THIS BLOCK INSIDE [dbo].[${spName || 'APIPlusOperation'}]`,
        `-- ═══════════════════════════════════════════════════`,
        ``,
        `\tIF @Operation = '${opName}'`,
        `\tBEGIN`,
        ...(declareLines.length > 0 ? [`\t\t-- Filter parameters from LineData JSON`, ...declareLines, ``] : []),
        `\t\tSELECT * FROM [PLS].[${viewName}]`,
        ...whereLines,
        `\t\tRETURN`,
        `\tEND`,
      ].join('\n');
      setSpSnippet(snippet);
      setPhaseStatus('sp', 'done', 'Snippet generated — copy and paste it into your stored procedure.');

      // ── Phase 6 (bespoke mode): AI Prompt ───────────────────────────────
      setPhaseStatus('prompt', 'running');
      const prompt = [
        `Hey Antigravity, please scaffold a new React page with the following specs:`,
        ``,
        `**Page Details**`,
        `- Name: ${pageName}`,
        `- Page ID: ${pageId}`,
        `- Icon: ${icon}`,
        `- Description: ${description || '(none)'}`,
        ``,
        `**Sidebar Group**`,
        isNewGroup
          ? `- NEW group: "${newGroupLabel}" (ID: ${newGroupId}, Icon: ${newGroupIcon})`
          : `- Existing group: ${finalGroupId}`,
        ``,
        `**API / Data**`,
        `- Operation name: "${opName}"`,
        `- Stored Procedure: ${spName || 'APIPlusOperation'}`,
        `- API target: "plus" (routes to /plus-api in dev, APIPlusOperation on server)`,
        `- View: [PLS].[${viewName}]`,
        ``,
        `**FilterPanel Filters & Key Column Mappings**`,
        `Each filter below specifies how parameters pass from FilterPanel to SQL.`,
        activeFilterDefs.length > 0
          ? activeFilterDefs.map(f => {
              if (f.isDateFilter || f.op.includes('Date')) {
                return `- 📅 ${f.op} (Mode: ${f.filterType}, Default Preset: ${f.defaultPreset || 'year_start'})\n  → LineData keys: \`${f.fromParam}\` / \`${f.toParam}\` (or \`${f.singleParam}\`)\n  → Grid Date column: \`${f.gridColumn}\``;
              }
              return `- 🔍 ${f.op} (Type: ${f.filterType || 'range'})\n  → LineData keys: \`${f.fromParam}\` / \`${f.toParam}\` (or \`${f.singleParam}\`)\n  → Grid column:  \`${f.gridColumn}\``;
            }).join('\n')
          : `- (none)`,
        ``,
        `**Instructions**`,
        `1. Create \`src/pages/${pageName.replace(/\s+/g, '')}.jsx\` using the project's standard pattern:`,
        `   - Import DataGrid and FilterPanel from \`../shared/\``,
        `   - Pass \`pageGroupId="${pageId}"\` to FilterPanel so it auto-loads registered lookup filters`,
        activeFilterDefs.some(f => f.isDateFilter || f.op.includes('Date'))
          ? `   - Pass \`filters={['date']}\` to FilterPanel so the date picker is enabled`
          : ``,
        `   - Call apiCall("${opName}", filters, {}, "plus") to fetch grid data`,
        `   - Use the \`flex-row-layout\` div wrapping FilterPanel + DataGrid (see TrialBalance.jsx)`,
        `2. Register the route in App.jsx: add \`${pageId}: ${pageName.replace(/\s+/g, '')}\` to the pageComponents map`,
        `3. Database registration (PagesAndGroups, QueryMaster, PageQueries) is ALREADY DONE — skip that step.`,
      ].join('\n');
      setAiPrompt(prompt);
      setPhaseStatus('prompt', 'done', 'Prompt ready — copy it to Antigravity chat.');
    }

    setIsRunning(false);
    setIsDone(true);
  };

  const resetExecution = () => {
    setPhases(getPhases(pageMode).map(p => ({ ...p, status: 'idle', detail: '' })));
    setIsDone(false);
    setSpSnippet('');
    setAiPrompt('');
  };

  const copyText = (text, label = '') => {
    navigator.clipboard.writeText(text);
    // Brief visual feedback via alert — minimal but clear
    alert((label ? label + ' ' : '') + 'copied to clipboard!');
  };

  // ─────────────────────────────────────────────────────────────
  // Styles
  // ─────────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '11px 14px', fontSize: '14px',
    borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)',
    background: 'var(--soft)', color: 'var(--text)',
    fontFamily: 'var(--font)', outline: 'none', transition: 'border-color .2s',
    boxSizing: 'border-box'
  };
  const monoStyle = { ...inputStyle, fontFamily: 'var(--mono)', fontSize: '13px' };
  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: 700,
    color: 'var(--muted)', marginBottom: 7, letterSpacing: '.07em', textTransform: 'uppercase'
  };
  const cardStyle = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '18px', padding: '24px', boxShadow: 'var(--shadow)'
  };
  const focus = { onFocus: e => (e.target.style.borderColor = 'var(--orange)'), onBlur: e => (e.target.style.borderColor = 'var(--border)') };

  // Fields step (Simple CRUD) -- compact grid/table instead of one card per field
  const thStyle = {
    padding: '8px 10px', textAlign: 'left', fontSize: 10.5, fontWeight: 800,
    color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase', whiteSpace: 'nowrap'
  };
  const tdStyle = { padding: '6px 8px', verticalAlign: 'middle' };
  const cellInput = {
    width: '100%', height: 30, padding: '0 8px', fontSize: 12.5,
    borderRadius: 6, border: '1.5px solid var(--border)', background: 'var(--soft)',
    color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box'
  };
  const cellInputMono = { ...cellInput, fontFamily: 'var(--mono)', fontSize: 12 };

  const stepBadge = (n) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 26, height: 26, borderRadius: '50%', fontSize: '13px', fontWeight: 900,
      background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
      color: '#fff', flexShrink: 0
    }}>{n}</span>
  );

  const phaseStatusColor = { idle: 'var(--muted)', running: '#2563eb', done: '#16a34a', error: '#dc2626', skipped: '#d97706' };
  const phaseStatusBg   = { idle: 'var(--soft)',   running: 'rgba(37,99,235,.08)', done: 'rgba(22,163,74,.08)', error: 'rgba(220,38,38,.08)', skipped: 'rgba(217,119,6,.08)' };
  const phaseStatusBorder = { idle: 'var(--border)', running: 'rgba(37,99,235,.3)', done: 'rgba(22,163,74,.3)', error: 'rgba(220,38,38,.3)', skipped: 'rgba(217,119,6,.3)' };

  const PhaseIcon = ({ status }) => {
    if (status === 'running') return <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, marginBottom: 0, display: 'inline-block' }} />;
    if (status === 'done')    return <span style={{ color: '#16a34a', fontWeight: 900 }}>✓</span>;
    if (status === 'error')   return <span style={{ color: '#dc2626', fontWeight: 900 }}>✕</span>;
    if (status === 'skipped') return <span style={{ color: '#d97706' }}>⤵</span>;
    return <span style={{ color: 'var(--border)', fontSize: 12 }}>○</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">{def?.icon || '🪄'} {def?.label || 'AI Page Builder'}</div>
          <div className="page-sub">{def?.desc || 'Register a new page step-by-step and scaffold a React component'}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isDone && (
            <button onClick={resetExecution} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              🔄 Reset
            </button>
          )}
          <button
            onClick={runSave}
            className="btn-primary"
            disabled={isRunning || loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: isRunning || loading ? 0.6 : 1, minWidth: 140, justifyContent: 'center' }}
          >
            {isRunning
              ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginBottom: 0 }} /> Running…</>
              : '▶ Run All Phases'}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 0 24px' }}>

        {/* ── LEFT: Form ── */}
        <div style={{ flex: '1.3', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Mode toggle -- always visible in both modes, lives outside the wizard so it's reachable from any step */}
          <div style={{ display: 'flex', gap: 0, border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden', width: 'fit-content' }}>
            {[
              { val: 'bespoke', label: '🧩 Bespoke Page' },
              { val: 'crud', label: '⚡ Simple CRUD (Generic Engine)' }
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => setPageMode(opt.val)}
                style={{
                  padding: '8px 16px', border: 'none', cursor: 'pointer',
                  background: pageMode === opt.val ? 'var(--orange)' : 'var(--soft)',
                  color: pageMode === opt.val ? '#fff' : 'var(--text)',
                  fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: pageMode === opt.val ? 800 : 600
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Simple CRUD is a one-step-at-a-time wizard; Bespoke keeps the classic stacked-cards layout below */}
          {pageMode === 'crud' && (
            <div style={{ display: 'flex', gap: 8 }}>
              {['Page Details', 'Data Setup', 'Fields', 'Review & Run'].map((label, idx) => {
                const n = idx + 1;
                const isActive = wizardStep === n;
                const isPast = wizardStep > n;
                return (
                  <button
                    key={n}
                    onClick={() => setWizardStep(n)}
                    style={{
                      flex: 1, textAlign: 'center', padding: '9px 4px', borderRadius: 8, cursor: 'pointer',
                      border: '1px solid var(--border)', fontFamily: 'var(--font)',
                      background: isActive ? 'var(--orange)' : isPast ? 'var(--orange-glow)' : 'var(--soft)',
                      color: isActive ? '#fff' : isPast ? 'var(--orange2)' : 'var(--muted)',
                      fontSize: 11.5, fontWeight: isActive ? 800 : 600
                    }}
                  >
                    {n}. {label}
                  </button>
                );
              })}
            </div>
          )}

          {(pageMode !== 'crud' || wizardStep === 1) && (
          /* Step 1: Page Details */
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              {stepBadge(1)}
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Page Details</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Page Name</label>
                  <input type="text" value={pageName} onChange={handleNameChange} placeholder="e.g. Inventory Report" style={inputStyle} {...focus} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Page ID <span style={{ color: 'var(--orange)', textTransform: 'none', fontWeight: 600 }}>(auto)</span></label>
                  <input type="text" value={pageId} onChange={e => setPageId(e.target.value)} placeholder="inventory_report" style={monoStyle} {...focus} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 70 }}>
                  <label style={labelStyle}>Icon</label>
                  <input type="text" value={icon} onChange={e => setIcon(e.target.value)} style={{ ...inputStyle, textAlign: 'center', fontSize: '20px', padding: 8 }} {...focus} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Parent Group</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, textTransform: 'none', fontWeight: 600, color: 'var(--orange)', letterSpacing: 0, cursor: 'pointer' }}>
                      <input type="checkbox" checked={isNewGroup} onChange={e => setIsNewGroup(e.target.checked)} style={{ accentColor: 'var(--orange)', width: 14, height: 14 }} />
                      Create New Group
                    </label>
                  </label>
                  {!isNewGroup ? (
                    <select value={parentGroup} onChange={e => setParentGroup(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }} {...focus}>
                      {loading ? <option>Loading…</option> : groups.map(g => (
                        <option key={g.PageGroupID} value={g.PageGroupID}>{g.Icon} {g.Label} ({g.PageGroupID})</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="text" value={newGroupIcon} onChange={e => setNewGroupIcon(e.target.value)} placeholder="📁"
                        style={{ ...inputStyle, width: 52, textAlign: 'center', fontSize: 18, padding: 8, borderColor: 'var(--orange)' }} />
                      <input type="text" value={newGroupLabel}
                        onChange={e => { setNewGroupLabel(e.target.value); setNewGroupId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_group'); }}
                        placeholder="Group Label" style={{ ...inputStyle, flex: 1, borderColor: 'var(--orange)' }} />
                      <input type="text" value={newGroupId} onChange={e => setNewGroupId(e.target.value)} placeholder="group_id"
                        style={{ ...monoStyle, flex: 1, borderColor: 'var(--orange)' }} />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. View all inventory balances across warehouses" style={inputStyle} {...focus} />
              </div>
            </div>
          </div>
          )}

          {(pageMode !== 'crud' || wizardStep === 2) && (
          /* Step 2: Data Setup */
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              {stepBadge(2)}
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Data Setup</h3>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 2 }}>Operation name + SQL body for the view</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {pageMode !== 'crud' && (
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ flex: 2 }}>
                    <label style={labelStyle}>Operation Name</label>
                    <input type="text" value={mainQuery} onChange={e => setMainQuery(e.target.value)}
                      placeholder="e.g. Inventory Report All" style={inputStyle} {...focus} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Stored Procedure</label>
                    <input type="text" value={spName} onChange={e => setSpName(e.target.value)}
                      placeholder="APIPlusOperation" style={monoStyle} {...focus} />
                  </div>
                </div>
              )}
              <div>
                <label style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between' }}>
                  <span>View SQL Body <span style={{ color: 'var(--muted)', textTransform: 'none', fontWeight: 400 }}>
                    {pageMode === 'crud' ? '(required — its FROM clause also tells the engine which table to write to)' : '(optional — leave blank to skip view creation)'}
                  </span></span>
                </label>
                <textarea
                  value={mainQuerySql}
                  onChange={e => setMainQuerySql(e.target.value)}
                  placeholder={`SELECT\n    i.ItemID,\n    i.ItemCode,\n    i.ItemDescription,\n    SUM(t.Qty) AS Balance\nFROM Inventory.Items i\n    LEFT JOIN Inventory.Transactions t ON t.ItemID = i.ItemID\nGROUP BY i.ItemID, i.ItemCode, i.ItemDescription`}
                  rows={7}
                  style={{ ...monoStyle, resize: 'vertical', lineHeight: 1.6, fontSize: '12.5px' }}
                  {...focus}
                />
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 5 }}>
                  This SQL becomes the body of <code style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>[PLS].[Q{pageName.replace(/\s+/g, '')}Grid]</code>. Leave blank if the view already exists.
                </div>
              </div>
              {pageMode === 'crud' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleCreateViewClick}
                    className="btn-primary"
                    disabled={creatingView}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: creatingView ? 0.6 : 1 }}
                  >
                    {creatingView
                      ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginBottom: 0 }} /> Creating…</>
                      : '🗂️ Create View'}
                  </button>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Step 3: Filters (bespoke mode only -- Simple CRUD pages skip FilterPanel entirely) */}
          {pageMode !== 'crud' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              {stepBadge(3)}
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Lookup Filters</h3>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 2 }}>Pick filters from the palette, then configure their key field mapping</div>
              </div>
              {activeLookups.length > 0 && (
                <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '12px', fontWeight: 800, background: 'var(--orange-glow)', color: 'var(--orange2)', border: '1px solid var(--orange)' }}>
                  {activeLookups.length} selected
                </span>
              )}
            </div>

            {/* ── ZONE A: Filter Picker ── */}
            <div style={{ border: '1.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              {/* Search bar */}
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--soft)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>🔍</span>
                <input
                  type="text"
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  placeholder={`Search ${lookupQueries.length} available filters…`}
                  style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: '13px', outline: 'none' }}
                />
                {filterSearch && (
                  <button onClick={() => setFilterSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, lineHeight: 1 }}>×</button>
                )}
              </div>

              {/* Compact chip grid */}
              {loading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}><div className="spinner" /></div>
              ) : (
                <div style={{ padding: 10, maxHeight: 200, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {lookupQueries
                    .filter(q => !filterSearch || q.Operation.toLowerCase().includes(filterSearch.toLowerCase()))
                    .map(q => {
                      const active = !!filterMappings[q.Operation]?.selected;
                      return (
                        <button
                          key={q.Operation}
                          onClick={() => toggleLookup(q.Operation)}
                          style={{
                            padding: '5px 12px', borderRadius: 999, fontSize: '12.5px', fontWeight: 600,
                            border: `1.5px solid ${active ? 'var(--orange)' : 'var(--border)'}`,
                            background: active ? 'var(--orange)' : 'var(--soft)',
                            color: active ? '#fff' : 'var(--text)',
                            cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--font)',
                            display: 'flex', alignItems: 'center', gap: 5
                          }}
                        >
                          {active && <span style={{ fontSize: 10, opacity: .8 }}>✓</span>}
                          {q.Operation}
                        </button>
                      );
                    })}
                  {lookupQueries.filter(q => !filterSearch || q.Operation.toLowerCase().includes(filterSearch.toLowerCase())).length === 0 && (
                    <div style={{ width: '100%', textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '12px 0' }}>No matches for "{filterSearch}"</div>
                  )}
                </div>
              )}

              {/* Custom lookup input */}
              <div style={{ padding: '8px 10px', borderTop: '1px dashed var(--border)', background: 'var(--soft)', display: 'flex', gap: 6 }}>
                <input
                  type="text" value={customLookupInput}
                  onChange={e => setCustomLookupInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomLookup()}
                  placeholder="Add a custom lookup name not in the list…"
                  style={{ ...inputStyle, flex: 1, height: 32, padding: '0 10px', fontSize: '12.5px' }}
                  onFocus={e => e.target.style.borderColor = 'var(--orange)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button onClick={addCustomLookup} className="btn-primary" style={{ height: 32, padding: '0 14px', fontSize: 12, whiteSpace: 'nowrap' }}>+ Custom</button>
              </div>
            </div>

            {/* ── ZONE B: Configured Filters ── */}
            {activeLookups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13, border: '1.5px dashed var(--border)', borderRadius: 10 }}>
                Select filters from the palette above to configure them here
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 2 }}>
                  Configured Filters ({activeLookups.length})
                </div>

                {/* DB lookups & Date filters that are selected */}
                {Object.entries(filterMappings).filter(([, v]) => v?.selected).map(([op, fm]) => {
                  const isDate = fm.isDateFilter || op.includes('Date');
                  return (
                  <div key={op} style={{ border: `1.5px solid ${isDate ? '#2563eb' : 'var(--orange)'}`, borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: isDate ? 'rgba(37,99,235,.08)' : 'var(--orange-glow)', borderBottom: `1px solid ${isDate ? 'rgba(37,99,235,.2)' : 'rgba(249,115,22,.2)'}` }}>
                      <span style={{ fontSize: 13, fontWeight: 700, flex: 1, color: isDate ? '#2563eb' : 'var(--orange2)' }}>{op}</span>

                      {/* Filter type segment */}
                      <div style={{ display: 'flex', gap: 0, border: `1.5px solid ${isDate ? 'rgba(37,99,235,.4)' : 'rgba(249,115,22,.4)'}`, borderRadius: 7, overflow: 'hidden' }}>
                        {(isDate ? [
                          { val: 'range', label: '↔ Date Range' },
                          { val: 'asOf', label: '≤ As Of Date' },
                          { val: 'exact', label: '= Exact Date' }
                        ] : [
                          { val: 'range', label: '↔ Range' },
                          { val: 'exact', label: '= Exact' },
                          { val: 'like', label: '~ Like' }
                        ]).map(opt => {
                          const sel = (fm.filterType || 'range') === opt.val;
                          return (
                            <button key={opt.val} onClick={() => setFilterField(op, 'filterType', opt.val)} style={{
                              padding: '4px 10px', border: 'none', cursor: 'pointer',
                              background: sel ? (isDate ? '#2563eb' : 'var(--orange)') : 'transparent',
                              color: sel ? '#fff' : (isDate ? '#2563eb' : 'var(--orange2)'),
                              fontFamily: 'var(--font)', fontSize: '11px', fontWeight: sel ? 800 : 600,
                              borderRight: '1px solid var(--border)',
                              transition: 'all .12s'
                            }}>{opt.label}</button>
                          );
                        })}
                      </div>

                      <button onClick={() => toggleLookup(op)} title="Remove filter" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
                    </div>

                    {/* Field mapping body */}
                    <div style={{ padding: '12px 14px' }}>
                      {isDate && (
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ ...labelStyle, fontSize: 10 }}>Default Date Preset</label>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {[
                              { val: 'year_start', label: '📅 Year Start – Today' },
                              { val: 'month_start', label: '📅 Month Start – Today' },
                              { val: 'today', label: '📅 Today Only' },
                              { val: 'none', label: '⚪ No Default' }
                            ].map(p => {
                              const sel = (fm.defaultPreset || 'year_start') === p.val;
                              return (
                                <button key={p.val} onClick={() => setFilterField(op, 'defaultPreset', p.val)} style={{
                                  padding: '4px 10px', borderRadius: 6, fontSize: '11px', fontWeight: sel ? 700 : 500,
                                  border: `1px solid ${sel ? '#2563eb' : 'var(--border)'}`,
                                  background: sel ? '#2563eb' : 'var(--soft)',
                                  color: sel ? '#fff' : 'var(--text)', cursor: 'pointer'
                                }}>{p.label}</button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {(fm.filterType || 'range') === 'range' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ ...labelStyle, fontSize: 10 }}>From Param <span style={{ color: isDate ? '#2563eb' : 'var(--orange)', textTransform: 'none' }}>$.{isDate ? 'startDate' : 'fromXxx'}</span></label>
                            <input type="text" value={fm.fromParam || ''} onChange={e => setFilterField(op, 'fromParam', e.target.value)}
                              placeholder={isDate ? 'startDate' : 'fromItem'} style={{ ...monoStyle, fontSize: '12px', padding: '6px 10px' }}
                              onFocus={e => e.target.style.borderColor = isDate ? '#2563eb' : 'var(--orange)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                          </div>
                          <div>
                            <label style={{ ...labelStyle, fontSize: 10 }}>To Param <span style={{ color: isDate ? '#2563eb' : 'var(--orange)', textTransform: 'none' }}>$.{isDate ? 'endDate' : 'toXxx'}</span></label>
                            <input type="text" value={fm.toParam || ''} onChange={e => setFilterField(op, 'toParam', e.target.value)}
                              placeholder={isDate ? 'endDate' : 'toItem'} style={{ ...monoStyle, fontSize: '12px', padding: '6px 10px' }}
                              onFocus={e => e.target.style.borderColor = isDate ? '#2563eb' : 'var(--orange)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                          </div>
                          <div>
                            <label style={{ ...labelStyle, fontSize: 10 }}>Grid Date Column <span style={{ color: isDate ? '#2563eb' : 'var(--orange)', textTransform: 'none' }}>WHERE col</span></label>
                            <input type="text" value={fm.gridColumn || ''} onChange={e => setFilterField(op, 'gridColumn', e.target.value)}
                              placeholder={isDate ? 'TxnDate' : 'ItemCode'} style={{ ...monoStyle, fontSize: '12px', padding: '6px 10px' }}
                              onFocus={e => e.target.style.borderColor = isDate ? '#2563eb' : 'var(--orange)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ ...labelStyle, fontSize: 10 }}>Param Name <span style={{ color: isDate ? '#2563eb' : 'var(--orange)', textTransform: 'none' }}>$.paramName</span></label>
                            <input type="text" value={fm.singleParam || ''} onChange={e => setFilterField(op, 'singleParam', e.target.value)}
                              placeholder={isDate ? (fm.filterType === 'asOf' ? 'asOfDate' : 'singleDate') : 'itemCode'} style={{ ...monoStyle, fontSize: '12px', padding: '6px 10px' }}
                              onFocus={e => e.target.style.borderColor = isDate ? '#2563eb' : 'var(--orange)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                          </div>
                          <div>
                            <label style={{ ...labelStyle, fontSize: 10 }}>Grid Date Column <span style={{ color: isDate ? '#2563eb' : 'var(--orange)', textTransform: 'none' }}>WHERE col</span></label>
                            <input type="text" value={fm.gridColumn || ''} onChange={e => setFilterField(op, 'gridColumn', e.target.value)}
                              placeholder={isDate ? 'TxnDate' : 'ItemCode'} style={{ ...monoStyle, fontSize: '12px', padding: '6px 10px' }}
                              onFocus={e => e.target.style.borderColor = isDate ? '#2563eb' : 'var(--orange)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                          </div>
                        </div>
                      )}

                      {/* WHERE preview */}
                      {fm.gridColumn && (
                        (fm.filterType || 'range') === 'range'
                          ? fm.fromParam && fm.toParam && (
                              <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: '11px', color: '#16a34a', background: 'rgba(22,163,74,.07)', padding: '5px 10px', borderRadius: 6 }}>
                                WHERE {fm.gridColumn} &gt;= @{fm.fromParam} AND {fm.gridColumn} &lt;= @{fm.toParam}
                              </div>
                            )
                          : fm.filterType === 'asOf'
                          ? (
                              <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: '11px', color: '#16a34a', background: 'rgba(22,163,74,.07)', padding: '5px 10px', borderRadius: 6 }}>
                                WHERE {fm.gridColumn} &lt;= @{fm.singleParam || 'asOfDate'}
                              </div>
                            )
                          : fm.singleParam && (
                              <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: '11px', color: '#16a34a', background: 'rgba(22,163,74,.07)', padding: '5px 10px', borderRadius: 6 }}>
                                {fm.filterType === 'like'
                                  ? `WHERE ${fm.gridColumn} LIKE '%' + @${fm.singleParam} + '%'`
                                  : `WHERE ${fm.gridColumn} = @${fm.singleParam}`}
                              </div>
                            )
                      )}
                    </div>
                  </div>
                  );
                })}

                {/* Custom lookups */}
                {customLookups.map(l => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--soft)' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1 }}>🔍 {l} <span style={{ fontSize: 11, color: 'var(--muted)' }}>(custom)</span></span>
                    <button onClick={() => setCustomLookups(prev => prev.filter(x => x !== l))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Step 3: Fields (Simple CRUD mode only) -- drives both the SQL engine and the drawer form */}
          {pageMode === 'crud' && wizardStep === 3 && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              {stepBadge(3)}
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Fields</h3>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 2 }}>Define each writable column — no hand-written SQL or form code needed</div>
              </div>
              <button
                onClick={loadFieldsFromView}
                disabled={loadingFields || !viewQueryId}
                title={!viewQueryId ? 'Create the View first (Step 2)' : 'Load all columns from the view'}
                className="btn-secondary"
                style={{ height: 32, padding: '0 14px', fontSize: 12, opacity: (loadingFields || !viewQueryId) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {loadingFields
                  ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2, marginBottom: 0 }} /> Loading…</>
                  : '📥 Load Fields from View'}
              </button>
              <button onClick={addCrudField} className="btn-primary" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>+ Field</button>
            </div>

            {crudFields.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13, border: '1.5px dashed var(--border)', borderRadius: 10 }}>
                {viewQueryId
                  ? 'Click "Load Fields from View" to pull in all its columns, or add fields manually (mark exactly one as the Key)'
                  : 'Add at least one field (mark exactly one as the Key), or go back to Step 2 and create the view first to auto-load its columns'}
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ maxHeight: 420, overflowY: 'auto', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: 'var(--soft)', position: 'sticky', top: 0 }}>
                        <th style={thStyle}>Column Name</th>
                        <th style={thStyle}>JSON Key</th>
                        <th style={thStyle}>Label</th>
                        <th style={{ ...thStyle, width: 110 }}>Type</th>
                        <th style={{ ...thStyle, width: 76, textAlign: 'center' }}>Required</th>
                        <th style={{ ...thStyle, width: 60, textAlign: 'center' }}>Key</th>
                        <th style={{ ...thStyle, width: 84, textAlign: 'center' }}>Identity</th>
                        <th style={{ ...thStyle, width: 32 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {crudFields.map((f, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={tdStyle}>
                            <input type="text" value={f.columnName} onChange={e => updateCrudFieldColumnName(i, e.target.value)}
                              placeholder="ItemCode" style={cellInputMono} {...focus} />
                          </td>
                          <td style={tdStyle}>
                            <input type="text" value={f.jsonKey} onChange={e => updateCrudField(i, { jsonKey: e.target.value })}
                              placeholder="itemCode" style={cellInputMono} {...focus} />
                          </td>
                          <td style={tdStyle}>
                            <input type="text" value={f.label} onChange={e => updateCrudField(i, { label: e.target.value })}
                              placeholder="Item Code" style={cellInput} {...focus} />
                          </td>
                          <td style={tdStyle}>
                            <select value={f.dataType} onChange={e => updateCrudField(i, { dataType: e.target.value })}
                              style={{ ...cellInput, cursor: 'pointer' }}>
                              <option value="string">String</option>
                              <option value="number">Number</option>
                              <option value="date">Date</option>
                              <option value="bool">Bool</option>
                            </select>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <input type="checkbox" checked={f.isRequired} onChange={e => updateCrudField(i, { isRequired: e.target.checked })} />
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <input type="radio" name="crudKey" checked={f.isKey} onChange={() => setCrudFieldKey(i)} />
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <input type="checkbox" checked={f.isIdentity} disabled={!f.isKey} onChange={e => updateCrudField(i, { isIdentity: e.target.checked })} />
                          </td>
                          <td style={tdStyle}>
                            <button onClick={() => removeCrudField(i)} title="Remove field" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, lineHeight: 1 }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {crudFields.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button
                  onClick={handleRegisterCrudFieldsClick}
                  className="btn-primary"
                  disabled={registeringFields}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: registeringFields ? 0.6 : 1 }}
                >
                  {registeringFields
                    ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginBottom: 0 }} /> Registering…</>
                    : '⚙️ Register CRUD Fields'}
                </button>
              </div>
            )}
          </div>
          )}

          {/* Step 4: Review & Run (Simple CRUD mode only) */}
          {pageMode === 'crud' && wizardStep === 4 && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              {stepBadge(4)}
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Review & Run</h3>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 2 }}>Confirm everything below, then click "▶ Run All Phases" up top</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--muted)' }}>Page</span>
                <span style={{ fontWeight: 700 }}>
                  {icon} {pageName || '(untitled)'} <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', fontWeight: 400 }}>({pageId || '—'})</span>
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--muted)' }}>Parent Group</span>
                <span style={{ fontWeight: 700 }}>
                  {isNewGroup ? `${newGroupLabel || '(untitled)'} (new)` : (groups.find(g => g.PageGroupID === parentGroup)?.Label || parentGroup || '—')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--muted)' }}>Target Table</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>
                  {(() => {
                    const t = parseTargetTable(mainQuerySql);
                    return t.table ? `[${t.schema}].[${t.table}]` : '(not detected — go back to Data Setup)';
                  })()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                <span style={{ color: 'var(--muted)' }}>Fields</span>
                <span style={{ fontWeight: 700 }}>
                  {crudFields.length} defined
                  {crudFields.some(f => f.isKey)
                    ? ` (key: ${crudFields.find(f => f.isKey)?.columnName || '?'})`
                    : <span style={{ color: 'var(--red)' }}> — no key marked!</span>}
                </span>
              </div>
            </div>
          </div>
          )}

          {/* Wizard nav (Simple CRUD mode only) */}
          {pageMode === 'crud' && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => setWizardStep(s => Math.max(1, s - 1))}
                disabled={wizardStep === 1}
                className="btn-secondary"
                style={{ opacity: wizardStep === 1 ? 0.5 : 1 }}
              >
                ← Back
              </button>
              <button
                onClick={() => setWizardStep(s => Math.min(4, s + 1))}
                disabled={wizardStep === 4}
                className="btn-primary"
                style={{ opacity: wizardStep === 4 ? 0.5 : 1 }}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Execution Panel ── */}
        <div style={{ flex: '0.75', display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...cardStyle, position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              {['execution', 'prompt'].map(tab => (
                <button key={tab} onClick={() => setRightTab(tab)} style={{
                  flex: 1, padding: '10px 0', border: 'none', borderBottom: `2.5px solid ${rightTab === tab ? 'var(--orange)' : 'transparent'}`,
                  background: 'transparent', color: rightTab === tab ? 'var(--text)' : 'var(--muted)',
                  fontFamily: 'var(--font)', fontWeight: rightTab === tab ? 800 : 600, fontSize: 13, cursor: 'pointer',
                  transition: 'all .15s'
                }}>
                  {tab === 'execution' ? '⚡ Execution Log' : '🤖 AI Prompt'}
                </button>
              ))}
            </div>

            {/* ── EXECUTION LOG TAB ── */}
            {rightTab === 'execution' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {phases.map((phase, idx) => (
                  <div key={phase.id}>
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 4px',
                      borderLeft: `3px solid ${phaseStatusBorder[phase.status]}`,
                      paddingLeft: 12, marginLeft: 4,
                      background: phaseStatusBg[phase.status],
                      borderRadius: 8, marginBottom: 6,
                      transition: 'all .3s'
                    }}>
                      {/* Status indicator */}
                      <div style={{ marginTop: 2, width: 20, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                        <PhaseIcon status={phase.status} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 15 }}>{phase.icon}</span>
                          <span style={{ fontSize: '13.5px', fontWeight: 800, color: phaseStatusColor[phase.status] }}>
                            Phase {idx + 1}: {phase.label}
                          </span>
                        </div>
                        {phase.detail && (
                          <div style={{ fontSize: '12px', color: phaseStatusColor[phase.status], marginTop: 5, lineHeight: 1.5, opacity: .9 }}>
                            {phase.detail}
                          </div>
                        )}

                        {/* Extra content for SP snippet and Prompt phases */}
                        {phase.id === 'sp' && phase.status === 'done' && spSnippet && (
                          <div style={{ marginTop: 10 }}>
                            <pre style={{
                              background: '#18181b', color: '#86efac', padding: '12px',
                              borderRadius: 8, fontSize: '11.5px', fontFamily: 'var(--mono)',
                              whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: 220,
                              border: '1px solid rgba(255,255,255,.07)', margin: 0
                            }}>{spSnippet}</pre>
                            <button onClick={() => copyText(spSnippet, 'SP snippet')} className="btn-secondary"
                              style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                              📋 Copy SP Snippet
                            </button>
                          </div>
                        )}

                        {phase.id === 'prompt' && phase.status === 'done' && aiPrompt && (
                          <div style={{ marginTop: 10 }}>
                            <button onClick={() => copyText(aiPrompt, 'AI prompt')} className="btn-primary"
                              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                              📋 Copy AI Prompt
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {!isRunning && !isDone && (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>
                    Fill in the form and click <strong>▶ Run All Phases</strong>
                  </div>
                )}

                {isDone && (
                  <button onClick={resetExecution} className="btn-secondary"
                    style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    🔄 Reset & Build Another Page
                  </button>
                )}
              </div>
            )}

            {/* ── AI PROMPT TAB ── */}
            {rightTab === 'prompt' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {aiPrompt ? (
                  <>
                    <pre style={{
                      background: '#18181b', color: '#e4e4e7', padding: '16px', borderRadius: 12,
                      overflow: 'auto', fontSize: '12.5px', fontFamily: 'var(--mono)',
                      whiteSpace: 'pre-wrap', border: '1px solid rgba(255,255,255,.06)',
                      lineHeight: 1.65, margin: 0, maxHeight: 'calc(100vh - 280px)'
                    }}>{aiPrompt}</pre>
                    <button onClick={() => copyText(aiPrompt, 'AI prompt')} className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', height: 40 }}>
                      📋 Copy Prompt to Clipboard
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>
                    Run all phases first to generate the AI prompt.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
