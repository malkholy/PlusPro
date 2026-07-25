USE [ERPMega25]
GO

-- ============================================================================
-- Transfer Request line-item detail, served through the generic GetGridData
-- engine (see APIPlusOperation.sql) using a virtual PageGroupID
-- ('warehouse_transfer_lines') that is NOT a real sidebar page -- it's just a
-- lookup key so the Warehouse Request drawer can fetch saved line details for
-- a specific request via {FILTER} on RequestNo. Registered as QueryType =
-- 'Detail' (GetGridData accepts both 'Grid' and 'Detail').
-- ============================================================================

-- 1. View for the transfer request line detail (verbatim from the user-supplied query)
IF OBJECT_ID('[PLS].[QTransferRequestLineDetail]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QTransferRequestLineDetail];
GO

CREATE VIEW [PLS].[QTransferRequestLineDetail] AS
SELECT INV.TransferRequestLine.RequestNo,
       INV.TransferRequestLine.Line,
       INV.TransferRequestLine.ItemID,
       INV.TransferRequestLine.ItemCode,
       INV.TransferRequestLine.QuantityRequested,
       INV.TransferRequestLine.QuantityRecieved,
       INV.TransferRequestLine.QuanityTransfered,
       INV.ItemMaster.NetWeight,
       INV.ItemMaster.ItemExtraDescription,
       INV.ItemMaster.ItemDescription,
       INV.ItemMaster.SellingUM,
       INV.ItemMaster.SellingConversion
FROM INV.TransferRequestLine
     INNER JOIN INV.ItemMaster
        ON INV.TransferRequestLine.ItemID = INV.ItemMaster.ItemID;
GO

-- 2. Register the virtual PageGroupID -- PLS.PageQueries has a real FK to
--    PagesAndGroups(PageGroupID), it's not just a loose string key. This entry
--    is never referenced by nav.js, so it won't ever appear as a real sidebar page.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'warehouse_transfer_lines')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('warehouse_transfer_lines', NULL, 999, N'Warehouse Transfer Lines Detail (internal)', N'🔧', N'Internal lookup key for the Warehouse Request drawer detail query -- not a real sidebar page', 0);
END
GO

-- 3. Register the Query in QueryMaster -- QuerySQL already has {FILTER} from
--    day one, matching the GetGridData engine's expectation.
DECLARE @WTLQueryID INT;

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Transfer Request Line Detail';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Transfer Request Line Detail';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Transfer Request Line Detail';

INSERT INTO [PLS].[QueryMaster]
(QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl)
VALUES
('Transfer Request Line Detail', '[PLS].[APIPlusOperation]', 'Transfer Request Line Detail', 'Line-item detail (with item master) for the Warehouse Request drawer', 'SELECT * FROM PLS.QTransferRequestLineDetail WHERE 1=1 {FILTER};', 'ERPMega25', 'PLS', 'QTransferRequestLineDetail', 'Detail', NULL);

SET @WTLQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('warehouse_transfer_lines', @WTLQueryID);

-- 4. FilterPanel -> column mapping: exact match on RequestNo, passed by the
--    Warehouse Request drawer as LineData.requestNo (not a user-facing FilterPanel field).
INSERT INTO [PLS].[QueryFilterMappings] (QueryID, FilterType, FromParam, ToParam, GridColumn, DataType, SortOrder)
VALUES (@WTLQueryID, 'exact', 'requestNo', NULL, 'RequestNo', 'number', 1);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Transfer Request Line Detail';
SELECT * FROM [PLS].[QueryFilterMappings] WHERE QueryID = (SELECT QueryID FROM [PLS].[QueryMaster] WHERE Operation = 'Transfer Request Line Detail');
GO
