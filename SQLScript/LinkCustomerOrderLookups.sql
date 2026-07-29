USE [ERPMega25]
GO

-- ============================================================================
-- Same fix as LinkRMALookups.sql, for Customer Order: links every Lookup
-- query NewCustomerOrderDrawer.jsx depends on to the 'customer_order'
-- PageGroupID via PLS.PageQueries, purely so Page Master's Filters/Queries
-- tab can show them -- the runtime Lookup engine doesn't need this link to
-- function (it matches by Operation name + QueryType='Lookup' globally).
-- ============================================================================

DECLARE @COLookups TABLE (Operation VARCHAR(150));
INSERT INTO @COLookups (Operation) VALUES
    ('Customer ShipTo By Customer'), ('Customer Defaults By Customer'),
    ('Customer Order Type'), ('Price Type Master All'), ('Payment Term Master All'),
    ('Tax Code Master All'), ('Currency Master All'), ('Facility Master All'),
    ('Carrier Master All'), ('Customer Master All'), ('Item Master All'), ('xx');

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
SELECT 'customer_order', q.QueryID
FROM [PLS].[QueryMaster] q
INNER JOIN @COLookups c ON q.Operation = c.Operation
WHERE q.QueryType = 'Lookup'
  AND NOT EXISTS (
      SELECT 1 FROM [PLS].[PageQueries] pq WHERE pq.PageGroupID = 'customer_order' AND pq.QueryID = q.QueryID
  );
GO

SELECT q.QueryID, q.Operation, q.QueryType
FROM [PLS].[PageQueries] pq
INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID
WHERE pq.PageGroupID = 'customer_order';
GO
