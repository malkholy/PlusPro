USE [ERPMega25]
GO

-- ============================================================================
-- Registers a Grid for the "Production Planning" page (PageGroupID
-- planning_item_history) reading PRO.PrdItemPlanningShiftPlan directly --
-- the table is now standalone (no more header table to join), same
-- Machine/Item/Formula joins as Get Planning Shift Calendar.
-- ============================================================================

DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Production Planning Shift Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Production Planning Shift Grid';

DECLARE @SPGQueryID INT;

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Production Planning Shift Grid', 'Production Planning Shift Grid', 'Shift plan rows -- the source of truth for production planning',
'SELECT
    sp.ShiftPlanID,
    mm.MachineCode,
    sp.ItemCode,
    im.ItemDescription,
    sp.ShiftDate,
    sp.ShiftNo,
    sp.PlannedQty,
    im.StockUM,
    bh.ParentItemCode AS FormulaCode,
    sp.ProductionTime,
    sp.Warehouse,
    sp.ShopOrderNo,
    sp.CreatedBy,
    sp.CreatedDate
FROM [PRO].[PrdItemPlanningShiftPlan] sp
LEFT OUTER JOIN prd.MachineMaster mm ON sp.MachineID = mm.MachineID
LEFT OUTER JOIN inv.ItemMaster im ON sp.ItemID = im.ItemID
LEFT OUTER JOIN prd.BillOfMaterialHeader bh ON sp.FormulaID = bh.FormulaID
WHERE 1=1 {FILTER}
ORDER BY sp.ShiftDate DESC, sp.ShiftNo, mm.MachineCode;', 'Grid', NULL);

SET @SPGQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('planning_item_history', @SPGQueryID);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Production Planning Shift Grid';
GO
