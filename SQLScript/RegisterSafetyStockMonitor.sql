USE [ERPMega25]
GO

-- ============================================================================
-- Safety Stock Monitor: new simple CRUD page (ItemID, ItemCode, LeadTime) on
-- Pro.SaftStockMontior. Registered on the generic single-table CRUD engine
-- (GenericMasterPage.jsx / GenericRecordSave / GenericRecordDelete, see
-- APIPlusOperation.sql) -- no hand-written Add/Edit SP operations and no new
-- React page needed; App.jsx auto-routes any PageGroupID found in
-- PLS.CrudTableMaster to GenericMasterPage.jsx.
--
-- Note: the generic Add/Edit form only renders plain text/number/date/bool
-- inputs -- ItemID has to be typed in by hand (no item search picker like
-- the rest of the app uses). Fine for a first cut; say the word if you'd
-- rather have a small dedicated form with a real item picker instead.
-- ============================================================================

-- 1. Target table.
IF OBJECT_ID('Pro.SaftStockMontior', 'U') IS NULL
BEGIN
    CREATE TABLE Pro.SaftStockMontior (
        ItemID   int          NOT NULL PRIMARY KEY,
        ItemCode nvarchar(50) NOT NULL,
        LeadTime int          NULL
    );
END
GO

-- 2. Sidebar page entry, under the existing "Planning" group.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'safety_stock_monitor')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('safety_stock_monitor', 'planning_group', 20, N'Safety Stock Monitor', N'📈', N'Per-item safety stock lead time monitoring', 0);
END
GO

-- 3. Grid query (read side -- same generic GetGridData engine every grid uses).
DECLARE @SSMQueryID INT;

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Safety Stock Monitor Grid';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Safety Stock Monitor Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Safety Stock Monitor Grid';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Safety Stock Monitor Grid', 'Safety Stock Monitor Grid', 'Per-item safety stock lead time, joined to Item Master for description',
'SELECT
    a.[ItemID], a.[ItemCode], b.ItemDescription, a.[LeadTime]
FROM Pro.SaftStockMontior a
LEFT OUTER JOIN inv.ItemMaster b ON a.ItemID = b.ItemID
WHERE 1=1 {FILTER}
ORDER BY a.ItemCode;', 'Grid', NULL);

SET @SSMQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('safety_stock_monitor', @SSMQueryID);
GO

-- 4. CRUD write-side registration -- Add/Edit/Delete all handled generically
--    by GenericRecordSave / GenericRecordDelete, keyed off ItemID.
IF EXISTS (SELECT 1 FROM PLS.CrudTableMaster WHERE PageGroupID = 'safety_stock_monitor')
BEGIN
    UPDATE PLS.CrudTableMaster
    SET TargetSchema = 'Pro', TargetTable = 'SaftStockMontior', AllowDelete = 1
    WHERE PageGroupID = 'safety_stock_monitor';
END
ELSE
BEGIN
    INSERT INTO PLS.CrudTableMaster (PageGroupID, TargetSchema, TargetTable, AllowDelete, CreatedBy)
    VALUES ('safety_stock_monitor', 'Pro', 'SaftStockMontior', 1, 'system');
END
GO

DELETE FROM PLS.CrudFieldMappings WHERE PageGroupID = 'safety_stock_monitor';

INSERT INTO PLS.CrudFieldMappings (PageGroupID, ColumnName, JsonKey, Label, DataType, IsRequired, IsKey, IsIdentity, SortOrder)
VALUES
('safety_stock_monitor', 'ItemID',   'ItemID',   'Item ID',   'number', 1, 1, 0, 1),
('safety_stock_monitor', 'ItemCode', 'ItemCode', 'Item Code', 'string', 1, 0, 0, 2),
('safety_stock_monitor', 'LeadTime', 'LeadTime', 'Lead Time', 'number', 0, 0, 0, 3);
GO

SELECT * FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'safety_stock_monitor';
SELECT * FROM PLS.CrudTableMaster WHERE PageGroupID = 'safety_stock_monitor';
SELECT * FROM PLS.CrudFieldMappings WHERE PageGroupID = 'safety_stock_monitor';
SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Safety Stock Monitor Grid';
GO
