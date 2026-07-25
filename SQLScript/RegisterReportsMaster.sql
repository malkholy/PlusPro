-- Reports Master: catalog of printable reports (Report ID, FileName, linked Page, Key Parameter, and the
-- SQL scripts used to feed each report's data tables, e.g. Header / Lines)
USE [ERPMega25]
GO

-- Drop tables from an earlier iteration of this script (QueryID-junction based, no KeyParam column) --
-- safe to do: these were only just created in this same dev session, no real data yet.
IF EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = 'PLS' AND t.name = 'ReportQueries')
    DROP TABLE [PLS].[ReportQueries];
GO
IF EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = 'PLS' AND t.name = 'ReportsMaster')
    DROP TABLE [PLS].[ReportsMaster];
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = 'PLS' AND t.name = 'ReportsMaster')
BEGIN
    CREATE TABLE [PLS].[ReportsMaster] (
        ReportID     INT IDENTITY(1,1) PRIMARY KEY,
        ReportName   NVARCHAR(150) NOT NULL,
        [FileName]   NVARCHAR(260) NOT NULL,
        PageGroupID  VARCHAR(50) NULL,
        KeyParam     NVARCHAR(100) NULL,
        Description  NVARCHAR(500) NULL,
        CreatedBy    NVARCHAR(100) NULL,
        CreatedDate  DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_ReportsMaster_PagesAndGroups FOREIGN KEY (PageGroupID) REFERENCES [PLS].[PagesAndGroups](PageGroupID)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = 'PLS' AND t.name = 'ReportQueries')
BEGIN
    CREATE TABLE [PLS].[ReportQueries] (
        ReportQueryID INT IDENTITY(1,1) PRIMARY KEY,
        ReportID      INT NOT NULL,
        QueryName     NVARCHAR(150) NOT NULL,
        QuerySQL      NVARCHAR(MAX) NOT NULL,
        SortOrder     INT NOT NULL DEFAULT 0,
        CONSTRAINT FK_ReportQueries_ReportsMaster FOREIGN KEY (ReportID) REFERENCES [PLS].[ReportsMaster](ReportID) ON DELETE CASCADE
    );
END
GO

-- Register the Reports Master page itself under the Settings group
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'reports_master')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('reports_master', 'system_admin_group',
            (SELECT ISNULL(MAX(SortOrder), 40) + 1 FROM [PLS].[PagesAndGroups] WHERE ParentID = 'system_admin_group'),
            N'Reports Master', N'🖨️', N'Catalog of printable reports, their source files, linked page and data queries', 0);
END
GO

-- Seed first report: Pick Release (the existing "NEW RELEASE REPORT.frx" served by NewReleaseReportApi,
-- printed from the Order Details drawer's Print Release button). Queries are copied verbatim from
-- ReportService.cs's LoadHeader/LoadLines SQL (Table1/Table2), just renamed to the @orderNo key param.
DECLARE @PickReleaseReportID INT;

IF NOT EXISTS (SELECT 1 FROM [PLS].[ReportsMaster] WHERE ReportName = N'Pick Release')
BEGIN
    INSERT INTO [PLS].[ReportsMaster] (ReportName, [FileName], PageGroupID, KeyParam, Description, CreatedBy)
    VALUES (N'Pick Release', N'NEW RELEASE REPORT.frx', 'orders', N'orderNo',
            N'New Release / Pick Release report printed from the Order Details drawer', 'system');

    SET @PickReleaseReportID = SCOPE_IDENTITY();

    INSERT INTO [PLS].[ReportQueries] (ReportID, QueryName, QuerySQL, SortOrder)
    VALUES
    (@PickReleaseReportID, N'Header',
N'SELECT
    h.OrderNumber,
    h.OrderState,
    h.OrderLoadingState,
    h.DateOrderEntered,
    h.CustomerNumber,
    h.CustomerType,
    h.RequestShipDate,
    h.TotalLines,
    h.Salesperson,
    h.Warehouse,
    h.TermsCode,
    h.TermsDescription,
    h.ShipToID,
    h.ShipToName,
    h.ShipToAddress,
    h.ScheduledShipDate,
    h.PaymentCode,
    h.CustomerTaxCode,
    h.Currency,
    h.ExchangeRate,
    h.LastShippingdate,
    h.ToatalItemAmount,
    h.TotalDiscount,
    h.TotalTaxtableAmount,
    h.TaxAmount,
    h.TotalFinalAmount,
    h.TotalWeight,
    h.WeightUnitOfMessure,
    h.OrderCarrier,
    h.BackOrderCode,
    h.PriceBookDate,
    h.CreatedByUser,
    h.CreatedDate,
    h.LastMaintUser,
    h.LastMaintDate,
    h.InUse,
    h.InUseBy,
    h.Facility,
    h.DeleteReasonID,
    h.OrderTruckType,
    h.AcceptorRejectReasonID,
    h.CustomerNote,
    h.SalesNote,
    h.CompanyNoteToCustomer,
    h.AccountingNote,
    h.LogisticNote,
    h.InternalNote,
    h.OrderType,
    h.OrderReferenceNumber,
    h.RMANumber,
    h.CustomerPurchaseOrder,
    h.CustomerPurchaseOrderDescription,
    h.OrderChangedLocked,
    CAST(NULL AS NVARCHAR(50)) AS CustomerNationlID, -- no matching column found anywhere in the schema
    h.TaxRegistration,
    h.CountryID,
    h.CountryCode,
    cm.CustomerName,
    cm.CustomerExtraName,
    cm.Phone,
    dn.LoadNumber,
    tm.TruckID,
    tm.TruckNumber,
    drv.DriverName,
    cm.Mobile,
    cm.AdressDetails,
    sm.ManagerName AS SalesName,
    pr.PickByUser
FROM COR.CustomerOrderHeader h
LEFT JOIN ACR.CustomerMaster cm ON cm.CustomerNo = h.CustomerNumber
LEFT JOIN ACR.SalesManagerMaster sm ON sm.SalesID = h.Salesperson
OUTER APPLY (
    SELECT TOP 1 OrderNumber, TruckID, DriverID, LoadNumber
    FROM COR.DeliveryNoteHeader
    WHERE OrderNumber = h.OrderNumber
    ORDER BY LoadNumber DESC
) dn
LEFT JOIN GSE.TruckMaster tm ON tm.TruckID = dn.TruckID
LEFT JOIN GSE.DriverMaster drv ON drv.DriverID = dn.DriverID
OUTER APPLY (
    SELECT TOP 1 PickByUser
    FROM COR.PickRelease
    WHERE OrderNumber = h.OrderNumber
    ORDER BY PickDate DESC
) pr
WHERE h.OrderNumber = @orderNo;', 1),
    (@PickReleaseReportID, N'Lines',
N'SELECT
    ol.LineOrderNumber,
    ol.LineNumber,
    ol.LineWarehouse,
    ol.ItemID,
    im.ItemCode,
    ol.QuantityAllocated,
    im.ItemDescription,
    im.SellingConversion,
    ol.PromotionFlag,
    im.ItemExtraDescription,
    CASE WHEN im.SellingConversion IS NULL OR im.SellingConversion = 0
         THEN NULL ELSE ol.QuantityOrdered / im.SellingConversion END AS QuantityOrderedPerConversion,
    im.SellingUM,
    ol.QuantityOrdered
FROM COR.CustomerOrderLine ol
LEFT JOIN INV.ItemMaster im ON im.ItemID = ol.ItemID
WHERE ol.LineOrderNumber = @orderNo;', 2);
END
GO
