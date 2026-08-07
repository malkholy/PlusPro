USE [ERPMega25]
GO

-- pro.V0070 renamed TotalDueVendorInvoices/TotalDueCustomerInvoices to
-- ...MonthEnding, but PLS.QCashFlowGrid ("SELECT * FROM pro.V0070") still
-- exposed the old names -- SQL Server caches a SELECT * view's expanded
-- column list at creation time and doesn't pick up underlying renames until
-- the view is refreshed. Drop+recreate (same as the original definition) to
-- force SQL Server to re-resolve the column list against the current
-- pro.V0070 schema.
IF OBJECT_ID('[PLS].[QCashFlowGrid]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QCashFlowGrid];
GO

CREATE VIEW [PLS].[QCashFlowGrid] AS
SELECT * FROM pro.V0070;
GO
