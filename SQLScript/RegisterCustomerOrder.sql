USE [ERPMega25]
GO

-- ============================================================================
-- Customer Order: a Customer-Service-facing, read-only header+lines browse
-- page onto COR.CustomerOrderHeader/COR.CustomerOrderLine -- the same base
-- tables the Loading module's "Orders" page (loading_orders_group) already
-- uses, but with a much broader column set (project/governorate/city names,
-- reject reason, item families, etc.) tailored for Customer Service staff,
-- under its own new sidebar group. Explicitly scoped to Grid + Detail only
-- (GetGridData, read-only) -- any New/Edit/Delete/state-transition operations
-- are deferred, per the user's "operations will discuss it later".
-- ============================================================================

-- 1. Header view -- verbatim from the user-supplied query.
IF OBJECT_ID('[PLS].[QCustomerOrderHeaderGrid]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QCustomerOrderHeaderGrid];
GO

CREATE VIEW [PLS].[QCustomerOrderHeaderGrid] AS
SELECT        a.OrderNumber, a.OrderState, a.OrderLoadingState, a.DateOrderEntered, a.CustomerNumber, a.CustomerType, a.RequestShipDate, a.TotalLines, a.Salesperson, a.Warehouse, a.TermsCode, a.TermsDescription, a.ShipToID,
                         a.ShipToName, a.ShipToAddress, a.ScheduledShipDate, a.PaymentCode, a.CustomerTaxCode, a.Currency, a.ExchangeRate, a.LastShippingdate, a.ToatalItemAmount, a.TotalDiscount, a.TotalTaxtableAmount, a.TaxAmount,
                         a.TotalFinalAmount, a.TotalWeight, a.WeightUnitOfMessure, a.OrderCarrier, a.BackOrderCode, a.PriceBookDate, a.CreatedByUser, a.CreatedDate, a.LastMaintUser, a.LastMaintDate, a.InUse, a.InUseBy, a.Facility,
                         a.DeleteReasonID, a.OrderTruckType, a.AcceptorRejectReasonID, a.CustomerNote, a.SalesNote, a.CompanyNoteToCustomer, a.AccountingNote, a.LogisticNote, a.InternalNote, a.OrderType, a.OrderReferenceNumber,
                         a.RMANumber, a.CustomerPurchaseOrder, a.CustomerPurchaseOrderDescription, a.OrderChangedLocked, a.CustomerNationlID, a.TaxRegistration, a.CountryID, a.CountryCode, b.CustomerName, b.CustomerExtraName,
                         b.ContactName, b.PaymentTerm, b.PaymentType, b.CreditLimitAmount, b.DaysCreditLimit, c.ShipToGovernorateID, c.ShipToCityID, e.SalesName, e.SalesID, a.DeletedBy, a.ProjectID, a.PriceType,
                             (SELECT        PriceTypeDescription
                               FROM            ACR.PriceTypeMaster AS pt
                               WHERE        (PriceTypeID = a.PriceType)) AS PriceTypeDescription,
                             (SELECT        ProjectName
                               FROM            COR.CustomerProjectHistory AS cph
                               WHERE        (CustomerNo = a.CustomerNumber) AND (ProjectID = a.ProjectID)) AS ProjectName,
                             (SELECT        StateDescription
                               FROM            COR.CustomerOrderState AS d
                               WHERE        (StateValue = a.OrderState) AND (Type = 'H')) AS StateDescription,
                             (SELECT        GovernorateArabicName
                               FROM            dbo.GovernorateMaster AS x
                               WHERE        (GovernorateId = c.ShipToGovernorateID)) AS GovernorateArabicName,
                             (SELECT        CityArabicName
                               FROM            dbo.CityMaster AS x
                               WHERE        (CityID = c.ShipToCityID)) AS CityArabicName, CONVERT(time, a.CreatedDate) AS CreatedTime,
                             (SELECT        CustomerOrderReasonDescription
                               FROM            COR.CustomerOrderReasonMaster AS x
                               WHERE        (CustomerOrderReasonID = a.DeleteReasonID) AND (CustomerOrderReasonType = 'R')) AS RejectReason, b.AccountantID, a.OrginalOrderNumber, ISNULL
                             ((SELECT        SUM(x.QuantityOrdered / m.SellingConversion * m.GrossWeightSellingUM) AS Expr1
                                 FROM            COR.CustomerOrderLine AS x LEFT OUTER JOIN
                                                          INV.ItemMaster AS m ON m.ItemID = x.ItemID
                                 WHERE        (x.LineOrderNumber = a.OrderNumber)), 0) AS TotalWeightSellingUM
FROM            COR.CustomerOrderHeader AS a LEFT OUTER JOIN
                         ACR.CustomerMaster AS b ON a.CustomerNumber = b.CustomerNo LEFT OUTER JOIN
                         ACR.CustomerShipToMaster AS c ON a.ShipToID = c.ShipToID LEFT OUTER JOIN
                         ACR.SalesMaster AS e ON e.SalesID = a.Salesperson;
GO

-- 2. Line view -- verbatim from the user-supplied query.
IF OBJECT_ID('[PLS].[QCustomerOrderLineDetail]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QCustomerOrderLineDetail];
GO

CREATE VIEW [PLS].[QCustomerOrderLineDetail] AS
SELECT        a.OrderNumber, a.OrderState, a.OrderLoadingState, a.DateOrderEntered, a.CustomerNumber, a.CustomerType, a.RequestShipDate, a.TotalLines, a.Salesperson, a.Warehouse, a.TermsCode, a.TermsDescription, a.ShipToID,
                         a.ShipToName, a.ShipToAddress, a.ScheduledShipDate, a.PaymentCode, a.CustomerTaxCode, a.Currency, a.ExchangeRate, a.LastShippingdate, a.ToatalItemAmount, a.TotalDiscount, a.TotalTaxtableAmount, a.TaxAmount,
                         a.TotalFinalAmount, a.TotalWeight, a.WeightUnitOfMessure, a.OrderCarrier, a.BackOrderCode, a.PriceBookDate, a.CreatedByUser, a.CreatedDate, a.LastMaintUser, a.LastMaintDate, a.InUse, a.InUseBy, a.Facility,
                         a.DeleteReasonID, a.OrderTruckType, a.AcceptorRejectReasonID, a.CustomerNote, a.SalesNote, a.CompanyNoteToCustomer, a.AccountingNote, a.LogisticNote, a.InternalNote, a.OrderType, a.OrderReferenceNumber,
                         a.RMANumber, a.CustomerPurchaseOrder, a.CustomerPurchaseOrderDescription, a.OrderChangedLocked, a.CustomerNationlID, a.TaxRegistration, a.CountryID, a.CountryCode, a.PriceType, a.DeletedBy, b.CustomerName,
                         b.CustomerExtraName, b.ContactName, b.PaymentTerm, b.PaymentType, b.CreditLimitAmount, b.DaysCreditLimit, c.ShipToGovernorateID, c.ShipToCityID, e.SalesName, e.SalesID, z.GUID, z.LineOrderNumber, z.LineState,
                         z.LineNumber, z.LineWarehouse, z.LineSalesperson, z.LineCustomerNumber, z.ItemID, z.ItemCode, z.ItemClass, z.QuantityOrdered, z.QuantityAllocated, z.QuantityShipped, z.QuantityInvoiced, z.StockingUnitofMeasure,
                         z.OriginalOrderedQuantity, z.OriginalOrderedUOM, z.LineRequestedDate, z.LineScheduledShipDate, z.NetPriceTransStocking, z.NetPriceBaseStocking, z.NetPriceBaseSelling, z.NetPriceTransSelling, z.NetPriceTransOrderdUM,
                         z.ListPriceTransStocking, z.ListPriceBaseStocking, z.ListPriceTransOrderdUM, z.DateEntered, z.LineAmountTransaction, z.LineDiscountTransaction, z.TaxtableAmount, z.LineTax, z.LineFinalAmountTransaction, z.LineShipToID,
                         z.LineCarrier, z.LineFacility, z.LinePriceBookDate, z.LineCreatedByUser, z.LineCreatedDate, z.LineLastMaintUser, z.LineLastMaintDate, z.LineWeight, z.OrderReasonID, z.LineOrderType, z.PromotionFlag, z.RelatedToLine,
                         z.ChangePriceReasonID, z.ManualPriceTransStocking, z.ManualPriceBaseStocking, z.SellingUnitOfMeasure, z.ListPriceTransSelling,
                             (SELECT        StateDescription
                                FROM            COR.CustomerOrderState AS d
                                WHERE        (StateValue = a.OrderState) AND (Type = 'H')) AS StateDescription,
                             (SELECT        GovernorateArabicName
                                FROM            dbo.GovernorateMaster AS x
                                WHERE        (GovernorateId = c.ShipToGovernorateID)) AS GovernorateArabicName,
                             (SELECT        CityArabicName
                                FROM            dbo.CityMaster AS x
                                WHERE        (CityID = c.ShipToGovernorateID)) AS CityArabicName, y.ItemDescription, y.ItemExtraDescription, y.ItemType, y.Barcode, y.ItemFamily1, y.ItemFamily2, y.ItemFamily3, y.ItemFamily4,
                             (SELECT        FamilyDescription
                                FROM            INV.FamilyMaster AS yy
                                WHERE        (FamilyID = y.ItemFamily1)) AS FamilyL1,
                             (SELECT        FamilyDescription
                                FROM            INV.FamilyMaster AS yy
                                WHERE        (FamilyID = y.ItemFamily2)) AS FamilyL2,
                             (SELECT        FamilyDescription
                                FROM            INV.FamilyMaster AS yy
                                WHERE        (FamilyID = y.ItemFamily3)) AS FamilyL3,
                             (SELECT        FamilyDescription
                                FROM            INV.FamilyMaster AS yy
                                WHERE        (FamilyID = y.ItemFamily4)) AS FamilyL4, b.AccountantID
FROM            COR.CustomerOrderHeader AS a LEFT OUTER JOIN
                         ACR.CustomerMaster AS b ON a.CustomerNumber = b.CustomerNo LEFT OUTER JOIN
                         ACR.CustomerShipToMaster AS c ON a.ShipToID = c.ShipToID LEFT OUTER JOIN
                         ACR.SalesMaster AS e ON e.SalesID = a.Salesperson LEFT OUTER JOIN
                         COR.CustomerOrderLine AS z ON z.LineOrderNumber = a.OrderNumber LEFT OUTER JOIN
                         INV.ItemMaster AS y ON y.ItemID = z.ItemID;
GO

-- 3. New top-level sidebar group: Customer Service.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'customer_service_group')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('customer_service_group', NULL, 60, N'Customer Service', N'🎧', N'Customer Service pages', 1);
END
GO

-- 4. Register the real sidebar page, under Customer Service.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'customer_order')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('customer_order', 'customer_service_group', 1, N'Customer Order', N'🧾', N'Customer Order header + lines (read-only, Customer Service view)', 0);
END
GO

-- 5. Register the virtual PageGroupID for line detail -- internal lookup key only.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'customer_order_lines')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('customer_order_lines', NULL, 999, N'Customer Order Lines Detail (internal)', N'🔧', N'Internal lookup key for the Customer Order drawer detail query -- not a real sidebar page', 0);
END
GO

-- 6. Register the Grid query (header).
DECLARE @COQueryID INT;

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Customer Order Grid';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Customer Order Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Customer Order Grid';

INSERT INTO [PLS].[QueryMaster]
(QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES
('Customer Order Grid', '[PLS].[APIPlusOperation]', 'Customer Order Grid', 'Customer Order header grid (Customer Service view)', 'SELECT * FROM PLS.QCustomerOrderHeaderGrid WHERE 1=1 {FILTER};', 'ERPMega25', 'PLS', 'QCustomerOrderHeaderGrid', 'Grid', NULL);

SET @COQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('customer_order', @COQueryID);

INSERT INTO [PLS].[QueryFilterMappings] (QueryID, FilterType, FromParam, ToParam, GridColumn, DataType, SortOrder)
VALUES
(@COQueryID, 'range', 'startDate', 'endDate', 'DateOrderEntered', 'date', 1);
GO

-- 7. Register the Detail query (lines), keyed by OrderNumber.
DECLARE @COLQueryID INT;

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Customer Order Line Detail';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Customer Order Line Detail';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Customer Order Line Detail';

INSERT INTO [PLS].[QueryMaster]
(QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES
('Customer Order Line Detail', '[PLS].[APIPlusOperation]', 'Customer Order Line Detail', 'Line-item detail (with item master + families) for the Customer Order drawer', 'SELECT * FROM PLS.QCustomerOrderLineDetail WHERE 1=1 {FILTER};', 'ERPMega25', 'PLS', 'QCustomerOrderLineDetail', 'Detail', NULL);

SET @COLQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('customer_order_lines', @COLQueryID);

INSERT INTO [PLS].[QueryFilterMappings] (QueryID, FilterType, FromParam, ToParam, GridColumn, DataType, SortOrder)
VALUES
(@COLQueryID, 'exact', 'orderNumber', NULL, 'OrderNumber', 'number', 1);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation IN ('Customer Order Grid', 'Customer Order Line Detail');
GO
