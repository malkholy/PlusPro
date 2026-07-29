-- Register "Order Print" as a report in Reports Master, printed from the
-- Customer Order drawer (CustomerOrderDrawer.jsx). Header/Lines queries are
-- the user-supplied SQL verbatim, just parameterized on the report's Key
-- (orderNo) -- same KeyParam name already used by the Pick Release/Pick
-- Confirm reports for the same OrderNumber concept (see RegisterReportsMaster.sql).
USE [ERPMega25]
GO

DECLARE @OrderPrintReportID INT;

IF NOT EXISTS (SELECT 1 FROM [PLS].[ReportsMaster] WHERE ReportName = N'Order Print')
BEGIN
    INSERT INTO [PLS].[ReportsMaster] (ReportName, [FileName], PageGroupID, KeyParam, Description, CreatedBy)
    VALUES (N'Order Print', N'OrderPrint.frx', 'customer_order', N'orderNo',
            N'Customer Order print report (header with delivery/driver/barcode info + lines), printed from the Customer Order drawer', 'system');

    SET @OrderPrintReportID = SCOPE_IDENTITY();

    INSERT INTO [PLS].[ReportQueries] (ReportID, QueryName, QuerySQL, SortOrder)
    VALUES
    (@OrderPrintReportID, N'Header',
N'SELECT        coh.OrderNumber, coh.OrderState, coh.OrderLoadingState, coh.DateOrderEntered, coh.CustomerNumber, coh.CustomerType, coh.RequestShipDate, coh.TotalLines, coh.Salesperson, coh.Warehouse, coh.TermsCode,
                         coh.TermsDescription, coh.ShipToID, coh.ShipToName, coh.ShipToAddress, coh.ScheduledShipDate, coh.PaymentCode, coh.CustomerTaxCode, coh.Currency, coh.ExchangeRate, coh.LastShippingdate, coh.ToatalItemAmount,
                         coh.TotalDiscount, coh.TotalTaxtableAmount, coh.TaxAmount, coh.TotalFinalAmount, coh.TotalWeight, coh.WeightUnitOfMessure, coh.OrderCarrier, coh.BackOrderCode, coh.PriceBookDate, coh.CreatedByUser, coh.CreatedDate,
                         coh.LastMaintUser, coh.LastMaintDate, coh.InUse, coh.InUseBy, coh.Facility, coh.DeleteReasonID, coh.OrderTruckType, coh.AcceptorRejectReasonID, coh.CustomerNote, coh.SalesNote, coh.CompanyNoteToCustomer,
                         coh.AccountingNote, coh.LogisticNote, coh.InternalNote, coh.OrderType, coh.OrderReferenceNumber, coh.RMANumber, coh.CustomerPurchaseOrder, coh.CustomerPurchaseOrderDescription, coh.OrderChangedLocked,
                         coh.CustomerNationlID, coh.TaxRegistration, coh.CountryID, coh.CountryCode, cm.CustomerName, cm.CustomerExtraName, cm.Phone, dnh.LoadNumber, dnh.TruckID, tm.TruckNumber, dm.DriverName, cm.Mobile,
                         cm.AdressDetails, sm.SalesName, pr.PickByUser, BH.BarcodeState,
                             (SELECT        StateDescription
                                FROM            COR.BarcodeCustomerOrderState AS ST
                                WHERE        (StateID = BH.BarcodeState)) AS BarcodeDes
FROM            COR.CustomerOrderHeader AS coh LEFT OUTER JOIN
                         ACR.CustomerMaster AS cm ON coh.CustomerNumber = cm.CustomerNo LEFT OUTER JOIN
                         COR.DeliveryNoteHeader AS dnh ON dnh.OrderNumber = coh.OrderNumber LEFT OUTER JOIN
                         GSE.TruckMaster AS tm ON tm.TruckID = dnh.TruckID LEFT OUTER JOIN
                         GSE.DriverMaster AS dm ON dm.DriverID = dnh.DriverID LEFT OUTER JOIN
                         ACR.SalesMaster AS sm ON sm.SalesID = coh.Salesperson LEFT OUTER JOIN
                         COR.PickRelease AS pr ON pr.OrderNumber = coh.OrderNumber AND pr.OrderLineNumber = 1 LEFT OUTER JOIN
                         COR.BarcodeCustomerOrderHeader AS BH ON BH.OrderNo = coh.OrderNumber
WHERE           coh.OrderNumber = @orderNo;', 1),
    (@OrderPrintReportID, N'Lines',
N'SELECT        col.GUID, col.LineOrderNumber, col.LineState, col.LineNumber, col.LineWarehouse, col.LineSalesperson, col.LineCustomerNumber, col.ItemID, col.ItemCode, col.ItemClass, col.QuantityOrdered, col.QuantityAllocated,
                         col.QuantityShipped, col.QuantityInvoiced, col.StockingUnitofMeasure, col.OriginalOrderedQuantity, col.OriginalOrderedUOM, col.LineRequestedDate, col.LineScheduledShipDate, col.NetPriceTransStocking,
                         col.NetPriceBaseStocking, col.NetPriceBaseSelling, col.NetPriceTransSelling, col.NetPriceTransOrderdUM, col.ListPriceTransStocking, col.ListPriceBaseStocking, col.ListPriceTransOrderdUM, col.DateEntered,
                         col.LineAmountTransaction, col.LineDiscountTransaction, col.TaxtableAmount, col.LineTax, col.LineFinalAmountTransaction, col.LineShipToID, col.LineCarrier, col.LineFacility, col.LinePriceBookDate, col.LineCreatedByUser,
                         col.LineCreatedDate, col.LineLastMaintUser, col.LineLastMaintDate, col.LineWeight, col.OrderReasonID, col.LineOrderType, col.PromotionFlag, col.RelatedToLine, col.ChangePriceReasonID, col.ManualPriceTransStocking,
                         col.ManualPriceBaseStocking, col.SellingUnitOfMeasure, col.ListPriceTransSelling, im.ItemDescription, im.ItemExtraDescription, im.SellingConversion, coh.OrderReferenceNumber,

                          (  -1* ( case when col.LineAmountTransaction=0 then 0 else
                                col.LineDiscountTransaction / col.LineAmountTransaction end ) )*100 as DiscountPer ,



                            (SELECT        SUM(QuantityAllocated) AS Expr1
                               FROM            INV.ItemAllocation AS ia
                               WHERE        (col.LineNumber = LineNumber) AND (col.LineOrderNumber = OrderNumber) AND (col.ItemID = ItemID)) AS Allocated
FROM            COR.CustomerOrderLine AS col LEFT OUTER JOIN
                         COR.CustomerOrderHeader AS coh ON coh.OrderNumber = col.LineOrderNumber LEFT OUTER JOIN
                         INV.ItemMaster AS im ON col.ItemID = im.ItemID
WHERE           col.LineOrderNumber = @orderNo;', 2);
END
GO

SELECT * FROM [PLS].[ReportsMaster] WHERE ReportName = N'Order Print';
SELECT ReportQueryID, QueryName, SortOrder FROM [PLS].[ReportQueries]
WHERE ReportID = (SELECT ReportID FROM [PLS].[ReportsMaster] WHERE ReportName = N'Order Print');
GO
