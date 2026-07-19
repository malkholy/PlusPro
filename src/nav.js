const NAV = [
  {
    id: 'accounting_group',
    label: 'Accounting',
    icon: '📋',
    isGroup: true,
    children: [
      {
        id: 'accounts_master',
        label: 'Accounts Master',
        icon: '📂',
        desc: 'Interactive tree directory of the Chart of Accounts'
      },
      {
        id: 'account_statement',
        label: 'Account Statement',
        icon: '📋',
        desc: 'Faceted transaction history and running balance statement ledger'
      },
      {
        id: 'trial_balance',
        label: 'Trial Balance',
        icon: '📊',
        desc: 'Company-wide General Ledger Trial Balance'
      },
      {
        id: 'segment_definition',
        label: 'Segment Definition',
        icon: '📑',
        desc: 'Manage Segment Values and Definitions'
      },
      {
        id: 'journal_entry',
        label: 'Journal Entry',
        icon: '📓',
        desc: 'View Journal Entries'
      },
      {
        id: 'journal_model',
        label: 'Journal Model',
        icon: '📑',
        desc: 'Manage Journal Entry Templates'
      },
      {
        id: 'smart_journal',
        label: 'Smart Journal',
        icon: '✨',
        desc: 'Generate Journal Entries by Model'
      },
      {
        id: 'accounting_events',
        label: 'Accounting Events',
        icon: '📅',
        desc: 'Manage Accounting Events and configurations'
      },
      {
        id: 'cash_receive',
        label: 'Cash Receive',
        icon: '💵',
        desc: 'Manage cash receivable transactions'
      }
    ]
  },
  {
    id: 'bom_group',
    label: 'BOM',
    icon: '⚙️',
    isGroup: true,
    children: [
      {
        id: 'bom_header',
        label: 'BOM Header',
        icon: '📄',
        desc: 'View level 1 Bill of Material Headers'
      }
    ]
  },
  {
    id: 'costing_group',
    label: 'Costing',
    icon: '💰',
    isGroup: true,
    children: [
      {
        id: 'price_list_cost',
        label: 'Price List Cost',
        icon: '📊',
        desc: 'Compare selling prices, production final costs, and profit margins'
      },
      {
        id: 'item_cost_summary',
        label: 'Item Cost Summary',
        icon: '💰',
        desc: 'View detailed item costing metrics, min/max costs and calculation dates'
      }
    ]
  },
  {
    id: 'system_admin_group',
    label: 'System Admin',
    icon: '⚙️',
    isGroup: true,
    children: [
      {
        id: 'user_permissions',
        label: 'User Permissions',
        icon: '🔐',
        desc: 'Manage page access and row-level query filters'
      },
      {
        id: 'query_master',
        label: 'Query Master',
        icon: '🗄️',
        desc: 'Configure generic database query routing and definitions'
      },
      {
        id: 'accounting_functions',
        label: 'Accounting Functions',
        icon: '🔗',
        desc: 'Manage master configurations for accounting functions and document types'
      },
      {
        id: 'accounting_macros',
        label: 'Accounting Macros',
        icon: '⚡',
        desc: 'Manage configurations for dynamic macros and variable substitutions'
      }
    ]
  }
];

export default NAV;

