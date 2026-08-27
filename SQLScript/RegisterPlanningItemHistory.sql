USE [ERPMega25]
GO

-- ============================================================================
-- Production Planning History: read-only Grid page over
-- PRO.PrdItemPlanningHistory, under the existing "Planning" sidebar group.
-- Operations (New/Edit/Delete) intentionally not wired yet -- deferred per
-- explicit instruction to discuss them separately. Grid-only for now, same
-- scope as RegisterItemBalance.sql/RegisterCashFlow.sql before their pages
-- grew mutation operations.
-- ============================================================================

-- 1. Register the page, under the Planning group.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'planning_item_history')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('planning_item_history', 'planning_group', 20, N'Production Planning History', N'📜', N'History of production planning runs per item', 0);
END
GO

-- 2. Register the Grid query.
DECLARE @PIHQueryID INT;

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Production Planning History Grid';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Production Planning History Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Production Planning History Grid';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Production Planning History Grid', 'Production Planning History Grid', 'Production planning history per item, joined to Item Master for description',
'SELECT
    h.[PlanningID], h.[ItemID], h.[ItemCode], b.ItemDescription,
    h.[PlanningState], h.[PlannedQty], h.[StartDate], h.[EndDate],
    h.[CreatedBy], h.[CreatedDate], h.[LastMaintBy], h.[LastMaintDate]
FROM [PRO].[PrdItemPlanningHistory] h
LEFT OUTER JOIN inv.ItemMaster b ON h.ItemID = b.ItemID
WHERE 1=1 {FILTER}
ORDER BY h.PlanningID DESC;', 'Grid', NULL);

SET @PIHQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('planning_item_history', @PIHQueryID);
GO

SELECT * FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'planning_item_history';
SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Production Planning History Grid';
GO
