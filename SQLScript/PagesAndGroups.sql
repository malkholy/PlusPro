USE [ERPMega25]
GO

-- Clear existing pages and groups
DELETE FROM [PLS].[PagesAndGroups];
GO

-- Insert Groups and Pages
INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, Label, Icon, Description, IsGroup, ParentID, SortOrder)
VALUES
    -- Groups (isGroup = 1)
    ('accounting_group', N'Accounting', N'📋', N'Accounting module group', 1, NULL, 10),
    ('bom_group', N'BOM', N'⚙️', N'Bill of Materials module group', 1, NULL, 20),
    ('costing_group', N'Costing', N'💰', N'Costing module group', 1, NULL, 30),
    ('system_admin_group', N'System Admin', N'⚙️', N'System Administration module group', 1, NULL, 40),

    -- Accounting Group Pages (isGroup = 0)
    ('accounts_master', N'Accounts Master', N'📂', N'Interactive tree directory of the Chart of Accounts', 0, 'accounting_group', 11),
    ('account_statement', N'Account Statement', N'📋', N'Faceted transaction history and running balance statement ledger', 0, 'accounting_group', 12),
    ('trial_balance', N'Trial Balance', N'📊', N'Company-wide General Ledger Trial Balance', 0, 'accounting_group', 13),
    ('segment_definition', N'Segment Definition', N'📑', N'Manage Segment Values and Definitions', 0, 'accounting_group', 14),
    ('journal_entry', N'Journal Entry', N'📓', N'View Journal Entries', 0, 'accounting_group', 15),
    ('journal_model', N'Journal Model', N'📑', N'Manage Journal Entry Templates', 0, 'accounting_group', 16),
    ('smart_journal', N'Smart Journal', N'✨', N'Generate Journal Entries by Model', 0, 'accounting_group', 17),
    ('accounting_events', N'Accounting Events', N'📅', N'Manage Accounting Events and configurations', 0, 'accounting_group', 18),
    ('cash_receive', N'Cash Receive', N'💵', N'Manage cash receivable transactions', 0, 'accounting_group', 19),

    -- BOM Group Pages (isGroup = 0)
    ('bom_header', N'BOM Header', N'📄', N'View level 1 Bill of Material Headers', 0, 'bom_group', 21),

    -- Costing Group Pages (isGroup = 0)
    ('price_list_cost', N'Price List Cost', N'📊', N'Compare selling prices, production final costs, and profit margins', 0, 'costing_group', 31),
    ('item_cost_summary', N'Item Cost Summary', N'💰', N'View detailed item costing metrics, min/max costs and calculation dates', 0, 'costing_group', 32),

    -- System Admin Group Pages (isGroup = 0)
    ('user_permissions', N'User Permissions', N'🔐', N'Manage page access and row-level query filters', 0, 'system_admin_group', 41),
    ('query_master', N'Query Master', N'🗄️', N'Configure generic database query routing and definitions', 0, 'system_admin_group', 42),
    ('accounting_functions', N'Accounting Functions', N'🔗', N'Manage master configurations for accounting functions and document types', 0, 'system_admin_group', 43),
    ('accounting_macros', N'Accounting Macros', N'⚡', N'Manage configurations for dynamic macros and variable substitutions', 0, 'system_admin_group', 44);
GO

SELECT * FROM [PLS].[PagesAndGroups] ORDER BY SortOrder;
GO
