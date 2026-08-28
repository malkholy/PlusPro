USE [ERPMega25]
GO

-- ============================================================================
-- Remove ShiftNo from the header table PRO.PrdItemPlanningHistory. The
-- per-shift ShiftNo on PRO.PrdItemPlanningShiftPlan (each shift's own row)
-- is untouched -- that's the meaningful place for it now that a run spans
-- both shifts.
-- ============================================================================

IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_PrdItemPlanningHistory_ShiftNo')
BEGIN
    ALTER TABLE [PRO].[PrdItemPlanningHistory] DROP CONSTRAINT DF_PrdItemPlanningHistory_ShiftNo;
END
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('PRO.PrdItemPlanningHistory') AND name = 'ShiftNo')
BEGIN
    ALTER TABLE [PRO].[PrdItemPlanningHistory] DROP COLUMN [ShiftNo];
END
GO

SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='PRO' AND TABLE_NAME='PrdItemPlanningHistory' ORDER BY ORDINAL_POSITION;
GO
