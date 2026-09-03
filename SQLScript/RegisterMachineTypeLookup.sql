USE [ERPMega25]
GO

-- ============================================================================
-- Machine Type lookup (PRD.MachineType: Producation / Packing) for the
-- Print Plan report's "Machine Type" filter combo.
-- ============================================================================

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Machine Type All';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Machine Type All';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Machine Type All';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Machine Type All', 'Machine Type All', 'Machine Type lookup (PRD.MachineType) for the Print Plan report filter',
'SELECT TypeID, TypeDescription FROM PRD.MachineType WHERE 1=1 {FILTER} ORDER BY TypeDescription;', 'Lookup', NULL);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Machine Type All';
GO
