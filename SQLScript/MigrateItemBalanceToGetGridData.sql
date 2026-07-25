USE [ERPMega25]
GO

-- ============================================================================
-- Pilot migration: move "Item Balance Grid" off its hand-written IF block in
-- APIPlusInvOperation and onto the generic GetGridData engine.
-- ============================================================================

-- 1. QuerySQL needs a {FILTER} placeholder so GetGridData can inject the
--    permission + FilterPanel conditions (same convention as Lookup queries).
UPDATE [PLS].[QueryMaster]
SET QuerySQL = 'SELECT * FROM PLS.QItemBalanceGrid WHERE 1=1 {FILTER};',
    SPName = '[PLS].[APIPlusOperation]'
WHERE Operation = 'Item Balance Grid' AND QueryType = 'Grid';

-- 2. Register the fromItem/toItem -> ItemCode range filter mapping.
DECLARE @QueryID INT = (SELECT QueryID FROM [PLS].[QueryMaster] WHERE Operation = 'Item Balance Grid' AND QueryType = 'Grid');

IF @QueryID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [PLS].[QueryFilterMappings] WHERE QueryID = @QueryID)
BEGIN
    INSERT INTO [PLS].[QueryFilterMappings] (QueryID, FilterType, FromParam, ToParam, GridColumn, DataType, SortOrder)
    VALUES (@QueryID, 'range', 'fromItem', 'toItem', 'ItemCode', 'string', 1);
END
GO
