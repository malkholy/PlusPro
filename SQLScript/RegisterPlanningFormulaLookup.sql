USE [ERPMega25]
GO

-- ============================================================================
-- Formula lookup for the Planning Item Master drawer's Default Formula field,
-- plus join ParentItemCode into the Grid so the list shows a readable formula
-- reference instead of the raw FormulaID (same pattern as Default Machine).
-- ============================================================================

-- 1. Register the Lookup query.
DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Formula Master All';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Formula Master All';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Formula Master All';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Formula Master All', 'Formula Master All', 'Formula (BOM header) lookup for planning defaults',
'SELECT FormulaID, ParentItemID, ParentItemCode FROM prd.BillOfMaterialHeader WHERE 1=1 {FILTER} ORDER BY ParentItemCode;', 'Lookup', NULL);
GO

-- 2. Refresh the Planning Item Master Grid query to also join ParentItemCode.
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Planning Item Master Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Planning Item Master Grid';

DECLARE @PIMQueryID INT;

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Planning Item Master Grid', 'Planning Item Master Grid', 'Per-item planning defaults, joined to Item Master, Machine Master, and BOM Header for readable labels',
'SELECT
    a.[ID], a.[ItemID], a.[ItemCode], a.[ItemType], b.ItemDescription,
    a.[DefaultMachine], mm.MachineCode AS DefaultMachineCode,
    a.[DefaultFormula], bh.ParentItemCode AS DefaultFormulaCode,
    a.[SaftyStock], a.[LeadTime], a.[NetWeight],
    a.[ColorName], a.[ColorPriority], a.[ProducationTime],
    a.[CreatedBy], a.[CreatedDate], a.[LastMaintBy], a.[LastMaintDate]
FROM [PRO].[ItemPlanningMaster] a
LEFT OUTER JOIN inv.ItemMaster b ON a.ItemID = b.ItemID
LEFT OUTER JOIN prd.MachineMaster mm ON a.DefaultMachine = mm.MachineID
LEFT OUTER JOIN prd.BillOfMaterialHeader bh ON a.DefaultFormula = bh.FormulaID
WHERE 1=1 {FILTER}
ORDER BY a.ItemCode;', 'Grid', NULL);

SET @PIMQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('planning_item_master', @PIMQueryID);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation IN ('Formula Master All', 'Planning Item Master Grid');
GO
