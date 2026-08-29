USE [ERPMega25]
GO

-- ============================================================================
-- Refresh the Bill Of Material Grid query: add ParentItemID so the new
-- Edit drawer can hydrate the Item select without an extra lookup call.
-- ============================================================================

DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Bill Of Material Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Bill Of Material Grid';

DECLARE @BOMQueryID INT;

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Bill Of Material Grid', 'Bill Of Material Grid', 'Formula headers per item, joined to Item Master and Machine Master for readable labels',
'SELECT
    a.[FormulaID], a.[ParentItemID], a.[ParentItemCode], b.ItemDescription,
    a.[BatchQuantity], a.[MachineID], mm.MachineCode,
    a.[FormulaFacility], a.[ParentItemType],
    a.[FormulaCreatedBy], a.[FormulaCreatedDate]
FROM prd.BillOfMaterialHeader a
LEFT OUTER JOIN inv.ItemMaster b ON a.ParentItemID = b.ItemID
LEFT OUTER JOIN prd.MachineMaster mm ON a.MachineID = mm.MachineID
WHERE 1=1 {FILTER}
ORDER BY a.FormulaID DESC;', 'Grid', NULL);

SET @BOMQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('bill_of_material', @BOMQueryID);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Bill Of Material Grid';
GO
