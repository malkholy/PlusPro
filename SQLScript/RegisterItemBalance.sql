USE [ERPMega25]
GO

-- 1. Create the View for the Main Query
IF OBJECT_ID('[PLS].[QItemBalanceGrid]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QItemBalanceGrid];
GO

CREATE VIEW [PLS].[QItemBalanceGrid] AS
SELECT 
    x.ItemID, 
    x.ItemCode, 
    z.ItemDescription, 
    z.ItemType, 
    z.SellingConversion,  
    x.Warehouse, 
    x.ItemBalance 
FROM inv.ItemBalance x 
LEFT OUTER JOIN inv.ItemMaster z ON x.ItemID = z.ItemID;
GO

-- 2. Register the Group (shared with other Inventory pages -- do not delete/recreate) and the Page
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'inventory_group')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('inventory_group', NULL, 90, 'Inventory', N'📁', 'Inventory Management Group', 1);
END

-- Delete if exists to allow re-running
DELETE FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'item_balance';

INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
VALUES
('item_balance', 'inventory_group', 1, 'Item Balance', N'📄', 'View item balance records', 0);
GO

-- 3. Register the Main Query in QueryMaster
DECLARE @MainQueryID INT;

-- Delete old registration if exists
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Item Balance Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Item Balance Grid';

INSERT INTO [PLS].[QueryMaster] 
(QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES 
('Item Balance Grid', '[PLS].[APIPlusInvOperation]', 'Item Balance Grid', 'Main grid data for Item Balance', 'SELECT * FROM PLS.QItemBalanceGrid;', 'ERPMega25', 'PLS', 'QItemBalanceGrid', 'Grid', NULL);

SET @MainQueryID = SCOPE_IDENTITY();

-- Link main query to page
INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('item_balance', @MainQueryID);
GO

-- 4. Link the requested Filters
DECLARE @FilterQueryID INT;

-- Item Master All
SELECT @FilterQueryID = QueryID FROM [PLS].[QueryMaster] WHERE Operation = 'Item Master All' AND QueryType = 'Lookup';
IF @FilterQueryID IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'item_balance' AND QueryID = @FilterQueryID)
    BEGIN
        INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('item_balance', @FilterQueryID);
    END
END
GO
