USE [ERPMega25]
GO

-- ============================================================================
-- Add MachineType to the "Machine Master All" lookup (was MachineID,
-- MachineCode, MachineDescription only) so the frontend can filter by
-- machine type (e.g. Show Plan's Shop Order List) without a new lookup.
-- ============================================================================

UPDATE [PLS].[QueryMaster]
SET QuerySQL = 'SELECT MachineID, MachineCode, MachineDescription, MachineType FROM prd.MachineMaster WHERE 1=1 {FILTER} ORDER BY MachineCode;'
WHERE Operation = 'Machine Master All' AND QueryType = 'Lookup';
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Machine Master All';
GO
