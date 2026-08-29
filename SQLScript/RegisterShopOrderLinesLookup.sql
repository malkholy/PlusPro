USE [ERPMega25]
GO

-- ============================================================================
-- "Shop Order Lines" Lookup query, powering the Shop Orders double-click
-- view drawer's line table. Routed through the generic Lookup engine in
-- dbo.APIPlusOperation (matches on Operation + QueryType='Lookup', binds
-- @param1 from LineData.param1) -- no SP code change needed.
-- ============================================================================

DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Shop Order Lines';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Shop Order Lines', 'Shop Order Lines', 'BOM lines for a shop order, for the Shop Orders view drawer',
'SELECT * FROM PRO.ShopOrderLine WHERE ShopOrderNumber = @param1 {FILTER} ORDER BY Line;', 'Lookup', NULL);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Shop Order Lines';
GO
