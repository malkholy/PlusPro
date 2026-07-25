USE [ERPMega25]
GO

-- ============================================================================
-- Item Master grid page, registered directly on the generic GetGridData
-- engine (see APIPlusOperation.sql) -- no hand-written IF block needed.
-- ============================================================================

-- 1. View for the main grid
IF OBJECT_ID('[PLS].[QItemMasterGrid]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QItemMasterGrid];
GO

CREATE VIEW [PLS].[QItemMasterGrid] AS
SELECT
    ItemID,
    ItemCode,
    ItemDescription,
    ItemType,
    ItemClass,
    DefaultWarehouse,
    Barcode,
    StockUM,
    SellingUM,
    SellingConversion,
    MinimumBalance,
    IsNotActive,
    ItemCreatedDate,
    ItemLastMaintDate
FROM inv.ItemMaster;
GO

-- 2. Register the Page (shares the existing 'inventory_group')
DELETE FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'item_master';

INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
VALUES
('item_master', 'inventory_group', 2, 'Item Master', N'🏷️', 'Manage item master records', 0);
GO

-- 3. Register the Main Query in QueryMaster -- QuerySQL already has {FILTER}
--    from day one, since it's built directly on GetGridData.
DECLARE @MainQueryID INT;

DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Item Master Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Item Master Grid';

INSERT INTO [PLS].[QueryMaster]
(QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES
('Item Master Grid', '[PLS].[APIPlusOperation]', 'Item Master Grid', 'Main grid data for Item Master', 'SELECT * FROM PLS.QItemMasterGrid WHERE 1=1 {FILTER};', 'ERPMega25', 'PLS', 'QItemMasterGrid', 'Grid', NULL);

SET @MainQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('item_master', @MainQueryID);

-- 4. FilterPanel -> column mapping (fromItem/toItem range on ItemCode)
INSERT INTO [PLS].[QueryFilterMappings] (QueryID, FilterType, FromParam, ToParam, GridColumn, DataType, SortOrder)
VALUES (@MainQueryID, 'range', 'fromItem', 'toItem', 'ItemCode', 'string', 1);
GO

-- 5. Link the existing 'Item Master All' Lookup so FilterPanel shows the
--    searchable Item range picker (same lookup Item Balance already uses).
DECLARE @FilterQueryID INT;
SELECT @FilterQueryID = QueryID FROM [PLS].[QueryMaster] WHERE Operation = 'Item Master All' AND QueryType = 'Lookup';
IF @FilterQueryID IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'item_master' AND QueryID = @FilterQueryID)
    BEGIN
        INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('item_master', @FilterQueryID);
    END
END
GO
