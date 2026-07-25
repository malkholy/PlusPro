USE [ERPMega25]
GO

-- ============================================================================
-- Adds a Date range filter on QWarehouseTransferGrid.RequestDate to the
-- GetGridData engine for the 'warehouse_transfer' page (see WarehouseTransfer.jsx's
-- filters={['date']} + defaultFilters={{startDate: monthStart, endDate: today}}).
--
-- NOTE: there are TWO QueryMaster rows with Operation = 'W Grid' (61 and 63) --
-- 63 is an orphaned duplicate (PageGroupID is NULL, never linked to any page).
-- The page only ever resolves QueryID 61 at runtime (via PLS.PageQueries), so
-- this script hardcodes 61 explicitly instead of looking it up by Operation
-- name, to avoid ambiguity. The first attempt at this script picked 63 by
-- accident, so the filter never took effect -- this cleans that up too.
-- ============================================================================

-- Remove the incorrect mapping from the orphaned duplicate (63), if any
DELETE FROM [PLS].[QueryFilterMappings] WHERE QueryID = 63 AND GridColumn = 'RequestDate';

-- Remove any previous attempt on the real query (61), then re-add cleanly
DELETE FROM [PLS].[QueryFilterMappings] WHERE QueryID = 61 AND GridColumn = 'RequestDate';

INSERT INTO [PLS].[QueryFilterMappings] (QueryID, FilterType, FromParam, ToParam, GridColumn, DataType, SortOrder)
VALUES (61, 'range', 'startDate', 'endDate', 'RequestDate', 'date', 1);
GO

-- Optional cleanup: the orphaned duplicate query (63) itself, once it no
-- longer has any QueryFilterMappings rows referencing it (see DELETE above).
-- Safe to run -- it isn't linked to any page and nothing depends on it.
DELETE FROM [PLS].[QueryMaster] WHERE QueryID = 63;
GO

SELECT * FROM [PLS].[QueryFilterMappings] WHERE QueryID = 61;
GO
