USE [ERPMega25]
GO

-- ============================================================================
-- Add a destination Warehouse field to Production Planning History (where
-- the produced item will be stocked). References inv.WarehouseMaster.Warehouse.
-- ============================================================================

IF COL_LENGTH('PRO.PrdItemPlanningHistory', 'Warehouse') IS NULL
BEGIN
    ALTER TABLE [PRO].[PrdItemPlanningHistory] ADD [Warehouse] nvarchar(50) NOT NULL DEFAULT ''
END
GO
