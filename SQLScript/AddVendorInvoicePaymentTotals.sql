USE [ERPMega25]
GO

-- ============================================================================
-- Adds Total Amount / Total Paid / Total Due to the Vendor Invoice Payment
-- grid, aggregated per Vendor + Year from ACP.VendorInvoiceHeader (same
-- invoice set the drawer's detail query draws from, but here summed across
-- ALL invoices for that vendor/year, not just the unpaid ones):
--   TotalAmount -- sum of TotalFinalAmount
--   TotalPaid   -- sum of PaidAmount
--   TotalDue    -- sum of (TotalFinalAmount - PaidAmount) for invoices whose
--                  due date has already passed (overdue outstanding balance)
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
                  AND x.InvoiceDueDate < GETDATE()), 0) AS TotalDue
FROM ACP.InvoicePaymentHeader h
LEFT OUTER JOIN ACP.VendorMaster v ON v.VendorNumber = h.VendorNo;
GO
