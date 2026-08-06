USE [ERPMega25]
GO

-- ============================================================================
-- Adds PLS.ReportsMaster.IsFastReport (bit, default 1) so each report can
-- declare how it should be printed:
--   1 (default) -- existing FastReport (.frx) flow: call NewReleaseReportApi,
--                  which loads the .frx and renders a PDF via FastReport.
--   0           -- no .frx / report-server dependency; the frontend renders
--                  its own printable view directly (e.g. Cash Flow Report,
--                  whose hand-authored .frx is unverified against the real
--                  FastReport renderer -- this flag lets it work today
--                  without waiting on a NewReleaseReportApi redeploy).
-- Existing reports (Order Print, RMA, Pick Confirm, ...) default to 1,
-- preserving their current behavior untouched.
-- ============================================================================

IF COL_LENGTH('PLS.ReportsMaster', 'IsFastReport') IS NULL
    ALTER TABLE PLS.ReportsMaster ADD IsFastReport BIT NOT NULL DEFAULT 1;
GO

UPDATE PLS.ReportsMaster SET IsFastReport = 0 WHERE ReportName = N'Cash Flow Report';
GO
