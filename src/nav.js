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
    label: 'Settings',
    icon: '⚙️',
    isGroup: true,
    isSettings: true,
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
        id: 'lookup_queries',
        label: 'Lookup Queries',
        icon: '🔍',
        desc: 'Manage filter/lookup queries used by FilterPanel dropdown pickers'
      },
      {
        id: 'page_builder',
        label: 'AI Page Builder',
        icon: '📝',
        desc: 'Generate structural prompts to build new pages instantly'
      },
      {
        id: 'page_master',
        label: 'Page Master',
        icon: '🗂️',
        desc: 'Manage sidebar navigation groups and pages'
      },
      {
        id: 'reports_master',
        label: 'Reports Master',
        icon: '🖨️',
        desc: 'Catalog of printable reports, their source files, linked page and data queries'
      }
    ]
  },
  {
    id: 'loading_orders_group',
    label: 'Loading Orders',
    icon: '🚚',
    isGroup: true,
    children: [
      {
        id: 'orders',
        label: 'Orders',
        icon: '📦',
        desc: 'View customer orders pending or in the loading/delivery pipeline'
      }
    ]
  },
  {
    id: 'inventory_group',
    label: 'Inventory',
    icon: '📁',
    isGroup: true,
    children: [
      {
        id: 'item_balance',
        label: 'Item Balance',
        icon: '📄',
        desc: 'View item balance records'
      },
      {
        id: 'item_master',
        label: 'Item Master',
        icon: '🏷️',
        desc: 'Manage item master records'
      },
      {
        id: 'warehouse_transfer',
        label: 'Warehouse Transfer',
        icon: '📄',
        desc: 'View warehouse transfer requests'
      }
    ]
  }
];

export default NAV;

