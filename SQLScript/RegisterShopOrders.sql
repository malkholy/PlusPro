USE [ERPMega25]
GO

-- ============================================================================
-- New "Shop Orders" page under the "Production" group: read-only Grid onto
-- Pro.ShopOrderHeader, curated to the important fields only (joins Item
-- Master, Machine Master, BOM Header, and Warehouse Master for readable
-- labels instead of raw IDs/codes).
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'shop_orders')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('shop_orders', 'production_group', 20, N'Shop Orders', N'🧾', N'Shop floor production orders', 0);
END
GO

DECLARE @SOQueryID INT;

DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Shop Orders Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Shop Orders Grid';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Shop Orders Grid', 'Shop Orders Grid', 'Shop order headers, joined to Item Master, Machine Master, BOM Header, and Warehouse Master for readable labels',
'SELECT
    a.[ShopOrderNumber], a.[OrderState], a.[ShopOrderDate],
    a.[ShopOrderWarehouse], wh.WarhouseDescription AS WarehouseDescription,
    a.[ParentItemID], a.[ParentItemCode], im.ItemDescription,
    a.[QuantityRequired], a.[QuantiftyIssued],
    a.[MachineID], mm.MachineCode,
    a.[FlormulaID], bh.ParentItemCode AS FormulaCode,
    a.[ShiftID],
    a.[OrderCreatedBy], a.[OrderCreatedDate]
FROM [Pro].[ShopOrderHeader] a
LEFT OUTER JOIN inv.ItemMaster im ON a.ParentItemID = im.ItemID
LEFT OUTER JOIN prd.MachineMaster mm ON a.MachineID = mm.MachineID
LEFT OUTER JOIN prd.BillOfMaterialHeader bh ON a.FlormulaID = bh.FormulaID
LEFT OUTER JOIN inv.WarehouseMaster wh ON a.ShopOrderWarehouse = wh.Warehouse
WHERE 1=1 {FILTER}
ORDER BY a.ShopOrderNumber DESC;', 'Grid', NULL);

SET @SOQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('shop_orders', @SOQueryID);
GO

SELECT * FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'shop_orders';
SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Shop Orders Grid';
GO
