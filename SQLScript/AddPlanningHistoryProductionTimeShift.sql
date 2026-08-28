USE [ERPMega25]
GO

-- ============================================================================
-- Add ProductionTime and ShiftNo columns to PRO.PrdItemPlanningHistory.
-- Batch Qty reuses the existing FormulaBatch column (no new column for it,
-- per explicit instruction) -- it just starts getting a real value instead
-- of being hardcoded to 0.
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('PRO.PrdItemPlanningHistory') AND name = 'ProductionTime')
BEGIN
    ALTER TABLE [PRO].[PrdItemPlanningHistory] ADD [ProductionTime] int NOT NULL CONSTRAINT DF_PrdItemPlanningHistory_ProductionTime DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('PRO.PrdItemPlanningHistory') AND name = 'ShiftNo')
BEGIN
    ALTER TABLE [PRO].[PrdItemPlanningHistory] ADD [ShiftNo] int NOT NULL CONSTRAINT DF_PrdItemPlanningHistory_ShiftNo DEFAULT 0;
END
GO

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='PRO' AND TABLE_NAME='PrdItemPlanningHistory' ORDER BY ORDINAL_POSITION;
GO
