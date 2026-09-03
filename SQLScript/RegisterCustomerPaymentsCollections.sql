USE [ERPMega25]
GO

-- ============================================================================
-- New "Customer Payments/Collections" page under "Sales Reports" (closest
-- existing match to "Sales" -- no group literally named "Sales" exists).
-- Read-only Grid: per-customer, per-month Payments / Sales / Total Due,
-- driven by the exact CTE query supplied by the user.
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'customer_payments_collections')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('customer_payments_collections', 'sales_reports_group', 10, N'Customer Payments/Collections', N'💰', N'Monthly customer payments, sales, and total due', 0);
END
GO

DECLARE @CPCQueryID INT;

DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Customer Payments Collections Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Customer Payments Collections Grid';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Customer Payments Collections Grid', 'Customer Payments Collections Grid', 'Per-customer, per-month payments/sales/due amounts',
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
    c.CustomerNo,
    c.CustomerName,
    c.CustomerSalesPerson,
    s.SalesName,
    isnull(p.TotalPayment, 0) as TotalPayment,
    isnull(sl.TotalSales, 0) as TotalSales,
    isnull(d.TotalDueAmount, 0) as TotalDueAmount
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
order by ym.Year, ym.Month, c.CustomerSalesPerson, c.CustomerName;', 'Grid', NULL);

SET @CPCQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('customer_payments_collections', @CPCQueryID);
GO

SELECT * FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'customer_payments_collections';
SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Customer Payments Collections Grid';
GO
