USE [ERPMega25]
GO

-- ============================================================================
-- Add ShopOrderNo to PRO.PrdItemPlanningShiftPlan -- lets a planned shift be
-- linked to the Shop Order created for it. Nullable: not every shift has a
-- shop order yet.
-- ============================================================================

IF COL_LENGTH('PRO.PrdItemPlanningShiftPlan', 'ShopOrderNo') IS NULL
BEGIN
    ALTER TABLE [PRO].[PrdItemPlanningShiftPlan] ADD [ShopOrderNo] int NULL
END
GO
