USE [ERPMega25]
GO

-- ============================================================================
-- Adds a Date range filter on Orders.ScheduledShipDate to the GetGridData
-- engine for the 'orders' page (see AppFilterPanel's filters={['date']} +
-- defaultFilters={{startDate: monthStart, endDate: today}} in Orders.jsx).
-- ============================================================================

DECLARE @QID INT;
SELECT @QID = QueryID FROM [PLS].[QueryMaster] WHERE Operation = 'Orders Grid';

IF @QID IS NULL
BEGIN
    RAISERROR('Orders Grid query not found in QueryMaster -- run RegisterOrdersGrid.sql first.', 16, 1);
    RETURN;
END

DELETE FROM [PLS].[QueryFilterMappings] WHERE QueryID = @QID AND GridColumn = 'ScheduledShipDate';

INSERT INTO [PLS].[QueryFilterMappings] (QueryID, FilterType, FromParam, ToParam, GridColumn, DataType, SortOrder)
VALUES (@QID, 'range', 'startDate', 'endDate', 'ScheduledShipDate', 'date', 1);
GO

SELECT * FROM [PLS].[QueryFilterMappings] WHERE QueryID = (SELECT QueryID FROM [PLS].[QueryMaster] WHERE Operation = 'Orders Grid');
GO
