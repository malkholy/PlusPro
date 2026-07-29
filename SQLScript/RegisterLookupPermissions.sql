USE [ERPMega25]
GO

-- ============================================================================
-- Registers the new "Lookup Queries Permission" page (LookupPermissions.jsx)
-- under System Admin. Uses an idempotent IF NOT EXISTS insert rather than
-- touching PagesAndGroups.sql's DELETE-all + re-INSERT script, since that
-- file appears to already be out of sync with several pages registered via
-- their own scripts since (rma, customer_order, page_master, item_price_by_type,
-- etc. are all missing from it) -- re-running it as-is would wipe those rows.
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'lookup_permissions')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('lookup_permissions', 'system_admin_group', 46, N'Lookup Queries Permission', N'🔎', N'Manage per-user row-level filter conditions for Lookup-type queries directly, regardless of page linkage', 0);
END
GO
