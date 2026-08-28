USE [ERPMega25]
GO

-- ============================================================================
-- Refresh the Production Planning History Grid query: add Warehouse (destination
-- warehouse for the produced item), joined to inv.WarehouseMaster for a readable label.
-- ============================================================================

DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Production Planning History Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Production Planning History Grid';

DECLARE @PIHQueryID INT;

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Production Planning History Grid', 'Production Planning History Grid', 'Production planning history per item, joined to Item Master, Machine Master, BOM Header, and Warehouse Master for readable labels',
'SELECT
    h.[PlanningID], h.[ItemID], h.[ItemCode], b.ItemDescription,
    h.[PlanningState], h.[PlannedQty], h.[StartDate], h.[EndDate],
    h.[MachineID], mm.MachineCode,
    h.[FormulaID], bh.ParentItemCode AS FormulaCode,
    h.[FormulaBatch], h.[ProductionTime],
    h.[Warehouse], wh.WarhouseDescription AS WarehouseDescription,
    h.[CreatedBy], h.[CreatedDate], h.[LastMaintBy], h.[LastMaintDate]
FROM [PRO].[PrdItemPlanningHistory] h
LEFT OUTER JOIN inv.ItemMaster b ON h.ItemID = b.ItemID
LEFT OUTER JOIN prd.MachineMaster mm ON h.MachineID = mm.MachineID
LEFT OUTER JOIN prd.BillOfMaterialHeader bh ON h.FormulaID = bh.FormulaID
LEFT OUTER JOIN inv.WarehouseMaster wh ON h.Warehouse = wh.Warehouse
WHERE 1=1 {FILTER}
ORDER BY h.PlanningID DESC;', 'Grid', NULL);

SET @PIHQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('planning_item_history', @PIHQueryID);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Production Planning History Grid';
GO
