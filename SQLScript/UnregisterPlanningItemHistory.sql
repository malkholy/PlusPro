USE [ERPMega25]
GO

-- ============================================================================
-- Removes the "Production Planning History" list page. Its underlying table
-- (PRO.PrdItemPlanningHistory) has been dropped -- ShiftPlan (via Show Plan)
-- is now the source of truth for production planning.
-- ============================================================================

DELETE qfm FROM [PLS].[QueryFilterMappings] qfm INNER JOIN [PLS].[QueryMaster] q ON qfm.QueryID = q.QueryID WHERE q.Operation = 'Production Planning History Grid';
DELETE qf FROM [PLS].[QueryFields] qf INNER JOIN [PLS].[QueryMaster] q ON qf.QueryID = q.QueryID WHERE q.Operation = 'Production Planning History Grid';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Production Planning History Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Production Planning History Grid';
DELETE FROM [PLS].[UserPagePermissions] WHERE PageGroupID = 'planning_item_history';
DELETE FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'planning_item_history';
GO

SELECT * FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'planning_item_history';
GO
