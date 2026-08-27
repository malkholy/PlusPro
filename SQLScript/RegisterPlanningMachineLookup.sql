USE [ERPMega25]
GO

-- ============================================================================
-- Machine lookup for the Planning Item Master drawer's Default Machine field,
-- plus join MachineCode into the Grid so the list shows a readable code
-- instead of a raw MachineID (same pattern as ItemDescription).
-- ============================================================================

-- 1. Register the Lookup query.
DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Machine Master All';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Machine Master All';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Machine Master All';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Machine Master All', 'Machine Master All', 'Machine lookup for planning defaults',
'SELECT MachineID, MachineCode, MachineDescription FROM prd.MachineMaster WHERE 1=1 {FILTER} ORDER BY MachineCode;', 'Lookup', NULL);
GO

-- 2. Refresh the Planning Item Master Grid query to also join MachineCode.
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Planning Item Master Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Planning Item Master Grid';

DECLARE @PIMQueryID INT;

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Planning Item Master Grid', 'Planning Item Master Grid', 'Per-item planning defaults, joined to Item Master for description and Machine Master for machine code',
'SELECT
    a.[ID], a.[ItemID], a.[ItemCode], a.[ItemType], b.ItemDescription,
    a.[DefaultMachine], m.MachineCode AS DefaultMachineCode,
    a.[DefaultFormula], a.[SaftyStock], a.[LeadTime], a.[NetWeight],
    a.[ColorName], a.[ColorPriority], a.[ProducationTime],
    a.[CreatedBy], a.[CreatedDate], a.[LastMaintBy], a.[LastMaintDate]
FROM [PRO].[ItemPlanningMaster] a
LEFT OUTER JOIN inv.ItemMaster b ON a.ItemID = b.ItemID
LEFT OUTER JOIN prd.MachineMaster m ON a.DefaultMachine = m.MachineID
WHERE 1=1 {FILTER}
ORDER BY a.ItemCode;', 'Grid', NULL);

SET @PIMQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('planning_item_master', @PIMQueryID);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation IN ('Machine Master All', 'Planning Item Master Grid');
GO
