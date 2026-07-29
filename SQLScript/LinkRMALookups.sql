USE [ERPMega25]
GO

-- ============================================================================
-- Links the Lookup queries RMADrawer.jsx actually depends on to the 'rma'
-- PageGroupID via PLS.PageQueries. The runtime Lookup engine (see the
-- fallthrough block in APIPlusOperation.sql) matches purely by Operation
-- name + QueryType='Lookup' and never checks PageQueries, so this link was
-- previously skipped as unnecessary for the app to function -- but that also
-- meant Page Master's Filters/Queries tab showed nothing for RMA, since that
-- tab is driven entirely by PageQueries. This is purely a visibility/
-- documentation fix; it doesn't change runtime lookup behavior.
--
-- RMA Facility / RMA Order Type / RMA Reason are RMA-specific. Customer
-- Master All / xx / Item Master All are shared across many pages -- adding
-- an extra PageQueries row here just makes them ALSO show under RMA; it
-- doesn't remove them from wherever else they're already linked.
-- ============================================================================

DECLARE @RMALookups TABLE (Operation VARCHAR(150));
INSERT INTO @RMALookups (Operation) VALUES
    ('RMA Facility'), ('RMA Order Type'), ('RMA Reason'),
    ('Customer Master All'), ('xx'), ('Item Master All');

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
SELECT 'rma', q.QueryID
FROM [PLS].[QueryMaster] q
INNER JOIN @RMALookups r ON q.Operation = r.Operation
WHERE q.QueryType = 'Lookup'
  AND NOT EXISTS (
      SELECT 1 FROM [PLS].[PageQueries] pq WHERE pq.PageGroupID = 'rma' AND pq.QueryID = q.QueryID
  );
GO

SELECT q.QueryID, q.Operation, q.QueryType
FROM [PLS].[PageQueries] pq
INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID
WHERE pq.PageGroupID = 'rma';
GO
