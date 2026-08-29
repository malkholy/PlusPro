USE [ERPMega25]
GO

-- ============================================================================
-- New "Bill Of Material" page under the "Production" group: read-only Grid
-- onto prd.BillOfMaterialHeader, curated to the important fields only
-- (drops internal PK/facility plumbing, joins ItemDescription and
-- MachineCode for readability).
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'bill_of_material')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('bill_of_material', 'production_group', 10, N'Bill Of Material', N'📋', N'Formula headers per item, with batch quantity and machine', 0);
END
GO

DECLARE @BOMQueryID INT;

DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Bill Of Material Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Bill Of Material Grid';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Bill Of Material Grid', 'Bill Of Material Grid', 'Formula headers per item, joined to Item Master and Machine Master for readable labels',
'SELECT
    a.[FormulaID], a.[ParentItemCode], b.ItemDescription,
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

SELECT * FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'bill_of_material';
SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Bill Of Material Grid';
GO
