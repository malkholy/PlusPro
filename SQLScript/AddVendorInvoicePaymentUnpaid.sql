USE [ERPMega25]
GO

-- ============================================================================
-- Adds Total Unpaid Amount to the Vendor Invoice Payment grid -- same
-- aggregation as TotalDue but without the overdue (InvoiceDueDate < today)
-- restriction, so it covers ALL outstanding balance for that vendor/year
-- regardless of whether it's yet due.
--   TotalUnpaid -- sum of (TotalFinalAmount - PaidAmount) across all of that
--                  vendor/year's invoices
-- ============================================================================

IF OBJECT_ID('[PLS].[QVendorInvoicePaymentGrid]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QVendorInvoicePaymentGrid];
GO

CREATE VIEW [PLS].[QVendorInvoicePaymentGrid] AS
SELECT  h.InternalID, h.VendorNo, v.VendorName, v.VendorExtraName, h.InvoiceYear,
        h.CreatedBy, h.CreatedDate, h.OrderInUse, h.OrderInUseBy,
        ISNULL((SELECT SUM(x.TotalFinalAmount) FROM ACP.VendorInvoiceHeader x
                WHERE x.VendorNumber = h.VendorNo AND YEAR(x.InvoiceDate) = h.InvoiceYear AND x.TotalFinalAmount > 0), 0) AS TotalAmount,
        ISNULL((SELECT SUM(x.PaidAmount) FROM ACP.VendorInvoiceHeader x
                WHERE x.VendorNumber = h.VendorNo AND YEAR(x.InvoiceDate) = h.InvoiceYear AND x.TotalFinalAmount > 0), 0) AS TotalPaid,
        ISNULL((SELECT SUM(x.TotalFinalAmount - x.PaidAmount) FROM ACP.VendorInvoiceHeader x
                WHERE x.VendorNumber = h.VendorNo AND YEAR(x.InvoiceDate) = h.InvoiceYear AND x.TotalFinalAmount > 0
                  AND x.InvoiceDueDate < GETDATE()), 0) AS TotalDue,
        ISNULL((SELECT SUM(x.TotalFinalAmount - x.PaidAmount) FROM ACP.VendorInvoiceHeader x
                WHERE x.VendorNumber = h.VendorNo AND YEAR(x.InvoiceDate) = h.InvoiceYear AND x.TotalFinalAmount > 0), 0) AS TotalUnpaid
FROM ACP.InvoicePaymentHeader h
LEFT OUTER JOIN ACP.VendorMaster v ON v.VendorNumber = h.VendorNo;
GO
