-- Register "RMA" as a report in Reports Master, printed from the RMA drawer
-- once the RMA is Confirmed (RMAState = 10). Header/Lines queries reuse the
-- views already registered for the RMA grid/detail (PLS.QRMAHeaderGrid /
-- PLS.QRMALineDetail), just parameterized on the report's Key (rmaNo).
USE [ERPMega25]
GO

DECLARE @RMAReportID INT;

IF NOT EXISTS (SELECT 1 FROM [PLS].[ReportsMaster] WHERE ReportName = N'RMA')
BEGIN
    INSERT INTO [PLS].[ReportsMaster] (ReportName, [FileName], PageGroupID, KeyParam, Description, CreatedBy)
    VALUES (N'RMA', N'RMA.frx', 'rma', N'rmaNo',
            N'RMA (Customer Return) report printed from the RMA drawer once the RMA is Confirmed', 'system');

    SET @RMAReportID = SCOPE_IDENTITY();

    INSERT INTO [PLS].[ReportQueries] (ReportID, QueryName, QuerySQL, SortOrder)
    VALUES
    (@RMAReportID, N'Header', N'SELECT * FROM PLS.QRMAHeaderGrid WHERE RMANumber = @rmaNo;', 1),
    (@RMAReportID, N'Lines', N'SELECT * FROM PLS.QRMALineDetail WHERE RMANumber = @rmaNo;', 2);
END
GO
