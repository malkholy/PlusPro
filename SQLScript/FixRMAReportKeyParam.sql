-- PLS.ReportsMaster.KeyParam for the RMA report is now "RMANumber" (changed from
-- the original "rmaNo" registration -- confirmed live). NewReleaseReportApi's
-- ReportService binds the SQL parameter as "@" + KeyParam, so the query text must
-- reference @RMANumber, not @rmaNo, or SQL Server rejects it with
-- "Must declare the scalar variable '@rmaNo'".
USE [ERPMega25]
GO

DECLARE @RMAReportID INT = (SELECT ReportID FROM [PLS].[ReportsMaster] WHERE ReportName = N'RMA');

UPDATE [PLS].[ReportQueries]
SET QuerySQL = REPLACE(QuerySQL, N'@rmaNo', N'@RMANumber')
WHERE ReportID = @RMAReportID;
GO

SELECT ReportQueryID, QueryName, QuerySQL FROM [PLS].[ReportQueries]
WHERE ReportID = (SELECT ReportID FROM [PLS].[ReportsMaster] WHERE ReportName = N'RMA');
GO
