USE [ERPMega25]
GO

-- ============================================================================
-- Shop Order State lookup (Pro.ShopOrderState: 0=New, 10=Issued, 20=Closed)
-- for readable state descriptions instead of the raw OrderState number.
-- ============================================================================

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Shop Order State All';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Shop Order State All';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Shop Order State All';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Shop Order State All', 'Shop Order State All', 'Shop Order state lookup (Pro.ShopOrderState) for readable state descriptions',
'SELECT StateID, StateDescription FROM Pro.ShopOrderState WHERE 1=1 {FILTER} ORDER BY StateID;', 'Lookup', NULL);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Shop Order State All';
GO
