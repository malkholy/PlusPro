USE [ERPMega25]
GO

-- ============================================================================
-- RMA (Customer Return) header + line-item grid/detail, served through the
-- generic GetGridData engine (see APIPlusOperation.sql), matching the exact
-- pattern used for Warehouse Transfer (RegisterTransferRequestLineDetail.sql).
--
-- NOTE: COR.RMAHeader/COR.RMALine are LIVE production tables (747+ existing
-- rows, actively written by other staff via a separate legacy UI) with a real
-- state machine (RmaStateMaster: 0=New, 10=Confirmed, 20=Transfered,
-- 30=Ordered, 99=Deleted) that appears to drive real inventory movement via
-- each RMAReasonMaster row's ReturnedWarehouse. This build is scoped to
-- record-keeping only: new RMAs are created and stay at RMAState=0 (New);
-- Confirm/Transfer/Order transitions and any inventory effect are explicitly
-- OUT OF SCOPE and deferred. Existing RMAs already past state 0 are shown
-- read-only in this page (no Edit/Delete), since we don't replicate whatever
-- process legitimately advances their state.
-- ============================================================================

-- 1. Header view -- verbatim from the user-supplied query, plus RMANumber
--    (grid identifying column) and three required (NOT NULL) columns that
--    were not in the original pasted query but are needed to insert/rehydrate
--    a header row: ReturnedDate, OrderType, ReturnedType.
IF OBJECT_ID('[PLS].[QRMAHeaderGrid]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QRMAHeaderGrid];
GO

CREATE VIEW [PLS].[QRMAHeaderGrid] AS
SELECT
    COR.RMAHeader.RMANumber,
    COR.RMAHeader.ReturnedCustomer,
    COR.RMAHeader.ReturnedDate,
    COR.RMAHeader.OrderType,
    COR.RMAHeader.ReturnedType,
    COR.RMAHeader.RMAState,
    COR.RMAHeader.Facility,
    COR.RMAHeader.Note,
    COR.RMAHeader.RMACreatedBy,
    COR.RMAHeader.RMACreatedDate,
    COR.RMAHeader.RMALastMaint,
    COR.RMAHeader.RMALastMaintDate,
    COR.RMAHeader.CustomerOrder,
    ACR.CustomerMaster.CustomerName,
    ACR.CustomerMaster.CustomerExtraName,
    COR.RmaStateMaster.RmaStateDescription,
    ACR.CustomerMaster.AccountantID,
    ACR.CustomerMaster.CustomerSalesPerson
FROM COR.RMAHeader
    LEFT OUTER JOIN ACR.CustomerMaster ON COR.RMAHeader.ReturnedCustomer = ACR.CustomerMaster.CustomerNo
    LEFT OUTER JOIN COR.RmaStateMaster ON COR.RMAHeader.RMAState = COR.RmaStateMaster.RmaStateValue;
GO

-- 2. Line view -- verbatim from the user-supplied query, unchanged.
IF OBJECT_ID('[PLS].[QRMALineDetail]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QRMALineDetail];
GO

CREATE VIEW [PLS].[QRMALineDetail] AS
SELECT bol.RCL, bol.RMANumber, bol.LineState, bol.Warehouse, bol.Line, bol.ItemID, bol.ItemCode, bol.QuantityReturned, bol.QuantityConfirmed, bol.QuantityInvoiced, bol.UnitOfMeasure, bol.CustomerNo,
       bol.LineCreatedBy, bol.LineCreatedDate, bol.LineLastMaintBy, bol.LineLastMaintDate, bol.TransactionBy, bol.TransactionDate, bol.CustomerOrderNumber, bol.RMAReasonID, bol.LineNote,
       im.ItemExtraDescription, im.StockUM, rrm.ReasonDescription
FROM COR.RMALine AS bol
     LEFT OUTER JOIN INV.ItemMaster AS im ON bol.ItemID = im.ItemID
     LEFT OUTER JOIN COR.RMAReasonMaster AS rrm ON bol.RMAReasonID = rrm.ReasonID;
GO

-- 3. Register the real sidebar page, under the existing Loading Orders group.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'rma')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('rma', 'loading_orders_group', 52, N'RMA', N'↩️', N'Customer Return (RMA) header + lines', 0);
END
GO

-- 4. Register the virtual PageGroupID for line detail -- PLS.PageQueries has
--    a real FK to PagesAndGroups(PageGroupID); this entry is never referenced
--    by nav.js/App.jsx, so it won't ever appear as a real sidebar page.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'rma_lines')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('rma_lines', NULL, 999, N'RMA Lines Detail (internal)', N'🔧', N'Internal lookup key for the RMA drawer detail query -- not a real sidebar page', 0);
END
GO

-- 5. Register the Grid query (header).
DECLARE @RMAQueryID INT;

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'RMA Grid';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'RMA Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'RMA Grid';

INSERT INTO [PLS].[QueryMaster]
(QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES
('RMA Grid', '[PLS].[APIPlusOperation]', 'RMA Grid', 'RMA header grid (Customer Return)', 'SELECT * FROM PLS.QRMAHeaderGrid WHERE 1=1 {FILTER};', 'ERPMega25', 'PLS', 'QRMAHeaderGrid', 'Grid', NULL);

SET @RMAQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('rma', @RMAQueryID);

INSERT INTO [PLS].[QueryFilterMappings] (QueryID, FilterType, FromParam, ToParam, GridColumn, DataType, SortOrder)
VALUES
(@RMAQueryID, 'range', 'startDate', 'endDate', 'RMACreatedDate', 'date', 1);
GO

-- 6. Register the Detail query (lines), keyed by RMANumber.
DECLARE @RMALQueryID INT;

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'RMA Line Detail';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'RMA Line Detail';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'RMA Line Detail';

INSERT INTO [PLS].[QueryMaster]
(QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES
('RMA Line Detail', '[PLS].[APIPlusOperation]', 'RMA Line Detail', 'Line-item detail (with item master + reason) for the RMA drawer', 'SELECT * FROM PLS.QRMALineDetail WHERE 1=1 {FILTER};', 'ERPMega25', 'PLS', 'QRMALineDetail', 'Detail', NULL);

SET @RMALQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('rma_lines', @RMALQueryID);

INSERT INTO [PLS].[QueryFilterMappings] (QueryID, FilterType, FromParam, ToParam, GridColumn, DataType, SortOrder)
VALUES
(@RMALQueryID, 'exact', 'rmaNumber', NULL, 'RMANumber', 'number', 1);
GO

-- 7. New Lookup registrations (QueryType='Lookup', no PageGroupID/PageQueries
--    row needed -- lookups match purely on Operation + QueryType='Lookup',
--    same as every other lookup in APIPlusOperation.sql).
--    Customer ('Customer Master All'), Warehouse ('xx') and Item ('Item
--    Master All') lookups already exist and are reused as-is.

DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'RMA Reason';
INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES ('RMA Reason', '[PLS].[APIPlusOperation]', 'RMA Reason', 'RMA line reason dropdown', 'SELECT ReasonID, ReasonDescription, Facility, ReturnedWarehouse, ChosableWarehouse FROM COR.RMAReasonMaster WHERE 1=1 {FILTER} ORDER BY ReasonID;', 'ERPMega25', 'COR', 'RMAReasonMaster', 'Lookup', NULL);

DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'RMA Order Type';
INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES ('RMA Order Type', '[PLS].[APIPlusOperation]', 'RMA Order Type', 'RMA header order-type dropdown (RmaFlag=1 order types only)', 'SELECT OrderTypeID, TypeDescription FROM COR.CustomerOrderType WHERE RmaFlag=1 {FILTER} ORDER BY OrderTypeID;', 'ERPMega25', 'COR', 'CustomerOrderType', 'Lookup', NULL);

DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'RMA Facility';
INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES ('RMA Facility', '[PLS].[APIPlusOperation]', 'RMA Facility', 'RMA header facility dropdown', 'SELECT FacilityCode, FacilityDescription FROM dbo.FacilityMaster WHERE 1=1 {FILTER} ORDER BY FacilityCode;', 'ERPMega25', 'dbo', 'FacilityMaster', 'Lookup', NULL);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation IN ('RMA Grid', 'RMA Line Detail', 'RMA Reason', 'RMA Order Type', 'RMA Facility');
GO
