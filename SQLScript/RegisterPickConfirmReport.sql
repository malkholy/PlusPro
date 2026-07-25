-- Register "Pick Confirm" as a second report in Reports Master, printed from the
-- Order Details drawer when the order is in Confirmed state (OrderState = 80).
-- Queries mirror COR.DeliveryNoteHeader/DeliveryNoteLine (created by the SP's
-- 'Confirm Order' operation), parameterized on the report's Key (orderNo).
USE [ERPMega25]
GO

DECLARE @PickConfirmReportID INT;

IF NOT EXISTS (SELECT 1 FROM [PLS].[ReportsMaster] WHERE ReportName = N'Pick Confirm')
BEGIN
    INSERT INTO [PLS].[ReportsMaster] (ReportName, [FileName], PageGroupID, KeyParam, Description, CreatedBy)
    VALUES (N'Pick Confirm', N'PickConfirm.frx', 'orders', N'orderNo',
            N'Pick Confirm / delivery note report printed from the Order Details drawer once the order is Confirmed', 'system');

    SET @PickConfirmReportID = SCOPE_IDENTITY();

    INSERT INTO [PLS].[ReportQueries] (ReportID, QueryName, QuerySQL, SortOrder)
    VALUES
    (@PickConfirmReportID, N'Header',
N'SELECT
    h.OrderNumber,
    h.CustomerNumber,
    h.CustomerType,
    h.Warehouse,
    h.ShipToID,
    h.ShipToAddress,
    h.CreatedByUser,
    h.CreatedDate,
    h.Facility,
    h.TaxRegistration,
    h.CountryID,
    cm.CustomerName,
    cm.CustomerExtraName,
    cm.Phone,
    dn.LoadNumber,
    dn.TruckID,
    tm.TruckNumber,
    drv.DriverName,
    dn.ShipDate,
    dn.TotalLoadLines,
    cm.CustomerSalesPerson,
    dn.TotalWeightShipped,
    dn.Carrier,
    h.OrderTruckType AS TruckType,
    h.ShipToName
FROM COR.CustomerOrderHeader h
LEFT JOIN ACR.CustomerMaster cm ON cm.CustomerNo = h.CustomerNumber
OUTER APPLY (
    SELECT TOP 1 *
    FROM COR.DeliveryNoteHeader
    WHERE OrderNumber = h.OrderNumber
    ORDER BY LoadNumber DESC
) dn
LEFT JOIN GSE.TruckMaster tm ON tm.TruckID = dn.TruckID
LEFT JOIN GSE.DriverMaster drv ON drv.DriverID = dn.DriverID
WHERE h.OrderNumber = @orderNo;', 1),
    (@PickConfirmReportID, N'Lines',
N'SELECT
    dnl.GUID,
    dnl.LineWarehouse,
    dnl.LineCustomerNumber,
    dnl.ItemId AS ItemID,
    dnl.ItemCode,
    col.ItemClass,
    dnl.LineFacility,
    dnl.LineOrderType,
    im.ItemDescription,
    im.ItemExtraDescription,
    im.SellingConversion,
    col.QuantityAllocated AS Allocated,
    dnl.OrderNumber,
    dnl.LoadNumber,
    dnl.LoadLineNumber,
    dnl.OrderLineNumber,
    dnl.ShippedQuantitySelling,
    dnl.ShipQuantityStocking,
    dnl.LineShipDate
FROM COR.DeliveryNoteLine dnl
LEFT JOIN INV.ItemMaster im ON im.ItemID = dnl.ItemId
LEFT JOIN COR.CustomerOrderLine col ON col.LineOrderNumber = dnl.OrderNumber AND col.LineNumber = dnl.OrderLineNumber
WHERE dnl.OrderNumber = @orderNo;', 2);
END
GO
