USE [ERPMega25]
GO

-- ============================================================================
-- Fixes the failed step from RegisterOrderLinesDetail.sql: PLS.PageQueries has
-- a real FK to PLS.PagesAndGroups(PageGroupID), so the virtual 'orders_lines'
-- key needs a row there too before it can be linked. The QueryMaster and
-- QueryFilterMappings rows from the earlier run already succeeded and are
-- left as-is; this only adds the missing PagesAndGroups row + PageQueries link.
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'orders_lines')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('orders_lines', NULL, 999, N'Order Lines Detail (internal)', N'🔧', N'Internal lookup key for the Orders drawer detail query -- not a real sidebar page', 0);
END
GO

DECLARE @QID INT;
SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE Operation = 'Order Lines Detail';

IF @QID IS NULL
BEGIN
    RAISERROR('Order Lines Detail query not found in QueryMaster -- run RegisterOrderLinesDetail.sql first.', 16, 1);
    RETURN;
END

IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = 'orders_lines' AND QueryID = @QID)
BEGIN
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('orders_lines', @QID);
END
GO

SELECT * FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'orders_lines';
SELECT * FROM [PLS].[PageQueries] WHERE PageGroupID = 'orders_lines';
GO
