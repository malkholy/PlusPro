USE [ERPMega25]
GO

-- ============================================================================
-- Refresh the "Shop Order Lines" lookup: add ItemDescription (joined from
-- inv.ItemMaster via ChildItemID) for the Shop Orders view drawer's line table.
-- ============================================================================

DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Shop Order Lines';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Shop Order Lines', 'Shop Order Lines', 'BOM lines for a shop order, joined to Item Master for description, for the Shop Orders view drawer',
'SELECT sol.*, im.ItemDescription FROM PRO.ShopOrderLine sol LEFT OUTER JOIN inv.ItemMaster im ON sol.ChildItemID = im.ItemID WHERE sol.ShopOrderNumber = @param1 {FILTER} ORDER BY sol.Line;', 'Lookup', NULL);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Shop Order Lines';
GO
