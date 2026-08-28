USE [ERPMega25]
GO

-- PLS.QCashFlowGrid is `SELECT * FROM pro.V0070`, but SQL Server caches a
-- view's column list at creation time -- it does not pick up new columns
-- added to the underlying view automatically. pro.V0070 gained
-- WholeSalesTarget / ModernTradeTarget / WholeCollectionTarget /
-- ModernTradeCollectionTarget, so refresh the metadata to expose them.
EXEC sp_refreshview 'PLS.QCashFlowGrid';
GO
