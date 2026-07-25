USE [ERPMega25]
GO

-- ============================================================================
-- Order line-item detail, served through the generic GetGridData engine
-- (see APIPlusOperation.sql) using a virtual PageGroupID ('orders_lines')
-- that is NOT a real sidebar page -- it's just a lookup key so the Orders
-- drawer can fetch line details for a specific order via {FILTER} on
-- OrderNumber. Registered as QueryType = 'Detail' (GetGridData accepts both
-- 'Grid' and 'Detail' -- see the matching change in APIPlusOperation.sql).
-- ============================================================================

-- 1. View for the order line detail (verbatim from the user-supplied query)
IF OBJECT_ID('[PLS].[QOrderLinesDetail]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QOrderLinesDetail];
GO

CREATE VIEW [PLS].[QOrderLinesDetail] AS
SELECT        COR.CustomerOrderHeader.OrderNumber, COR.CustomerOrderHeader.OrderState, COR.CustomerOrderHeader.OrderLoadingState, COR.CustomerOrderHeader.DateOrderEntered, COR.CustomerOrderHeader.CustomerNumber,
                         COR.CustomerOrderHeader.CustomerType, COR.CustomerOrderHeader.RequestShipDate, COR.CustomerOrderHeader.TotalLines, COR.CustomerOrderHeader.Salesperson, COR.CustomerOrderHeader.Warehouse,
                         COR.CustomerOrderHeader.TermsCode, COR.CustomerOrderHeader.TermsDescription, COR.CustomerOrderHeader.ShipToID, COR.CustomerOrderHeader.ShipToName, COR.CustomerOrderHeader.ShipToAddress,
                         COR.CustomerOrderHeader.ScheduledShipDate, COR.CustomerOrderHeader.PaymentCode, COR.CustomerOrderHeader.CustomerTaxCode, COR.CustomerOrderHeader.Currency, COR.CustomerOrderHeader.ExchangeRate,
                         COR.CustomerOrderHeader.LastShippingdate, COR.CustomerOrderHeader.ToatalItemAmount, COR.CustomerOrderHeader.TotalDiscount, COR.CustomerOrderHeader.TotalTaxtableAmount, COR.CustomerOrderHeader.TaxAmount,
                          COR.CustomerOrderHeader.TotalFinalAmount, COR.CustomerOrderHeader.TotalWeight, COR.CustomerOrderHeader.WeightUnitOfMessure, COR.CustomerOrderHeader.OrderCarrier, COR.CustomerOrderHeader.BackOrderCode,
                         COR.CustomerOrderHeader.PriceBookDate, COR.CustomerOrderHeader.CreatedByUser, COR.CustomerOrderHeader.CreatedDate, COR.CustomerOrderHeader.LastMaintUser, COR.CustomerOrderHeader.LastMaintDate,
                         COR.CustomerOrderHeader.InUse, COR.CustomerOrderHeader.InUseBy, COR.CustomerOrderHeader.Facility, COR.CustomerOrderHeader.DeleteReasonID, COR.CustomerOrderHeader.OrderTruckType,
                         COR.CustomerOrderHeader.AcceptorRejectReasonID, COR.CustomerOrderHeader.CustomerNote, COR.CustomerOrderHeader.SalesNote, COR.CustomerOrderHeader.CompanyNoteToCustomer,
                         COR.CustomerOrderHeader.AccountingNote, COR.CustomerOrderHeader.LogisticNote, COR.CustomerOrderHeader.InternalNote, COR.CustomerOrderHeader.OrderType, COR.CustomerOrderHeader.OrderReferenceNumber,
                         COR.CustomerOrderHeader.RMANumber, COR.CustomerOrderHeader.CustomerPurchaseOrder, COR.CustomerOrderHeader.CustomerPurchaseOrderDescription, ol.GUID, ol.LineOrderNumber, ol.LineState, ol.LineNumber,
                         ol.LineWarehouse, ol.LineSalesperson, ol.LineCustomerNumber, ol.ItemID, ol.ItemClass, ol.QuantityOrdered, ol.QuantityAllocated, ol.QuantityShipped, ol.QuantityInvoiced, ol.StockingUnitofMeasure, ol.OriginalOrderedQuantity,
                         ol.OriginalOrderedUOM, ol.LineRequestedDate, ol.LineScheduledShipDate, ol.NetPriceTransStocking, ol.NetPriceBaseStocking, ol.NetPriceBaseSelling, ol.NetPriceTransSelling, ol.ListPriceTransStocking,
                         ol.ListPriceBaseStocking, ol.DateEntered, ol.LineAmountTransaction, ol.LineDiscountTransaction, ol.TaxtableAmount, ol.LineTax, ol.LineFinalAmountTransaction, ol.LineShipToID, ol.LineCarrier, ol.LineFacility,
                         ol.LinePriceBookDate, ol.LineCreatedByUser, ol.LineCreatedDate, ol.LineLastMaintUser, ol.LineLastMaintDate, ol.LineWeight, ol.OrderReasonID, ol.LineOrderType, ol.PromotionFlag, ol.RelatedToLine, ol.ChangePriceReasonID,
                         ol.ManualPriceTransStocking, ol.ManualPriceBaseStocking, im.IIMid, im.ItemCode, im.ItemType, im.ItemFamily1, im.ItemFamily2, im.ItemFamily3, im.ItemFamily4, im.NetWeight, im.GrossWeight, im.ItemDescription,
                         im.ItemExtraDescription, im.ItemPurchasingDescription, im.LotControl, im.DefaultWarehouse, im.Barcode, im.StockUM, im.SellingUM, im.SellingConversion, im.ItemTaxCode, im.MinimumBalance, im.Volume, im.Lenght,
                         im.Width, im.Hight, im.PackingID, im.IsNotActive, im.ItemCreatedByUser, im.ItemCreatedDate, im.ItemLastMaintBy, im.ItemLastMaintDate, ol.BarcodeLoading, cm.CustomerExtraName,
                             (SELECT        ISNULL(SUM(QuantityAllocated), 0) AS Expr1
                                FROM            INV.ItemAllocation
                                WHERE        (OrderNumber = ol.LineOrderNumber) AND (ItemID = ol.ItemID)) AS Allocated,
                             (SELECT        itembalance  AS Expr1
                                FROM            INV.ItemBalance
                                WHERE        (ItemID = ol.ItemID) AND (Warehouse = ol.LineWarehouse)) -
                             (SELECT        ISNULL(SUM(QuantityAllocated), 0) AS Expr1
                                FROM            INV.ItemAllocation AS ItemAllocation_1
                                WHERE        (Warehouse = ol.LineWarehouse) AND (ItemID = ol.ItemID)) AS OnHand, ol.QuantityOrdered / im.SellingConversion AS Carton, ol.OfferNumber, ol.OfferInternalID
FROM            COR.CustomerOrderHeader LEFT OUTER JOIN
                         COR.CustomerOrderLine AS ol ON COR.CustomerOrderHeader.OrderNumber = ol.LineOrderNumber LEFT OUTER JOIN
                         INV.ItemMaster AS im ON im.ItemID = ol.ItemID LEFT OUTER JOIN
                         ACR.CustomerMaster AS cm ON cm.CustomerNo = COR.CustomerOrderHeader.CustomerNumber
WHERE        (COR.CustomerOrderHeader.OrderState IN (60, 65, 80));
GO

-- 2. Register the Main Query in QueryMaster -- QuerySQL already has {FILTER}
--    from day one, since it's built directly on GetGridData.
--
-- The virtual 'orders_lines' PageGroupID needs its own row in PagesAndGroups
-- first -- PLS.PageQueries has a real FK to PagesAndGroups(PageGroupID), it's
-- not just a loose string key. This entry is never referenced by nav.js, so
-- it won't ever appear as a real sidebar page.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'orders_lines')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('orders_lines', NULL, 999, N'Order Lines Detail (internal)', N'🔧', N'Internal lookup key for the Orders drawer detail query -- not a real sidebar page', 0);
END

DECLARE @MainQueryID INT;

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Order Lines Detail';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Order Lines Detail';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Order Lines Detail';

INSERT INTO [PLS].[QueryMaster]
(QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES
('Order Lines Detail', '[PLS].[APIPlusOperation]', 'Order Lines Detail', 'Line-item detail (with item master + allocation/on-hand) for the Orders drawer', 'SELECT * FROM PLS.QOrderLinesDetail WHERE 1=1 {FILTER};', 'ERPMega25', 'PLS', 'QOrderLinesDetail', 'Detail', NULL);

SET @MainQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('orders_lines', @MainQueryID);

-- 3. FilterPanel -> column mapping: exact match on OrderNumber, passed by the
--    Orders drawer as LineData.orderNumber (not a user-facing FilterPanel field).
INSERT INTO [PLS].[QueryFilterMappings] (QueryID, FilterType, FromParam, ToParam, GridColumn, DataType, SortOrder)
VALUES (@MainQueryID, 'exact', 'orderNumber', NULL, 'OrderNumber', 'number', 1);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Order Lines Detail';
SELECT * FROM [PLS].[QueryFilterMappings] WHERE QueryID = (SELECT QueryID FROM [PLS].[QueryMaster] WHERE Operation = 'Order Lines Detail');
GO
