USE [ERPMega25]
GO

-- ============================================================================
-- New Lookup/Detail registrations needed for the "New Customer Order" create
-- flow (drawer calls APIPlusCustomerOrderOperation directly for the actual
-- Generate Order No / New Line / New Header operations -- these are just the
-- picker data sources, served through APIPlusOperation.sql as usual).
-- ============================================================================

-- Dependent lookup: ShipTo addresses for a given customer (param1 = CustomerNo)
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Customer ShipTo By Customer';
INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES ('Customer ShipTo By Customer', '[PLS].[APIPlusOperation]', 'Customer ShipTo By Customer', 'Ship-To addresses for a given customer (New Customer Order)', 'SELECT ShipToID, ShipToName, ShipToAddress FROM ACR.CustomerShipToMaster WHERE CustomerNo = @param1 {FILTER} ORDER BY ShipToID;', 'ERPMega25', 'ACR', 'CustomerShipToMaster', 'Lookup', NULL);

-- Dependent lookup: customer's default Price Type/ShipTo/Warehouse/Payment
-- Term/Tax Code/Carrier, used to pre-fill the New Customer Order header the
-- moment a customer is picked (param1 = CustomerNo).
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Customer Defaults By Customer';
INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES ('Customer Defaults By Customer', '[PLS].[APIPlusOperation]', 'Customer Defaults By Customer', 'Default PriceType/ShipTo/Warehouse/PaymentTerm/TaxCode/Carrier for a customer (New Customer Order)', 'SELECT x.DefaultPriceType, x.DefaultShipToID, x.DefaultWarehouse, x.PaymentTerm, x.CustomerTaxCode, x.DefaultCarrier FROM ACR.CustomerMaster x WHERE x.CustomerNo = @param1 {FILTER};', 'ERPMega25', 'ACR', 'CustomerMaster', 'Lookup', NULL);

-- Dependent lookup: the current, authoritative state of an order's lines as
-- staged in COR.CustomerOrderLineWF (param1 = LineOrderNumber) -- used to
-- refresh the New Customer Order lines grid with server-computed values
-- (price, discount, tax, final amount) right after New/Edit/Delete Line.
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Customer Order Line WF By Order';
INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES ('Customer Order Line WF By Order', '[PLS].[APIPlusOperation]', 'Customer Order Line WF By Order', 'Working-file lines for an in-progress Customer Order, for refreshing the entry grid after New/Edit/Delete Line', 'SELECT LineNumber, ItemID, ItemCode, OriginalOrderedQuantity, OriginalOrderedUOM, SellingUnitOfMeasure, StockingUnitofMeasure, NetPriceTransSelling, ListPriceTransSelling, LineAmountTransaction, LineDiscountTransaction, LineTax, LineFinalAmountTransaction FROM COR.CustomerOrderLineWF WHERE LineOrderNumber = @param1 {FILTER} ORDER BY LineNumber;', 'ERPMega25', 'COR', 'CustomerOrderLineWF', 'Lookup', NULL);

-- Dependent lookup: the working-file HEADER for an order being edited
-- (param1 = OrderNumber) -- populated by the new 'Open' operation (copies
-- the real CustomerOrderHeader row into CustomerOrderHeaderWF), used to
-- pre-fill the drawer's header fields when editing an existing order.
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Customer Order Header WF By Order';
INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES ('Customer Order Header WF By Order', '[PLS].[APIPlusOperation]', 'Customer Order Header WF By Order', 'Working-file header for an order being edited (populated by the Open operation)', 'SELECT CustomerNumber, ShipToID, Warehouse, OrderType, PriceType, TermsCode, CustomerTaxCode, Facility, Currency, ExchangeRate, OrderCarrier, DateOrderEntered, ScheduledShipDate, CustomerPurchaseOrder, InternalNote FROM COR.CustomerOrderHeaderWF WHERE OrderNumber = @param1 {FILTER};', 'ERPMega25', 'COR', 'CustomerOrderHeaderWF', 'Lookup', NULL);

-- Dependent lookup: the REAL, already-committed header row (param1 =
-- OrderNumber) -- used instead of the WF version to pre-fill the Edit Order
-- form, since it doesn't depend on Open's WF-copy step having landed yet.
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Customer Order Header By Order';
INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES ('Customer Order Header By Order', '[PLS].[APIPlusOperation]', 'Customer Order Header By Order', 'Committed header for an existing order, used to pre-fill the Edit Order form', 'SELECT CustomerNumber, ShipToID, Warehouse, OrderType, PriceType, TermsCode, CustomerTaxCode, Facility, Currency, ExchangeRate, OrderCarrier, DateOrderEntered, ScheduledShipDate, CustomerPurchaseOrder, InternalNote FROM COR.CustomerOrderHeader WHERE OrderNumber = @param1 {FILTER};', 'ERPMega25', 'COR', 'CustomerOrderHeader', 'Lookup', NULL);

-- Dependent lookup: the REAL, already-committed lines for an order (param1 =
-- OrderNumber) -- used instead of the WF version to pre-fill the Edit Order
-- form's lines grid.
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Customer Order Line By Order';
INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES ('Customer Order Line By Order', '[PLS].[APIPlusOperation]', 'Customer Order Line By Order', 'Committed lines for an existing order, used to pre-fill the Edit Order form', 'SELECT LineNumber, ItemID, ItemCode, OriginalOrderedQuantity, OriginalOrderedUOM, SellingUnitOfMeasure, StockingUnitofMeasure, NetPriceTransSelling, ListPriceTransSelling, LineAmountTransaction, LineDiscountTransaction, LineTax, LineFinalAmountTransaction FROM COR.CustomerOrderLine WHERE LineOrderNumber = @param1 {FILTER} ORDER BY LineNumber;', 'ERPMega25', 'COR', 'CustomerOrderLine', 'Lookup', NULL);

DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Customer Order Type';
INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES ('Customer Order Type', '[PLS].[APIPlusOperation]', 'Customer Order Type', 'Order type dropdown (New Customer Order)', 'SELECT OrderTypeID, TypeDescription FROM COR.CustomerOrderType WHERE 1=1 {FILTER} ORDER BY OrderTypeID;', 'ERPMega25', 'COR', 'CustomerOrderType', 'Lookup', NULL);

DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Price Type Master All';
INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES ('Price Type Master All', '[PLS].[APIPlusOperation]', 'Price Type Master All', 'Price type dropdown (New Customer Order)', 'SELECT PriceTypeID, PriceTypeDescription FROM ACR.PriceTypeMaster WHERE IsNotActive = 0 {FILTER} ORDER BY PriceTypeID;', 'ERPMega25', 'ACR', 'PriceTypeMaster', 'Lookup', NULL);

DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Payment Term Master All';
INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES ('Payment Term Master All', '[PLS].[APIPlusOperation]', 'Payment Term Master All', 'Payment term dropdown (New Customer Order)', 'SELECT PaymentTerm, TermDescription FROM ACR.CustomerPaymentTerm WHERE 1=1 {FILTER} ORDER BY PaymentTerm;', 'ERPMega25', 'ACR', 'CustomerPaymentTerm', 'Lookup', NULL);

DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Tax Code Master All';
INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES ('Tax Code Master All', '[PLS].[APIPlusOperation]', 'Tax Code Master All', 'Tax code dropdown (New Customer Order)', 'SELECT TaxCode, TaxCodeDescription FROM TAX.TaxCodeMaster WHERE 1=1 {FILTER} ORDER BY TaxCode;', 'ERPMega25', 'TAX', 'TaxCodeMaster', 'Lookup', NULL);

DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Currency Master All';
INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES ('Currency Master All', '[PLS].[APIPlusOperation]', 'Currency Master All', 'Currency dropdown (New Customer Order)', 'SELECT Currency, CurrencyDescription FROM ACC.CurrencyMaster WHERE 1=1 {FILTER} ORDER BY Currency;', 'ERPMega25', 'ACC', 'CurrencyMaster', 'Lookup', NULL);

DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Facility Master All';
INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES ('Facility Master All', '[PLS].[APIPlusOperation]', 'Facility Master All', 'Facility dropdown (generic, used by New Customer Order)', 'SELECT FacilityCode, FacilityDescription FROM dbo.FacilityMaster WHERE 1=1 {FILTER} ORDER BY FacilityCode;', 'ERPMega25', 'dbo', 'FacilityMaster', 'Lookup', NULL);

DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Carrier Master All';
INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES ('Carrier Master All', '[PLS].[APIPlusOperation]', 'Carrier Master All', 'Carrier dropdown (New Customer Order)', 'SELECT Carrier FROM acr.CustomerOrdersCarrierMaser WHERE 1=1 {FILTER} ORDER BY Carrier;', 'ERPMega25', 'ACR', 'CustomerOrdersCarrierMaser', 'Lookup', NULL);

-- 'Item Master All' already exists and is reused by other drawers -- extend it
-- with SellingUM/StockUM (additive columns, backward-compatible with existing
-- callers) so the New Customer Order line grid can offer both UOMs, defaulting
-- to SellingUM.
UPDATE [PLS].[QueryMaster]
SET QuerySQL = 'SELECT ItemID, ItemCode, ItemDescription AS ItemName, LotControl, SellingConversion, SellingUM, StockUM FROM inv.ItemMaster WHERE 1=1 {FILTER} ORDER BY ItemID'
WHERE Operation = 'Item Master All';

-- Item price by Price Type -- served as a Detail-type GetGridData query (not
-- the single-@param1 Lookup engine) since it needs two filters (PriceTypeID +
-- ItemID). Only currently-valid price rows (today's date) are considered --
-- good enough for order entry, which always prices as of "now".
IF OBJECT_ID('[PLS].[QItemPriceByType]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QItemPriceByType];
GO

CREATE VIEW [PLS].[QItemPriceByType] AS
SELECT PriceTypeID, ItemID, ItemCode, PriceSellingUnit, SellingUM
FROM ACR.PriceHistory
WHERE PriceIsNotActive = 0 AND StartDate <= GETDATE() AND EndDate >= GETDATE();
GO

IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'item_price_by_type')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('item_price_by_type', NULL, 999, N'Item Price By Type (internal)', N'🔧', N'Internal lookup key for the New Customer Order line price fetch -- not a real sidebar page', 0);
END
GO

DECLARE @IPQueryID INT;

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Item Price By Type';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Item Price By Type';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Item Price By Type';

INSERT INTO [PLS].[QueryMaster]
(QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES
('Item Price By Type', '[PLS].[APIPlusOperation]', 'Item Price By Type', 'Current selling price for an item under a given price type (New Customer Order line entry)', 'SELECT * FROM PLS.QItemPriceByType WHERE 1=1 {FILTER};', 'ERPMega25', 'PLS', 'QItemPriceByType', 'Detail', NULL);

SET @IPQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('item_price_by_type', @IPQueryID);

INSERT INTO [PLS].[QueryFilterMappings] (QueryID, FilterType, FromParam, ToParam, GridColumn, DataType, SortOrder)
VALUES
(@IPQueryID, 'exact', 'priceType', NULL, 'PriceTypeID', 'number', 1),
(@IPQueryID, 'exact', 'itemId', NULL, 'ItemID', 'number', 2);
GO
