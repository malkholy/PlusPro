USE [ERPMega25]
GO

-- ============================================================================
-- The "Production Planning History" list page is gone (its table,
-- PrdItemPlanningHistory, was dropped -- ShiftPlan is now the source of
-- truth). But the same sidebar entry is still the only way to reach Show
-- Plan / FG Inquiry / Print Plan, which live as buttons on this page's
-- component -- so the PageGroupID is kept (same ID, no permission re-keying)
-- and just relabeled to reflect its new purpose as a launcher, not a grid.
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'planning_item_history')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('planning_item_history', 'planning_group', 20, N'Production Planning', N'🏭', N'Show Plan / FG Inquiry / Print Plan launcher', 0);
END
ELSE
BEGIN
    UPDATE [PLS].[PagesAndGroups]
    SET Label = N'Production Planning', Description = N'Show Plan / FG Inquiry / Print Plan launcher'
    WHERE PageGroupID = 'planning_item_history';
END
GO

SELECT * FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'planning_item_history';
GO
