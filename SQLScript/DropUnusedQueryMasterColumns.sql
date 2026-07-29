USE [ERPMega25]
GO

-- ============================================================================
-- Drops SPName / DatabaseName / SchemaName / TableOrViewName from PLS.QueryMaster.
--
-- Confirmed unused by every runtime consumer -- GetGridData, the generic
-- Lookup engine, GetQueryFields, and ValidateQueryCondition all route purely
-- off QueryID/Operation/QuerySQL. These four were only ever displayed as
-- provenance text in the admin screens (QueryMaster.jsx, LookupQueries.jsx,
-- UserPermissions.jsx, LookupPermissions.jsx). Dropped per explicit request
-- to stop the confusion of unused columns; APIPlusOperation.sql's
-- SaveQueryMaster/CreateQueryView/GetQueryMaster no longer read or write them,
-- and the frontend no longer sends or displays them.
-- ============================================================================

IF COL_LENGTH('PLS.QueryMaster', 'SPName') IS NOT NULL
    ALTER TABLE PLS.QueryMaster DROP COLUMN SPName;
GO

IF COL_LENGTH('PLS.QueryMaster', 'DatabaseName') IS NOT NULL
    ALTER TABLE PLS.QueryMaster DROP COLUMN DatabaseName;
GO

IF COL_LENGTH('PLS.QueryMaster', 'SchemaName') IS NOT NULL
    ALTER TABLE PLS.QueryMaster DROP COLUMN SchemaName;
GO

IF COL_LENGTH('PLS.QueryMaster', 'TableOrViewName') IS NOT NULL
    ALTER TABLE PLS.QueryMaster DROP COLUMN TableOrViewName;
GO
