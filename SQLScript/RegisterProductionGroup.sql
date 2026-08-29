USE [ERPMega25]
GO

-- ============================================================================
-- New top-level "Production" sidebar group. Created empty -- pages get added
-- under it later as they're built or moved (separate from the existing
-- "Planning" group, which stays as-is: Planning Item Master + Production
-- Planning History).
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'production_group')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('production_group', NULL, 96, N'Production', N'🏭', N'Production floor operations', 1);
END
GO

SELECT * FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'production_group';
GO
