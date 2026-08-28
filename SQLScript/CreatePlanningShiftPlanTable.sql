USE [ERPMega25]
GO

-- ============================================================================
-- Persists the computed Shift Plan (one row per shift) for each Production
-- Planning History record, keyed by PlanningID.
-- ============================================================================

IF OBJECT_ID('PRO.PrdItemPlanningShiftPlan', 'U') IS NULL
BEGIN
    CREATE TABLE [PRO].[PrdItemPlanningShiftPlan] (
        [ShiftPlanID]   int IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PlanningID]    int NOT NULL,
        [ItemCode]      nvarchar(50) NOT NULL,
        [ShiftIndex]    int NOT NULL,
        [ShiftDate]     date NOT NULL,
        [ShiftNo]       int NOT NULL,
        [StartTime]     datetime NOT NULL,
        [EndTime]       datetime NOT NULL,
        [PlannedQty]    decimal(18,5) NOT NULL,
        [CumulativeQty] decimal(18,5) NOT NULL,
        [CreatedBy]     nvarchar(150) NOT NULL,
        [CreatedDate]   datetime NOT NULL,
        CONSTRAINT FK_PrdItemPlanningShiftPlan_PlanningID FOREIGN KEY ([PlanningID])
            REFERENCES [PRO].[PrdItemPlanningHistory] ([PlanningID])
    );

    CREATE INDEX IX_PrdItemPlanningShiftPlan_PlanningID ON [PRO].[PrdItemPlanningShiftPlan] ([PlanningID]);
END
GO

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='PRO' AND TABLE_NAME='PrdItemPlanningShiftPlan' ORDER BY ORDINAL_POSITION;
GO
