USE [ERPMega25]
GO

-- ============================================================================
-- Add QtyIssued to PRO.PrdItemPlanningShiftPlan -- tracks how much of THIS
-- specific shift slot's PlannedQty has actually been produced/issued, as
-- opposed to the Shop Order header's QuantiftyIssued which is a running
-- total across every slot the order covers (a single order can span
-- multiple shifts). Updated by Show Plan's "Production" feature
-- (ProductionBulkModal.jsx) via the new "Update Shift Plan Issued Qty"
-- operation, additive per release same as the header's own Qty Issued.
-- ============================================================================

IF COL_LENGTH('PRO.PrdItemPlanningShiftPlan', 'QtyIssued') IS NULL
BEGIN
    ALTER TABLE [PRO].[PrdItemPlanningShiftPlan] ADD [QtyIssued] decimal(18,5) NOT NULL CONSTRAINT DF_PrdItemPlanningShiftPlan_QtyIssued DEFAULT (0)
END
GO
