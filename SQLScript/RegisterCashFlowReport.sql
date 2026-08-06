USE [ERPMega25]
GO

-- ============================================================================
-- "Cash Flow Report" -- prints one month's cash-flow summary (pro.V0070),
-- keyed by YearMonth (e.g. 202601), matching the FastReport report-server
-- architecture (PLS.ReportsMaster/ReportQueries -> NewReleaseReportApi ->
-- CashFlow.frx). Single flat row per key, unlike the header+lines reports
-- (Order Print, Pick Confirm) -- Table1 is just the one matching V0070 row.
-- ============================================================================

DECLARE @CashFlowReportID INT;

IF NOT EXISTS (SELECT 1 FROM [PLS].[ReportsMaster] WHERE ReportName = N'Cash Flow Report')
BEGIN
    INSERT INTO [PLS].[ReportsMaster] (ReportName, [FileName], PageGroupID, KeyParam, Description, CreatedBy)
    VALUES (N'Cash Flow Report', N'CashFlow.frx', 'cash_flow', N'yearMonth',
            N'Cash Flow summary report for one month (pro.V0070), printed from the Cash Flow page', 'system');

    SET @CashFlowReportID = SCOPE_IDENTITY();

    INSERT INTO [PLS].[ReportQueries] (ReportID, QueryName, QuerySQL, SortOrder)
    VALUES
    (@CashFlowReportID, N'Table1', N'SELECT * FROM pro.V0070 WHERE YearMonth = @yearMonth;', 1);
END
GO

SELECT * FROM [PLS].[ReportsMaster] WHERE ReportName = N'Cash Flow Report';
GO
