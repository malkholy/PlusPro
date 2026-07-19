import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import EmployeeDrawer from './EmployeeDrawer.jsx';

const DEFAULT_AVATAR = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

// Helper for formatting date strings
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Helper to format currency values using M and K abbreviations
function formatCurrency(val) {
  if (val == null || val === '') return '—';
  const num = Number(val);
  if (isNaN(num)) return val;
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M EGP';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.?0+$/, '') + 'K EGP';
  }
  return num + ' EGP';
}

// Helper to format raw numbers with M and K abbreviations without currency suffix
function formatNumberAbbr(val) {
  if (val == null || val === '') return '—';
  const num = Number(val);
  if (isNaN(num)) return val;
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.?0+$/, '') + 'K';
  }
  return num.toString();
}

// Helper for department card background gradients
function getDeptGradient(index) {
  const gradients = [
    'linear-gradient(135deg, #f97316, #ea580c)', // Orange
    'linear-gradient(135deg, #3b82f6, #1d4ed8)', // Blue
    'linear-gradient(135deg, #10b981, #047857)', // Emerald
    'linear-gradient(135deg, #6366f1, #4338ca)', // Indigo
    'linear-gradient(135deg, #ec4899, #be185d)', // Pink
    'linear-gradient(135deg, #8b5cf6, #6d28d9)', // Purple
    'linear-gradient(135deg, #06b6d4, #0e7490)', // Cyan
    'linear-gradient(135deg, #f59e0b, #b45309)'  // Amber
  ];
  return gradients[index % gradients.length];
}

const DEPARTMENT_GROUPS_MAPPING = {
  'Sales & Marketing': [
    'ادارة المبيعات',
    'ادارة التسويق',
    'ادارة البيع المباشر',
    'ادارة مبيعات المشروعات',
    'ادارة دعم المبيعات',
    'الادارة التجارية للتصدير',
    'ادارة مراكز التلوين',
    'منسق لوجيستيات المنتج التام',
    'ادارة اللوجيستيات المنتج التام'
  ],
  'Operations & Production': [
    'ادارة الانتاج',
    'ادارة العمليات',
    'الادارة الفنية للدهانات',
    'ادارة الصيانة',
    'ادارة المعامل',
    'ادرة الانتاج',
    'اداة الانتاج',
    'ادارة التخطيط'
  ],
  'Warehousing': [
    'ادارة مخازن المنتج التام والتحميل',
    'ادارة مخزن المواد الخام',
    'ادارة مخزن PR1',
    'ادارة مخزن الهدايا',
    '9R1 ادارة مخزن',
    'ادارة مخازن المنتج اتام والتحميل'
  ],
  'Logistics & Procurement': [
    'ادارة اللوجيستيات الواردة',
    'ادارة  اللوجيستيات الواردة',
    'ادارة المشتريات'
  ],
  'Corporate Services & HR': [
    'الادارة العليا',
    'ادارة الموارد البشرية',
    'علاقات حكومية',
    'TESTER1'
  ],
  'Services': [
    'ادارة الخدمات'
  ],
  'Security': [
    'ادارة الأمن'
  ],
  'Finance': [
    'الادارة المالية'
  ],
  'IT': [
    'ادارة النظم والمعلومات'
  ],
  'Projects & Construction': [
    'ادارة مشاريع الانشاءات'
  ],
  'HSE (Safety & Health)': [
    'السلامة والصحة المهنية والبيئة',
    'ادارة توكيد الجودة والسلامة والصحة المهنية  والبيئة'
  ]
};

const DEPARTMENT_GROUP_ICONS = {
  'Sales & Marketing': '📢',
  'Operations & Production': '⚙️',
  'Warehousing': '📦',
  'Logistics & Procurement': '🚚',
  'Corporate Services & HR': '🏢',
  'Security': '🔒',
  'Services': '🛎️',
  'Finance': '💵',
  'IT': '💻',
  'Projects & Construction': '🏗️',
  'HSE (Safety & Health)': '🛡️'
};

function getGroupForDept(deptName) {
  if (!deptName) return 'Corporate Services & HR';
  const nameTrim = deptName.trim();
  
  // Clean corrupt characters / multiple spaces
  const cleanName = nameTrim.replace(/[\uFFFD\u0000-\u001F]/g, '').replace(/\s+/g, ' ');
  
  // Direct matching
  for (const [groupName, depts] of Object.entries(DEPARTMENT_GROUPS_MAPPING)) {
    if (depts.includes(cleanName)) {
      return groupName;
    }
  }

  // Substring fallback checks for robustness against database encoding corruption
  if (cleanName.includes('الانتاج') || cleanName.includes('المعامل') || cleanName.includes('الصيانة') || cleanName.includes('العمليات') || cleanName.includes('الفنية للدهانات') || cleanName.includes('انتاج')) {
    return 'Operations & Production';
  }
  if (cleanName.includes('المبيعات') || cleanName.includes('التسويق') || cleanName.includes('البيع المباشر') || cleanName.includes('تصدير') || cleanName.includes('التلوين') || cleanName.includes('التجارية') || cleanName.includes('مبيعات') || cleanName.includes('منسق لوجيستيات المنتج التام') || cleanName.includes('اللوجيستيات المنتج التام')) {
    return 'Sales & Marketing';
  }
  if (cleanName.includes('مخزن') || cleanName.includes('مخازن') || cleanName.includes('التحميل')) {
    return 'Warehousing';
  }
  if (cleanName.includes('اللوجيستيات') || cleanName.includes('واردة') || cleanName.includes('المشتريات')) {
    return 'Logistics & Procurement';
  }
  if (cleanName.includes('الأمن') || cleanName.includes('الامن')) {
    return 'Security';
  }
  if (cleanName.includes('الخدمات')) {
    return 'Services';
  }
  if (cleanName.includes('الموارد البشرية') || cleanName.includes('علاقات حكومية') || cleanName.includes('العليا') || cleanName.includes('TESTER')) {
    return 'Corporate Services & HR';
  }
  if (cleanName.includes('المالية')) {
    return 'Finance';
  }
  if (cleanName.includes('التخطيط')) {
    return 'Operations & Production';
  }
  if (cleanName.includes('النظم') || cleanName.includes('المعلومات')) {
    return 'IT';
  }
  if (cleanName.includes('انشاءات') || cleanName.includes('مشاريع')) {
    return 'Projects & Construction';
  }
  if (cleanName.includes('السلامة') || cleanName.includes('الصحة') || cleanName.includes('البيئة') || cleanName.includes('الجودة')) {
    return 'HSE (Safety & Health)';
  }

  return 'Corporate Services & HR';
}

function TreeNode({ node, onSelectEmployee, formatCurrency, onSelectPhoto, layout = 'horizontal', level = 1 }) {
  const [expanded, setExpanded] = useState(true);
  const displayName = node.Fullname || node.FullName || `Employee #${node.EmployeeID}`;
  const initialLetters = displayName
    ? displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'EMP';
  const hasPhoto = node.ImagePhoto && !node.ImagePhoto.endsWith('/-0.jpg') && !node.ImagePhoto.endsWith('/0-0.jpg');

  const hasChildren = node.children && node.children.length > 0;
  const isVertical = layout === 'vertical';
  const isVerticalRoot = isVertical && level === 1;
  const isVerticalSub = isVertical && level >= 2;

  return (
    <div className={isVerticalRoot ? "hr-tree-row-vertical-root" : (isVerticalSub ? "hr-tree-row-vertical-sub" : "hr-tree-row")}>
      <div 
        className={`${isVerticalRoot ? "hr-tree-node-wrapper-vertical-root" : (isVerticalSub ? "hr-tree-node-wrapper-vertical-sub" : "hr-tree-node-wrapper")} ${hasChildren && expanded ? 'has-expanded-children' : ''}`}
        style={{ width: isVertical ? 220 : 260, flexShrink: 0 }}
      >
        {/* Node Box */}
        <div 
          onClick={() => onSelectEmployee(node.EmployeeID)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: node.IsManger === 1 ? 'var(--surface)' : 'var(--soft)',
            border: node.IsManger === 1 ? '1px solid var(--orange)' : '1px solid var(--border)',
            borderRadius: 'var(--radius-xs)',
            padding: '10px 14px',
            cursor: 'pointer',
            boxShadow: node.IsManger === 1 ? '0 2px 8px rgba(249, 115, 22, 0.06)' : 'var(--shadow-sm)',
            transition: 'all 0.2s ease',
            width: '100%',
            position: 'relative'
          }}
          className="hover-row"
        >
          {/* Photo Avatar */}
          <img 
            src={hasPhoto ? node.ImagePhoto : DEFAULT_AVATAR}
            alt={displayName}
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '1px solid var(--border)', cursor: 'zoom-in', flexShrink: 0 }}
            onClick={(e) => { e.stopPropagation(); onSelectPhoto(hasPhoto ? node.ImagePhoto : DEFAULT_AVATAR, displayName); }}
            onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.3' }} title={displayName}>
                {displayName}
              </span>
              {node.IsManger === 1 && (
                <span style={{
                  fontSize: '8px',
                  fontWeight: '800',
                  background: 'rgba(249, 115, 22, 0.08)',
                  color: 'var(--orange)',
                  border: '1px solid var(--orange)',
                  padding: '0.5px 4px',
                  borderRadius: '2px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Mgr
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2, fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>💼 {node.JobName || '—'}</span>
              <span style={{ color: 'var(--orange)', fontWeight: 700 }}>💵 {formatCurrency(node.SalaryAmount)}</span>
            </div>
          </div>

          {/* Toggle Expand/Collapse Button */}
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              style={{
                background: 'var(--soft)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 11,
                color: 'var(--text)',
                padding: 0,
                marginLeft: 4,
                flexShrink: 0
              }}
            >
              {expanded ? '−' : '+'}
            </button>
          )}
        </div>
      </div>

      {/* Children Sub-nodes */}
      {hasChildren && expanded && (
        <div className={isVerticalRoot ? "hr-tree-children-vertical-row" : (isVerticalSub ? "hr-tree-children-vertical-col" : "hr-tree-children")}>
          {node.children.map(child => (
            <div key={child.EmployeeID} className={isVerticalRoot ? "hr-tree-child-item-vertical-row" : (isVerticalSub ? "hr-tree-child-item-vertical-col" : "hr-tree-child-item")}>
              <TreeNode 
                node={child} 
                onSelectEmployee={onSelectEmployee}
                formatCurrency={formatCurrency}
                onSelectPhoto={onSelectPhoto}
                layout={layout}
                level={level + 1}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HR({ user, def, onBack }) {
  const [directoryViewMode, setDirectoryViewMode] = useState('grid'); // 'grid' or 'tree'
  const [treeLayout, setTreeLayout] = useState('horizontal'); // 'horizontal' or 'vertical'

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Autocomplete search states
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const searchRef = React.useRef(null);

  // Data State
  const [employees, setEmployees] = useState([]);
  const [selectedDeptGroup, setSelectedDeptGroup] = useState(null);
  const [selectedSubDept, setSelectedSubDept] = useState('All');
  const [kpis, setKpis] = useState({
    ActiveWorkerNormal: 0,
    TerminationsThisYear: 0,
    TotalSalary: 0,
    TurnoverRate: 0,
    JoinedThisYear: 0,
    LeavesToday: 0,
    MissionsToday: 0
  });

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmployeeID, setSelectedEmployeeID] = useState(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState(null);
  const [kpiDrawerMode, setKpiDrawerMode] = useState(null); // 'leaves' | 'missions' | null

  // Load dashboard data from SQL backend
  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('Get HR Dashboard Data', {}, {}, 'hr');
      const dataList = res.List0 || (Array.isArray(res) ? res : []);
      setEmployees(dataList);

      const summaryList = res.List1 || [];
      if (summaryList.length > 0) {
        setKpis(summaryList[0]);
      } else {
        // Fallback: calculate client-side if List1 is empty
        const activeWN = dataList.filter(e => e.EmployeeCurrentStauts === 'Working' && (e.GroupCode1 === 'Worker' || e.GroupCode1 === 'Normal Employee')).length;
        const currentYear = new Date().getFullYear();
        const terms = dataList.filter(e => {
          if (!e.LeavingDate) return false;
          const d = new Date(e.LeavingDate);
          return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
        }).length;
        const joined = dataList.filter(e => {
          if (!e.JoiningDate) return false;
          const d = new Date(e.JoiningDate);
          return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
        }).length;
        const turn = activeWN > 0 ? ((terms / activeWN) * 100).toFixed(1) : 0;
        setKpis({
          ActiveWorkerNormal: activeWN,
          TerminationsThisYear: terms,
          TotalSalary: 0,
          TurnoverRate: turn,
          JoinedThisYear: joined,
          LeavesToday: 0,
          MissionsToday: 0
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load Human Resources data.');
    }
    setLoading(false);
  }

  // Load once on mount
  useEffect(() => {
    loadData();
  }, []);

  // Handle Search Input Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  // Dynamic Lists extracted from fetched data
  const branches = React.useMemo(() => {
    const list = employees.map(e => e.BranchName).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [employees]);

  const departments = React.useMemo(() => {
    const list = employees.map(e => e.DepartmentName).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [employees]);

  const statuses = React.useMemo(() => {
    const list = employees.map(e => e.EmployeeCurrentStauts).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [employees]);

  const types = React.useMemo(() => {
    const list = employees.map(e => e.GroupCode1).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [employees]);

  // Handle click outside to close quick search autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Matching autocomplete employees for search popover (max 10 results)
  const autocompleteResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return employees.filter(emp => {
      const idStr = String(emp.EmployeeID || '');
      const name = String(emp.Fullname || emp.FullName || '').toLowerCase();
      const branch = String(emp.BranchName || '').toLowerCase();
      const dept = String(emp.DepartmentName || '').toLowerCase();
      const job = String(emp.JobName || '').toLowerCase();
      const division = String(emp.DivisionName || '').toLowerCase();
      return idStr.includes(q) || name.includes(q) || branch.includes(q) || dept.includes(q) || job.includes(q) || division.includes(q);
    }).slice(0, 10);
  }, [employees, searchQuery]);

  const handleSelectAutocomplete = (empID) => {
    setSelectedEmployeeID(empID);
    setSearchFocused(false);
  };

  const handleSearchKeyDown = (e) => {
    if (autocompleteResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSearchIndex(prev => (prev + 1) % autocompleteResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSearchIndex(prev => (prev - 1 + autocompleteResults.length) % autocompleteResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSearchIndex >= 0 && autocompleteResults[activeSearchIndex]) {
        handleSelectAutocomplete(autocompleteResults[activeSearchIndex].EmployeeID);
      }
    } else if (e.key === 'Escape') {
      setSearchFocused(false);
    }
  };

  // Client-Side Filtered Employees List
  const filteredEmployees = React.useMemo(() => {
    return employees.filter(emp => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idStr = String(emp.EmployeeID || '');
        const name = String(emp.Fullname || emp.FullName || '').toLowerCase();
        const branch = String(emp.BranchName || '').toLowerCase();
        const dept = String(emp.DepartmentName || '').toLowerCase();
        const job = String(emp.JobName || '').toLowerCase();
        const division = String(emp.DivisionName || '').toLowerCase();
        if (!idStr.includes(q) && !name.includes(q) && !branch.includes(q) && !dept.includes(q) && !job.includes(q) && !division.includes(q)) {
          return false;
        }
      }
      // 2. Branch Filter
      if (selectedBranch !== 'All' && selectedBranch !== '') {
        if (emp.BranchName !== selectedBranch) return false;
      }
      // 3. Department Filter
      if (selectedDept !== 'All' && selectedDept !== '') {
        if (emp.DepartmentName !== selectedDept) return false;
      }
      // 4. Status Filter
      if (selectedState !== 'All' && selectedState !== '') {
        if (emp.EmployeeCurrentStauts !== selectedState) return false;
      }
      // 5. Employee Type Filter
      if (selectedType !== 'All' && selectedType !== '') {
        if (emp.GroupCode1 !== selectedType) return false;
      }
      return true;
    });
  }, [employees, searchQuery, selectedBranch, selectedDept, selectedState, selectedType]);

  // Group filtered employees by aggregated Department Group for Directory drill-down
  const departmentGroups = React.useMemo(() => {
    const groups = {};
    
    // Pre-initialize mapped groups to maintain a consistent executive order
    const orderedGroups = [
      'Sales & Marketing',
      'Operations & Production',
      'Warehousing',
      'Logistics & Procurement',
      'Corporate Services & HR',
      'Security',
      'Services',
      'Finance',
      'IT',
      'Projects & Construction',
      'HSE (Safety & Health)'
    ];
    
    orderedGroups.forEach(gName => {
      groups[gName] = {
        name: gName,
        count: 0,
        totalSalary: 0
      };
    });

    filteredEmployees.forEach(emp => {
      const gName = getGroupForDept(emp.DepartmentName);
      if (groups[gName]) {
        groups[gName].count += 1;
        groups[gName].totalSalary += Number(emp.SalaryAmount || 0);
      }
    });

    return Object.values(groups);
  }, [filteredEmployees]);

  // Table grid distribution data calculated dynamically
  const departmentTableData = React.useMemo(() => {
    const groups = {};
    const orderedGroups = [
      'Sales & Marketing',
      'Operations & Production',
      'Warehousing',
      'Logistics & Procurement',
      'Corporate Services & HR',
      'Security',
      'Services',
      'Finance',
      'IT',
      'Projects & Construction',
      'HSE (Safety & Health)'
    ];
    
    orderedGroups.forEach(gName => {
      groups[gName] = {
        name: gName,
        activeCount: 0,
        terminationCount: 0,
        totalSalary: 0
      };
    });

    filteredEmployees.forEach(emp => {
      const gName = getGroupForDept(emp.DepartmentName);
      if (groups[gName]) {
        const isActive = emp.EmployeeCurrentStauts === 'Working';
        if (isActive) {
          groups[gName].activeCount += 1;
          groups[gName].totalSalary += Number(emp.SalaryAmount || 0);
        } else {
          groups[gName].terminationCount += 1;
        }
      }
    });

    return Object.values(groups).sort((a, b) => b.totalSalary - a.totalSalary);
  }, [filteredEmployees]);

  // Total salary across all department groups for percentage calculation
  const totalDeptSalary = React.useMemo(() => {
    return departmentTableData.reduce((sum, d) => sum + d.totalSalary, 0);
  }, [departmentTableData]);

  // Extract unique sub-departments within the selected group from the filtered employees list
  const subDeptsInGroup = React.useMemo(() => {
    if (!selectedDeptGroup) return [];
    // Get unique raw department names belonging to the selected group
    const list = filteredEmployees
      .filter(emp => getGroupForDept(emp.DepartmentName) === selectedDeptGroup)
      .map(emp => (emp.DepartmentName || '').trim())
      .filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [filteredEmployees, selectedDeptGroup]);

  // Dynamic Statistics computed from currently filtered employees for real-time visual charts update
  const departmentStats = React.useMemo(() => {
    const counts = {};
    filteredEmployees.forEach(e => {
      const dName = e.DepartmentName || 'Unknown';
      counts[dName] = (counts[dName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        pct: filteredEmployees.length > 0 ? ((count / filteredEmployees.length) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEmployees]);

  const branchStats = React.useMemo(() => {
    const data = {};
    filteredEmployees.forEach(e => {
      const bName = e.BranchName || 'Unknown';
      if (!data[bName]) {
        data[bName] = { count: 0, totalSalary: 0 };
      }
      data[bName].count += 1;
      data[bName].totalSalary += Number(e.SalaryAmount || 0);
    });
    return Object.entries(data)
      .map(([name, info]) => ({
        name,
        count: info.count,
        totalSalary: info.totalSalary,
        pct: filteredEmployees.length > 0 ? ((info.count / filteredEmployees.length) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEmployees]);

  const divisionStats = React.useMemo(() => {
    const counts = {};
    filteredEmployees.forEach(e => {
      const divName = e.DivisionName || 'Unknown';
      counts[divName] = (counts[divName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        pct: filteredEmployees.length > 0 ? ((count / filteredEmployees.length) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEmployees]);

  // Top Management Executive KPIs computed dynamically from total (unfiltered) list
  const totalEmployeesCount = employees.length;
  const activeEmployeesCount = React.useMemo(() => {
    return employees.filter(e => e.EmployeeCurrentStauts === 'Working').length;
  }, [employees]);
  const uniqueDeptsCount = departments.length;
  const uniqueBranchesCount = branches.length;

  // Drill-down employees and stats (changes dynamically by department group and sub-department)
  const drillDownEmployees = React.useMemo(() => {
    if (!selectedDeptGroup) return [];
    return filteredEmployees.filter(emp => 
      getGroupForDept(emp.DepartmentName) === selectedDeptGroup && 
      (selectedSubDept === 'All' || (emp.DepartmentName || '').trim() === selectedSubDept)
    );
  }, [filteredEmployees, selectedDeptGroup, selectedSubDept]);

  const drillDownStats = React.useMemo(() => {
    const count = drillDownEmployees.length;
    const totalSalary = drillDownEmployees.reduce((sum, emp) => sum + Number(emp.SalaryAmount || 0), 0);
    return { count, totalSalary };
  }, [drillDownEmployees]);

  const employeeTree = React.useMemo(() => {
    // 1. Map all employees by EmployeeID for O(1) access
    const map = {};
    drillDownEmployees.forEach(emp => {
      map[emp.EmployeeID] = { ...emp, children: [] };
    });

    const roots = [];

    // 2. Build hierarchy
    drillDownEmployees.forEach(emp => {
      const node = map[emp.EmployeeID];
      const managerId = emp.ManagerID;
      
      if (managerId && map[managerId]) {
        // Parent exists in the current view mapping, push as child
        map[managerId].children.push(node);
      } else {
        // Parent does not exist or is 0, so this node is a root of our tree
        roots.push(node);
      }
    });

    // 3. Helper to sort children (managers first, then alphabetical)
    const sortTreeNodes = (nodes) => {
      nodes.sort((a, b) => {
        const isMgrA = a.IsManger === 1 ? 0 : 1;
        const isMgrB = b.IsManger === 1 ? 0 : 1;
        if (isMgrA !== isMgrB) return isMgrA - isMgrB;

        const nameA = (a.Fullname || a.FullName || '').toLowerCase();
        const nameB = (b.Fullname || b.FullName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortTreeNodes(node.children);
        }
      });
    };

    sortTreeNodes(roots);
    return roots;
  }, [drillDownEmployees]);

  return (
    <div>
      {/* Localized CSS for Print Layout and styling */}
      <style>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .hr-directory-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }
        @media (max-width: 1024px) {
          .hr-directory-grid {
            grid-template-columns: 1fr;
          }
        }
        .hr-kpi-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 16px; margin-bottom: 20px; }
        @media (max-width: 1200px) {
          .hr-kpi-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 768px) {
          .hr-kpi-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .hr-kpi-grid { grid-template-columns: 1fr; }
        }
        .hr-drilldown-kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px; }
        
        /* Horizontal tree layout styles */
        .hr-tree-container {
          display: flex;
          flex-direction: column;
          gap: 32px;
          overflow-x: auto;
          padding: 20px 10px;
          width: 100%;
        }
        .hr-tree-row {
          display: flex;
          align-items: flex-start;
          gap: 40px;
          position: relative;
        }
        .hr-tree-node-wrapper {
          display: flex;
          align-items: center;
          position: relative;
        }
        .hr-tree-children {
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          padding-left: 24px;
        }
        .hr-tree-node-wrapper::after {
          content: '';
          position: absolute;
          right: -40px;
          top: 50%;
          width: 40px;
          height: 2px;
          background: var(--border);
          display: none;
        }
        .hr-tree-node-wrapper.has-expanded-children::after {
          display: block;
        }
        .hr-tree-children::before {
          content: '';
          position: absolute;
          left: 0;
          top: 25px;
          bottom: 25px;
          width: 2px;
          background: var(--border);
        }
        .hr-tree-child-item {
          position: relative;
        }
        .hr-tree-child-item::before {
          content: '';
          position: absolute;
          left: -24px;
          top: 25px;
          width: 24px;
          height: 2px;
          background: var(--border);
        }

        /* Vertical tree layout styles */
        /* Level 1: Root (Vertical Root Layout, centering Level 2 horizontally) */
        .hr-tree-row-vertical-root {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }
        .hr-tree-node-wrapper-vertical-root {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .hr-tree-node-wrapper-vertical-root::after {
          content: '';
          position: absolute;
          bottom: -20px;
          left: 50%;
          width: 2px;
          height: 20px;
          background: var(--border);
          display: none;
          transform: translateX(-50%);
        }
        .hr-tree-node-wrapper-vertical-root.has-expanded-children::after {
          display: block;
        }
        .hr-tree-children-vertical-row {
          display: flex;
          flex-direction: row;
          justify-content: center;
          gap: 32px;
          position: relative;
          padding-top: 20px;
          margin-top: 20px;
        }
        .hr-tree-children-vertical-row::before {
          content: '';
          position: absolute;
          top: 0;
          left: 110px; /* Center of first child node (width 220px) */
          right: 110px; /* Center of last child node (width 220px) */
          height: 2px;
          background: var(--border);
        }
        .hr-tree-child-item-vertical-row {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .hr-tree-child-item-vertical-row::before {
          content: '';
          position: absolute;
          top: -20px;
          left: 50%;
          width: 2px;
          height: 20px;
          background: var(--border);
          transform: translateX(-50%);
        }

        /* Level 2 & Deeper: Sub-levels (stacked vertically in nested columns) */
        .hr-tree-row-vertical-sub {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          position: relative;
        }
        .hr-tree-node-wrapper-vertical-sub {
          display: flex;
          align-items: center;
          position: relative;
        }
        .hr-tree-node-wrapper-vertical-sub::after {
          content: '';
          position: absolute;
          bottom: -20px;
          left: 110px; /* Center of parent node (width 220px) */
          width: 2px;
          height: 20px;
          background: var(--border);
          display: none;
        }
        .hr-tree-node-wrapper-vertical-sub.has-expanded-children::after {
          display: block;
        }
        .hr-tree-children-vertical-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          padding-left: 20px;
          margin-left: 110px; /* Indent children under parent node's center line */
          margin-top: 20px;
        }
        .hr-tree-children-vertical-col::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 25px; /* Connects to horizontal connector of last child */
          width: 2px;
          background: var(--border);
        }
        .hr-tree-child-item-vertical-col {
          position: relative;
        }
        .hr-tree-child-item-vertical-col::before {
          content: '';
          position: absolute;
          left: -20px;
          top: 25px; /* Aligns with center of child node */
          width: 20px;
          height: 2px;
          background: var(--border);
        }

        .hr-filter-bar { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 20px; margin-bottom: 20px; box-shadow: var(--shadow); }
        .hr-search-form { display: flex; gap: 8px; flex: 1; min-width: 250px; }
        .hr-search-input { flex: 1; height: 32px; border: 1.5px solid var(--border); border-radius: var(--radius-xs); padding: 0 12px; background: var(--soft); color: var(--text); outline: none; font-size: 13px; font-family: var(--font); }
        .hr-search-input:focus { border-color: var(--orange); }
        
        /* Sub-tab switcher styling */
        .hr-tab-switcher { display: inline-flex; background: var(--soft); border: 1px solid var(--border); border-radius: 30px; padding: 4px; gap: 4px; }
        .hr-tab-btn { border: none; background: transparent; padding: 8px 22px; font-size: 13px; font-weight: 700; font-family: var(--font); color: var(--muted); border-radius: 25px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease; }
        .hr-tab-btn:hover { color: var(--text); }
        .hr-tab-btn.active { background: linear-gradient(135deg, var(--orange), var(--orange2)); color: #fff; box-shadow: 0 4px 10px rgba(249, 115, 22, 0.2); }
        
        /* Insights panel styling */
        .hr-insights-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .insight-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow); display: flex; flex-direction: column; }
        .insight-title { font-size: 14px; font-weight: 800; color: var(--text); margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
        .insight-list { display: flex; flex-direction: column; gap: 12px; flex: 1; }
        .insight-row { display: flex; flex-direction: column; gap: 4px; }
        .insight-row-info { display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 600; }
        .insight-row-label { color: var(--text); }
        .insight-row-val { color: var(--muted); }
        .insight-progress-container { height: 8px; background: var(--soft); border-radius: 4px; overflow: hidden; position: relative; border: 1px solid var(--border); }
        .insight-progress-bar { height: 100%; border-radius: 4px; transition: width 0.6s ease; }

        /* Department Grid & Cards for drill-down view */
        .hr-dept-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 1100px) {
          .hr-dept-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .hr-dept-grid {
            grid-template-columns: 1fr;
          }
          .hr-drilldown-kpi-grid {
            grid-template-columns: 1fr;
          }
        }
        .hr-dept-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: var(--shadow-sm);
        }
        .hr-dept-card:hover {
          transform: translateY(-4px);
          border-color: var(--orange);
          box-shadow: 0 12px 28px rgba(249, 115, 22, 0.12);
        }
        .hr-dept-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #ffffff !important;
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          box-shadow: var(--shadow-sm);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hr-dept-card:hover .hr-dept-card-icon {
          border-color: var(--orange);
          transform: scale(1.06);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.15);
        }
        .hr-dept-card-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }
        .hr-dept-card-name {
          font-size: 14px;
          font-weight: 800;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        .hr-dept-card-count {
          font-size: 11.5px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #10b981;
          background: rgba(16, 185, 129, 0.08);
          padding: 3px 10px;
          border-radius: 20px;
          width: fit-content;
        }
        .hr-dept-pulse {
          width: 6px;
          height: 6px;
          background-color: #10b981;
          border-radius: 50%;
          display: inline-block;
          animation: pulse-grow 1.8s infinite ease-in-out;
        }
        @keyframes pulse-grow {
          0% { transform: scale(0.85); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.85); opacity: 0.6; }
        }
        .hr-dept-card-arrow {
          font-size: 16px;
          color: var(--muted);
          display: flex;
          align-items: center;
          transition: all 0.25s ease;
        }
        .hr-dept-card:hover .hr-dept-card-arrow {
          transform: translateX(4px);
          color: var(--orange);
        }

        /* Side tabs and layout styles for drill-down view */
        .hr-drilldown-layout {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          width: 100%;
        }
        .hr-side-tabs {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 230px;
          flex-shrink: 0;
          background: var(--soft);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px;
        }
        .hr-side-tab-btn {
          border: 1.5px solid transparent;
          background: transparent;
          padding: 8px 12px;
          font-size: 12.5px;
          font-weight: 700;
          font-family: var(--font);
          color: var(--muted);
          border-radius: var(--radius-xs);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          width: 100%;
        }
        .hr-side-tab-btn:hover {
          color: var(--text);
          background: var(--surface);
          border-color: var(--border);
        }
        .hr-side-tab-btn.active {
          background: rgba(249, 115, 22, 0.08) !important;
          border-color: var(--orange) !important;
          color: var(--orange) !important;
        }
        .hr-side-tab-count {
          font-size: 11px;
          font-weight: 700;
          color: var(--muted);
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 1px 6px;
          border-radius: 12px;
          transition: all 0.2s ease;
        }
        .hr-side-tab-btn.active .hr-side-tab-count {
          background: var(--orange) !important;
          color: #ffffff !important;
          border-color: var(--orange) !important;
        }
        .hr-table-container {
          flex: 1;
          min-width: 0;
        }
        @media (max-width: 768px) {
          .hr-drilldown-layout {
            flex-direction: column;
          }
          .hr-side-tabs {
            width: 100%;
            flex-direction: row;
            overflow-x: auto;
            white-space: nowrap;
          }
          .hr-side-tab-btn {
            width: auto;
          }
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 12mm 15mm;
          }
          
          /* Hide non-printable elements */
          .sidebar,
          .topbar,
          .no-print,
          .tab-buttons,
          .client-drawer,
          .client-drawer-backdrop,
          .client-drawer-container,
          .hr-filter-bar,
          .hr-tab-switcher,
          .hr-back-breadcrumb {
            display: none !important;
          }
          
          /* Full width layout print */
          .main {
            margin-left: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background: #fff !important;
          }
          
          .page-area {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-title {
            display: block !important;
            margin-bottom: 12px !important;
          }

          /* KPI layout in landscape print */
          .hr-kpi-grid {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            gap: 12px !important;
            margin-bottom: 20px !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .hr-drilldown-kpi-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
            margin-bottom: 20px !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .kpi-card {
            border: 1px solid var(--border) !important;
            background: var(--surface) !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .hr-insights-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 12px !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .insight-card {
            border: 1px solid var(--border) !important;
            background: var(--surface) !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .panel {
            border: 1px solid var(--border) !important;
            background: var(--surface) !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .panel-body {
            overflow: visible !important;
            max-height: none !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>

      {/* Print-Only Title */}
      <div className="print-title" style={{ display: 'none' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0' }}>👥 Human Resources Employee Directory</h1>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', margin: '0 0 12px 0' }}>
          Active Filters Report
        </div>
      </div>

      {/* Header breadcrumb & title */}
      <div className="page-header no-print">
        <div>
          <div className="page-sub hr-back-breadcrumb" style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
            <span style={{ color: 'var(--orange)', cursor: 'pointer' }} onClick={onBack}>Control Page</span>
            <span style={{ margin: '0 6px' }}>›</span><span>HR Directory</span>
          </div>
          <div className="page-title">👥 Human Resources Dashboard</div>
        </div>
        <button className="btn-primary" onClick={loadData} style={{ height: 32, fontSize: 12 }}>🔄 Refresh</button>
      </div>

      {error && <div className="err-page">⚠ {error}</div>}

      {/* KPI Cards Grid */}
      <div className="hr-kpi-grid">
        {/* KPI 1: Active Employees (Worker and Normal) */}
        <div className="kpi-card">
          <div className="kpi-label">Active Staff (W & N)</div>
          <div className="kpi-value" style={{ color: 'var(--green)' }}>
            {loading ? '—' : kpis.ActiveWorkerNormal}
          </div>
          <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 8 }}>
            Workers & Normal Staff
          </div>
        </div>

        {/* KPI 2: Total Joined This Year */}
        <div className="kpi-card">
          <div className="kpi-label">Joined This Year</div>
          <div className="kpi-value" style={{ color: '#8b5cf6' }}>
            {loading ? '—' : kpis.JoinedThisYear}
          </div>
          <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 8 }}>
            New Hires in {new Date().getFullYear()}
          </div>
        </div>

        {/* KPI 3: Total Termination This Year */}
        <div className="kpi-card">
          <div className="kpi-label">Terminations This Year</div>
          <div className="kpi-value" style={{ color: 'var(--red)' }}>
            {loading ? '—' : kpis.TerminationsThisYear}
          </div>
          <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 8 }}>
            Resigned / Terminated {new Date().getFullYear()}
          </div>
        </div>

        {/* KPI 3: Total Salary For Employees */}
        <div className="kpi-card">
          <div className="kpi-label">Total Active Salary</div>
          <div className="kpi-value" style={{ color: 'var(--blue)', fontSize: '20px', lineHeight: '36px' }}>
            {loading ? '—' : formatCurrency(kpis.TotalSalary)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 8 }}>
            Active Monthly Payroll
          </div>
        </div>

        {/* KPI 4: TurnOver */}
        <div className="kpi-card">
          <div className="kpi-label">Turnover Rate</div>
          <div className="kpi-value" style={{ color: 'var(--orange)' }}>
            {loading ? '—' : `${kpis.TurnoverRate}%`}
          </div>
          <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 8 }}>
            Annual Employee Turnover
          </div>
        </div>

        {/* KPI 6: Leaves Today */}
        <div 
          className="kpi-card" 
          onClick={() => setKpiDrawerMode('leaves')} 
          style={{ cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
          title="Click to view employees on leave today"
        >
          <div className="kpi-label">Leaves Today</div>
          <div className="kpi-value" style={{ color: '#06b6d4' }}>
            {loading ? '—' : kpis.LeavesToday}
          </div>
          <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 8 }}>
            Worker & Normal Leaves
          </div>
        </div>

        {/* KPI 7: Missions Today */}
        <div 
          className="kpi-card" 
          onClick={() => setKpiDrawerMode('missions')} 
          style={{ cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
          title="Click to view employees on business missions today"
        >
          <div className="kpi-label">Missions Today</div>
          <div className="kpi-value" style={{ color: '#f59e0b' }}>
            {loading ? '—' : kpis.MissionsToday}
          </div>
          <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 8 }}>
            Worker & Normal Missions
          </div>
        </div>
      </div>

      {/* Spacer below KPI cards */}
      <div style={{ marginBottom: '20px' }} className="no-print"></div>

      {/* Shared Filter and Search Bar */}
      <div className="hr-filter-bar no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Search Input Container for Relative Autocomplete Dropdown */}
        <div ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: '350px', zIndex: 100 }}>
          <div className="hr-search-form" style={{ width: '100%' }}>
            <input 
              type="text" 
              className="hr-search-input" 
              placeholder="🔍 Search name, ID, branch, job..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveSearchIndex(-1);
              }}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveSearchIndex(-1);
                }}
                style={{
                  background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700, padding: '0 6px', fontFamily: 'var(--font)'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown suggestions list */}
          {searchFocused && autocompleteResults.length > 0 && (
            <div 
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xs)',
                boxShadow: 'var(--shadow-lg)',
                maxHeight: '280px',
                overflowY: 'auto',
                marginTop: '4px',
                padding: '4px 0'
              }}
            >
              {autocompleteResults.map((emp, index) => {
                const displayName = emp.Fullname || emp.FullName || `Employee #${emp.EmployeeID}`;
                const initialLetters = displayName
                  ? displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  : 'EMP';
                const isSelected = index === activeSearchIndex;

                return (
                  <div
                    key={emp.EmployeeID}
                    onClick={() => handleSelectAutocomplete(emp.EmployeeID)}
                    onMouseEnter={() => setActiveSearchIndex(index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      background: isSelected ? 'var(--orange-soft)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div 
                        style={{
                          width: 26, height: 26, borderRadius: '50%', 
                          background: emp.IsManger === 1 ? 'rgba(249, 115, 22, 0.08)' : 'var(--blue-soft)',
                          color: emp.IsManger === 1 ? 'var(--orange)' : 'var(--blue)',
                          fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', border: emp.IsManger === 1 ? '1px solid var(--orange)' : '1px solid var(--border)',
                          flexShrink: 0
                        }}
                      >
                        {initialLetters}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {displayName}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {emp.JobName || '—'} · {emp.DepartmentName || '—'}
                        </div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, marginLeft: 8 }}>
                      <span style={{ fontSize: '9.5px', color: 'var(--orange)', fontWeight: 700 }}>
                        #{emp.EmployeeID}
                      </span>
                      <span style={{ fontSize: '9px', background: 'var(--soft)', border: '1px solid var(--border)', padding: '1px 4px', borderRadius: 3, color: 'var(--muted)' }}>
                        {emp.BranchName || '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Select Filter Dropdowns */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {/* Branch Filter */}
          <select 
            className="filter-select"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{ height: 32, fontSize: 12.5 }}
          >
            <option value="All">📍 All Branches</option>
            {branches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Department Filter */}
          <select 
            className="filter-select"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ height: 32, fontSize: 12.5 }}
          >
            <option value="All">🏢 All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select 
            className="filter-select"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            style={{ height: 32, fontSize: 12.5 }}
          >
            <option value="All">🟢 All Statuses</option>
            {statuses.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Employee Type Filter */}
          <select 
            className="filter-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ height: 32, fontSize: 12.5 }}
          >
            <option value="All">💼 All Types</option>
            {types.map(t => (
              <option key={t} value={t}>{t === 'Worker' ? 'Worker' : t === 'Normal Employee' ? 'Normal Employee' : t}</option>
            ))}
          </select>

          {/* Reset Button */}
          {(searchQuery || selectedBranch !== 'All' || selectedDept !== 'All' || selectedState !== 'All' || selectedType !== 'All') && (
            <button 
              className="btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setSelectedBranch('All');
                setSelectedDept('All');
                setSelectedState('All');
                setSelectedType('All');
              }}
              style={{ height: 32, padding: '0 12px', fontSize: 12, border: '1px dashed var(--orange)', color: 'var(--orange)' }}
            >
              Reset
            </button>
          )}
        </div>
      </div>



      {selectedDeptGroup === null ? (
            /* 1. Department List View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 }}>
              {/* Top Side: Browse by Department Panel */}
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
                <div className="panel-head">
                  <span className="panel-title">🏢 Browse by Department ({departmentGroups.length} departments)</span>
                  <span className="badge badge-orange no-print">Select a department to view staff</span>
                </div>
                <div className="panel-body" style={{ padding: '24px 20px' }}>
                  {loading ? (
                    <div className="loading-wrap"><div className="spinner"></div></div>
                  ) : departmentGroups.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      No departments found matching filter criteria.
                    </div>
                  ) : (
                    <div className="hr-dept-grid">
                      {departmentGroups.map((group, idx) => {
                        return (
                          <div 
                            key={group.name} 
                            className="hr-dept-card"
                            onClick={() => { setSelectedDeptGroup(group.name); setSelectedSubDept('All'); }}
                          >
                            <div className="hr-dept-card-icon">
                              {DEPARTMENT_GROUP_ICONS[group.name] || '🧩'}
                            </div>
                            <div className="hr-dept-card-info">
                              <div className="hr-dept-card-name" title={group.name}>{group.name}</div>
                              <div className="hr-dept-card-count">
                                <span className="hr-dept-pulse"></span>
                                <span>{group.count} Active Staff</span>
                              </div>
                              <div style={{ 
                                fontSize: '11px', 
                                color: 'var(--muted)', 
                                fontWeight: 700, 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                marginTop: '2px'
                              }}>
                                <span>Total Salary:</span>
                                <span style={{ color: 'var(--orange)', fontWeight: 800 }}>{formatCurrency(group.totalSalary)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Side: 3-column Grid Dashboard */}
              <div className="hr-directory-grid">
                {/* Column 1: Department Distribution Table Grid */}
                <div className="insight-card" style={{ display: 'flex', flexDirection: 'column', marginBottom: 0, overflowX: 'auto' }}>
                  <div className="insight-title" style={{ marginBottom: 12 }}>
                    <span>🏢 Department Distribution</span>
                    <span className="badge badge-orange">{departmentTableData.length} Groups</span>
                  </div>
                  <div style={{ flex: 1, overflowX: 'auto' }}>
                    {loading ? (
                      <div className="loading-wrap"><div className="spinner"></div></div>
                    ) : departmentTableData.length === 0 ? (
                      <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No data available</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '320px', tableLayout: 'fixed' }}>
                        <thead>
                          <tr style={{ borderBottom: '1.5px solid var(--border)', color: 'var(--muted)', textAlign: 'left', fontWeight: 700 }}>
                            <th style={{ padding: '6px 4px', textAlign: 'left', width: '25%' }}>Dep</th>
                            <th style={{ padding: '6px 4px', textAlign: 'center', width: '13%' }}>Active</th>
                            <th style={{ padding: '6px 4px', textAlign: 'center', width: '13%' }}>Term</th>
                            <th style={{ padding: '6px 4px', textAlign: 'right', width: '17%' }}>Salary</th>
                            <th style={{ padding: '6px 4px', textAlign: 'right', width: '15%' }} title="Percentage of Total Salary">Sal %</th>
                            <th style={{ padding: '6px 4px', textAlign: 'right', width: '17%' }} title="Average Salary per Employee">Avg Sal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {departmentTableData.map((dept) => {
                            const icon = DEPARTMENT_GROUP_ICONS[dept.name] || '🧩';
                            const salPercentage = totalDeptSalary > 0 ? ((dept.totalSalary / totalDeptSalary) * 100).toFixed(1) : '0.0';
                            return (
                              <tr key={dept.name} style={{ borderBottom: '1px solid var(--border)' }} className="hover-row">
                                <td style={{ padding: '6px 4px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.3' }} title={dept.name}>
                                  <span style={{ marginRight: '4px' }}>{icon}</span>{dept.name}
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: 'var(--green)' }}>
                                  {dept.activeCount}
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: 'var(--red)' }}>
                                  {dept.terminationCount}
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                                  {dept.totalSalary ? formatNumberAbbr(dept.totalSalary) : '—'}
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: 'var(--orange)' }}>
                                  {dept.totalSalary > 0 ? `${salPercentage}%` : '0.0%'}
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 600, color: 'var(--blue)' }}>
                                  {dept.activeCount > 0 ? formatNumberAbbr(dept.totalSalary / dept.activeCount) : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Column 2: Employee per Branch */}
                <div className="insight-card" style={{ display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
                  <div className="insight-title">
                    <span>📍 Employee per Branch</span>
                    <span className="badge badge-blue">{branchStats.length} Branches</span>
                  </div>
                  <div className="insight-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {loading ? (
                      <div className="loading-wrap"><div className="spinner"></div></div>
                    ) : branchStats.length === 0 ? (
                      <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No data available</div>
                    ) : (
                      branchStats.map((br) => (
                        <div key={br.name} className="insight-row">
                          <div className="insight-row-info">
                            <span className="insight-row-label" style={{ fontSize: '12.5px', fontWeight: 600 }}>{br.name}</span>
                            <span className="insight-row-val" style={{ fontSize: '12px', color: 'var(--muted)' }}>{br.count} ({br.pct}%) · 💵 {formatCurrency(br.totalSalary)}</span>
                          </div>
                          <div className="insight-progress-container">
                            <div 
                              className="insight-progress-bar" 
                              style={{ 
                                width: `${br.pct}%`, 
                                background: 'linear-gradient(90deg, var(--blue), #3b82f6)' 
                              }} 
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 2. Drill-down Employee List View for Selected Department */
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', marginBottom: 20 }}>
              <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button 
                    onClick={() => { setSelectedDeptGroup(null); setSelectedSubDept('All'); }}
                    style={{
                      background: 'var(--soft)', border: '1px solid var(--border)',
                      padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, color: 'var(--text)', transition: 'background 0.2s'
                    }}
                    className="no-print"
                  >
                    ← Departments
                  </button>
                  <span className="panel-title">👥 {selectedDeptGroup} Directory ({drillDownEmployees.length} entries)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="hr-view-switcher no-print" style={{
                    display: 'inline-flex', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px', gap: '2px'
                  }}>
                    <button
                      type="button"
                      onClick={() => setDirectoryViewMode('grid')}
                      style={{
                        border: 'none', background: directoryViewMode === 'grid' ? 'var(--orange)' : 'transparent',
                        color: directoryViewMode === 'grid' ? '#fff' : 'var(--muted)',
                        padding: '4px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      📁 Grid
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectoryViewMode('tree')}
                      style={{
                        border: 'none', background: directoryViewMode === 'tree' ? 'var(--orange)' : 'transparent',
                        color: directoryViewMode === 'tree' ? '#fff' : 'var(--muted)',
                        padding: '4px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      🌿 Tree
                    </button>
                  </div>
                  <span className="badge badge-orange no-print">Click row for full file</span>
                </div>
              </div>
              <div 
                className="panel-body" 
                style={{ 
                  padding: '24px 20px',
                  overflowX: directoryViewMode === 'tree' ? 'auto' : 'visible'
                }}
              >
                {loading ? (
                  <div className="loading-wrap"><div className="spinner"></div></div>
                ) : (
                  <>
                    {/* Drill-down localized KPIs */}
                    <div className="hr-drilldown-kpi-grid">
                      <div className="kpi-card" style={{ border: '1px solid var(--border)', background: 'var(--soft)' }}>
                        <div className="kpi-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Employees</div>
                        <div className="kpi-value" style={{ color: 'var(--orange)', fontSize: '24px', fontWeight: '800' }}>
                          {drillDownStats.count}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--hint)', marginTop: '4px' }}>
                          Active in {selectedSubDept === 'All' ? selectedDeptGroup : selectedSubDept}
                        </div>
                      </div>
                      <div className="kpi-card" style={{ border: '1px solid var(--border)', background: 'var(--soft)' }}>
                        <div className="kpi-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Salary</div>
                        <div className="kpi-value" style={{ color: 'var(--blue)', fontSize: '24px', fontWeight: '800' }}>
                          {formatCurrency(drillDownStats.totalSalary)}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--hint)', marginTop: '4px' }}>
                          Monthly Payroll
                        </div>
                      </div>
                    </div>

                    <div className="hr-drilldown-layout">
                    {/* Sub-department Side Tabs */}
                    {subDeptsInGroup.length > 1 && (
                      <div className="hr-side-tabs no-print">
                        <button
                          type="button"
                          className={`hr-side-tab-btn ${selectedSubDept === 'All' ? 'active' : ''}`}
                          onClick={() => setSelectedSubDept('All')}
                        >
                          <span>All</span>
                          <span className="hr-side-tab-count">
                            {filteredEmployees.filter(emp => getGroupForDept(emp.DepartmentName) === selectedDeptGroup).length}
                          </span>
                        </button>
                        {subDeptsInGroup.map(subDept => {
                          const count = filteredEmployees.filter(
                            emp => getGroupForDept(emp.DepartmentName) === selectedDeptGroup && (emp.DepartmentName || '').trim() === subDept
                          ).length;
                          return (
                            <button
                              key={subDept}
                              type="button"
                              className={`hr-side-tab-btn ${selectedSubDept === subDept ? 'active' : ''}`}
                              onClick={() => setSelectedSubDept(subDept)}
                            >
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subDept}</span>
                              <span className="hr-side-tab-count">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {/* Table Container Column */}
                    <div className="hr-table-container">
                      {directoryViewMode === 'grid' ? (
                        <div style={{ overflowX: 'auto' }}>
                        {drillDownEmployees.length === 0 ? (
                          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                            No employees found in this department matching filter criteria.
                          </div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                            <thead>
                              <tr style={{ borderBottom: '1.5px solid var(--border)', color: 'var(--muted)', textAlign: 'left' }}>
                                <th style={{ padding: '10px 8px', width: 80 }}>ID</th>
                                <th style={{ padding: '10px 8px' }}>Full Name</th>
                                <th style={{ padding: '10px 8px' }}>Job Role</th>
                                <th style={{ padding: '10px 8px', textAlign: 'right', width: 110 }}>Payroll</th>
                                <th style={{ padding: '10px 8px' }}>Reports To</th>
                                <th style={{ padding: '10px 8px' }}>Branch</th>
                                <th style={{ padding: '10px 8px' }}>Division</th>
                                <th style={{ padding: '10px 8px', textAlign: 'center', width: 90 }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...drillDownEmployees]
                                .sort((a, b) => {
                                  // 1. Group by ManagerID
                                  const m1 = a.ManagerID || 0;
                                  const m2 = b.ManagerID || 0;
                                  if (m1 !== m2) return m1 - m2;
                                  
                                  // 2. Manager first within the same manager group
                                  const isMgrA = a.IsManger === 1 ? 0 : 1;
                                  const isMgrB = b.IsManger === 1 ? 0 : 1;
                                  if (isMgrA !== isMgrB) return isMgrA - isMgrB;
                                  
                                  // 3. Alphabetical name
                                  const nameA = (a.Fullname || a.FullName || '').toLowerCase();
                                  const nameB = (b.Fullname || b.FullName || '').toLowerCase();
                                  return nameA.localeCompare(nameB);
                                })
                                .map((emp) => {
                                  const displayName = emp.Fullname || emp.FullName || `Employee #${emp.EmployeeID}`;
                                  const hasPhoto = emp.ImagePhoto && !emp.ImagePhoto.endsWith('/-0.jpg') && !emp.ImagePhoto.endsWith('/0-0.jpg');
                                  const initialLetters = displayName.split(' ').filter((_, i, arr) => i === 0 || i === arr.length - 1).map(n => n[0]).join('').toUpperCase();

                                  return (
                                    <tr 
                                      key={emp.EmployeeID} 
                                      onClick={() => setSelectedEmployeeID(emp.EmployeeID)}
                                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                                      className="hover-row"
                                    >
                                      <td style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--orange)' }}>
                                        #{emp.EmployeeID}
                                      </td>
                                      <td style={{ padding: '10px 8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                          <img 
                                            src={hasPhoto ? emp.ImagePhoto : DEFAULT_AVATAR}
                                            alt={displayName}
                                            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                                            onClick={(e) => { e.stopPropagation(); setEnlargedPhoto({ src: hasPhoto ? emp.ImagePhoto : DEFAULT_AVATAR, name: displayName }); }}
                                            onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
                                          />

                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{displayName}</span>
                                            {emp.IsManger === 1 && (
                                              <span style={{
                                                fontSize: '9px',
                                                fontWeight: '800',
                                                background: 'rgba(249, 115, 22, 0.08)',
                                                color: 'var(--orange)',
                                                border: '1px solid var(--orange)',
                                                padding: '1px 5px',
                                                borderRadius: '3px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em'
                                              }}>
                                                Manager
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td style={{ padding: '10px 8px', color: 'var(--muted)', fontWeight: 600 }}>
                                        {emp.JobName || '—'}
                                      </td>
                                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                                        {formatCurrency(emp.SalaryAmount)}
                                      </td>
                                      <td style={{ padding: '10px 8px', color: 'var(--muted)', fontWeight: 600 }}>
                                        {emp.ReportingTo || '—'}
                                      </td>
                                      <td style={{ padding: '10px 8px' }}>
                                        <span style={{ background: 'var(--soft)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: 4, fontSize: 10.5 }}>
                                          {emp.BranchName || '—'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '10px 8px' }}>
                                        {emp.DivisionName || '—'}
                                      </td>
                                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                        <span className={`badge ${emp.EmployeeCurrentStauts === 'Working' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                                          {emp.EmployeeCurrentStauts || 'Inactive'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        )}
                      </div>
                      ) : (
                        /* Tree View Representation */
                        <div className="hr-tree-container">
                          {/* Tree Layout Direction Switcher */}
                          {employeeTree.length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }} className="no-print">
                              <div style={{ display: 'inline-flex', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px', gap: '2px' }}>
                                <button
                                  type="button"
                                  onClick={() => setTreeLayout('horizontal')}
                                  style={{
                                    border: 'none', background: treeLayout === 'horizontal' ? 'var(--orange)' : 'transparent',
                                    color: treeLayout === 'horizontal' ? '#fff' : 'var(--muted)',
                                    padding: '4px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s'
                                  }}
                                >
                                  ➡️ Horizontal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTreeLayout('vertical')}
                                  style={{
                                    border: 'none', background: treeLayout === 'vertical' ? 'var(--orange)' : 'transparent',
                                    color: treeLayout === 'vertical' ? '#fff' : 'var(--muted)',
                                    padding: '4px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s'
                                  }}
                                >
                                  ⬇️ Vertical
                                </button>
                              </div>
                            </div>
                          )}

                          {employeeTree.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                              No reporting structure found matching filter criteria.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'flex-start' }}>
                              {employeeTree.map(rootNode => (
                                <TreeNode 
                                  key={rootNode.EmployeeID} 
                                  node={rootNode} 
                                  onSelectEmployee={setSelectedEmployeeID}
                                  formatCurrency={formatCurrency}
                                  onSelectPhoto={(src, name) => setEnlargedPhoto({ src, name })}
                                  layout={treeLayout}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  </>
                )}
              </div>
            </div>
          )}

      {/* Slide-out Employee Details Drawer Modal */}
      <EmployeeDrawer 
        employeeID={selectedEmployeeID} 
        onClose={() => setSelectedEmployeeID(null)} 
      />

      {/* Slide-out Leaves & Missions Drawer Modal */}
      <LeavesDrawer
        mode={kpiDrawerMode}
        onClose={() => setKpiDrawerMode(null)}
        onSelectEmployee={setSelectedEmployeeID}
      />

      {enlargedPhoto && (
        <div 
          onClick={() => setEnlargedPhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          `}</style>
          <div 
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '90%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'zoomIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={enlargedPhoto.src} 
              alt={enlargedPhoto.name}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: '8px',
                border: '3px solid rgba(255, 255, 255, 0.95)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
                objectFit: 'contain'
              }}
            />
            <div 
              style={{
                marginTop: 14,
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                textAlign: 'center'
              }}
            >
              {enlargedPhoto.name}
            </div>
            <button
              onClick={() => setEnlargedPhoto(null)}
              style={{
                position: 'absolute',
                top: -15,
                right: -15,
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.6)',
                border: '2px solid #fff',
                color: '#fff',
                fontSize: 18,
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--orange)'}
              onMouseLeave={(e) => e.style.backgroundColor = 'rgba(0,0,0,0.6)'}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Side Drawer component to list employees on Leave or Business Mission today
function LeavesDrawer({ mode, onClose, onSelectEmployee }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeDeptTab, setActiveDeptTab] = useState('All');

  // Reset tab selection when mode changes
  useEffect(() => {
    setActiveDeptTab('All');
  }, [mode]);

  useEffect(() => {
    if (!mode) return;
    async function fetchLeaves() {
      setLoading(true);
      setError('');
      try {
        const res = await apiCall('Get Leaves and Missions Today', {}, {}, 'hr');
        const dataList = res.List0 || (Array.isArray(res) ? res : []);
        // Filter by mode
        const isMissionMode = mode === 'missions';
        const filtered = dataList.filter(emp => {
          const isMission = emp.IsBusinessLeave === 1;
          return isMissionMode ? isMission : !isMission;
        });
        setData(filtered);
      } catch (err) {
        console.error(err);
        setError('Failed to load leaves/missions.');
      }
      setLoading(false);
    }
    fetchLeaves();
  }, [mode]);

  if (!mode) return null;

  const title = mode === 'missions' ? '💼 Business Missions Today' : '🏖️ Employees on Leave Today';
  const subtitle = mode === 'missions' 
    ? 'Worker & Normal status staff currently on business missions today' 
    : 'Worker & Normal status staff currently on leave today';

  // Compute unique departments in the filtered list
  const depts = Array.from(new Set(data.map(emp => getGroupForDept(emp.DepartmentName)).filter(Boolean))).sort();

  // Filter displayed data by active tab
  const displayedData = activeDeptTab === 'All'
    ? data
    : data.filter(emp => getGroupForDept(emp.DepartmentName) === activeDeptTab);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }} className="no-print">
      {/* Backdrop overlay */}
      <div 
        onClick={onClose} 
        style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
          animation: 'fadeIn 0.25s ease-out'
        }}
      ></div>

      {/* Slide-out Drawer Panel */}
      <div 
        style={{
          position: 'relative', width: '100%', maxWidth: '800px', height: '100%',
          background: 'var(--surface)', borderLeft: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column',
          padding: '24px', animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: mode === 'missions' ? '#f59e0b' : '#06b6d4' }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--hint)', marginTop: 4 }}>{subtitle}</div>
          </div>
          <button 
            onClick={onClose} 
            style={{
              width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)',
              background: 'var(--soft)', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text)',
              transition: 'all 0.2s ease'
            }}
            className="hover-scale"
          >✕</button>
        </div>

        {/* Split Container: Left Tabs, Right list */}
        <div style={{ display: 'flex', flex: 1, gap: 20, overflow: 'hidden' }}>
          
          {/* Left Column: Vertical Tabs */}
          {!loading && data.length > 0 && depts.length > 0 && (
            <div 
              style={{ 
                width: '180px', display: 'flex', flexDirection: 'column', gap: 6,
                borderRight: '1px solid var(--border)', paddingRight: 14, overflowY: 'auto',
                flexShrink: 0
              }} 
              className="no-scrollbar"
            >
              <button 
                onClick={() => setActiveDeptTab('All')}
                style={{
                  background: activeDeptTab === 'All' ? 'var(--orange-soft)' : 'none',
                  color: activeDeptTab === 'All' ? 'var(--orange)' : 'var(--muted)',
                  border: '1px solid',
                  borderColor: activeDeptTab === 'All' ? 'var(--orange)' : 'transparent',
                  padding: '8px 12px', borderRadius: '6px', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s ease',
                  textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <span>All</span>
                <span style={{ fontSize: '10px', color: 'var(--hint)' }}>({data.length})</span>
              </button>
              {depts.map(dept => {
                const count = data.filter(emp => getGroupForDept(emp.DepartmentName) === dept).length;
                return (
                  <button
                    key={dept}
                    onClick={() => setActiveDeptTab(dept)}
                    style={{
                      background: activeDeptTab === dept ? 'var(--orange-soft)' : 'none',
                      color: activeDeptTab === dept ? 'var(--orange)' : 'var(--muted)',
                      border: '1px solid',
                      borderColor: activeDeptTab === dept ? 'var(--orange)' : 'transparent',
                      padding: '8px 12px', borderRadius: '6px', fontSize: 11, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s ease',
                      textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 4 }} title={dept}>{dept}</span>
                    <span style={{ fontSize: '10px', color: 'var(--hint)', flexShrink: 0 }}>({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Right Column: List Content */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner"></div></div>
            ) : error ? (
              <div className="err-page">⚠ {error}</div>
            ) : data.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>
                No staff members found on {mode === 'missions' ? 'mission' : 'leave'} today.
              </div>
            ) : displayedData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>
                No staff members found in this department group today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
                {displayedData.map((emp) => {
                  const displayName = emp.Fullname || `Employee #${emp.EmployeeID}`;
                  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  const hasPhoto = emp.ImagePhoto && !emp.ImagePhoto.endsWith('/-0.jpg') && !emp.ImagePhoto.endsWith('/0-0.jpg');

                  return (
                    <div 
                      key={emp.EmployeeID} 
                      onClick={() => {
                        onSelectEmployee(emp.EmployeeID);
                        onClose();
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                        background: 'var(--soft)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      className="hover-row"
                    >
                      {/* Photo/Avatar */}
                      <img 
                        src={hasPhoto ? emp.ImagePhoto : DEFAULT_AVATAR} 
                        alt={displayName}
                        style={{ width: 44, height: 44, borderRadius: '6px', objectFit: 'cover', objectPosition: 'top', border: '1px solid var(--border)', flexShrink: 0 }}
                        onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
                      />

                      {/* Employee Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
                          {emp.IsBusinessLeave !== 1 && (
                            <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: '10.5px', marginLeft: '6px', flexShrink: 0 }} title="Current leave balance">
                              (Bal: {emp.LeaveBalance} Days)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--hint)', marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
                          <span>🏢 {emp.DepartmentName}</span>
                          <span>📍 {emp.BranchName}</span>
                          <span>💼 {emp.JobName}</span>
                        </div>
                      </div>

                      {/* Leave tag */}
                      <div style={{
                        background: mode === 'missions' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                        color: mode === 'missions' ? '#f59e0b' : '#06b6d4',
                        border: `1px solid ${mode === 'missions' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(6, 182, 212, 0.2)'}`,
                        padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        whiteSpace: 'nowrap'
                      }}>
                        {emp.LeaveName}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
