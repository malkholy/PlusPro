USE [ERPMega25]
GO

-- ============================================================================
-- Tracks how many times a Shop Order has been issued to production (partial
-- releases). E.g. Qty Required 150 -- issue 100 now (release #1), issue 40
-- more later (release #2). QuantiftyIssued/ChildQuantityIssued already hold
-- the running totals; this just counts how many Issue Shop Order calls have
-- happened.
-- ============================================================================

IF COL_LENGTH('pro.ShopOrderHeader', 'NumberOfReleases') IS NULL
    ALTER TABLE pro.ShopOrderHeader ADD NumberOfReleases int NOT NULL DEFAULT 0;
GO

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pro' AND TABLE_NAME = 'ShopOrderHeader' AND COLUMN_NAME = 'NumberOfReleases';
GO
