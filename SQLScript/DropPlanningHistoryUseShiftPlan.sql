USE [ERPMega25]
GO

-- ============================================================================
-- Decouples PRO.PrdItemPlanningShiftPlan from PRO.PrdItemPlanningHistory and
-- drops the History table entirely. ShiftPlan becomes the standalone source
-- of truth: Machine/Item/Formula/ProductionTime/Warehouse move from the
-- (now-removed) header table directly onto each shift row. Per explicit
-- direction, existing data in both tables is not preserved -- wiped for a
-- clean cutover rather than migrated, since old rows can't populate the new
-- required-in-practice columns anyway.
-- ============================================================================

DELETE FROM [PRO].[PrdItemPlanningShiftPlan];
DELETE FROM [PRO].[PrdItemPlanningHistory];
GO

IF COL_LENGTH('PRO.PrdItemPlanningShiftPlan', 'ItemID') IS NULL
    ALTER TABLE [PRO].[PrdItemPlanningShiftPlan] ADD ItemID int NULL;
GO
IF COL_LENGTH('PRO.PrdItemPlanningShiftPlan', 'MachineID') IS NULL
    ALTER TABLE [PRO].[PrdItemPlanningShiftPlan] ADD MachineID int NULL;
GO
IF COL_LENGTH('PRO.PrdItemPlanningShiftPlan', 'FormulaID') IS NULL
    ALTER TABLE [PRO].[PrdItemPlanningShiftPlan] ADD FormulaID int NULL;
GO
IF COL_LENGTH('PRO.PrdItemPlanningShiftPlan', 'FormulaBatch') IS NULL
    ALTER TABLE [PRO].[PrdItemPlanningShiftPlan] ADD FormulaBatch decimal(18,5) NULL;
GO
IF COL_LENGTH('PRO.PrdItemPlanningShiftPlan', 'ProductionTime') IS NULL
    ALTER TABLE [PRO].[PrdItemPlanningShiftPlan] ADD ProductionTime int NULL;
GO
IF COL_LENGTH('PRO.PrdItemPlanningShiftPlan', 'Warehouse') IS NULL
    ALTER TABLE [PRO].[PrdItemPlanningShiftPlan] ADD Warehouse nvarchar(50) NULL;
GO

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_PrdItemPlanningShiftPlan_PlanningID')
    ALTER TABLE [PRO].[PrdItemPlanningShiftPlan] DROP CONSTRAINT FK_PrdItemPlanningShiftPlan_PlanningID;
GO
-- PlanningID also has a non-clustered index (IX_PrdItemPlanningShiftPlan_PlanningID)
-- that must be dropped before the column -- DROP COLUMN otherwise fails, and
-- on this gateway that failure is silently swallowed and reported as success.
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PrdItemPlanningShiftPlan_PlanningID' AND object_id = OBJECT_ID('PRO.PrdItemPlanningShiftPlan'))
    DROP INDEX IX_PrdItemPlanningShiftPlan_PlanningID ON [PRO].[PrdItemPlanningShiftPlan];
GO
IF COL_LENGTH('PRO.PrdItemPlanningShiftPlan', 'PlanningID') IS NOT NULL
    ALTER TABLE [PRO].[PrdItemPlanningShiftPlan] DROP COLUMN PlanningID;
GO

IF OBJECT_ID('PRO.PrdItemPlanningHistory', 'U') IS NOT NULL
    DROP TABLE [PRO].[PrdItemPlanningHistory];
GO

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PRO' AND TABLE_NAME = 'PrdItemPlanningShiftPlan' ORDER BY ORDINAL_POSITION;
SELECT OBJECT_ID('PRO.PrdItemPlanningHistory', 'U') AS HistoryTableStillExists;
GO
