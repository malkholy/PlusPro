USE [ERPMega25]
GO

-- Adds a Month filter (exact match on the Month column) to the Cash Flow
-- grid query, via the generic GetGridData filter-mapping mechanism.
DECLARE @CFQueryID INT = (SELECT QueryID FROM [PLS].[QueryMaster] WHERE Operation = 'Cash Flow Grid');

IF @CFQueryID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [PLS].[QueryFilterMappings] WHERE QueryID = @CFQueryID AND FromParam = 'month')
BEGIN
    INSERT INTO [PLS].[QueryFilterMappings] (QueryID, FilterType, FromParam, ToParam, GridColumn, DataType, SortOrder)
    VALUES (@CFQueryID, 'exact', 'month', NULL, 'Month', 'number', 1);
END
GO
