USE [ERPMega25]
GO

-- ============================================================================
-- Add BatchQuantity to the Formula lookup, so Production Planning History's
-- New drawer can show it (read-only) once a formula is chosen.
-- ============================================================================

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Formula Master All';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Formula Master All';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Formula Master All';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Formula Master All', 'Formula Master All', 'Formula (BOM header) lookup for planning defaults, includes batch quantity',
'SELECT FormulaID, ParentItemID, ParentItemCode, BatchQuantity FROM prd.BillOfMaterialHeader WHERE 1=1 {FILTER} ORDER BY ParentItemCode;', 'Lookup', NULL);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Formula Master All';
GO
