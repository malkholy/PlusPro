USE [ERPMega25]
GO

-- Registers the data query behind the "Item Customer Sales" page
-- (ItemCustomerSales.jsx) in PLS.QueryMaster as a Grid-type query, purely so
-- admins can attach a per-user row-level SQL condition to it via
-- UserPermissions.jsx's "Grid Permission" tab (or QueryMaster.jsx's "User
-- Permissions" tab) -- the same UserQueryPermissions mechanism GetGridData
-- already uses for every other Grid page.
--
-- The page itself keeps calling its own dedicated 'GetItemCustomerMonthlySales'
-- operation (APIPlusOperation.sql) for the Monthly/Quarterly/Yearly period
-- logic, which doesn't fit the generic GetGridData/QueryFilterMappings model.
-- That operation was patched to look up this QueryID and enforce any saved
-- UserQueryPermissions.SQLFilter, so this registration is not just cosmetic --
-- WHERE 1=1 {FILTER} below is never executed as-is (it's metadata only, used
-- by GetQueryFields/ValidateQueryCondition/SQLFilterInput's column
-- autocomplete and condition validation).

DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Item Customer Sales';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Item Customer Sales';

DECLARE @ICSQueryID INT;

INSERT INTO [PLS].[QueryMaster] (QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES (
    N'Item Customer Sales',
    N'Item Customer Sales',
    N'Item-by-customer invoice detail backing the Item Customer Sales report -- served at runtime by the dedicated GetItemCustomerMonthlySales operation (not GetGridData); registered here only so admins can attach per-user row-level conditions',
    N'SELECT      year(b.InvoiceDate) as InvoiceYear, b.InvoiceDate, b.CustomerNo as CustomerNumber, C.CustomerSalesPerson as SalesPersonNumber,
                     b.WarehouseLine as Warehouse, b.LineShipToID as ShipToID, b.LineCurrency as Currency, B.LineExchangeRate as ExchangeRate,
                     b.ItemCode,
                     b.ItemClass, b.InvoicedQuantity AS Qty, b.LineTaxtableAmount * b.LineExchangeRate AS Amount,
                     b.LineCreatedByUser, b.LineCreatedDate, b.LineWeight,
                     c.CustomerExtraName, d.ItemType, d.ItemFamily1, d.ItemFamily2, d.ItemFamily3, d.ItemFamily4, d.ItemFamily5, d.ItemExtraDescription, b.ItemID,
                     c.ParentCustomer, P.ParentName, month(b.invoicedate) as InvoiceMonth,
                     d.NetWeight, d.GrossWeight, d.Volume,
                     ( select x.FamilyDescription from inv.FamilyMaster x where x.FamilyID=d.ItemFamily1 and x.ItemType=''F'' ) Family1,
                     ( select x.FamilyDescription from inv.FamilyMaster x where x.FamilyID=d.ItemFamily2 and x.ItemType=''F'' ) Family2,
                     ( select x.FamilyDescription from inv.FamilyMaster x where x.FamilyID=d.ItemFamily3 and x.ItemType=''F'' ) Family3,
                     ( select x.FamilyDescription from inv.FamilyMaster x where x.FamilyID=d.ItemFamily4 and x.ItemType=''F'' ) Family4,
                      x.SalesName, 0 as SalesGroupID, '''' as SalesGroupName, 0 as SalesManagerID, '''' as SalesManagerName,
                     ( select ShipToName from acr.CustomerShipToMaster y where y.ShipToID=b.LineShipToID ) as ShipToName, IntID, isnull( PO.Point ,0 ) Point,
                      ( b.InvoicedQuantity/d.SellingConversion) as QtyBox, ( select x.ShipToAddress from acr.CustomerShipToMaster x where x.ShipToID=b.LineShipToID ) ShipToAddress
        FROM
                     ACR.CustomerInvoiceLine b LEFT OUTER JOIN
                     ACR.CustomerMaster AS c ON b.CustomerNo = c.CustomerNo LEFT OUTER JOIN
                     INV.ItemMaster AS d ON d.itemid = b.ItemID LEFT OUTER JOIN
                     ACR.CustomerParentMaster AS P ON P.CustomerParentID = c.ParentCustomer left outer join
                     acr.SalesMaster x on x.SalesID = c.CustomerSalesPerson left outer join
                     pro.SalesItemPoint PO on PO.itemCode=b.ItemCode
        WHERE 1=1 {FILTER};',
    'Grid',
    NULL
);

SET @ICSQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES ('item_customer_sales', @ICSQueryID);
GO

-- Standing rule: every QueryMaster row needs matching PLS.QueryFields rows
-- (see feedback_queryfields_registration_rule). This one was added by hand,
-- not through SaveQueryMaster/CreateQueryView, so run BackfillQueryFields.sql
-- after this script -- it's safe to re-run and only processes QueryIDs that
-- still have zero QueryFields rows, which after this script includes the one
-- just inserted above.
