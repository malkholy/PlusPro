USE [ERPMega25]
GO

-- ============================================================================
-- Vendor Invoice Payment: first page under the new "Account Payable" sidebar
-- group. Read-only Grid browse onto ACP.InvoicePaymentHeader (a thin batch/
-- header table -- InternalID, VendorNo, InvoiceYear, CreatedBy, CreatedDate,
-- OrderInUse, OrderInUseBy), joined to ACP.VendorMaster for a display name.
-- Scoped to Grid only (GetGridData, read-only) per the user's request --
-- New/Edit/Delete/state-transition operations are deferred ("discuss later"),
-- same pattern as RegisterCustomerOrder.sql.
-- ============================================================================

-- 1. Header view.
IF OBJECT_ID('[PLS].[QVendorInvoicePaymentGrid]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QVendorInvoicePaymentGrid];
GO

CREATE VIEW [PLS].[QVendorInvoicePaymentGrid] AS
SELECT  h.InternalID, h.VendorNo, v.VendorName, v.VendorExtraName, h.InvoiceYear,
        h.CreatedBy, h.CreatedDate, h.OrderInUse, h.OrderInUseBy
FROM ACP.InvoicePaymentHeader h
LEFT OUTER JOIN ACP.VendorMaster v ON v.VendorNumber = h.VendorNo;
GO

-- 2. New top-level sidebar group: Account Payable.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'account_payable_group')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('account_payable_group', NULL, 65, N'Account Payable', N'💳', N'Account Payable pages', 1);
END
GO

-- 3. Register the page, under Account Payable.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'vendor_invoice_payment')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('vendor_invoice_payment', 'account_payable_group', 1, N'Vendor Invoice Payment', N'💰', N'Vendor invoice payment batches (read-only Grid; operations TBD)', 0);
END
GO

-- 4. Register the Grid query.
DECLARE @VIPQueryID INT;

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Vendor Invoice Payment Grid';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Vendor Invoice Payment Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Vendor Invoice Payment Grid';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Vendor Invoice Payment Grid', 'Vendor Invoice Payment Grid', 'Vendor Invoice Payment header grid', 'SELECT * FROM PLS.QVendorInvoicePaymentGrid WHERE 1=1 {FILTER};', 'Grid', NULL);

SET @VIPQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('vendor_invoice_payment', @VIPQueryID);

INSERT INTO [PLS].[QueryFilterMappings] (QueryID, FilterType, FromParam, ToParam, GridColumn, DataType, SortOrder)
VALUES
(@VIPQueryID, 'range', 'startDate', 'endDate', 'CreatedDate', 'date', 1);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Vendor Invoice Payment Grid';
GO
