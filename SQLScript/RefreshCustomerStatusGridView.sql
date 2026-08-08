USE [ERPMega25]
GO

-- PRO.V0090 added a new PartnerProfit column, but PLS.QCustomerStatusGrid
-- ("SELECT * FROM PRO.V0090") still doesn't expose it -- SQL Server caches
-- a SELECT * view's column list at creation time and doesn't pick up
-- underlying additions until the view is refreshed. Drop+recreate (same
-- definition as RegisterCustomerStatus.sql) to force re-resolution.
IF OBJECT_ID('[PLS].[QCustomerStatusGrid]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QCustomerStatusGrid];
GO

CREATE VIEW [PLS].[QCustomerStatusGrid] AS
SELECT * FROM PRO.V0090;
GO
