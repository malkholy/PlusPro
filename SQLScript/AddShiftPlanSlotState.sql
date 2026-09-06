USE [ERPMega25]
GO

-- ============================================================================
-- Add SlotState to PRO.PrdItemPlanningShiftPlan -- a per-slot completion
-- state, independent of the Shop Order it's linked to (the link itself is
-- untouched by this). 0 = Open (default), 20 = Closed (same numbering
-- convention as Pro.ShopOrderState's Closed=20, for consistency).
--
-- Once Closed, every slot-mutating operation (Delete/Edit Shift Plan Slot,
-- Shift Machine Plan, Split Shift Plan Slot) refuses to touch that slot --
-- lets a user mark a slot "done" and move on to the next one without
-- worrying about accidentally editing/deleting/moving it later.
-- ============================================================================

IF COL_LENGTH('PRO.PrdItemPlanningShiftPlan', 'SlotState') IS NULL
BEGIN
    ALTER TABLE [PRO].[PrdItemPlanningShiftPlan] ADD [SlotState] int NOT NULL CONSTRAINT DF_PrdItemPlanningShiftPlan_SlotState DEFAULT (0)
END
GO
