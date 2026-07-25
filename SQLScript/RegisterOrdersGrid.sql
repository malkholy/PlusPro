USE [ERPMega25]
GO

-- ============================================================================
-- "Loading Orders" group + "Orders" grid page, registered directly on the
-- generic GetGridData engine (see APIPlusOperation.sql) -- no hand-written
-- IF block needed.
-- ============================================================================

-- 1. View for the main grid (verbatim from the user-supplied query)
IF OBJECT_ID('[PLS].[QOrdersGrid]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QOrdersGrid];
GO

CREATE VIEW [PLS].[QOrdersGrid] AS
SELECT        COR.CustomerOrderHeader.OrderNumber, COR.CustomerOrderHeader.OrderState, COR.CustomerOrderHeader.OrderLoadingState, COR.CustomerOrderHeader.DateOrderEntered, COR.CustomerOrderHeader.CustomerNumber,
                         COR.CustomerOrderHeader.CustomerType, COR.CustomerOrderHeader.RequestShipDate, COR.CustomerOrderHeader.TotalLines, COR.CustomerOrderHeader.Salesperson, COR.CustomerOrderHeader.Warehouse,
                         COR.CustomerOrderHeader.TermsCode, COR.CustomerOrderHeader.TermsDescription, COR.CustomerOrderHeader.ShipToID, COR.CustomerOrderHeader.ShipToName, COR.CustomerOrderHeader.ShipToAddress,
                         COR.CustomerOrderHeader.ScheduledShipDate, COR.CustomerOrderHeader.LastShippingdate, COR.CustomerOrderHeader.TotalWeight, COR.CustomerOrderHeader.WeightUnitOfMessure,
                         COR.CustomerOrderHeader.OrderCarrier, COR.CustomerOrderHeader.BackOrderCode, COR.CustomerOrderHeader.PriceBookDate, COR.CustomerOrderHeader.InUse, COR.CustomerOrderHeader.InUseBy,
                         COR.CustomerOrderHeader.Facility, COR.CustomerOrderHeader.DeleteReasonID, COR.CustomerOrderHeader.OrderTruckType, COR.CustomerOrderHeader.AcceptorRejectReasonID, COR.CustomerOrderHeader.CustomerNote,
                         COR.CustomerOrderHeader.SalesNote, COR.CustomerOrderHeader.CompanyNoteToCustomer, COR.CustomerOrderHeader.AccountingNote, COR.CustomerOrderHeader.LogisticNote, COR.CustomerOrderHeader.InternalNote,
                         COR.CustomerOrderHeader.OrderType, COR.CustomerOrderHeader.OrderReferenceNumber, COR.CustomerOrderHeader.RMANumber, COR.CustomerOrderHeader.CustomerPurchaseOrder,
                         COR.CustomerOrderHeader.CustomerPurchaseOrderDescription, ACR.CustomerMaster.CustomerName, ACR.CustomerMaster.CustomerExtraName, ISNULL(COR.DeliveryNoteHeader.LoadNumber, 0) AS LoadNumber,
                         COR.CustomerOrderState.StateDescription AS LoadingOrderStateDescription, x.StateDescription AS OrderStateDescription, COR.DeliveryNoteHeader.WorkerShiftID, GSE.TruckMaster.TruckNumber,
                         GSE.DriverMaster.DriverName,
                             (SELECT        TruckTypeArabicDescription
                               FROM            GSE.TruckTypeMaster AS z
                               WHERE        (TruckTypeID = COR.CustomerOrderHeader.OrderTruckType)) AS TruckTypeDesc,
                             (SELECT        a.RequestState
                               FROM            COR.LoadingRequestHeader AS a LEFT OUTER JOIN
                                                         COR.LoadingRequestLine AS b ON a.LoadingRequestNo = b.LoadingRequestNo
                               WHERE        (b.OrderNo = COR.CustomerOrderHeader.OrderNumber)) AS Expr1,
                             (SELECT        COR.CustomerOrderState.StateDescription
                               FROM            COR.LoadingRequestState AS f
                               WHERE        (StateID =
                                                             (SELECT        a.RequestState
                                                               FROM            COR.LoadingRequestHeader AS a LEFT OUTER JOIN
                                                                                         COR.LoadingRequestLine AS b ON a.LoadingRequestNo = b.LoadingRequestNo
                                                               WHERE        (b.OrderNo = COR.CustomerOrderHeader.OrderNumber)))) AS RequestStateDes, CASE WHEN
                             (SELECT        a.RequestType
                               FROM            COR.LoadingRequestHeader a LEFT OUTER JOIN
                                                         COR.LoadingRequestLine b ON a.LoadingRequestNo = b.LoadingRequestNo
                               WHERE        b.OrderNo = COR.CustomerOrderHeader.OrderNumber) = 1 THEN 'One Request ' WHEN
                             (SELECT        a.RequestType
                               FROM            COR.LoadingRequestHeader a LEFT OUTER JOIN
                                                         COR.LoadingRequestLine b ON a.LoadingRequestNo = b.LoadingRequestNo
                               WHERE        b.OrderNo = COR.CustomerOrderHeader.OrderNumber) = 2 THEN 'Shared Request ' WHEN
                             (SELECT        a.RequestType
                               FROM            COR.LoadingRequestHeader a LEFT OUTER JOIN
                                                         COR.LoadingRequestLine b ON a.LoadingRequestNo = b.LoadingRequestNo
                               WHERE        b.OrderNo = COR.CustomerOrderHeader.OrderNumber) = 3 THEN 'Shared Transfered ' ELSE 'No Request ' END AS LoadingType,
                             (SELECT        LoadingRequestNo
                               FROM            COR.LoadingRequestLine AS y
                               WHERE        (OrderNo = COR.CustomerOrderHeader.OrderNumber)) AS LoadingRequestNo, ACR.CustomerMaster.CustomerSalesPerson, ACR.CustomerMaster.AccountantID, BH.BarcodeState,
                             (SELECT        StateDescription
                               FROM            COR.BarcodeCustomerOrderState AS ST
                               WHERE        (StateID = BH.BarcodeState)) AS BarcodeDes
FROM            COR.CustomerOrderHeader LEFT OUTER JOIN
                         COR.CustomerOrderState ON COR.CustomerOrderHeader.OrderLoadingState = COR.CustomerOrderState.StateValue AND COR.CustomerOrderState.Type = 'L' LEFT OUTER JOIN
                         COR.DeliveryNoteHeader ON COR.DeliveryNoteHeader.OrderNumber = COR.CustomerOrderHeader.OrderNumber LEFT OUTER JOIN
                         ACR.CustomerMaster ON ACR.CustomerMaster.CustomerNo = COR.CustomerOrderHeader.CustomerNumber LEFT OUTER JOIN
                         COR.CustomerOrderState AS x ON COR.CustomerOrderHeader.OrderState = x.StateValue AND x.Type = 'H' LEFT OUTER JOIN
                         COR.BarcodeCustomerOrderHeader AS BH ON BH.OrderNo = COR.CustomerOrderHeader.OrderNumber LEFT OUTER JOIN
                         GSE.TruckMaster ON GSE.TruckMaster.TruckID = COR.DeliveryNoteHeader.TruckID LEFT OUTER JOIN
                         GSE.DriverMaster ON GSE.DriverMaster.DriverID = COR.DeliveryNoteHeader.DriverID
WHERE        (COR.CustomerOrderHeader.OrderState IN (60, 65, 80));
GO

-- 2. Register the Group + Page
DELETE FROM [PLS].[PagesAndGroups] WHERE PageGroupID IN ('loading_orders_group', 'orders');

INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
VALUES
    ('loading_orders_group', NULL, 50, N'Loading Orders', N'🚚', N'Loading Orders module group', 1),
    ('orders', 'loading_orders_group', 51, N'Orders', N'📦', N'View customer orders pending or in the loading/delivery pipeline', 0);
GO

-- 3. Register the Main Query in QueryMaster -- QuerySQL already has {FILTER}
--    from day one, since it's built directly on GetGridData.
DECLARE @MainQueryID INT;

DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Orders Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Orders Grid';

INSERT INTO [PLS].[QueryMaster]
(QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES
('Orders Grid', '[PLS].[APIPlusOperation]', 'Orders Grid', 'Main grid data for Loading Orders', 'SELECT * FROM PLS.QOrdersGrid WHERE 1=1 {FILTER};', 'ERPMega25', 'PLS', 'QOrdersGrid', 'Grid', NULL);

SET @MainQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('orders', @MainQueryID);
GO

SELECT * FROM [PLS].[PagesAndGroups] WHERE PageGroupID IN ('loading_orders_group', 'orders');
SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Orders Grid';
GO
