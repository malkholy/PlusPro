USE [ERPMega25]
GO

-- ============================================================================
-- Vendor Invoice Payment drawer: unpaid/partially-paid invoice detail for a
-- given Vendor + Year, keyed off the Vendor Invoice Payment header row
-- (VendorNo, InvoiceYear). Read-only Grid/Detail (GetGridData), same pattern
-- as customer_order_lines -- a virtual, non-sidebar PageGroupID.
-- ============================================================================

-- 1. Detail view -- verbatim from the user-supplied query, with VendorNumber
--    and a computed InvoiceYear column exposed so both keys can be filtered
--    via plain column-equality QueryFilterMappings.
IF OBJECT_ID('[PLS].[QVendorInvoicePaymentDetail]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QVendorInvoicePaymentDetail];
GO

CREATE VIEW [PLS].[QVendorInvoicePaymentDetail] AS
SELECT  x.InternalID, x.VendorNumber, YEAR(x.InvoiceDate) AS InvoiceYear, x.InvoiceDate, x.InvoiceDueDate,
        x.TotalFinalAmount, x.PaidAmount, x.TotalFinalAmount - x.PaidAmount AS UnPaidAmount
FROM ACP.VendorInvoiceHeader x
WHERE x.PaidState IN (0, 1) AND x.TotalFinalAmount > 0;
GO

-- 2. Register the virtual PageGroupID for this detail query -- internal
--    lookup key only, not a real sidebar page.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'vendor_invoice_payment_details')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('vendor_invoice_payment_details', NULL, 999, N'Vendor Invoice Payment Detail (internal)', N'🔧', N'Internal lookup key for the Vendor Invoice Payment drawer -- not a real sidebar page', 0);
END
GO

-- 3. Register the Detail query, keyed by VendorNo + InvoiceYear.
DECLARE @VIPDQueryID INT;

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Vendor Invoice Payment Detail';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Vendor Invoice Payment Detail';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Vendor Invoice Payment Detail';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Vendor Invoice Payment Detail', 'Vendor Invoice Payment Detail', 'Unpaid/partial vendor invoices for a given Vendor + Year (Vendor Invoice Payment drawer)', 'SELECT * FROM PLS.QVendorInvoicePaymentDetail WHERE 1=1 {FILTER};', 'Detail', NULL);

SET @VIPDQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('vendor_invoice_payment_details', @VIPDQueryID);

INSERT INTO [PLS].[QueryFilterMappings] (QueryID, FilterType, FromParam, ToParam, GridColumn, DataType, SortOrder)
VALUES
(@VIPDQueryID, 'exact', 'vendorNo', NULL, 'VendorNumber', 'number', 1),
(@VIPDQueryID, 'exact', 'invoiceYear', NULL, 'InvoiceYear', 'number', 2);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Vendor Invoice Payment Detail';
GO
