-- RMA.frx's Dictionary (Table1/Table2) was designed against these exact queries
-- (different column set/joins than PLS.QRMAHeaderGrid/QRMALineDetail -- e.g. joins
-- ItemMaster via ItemCode not ItemID, only pulls ItemDescription not
-- ItemExtraDescription/StockUM). Swap ReportID 3's ReportQueries to match verbatim,
-- adding the WHERE @rmaNo filter (missing from the pasted design-time queries) so
-- each report run only pulls the one RMA being printed instead of every row in the table.
USE [ERPMega25]
GO

DECLARE @RMAReportID INT = (SELECT ReportID FROM [PLS].[ReportsMaster] WHERE ReportName = N'RMA');

DELETE FROM [PLS].[ReportQueries] WHERE ReportID = @RMAReportID;

INSERT INTO [PLS].[ReportQueries] (ReportID, QueryName, QuerySQL, SortOrder)
VALUES
(@RMAReportID, N'Header',
N'SELECT        a.RCH, a.RMANumber, a.OrderType, a.RMAState, a.ReturnedDate, a.ReturnedType, a.ReturnedCustomer, a.Facility, a.Note, a.RMACreatedBy, a.RMACreatedDate, a.RMALastMaint, a.RMALastMaintDate, a.CustomerOrder,
                         b.CustomerName
FROM            COR.RMAHeader AS a LEFT OUTER JOIN
                         ACR.CustomerMaster AS b ON a.ReturnedCustomer = b.CustomerNo
WHERE a.RMANumber = @rmaNo;', 1),
(@RMAReportID, N'Lines',
N'SELECT        a.RCL, a.RMANumber, a.LineState, a.Warehouse, a.Line, a.ItemID, a.ItemCode, a.QuantityReturned, a.QuantityConfirmed, a.QuantityInvoiced, a.UnitOfMeasure, a.CustomerNo, a.LineCreatedBy, a.LineCreatedDate,
                         a.LineLastMaintBy, a.LineLastMaintDate, a.TransactionBy, a.TransactionDate, a.CustomerOrderNumber, a.RMAReasonID, a.LineNote, b.ItemDescription, c.ReasonDescription
FROM            COR.RMALine AS a LEFT OUTER JOIN
                         INV.ItemMaster AS b ON a.ItemCode = b.ItemCode LEFT OUTER JOIN
                         COR.RMAReasonMaster AS c ON c.ReasonID = a.RMAReasonID
WHERE a.RMANumber = @rmaNo;', 2);
GO

SELECT * FROM [PLS].[ReportQueries] WHERE ReportID = (SELECT ReportID FROM [PLS].[ReportsMaster] WHERE ReportName = N'RMA');
GO
