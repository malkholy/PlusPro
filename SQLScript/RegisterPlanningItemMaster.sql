USE [ERPMega25]
GO

-- ============================================================================
-- Planning Item Master: new top-level "Planning" sidebar group + a Grid page
-- reading PRO.ItemPlanningMaster joined to inv.ItemMaster for ItemDescription
-- (via GetGridData, same generic engine every other Grid page uses). New/Edit/
-- Delete go through the user-supplied dedicated PRO.APIPlusPlanningOperation
-- SP (deployed separately in SQLScript/SPs/APIPlusPlanningOperation.sql),
-- same pattern as RMA/ACP/CustomerOrder having their own SP outside
-- APIPlusOperation.sql.
-- ============================================================================

-- 1. New top-level group.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'planning_group')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('planning_group', NULL, 95, N'Planning', N'🗓️', N'Production planning', 1);
END
GO

-- 2. Planning Item Master page, under the new group.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'planning_item_master')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('planning_item_master', 'planning_group', 10, N'Planning Item Master', N'🧩', N'Per-item planning defaults: machine, formula, safety stock, lead time', 0);
END
GO

-- 3. Register the Grid query (idempotent re-register, same pattern as RegisterCashFlow.sql).
DECLARE @PIMQueryID INT;

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Planning Item Master Grid';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Planning Item Master Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Planning Item Master Grid';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Planning Item Master Grid', 'Planning Item Master Grid', 'Per-item planning defaults, joined to Item Master for description',
'SELECT
    a.[ID], a.[ItemID], a.[ItemCode], a.[ItemType], b.ItemDescription,
    a.[DefaultMachine], a.[DefaultFormula], a.[SaftyStock], a.[LeadTime], a.[NetWeight],
    a.[ColorName], a.[ColorPriority], a.[ProducationTime],
    a.[CreatedBy], a.[CreatedDate], a.[LastMaintBy], a.[LastMaintDate]
FROM [PRO].[ItemPlanningMaster] a
LEFT OUTER JOIN inv.ItemMaster b ON a.ItemID = b.ItemID
WHERE 1=1 {FILTER}
ORDER BY a.ItemCode;', 'Grid', NULL);

SET @PIMQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('planning_item_master', @PIMQueryID);
GO

SELECT * FROM [PLS].[PagesAndGroups] WHERE PageGroupID IN ('planning_group', 'planning_item_master');
SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Planning Item Master Grid';
GO
