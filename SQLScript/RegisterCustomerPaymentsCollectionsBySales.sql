USE [ERPMega25]
GO

-- ============================================================================
-- Second view for the Customer Payments/Collections page: same data,
-- aggregated to Year/Month/SalesPerson instead of Year/Month/Customer.
-- Registered as an internal (non-sidebar) PageGroupID, matching the existing
-- orders_lines / warehouse_transfer_lines convention -- the page itself
-- toggles between this and customer_payments_collections client-side.
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'customer_payments_collections_by_sales')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('customer_payments_collections_by_sales', NULL, 999, N'Customer Payments/Collections By Sales (internal)', N'🔧', N'Internal query key for the Customer Payments/Collections page''s "By Sales Person" view -- not a real sidebar page', 0);
END
GO

DECLARE @CPCSQueryID INT;

DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Customer Payments Collections By Sales Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Customer Payments Collections By Sales Grid';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Customer Payments Collections By Sales Grid', 'Customer Payments Collections By Sales Grid', 'Per-sales-person, per-month payments/sales/due amounts (aggregated across their customers)',
'WITH Payments as (
    select
        year(a.JournalDate) as Yr,
        month(a.JournalDate) as Mo,
        a.Customer as CustomerNo,
        sum(a.CreditBook) as TotalPayment
    from acc.JournalLine a
    where a.Account = ''1241''
      and a.JournalNo not like ''BL%''
      and a.JournalNo not like ''CJ%''
      and a.JournalNo not like ''TJ%''
      and a.JournalNo not like ''OB%''
      and a.CreditBook > 0
    group by year(a.JournalDate), month(a.JournalDate), a.Customer
),
Sales as (
    select
        year(a.InvoiceDate) as Yr,
        month(a.InvoiceDate) as Mo,
        a.CustomerNumber as CustomerNo,
        sum(a.TotalTaxtableAmount) as TotalSales
    from ACR.CustomerInvoiceHeader a
    group by year(a.InvoiceDate), month(a.InvoiceDate), a.CustomerNumber
)
select
    ym.Year,
    ym.Month,
    c.CustomerSalesPerson,
    s.SalesName,
    sum(isnull(p.TotalPayment, 0)) as TotalPayment,
    sum(isnull(sl.TotalSales, 0)) as TotalSales,
    sum(isnull(d.TotalDueAmount, 0)) as TotalDueAmount
from pro.YearMonth ym
inner join acr.CustomerMaster c on 1 = 1
left outer join acr.SalesMaster s on c.CustomerSalesPerson = s.SalesID
left outer join Payments p on p.Yr = ym.Year and p.Mo = ym.Month and p.CustomerNo = c.CustomerNo
left outer join Sales sl on sl.Yr = ym.Year and sl.Mo = ym.Month and sl.CustomerNo = c.CustomerNo
outer apply (
    select sum(a.TotalFinalAmountBase - a.CollectedAmount) as TotalDueAmount
    from ACR.CustomerInvoiceHeader a
    where a.CustomerNumber = c.CustomerNo
      and a.InvoiceYear >= 2025
      and a.TotalFinalAmountBase > 0
      and a.InvoiceDueDate <= eomonth(datefromparts(ym.Year, ym.Month, 1))
) d
where (p.TotalPayment is not null or sl.TotalSales is not null or d.TotalDueAmount is not null) {FILTER}
group by ym.Year, ym.Month, c.CustomerSalesPerson, s.SalesName
order by ym.Year, ym.Month, c.CustomerSalesPerson;', 'Grid', NULL);

SET @CPCSQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('customer_payments_collections_by_sales', @CPCSQueryID);
GO

SELECT * FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'customer_payments_collections_by_sales';
SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Customer Payments Collections By Sales Grid';
GO
