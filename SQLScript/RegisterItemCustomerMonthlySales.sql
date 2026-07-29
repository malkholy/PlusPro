-- Register the "Item Customer Sales" custom page (ItemCustomerSales.jsx):
-- a hand-built Monthly/Quarterly/Yearly report (same period-filter pattern
-- as ExpressDetail.jsx/SalesDetail.jsx) over Sales.ItemCustomerMonthly, with
-- Customer/Item/Sales Person filters. NOT the generic GetGridData engine --
-- the data itself is served by a dedicated 'GetItemCustomerMonthlySales'
-- operation in APIPlusOperation.sql, since the period logic (month/quarter
-- grouping) doesn't fit the QueryFilterMappings model.
USE [ERPMega25]
GO

-- 1. New top-level sidebar group + the page itself.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'sales_reports_group')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('sales_reports_group', NULL, 70, N'Sales Reports', N'📈', N'Sales analysis and reporting pages', 1);
END
GO

IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'item_customer_sales')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('item_customer_sales', 'sales_reports_group', 71, N'Item Customer Sales', N'📊',
            N'Monthly/Quarterly/Yearly item-by-customer sales -- custom page served by APIPlusOperation.sql''s GetItemCustomerMonthlySales, not the generic Grid engine', 0);
END
GO

-- 2. 'Sales Person Master All' Lookup -- Customer/Item lookups ('Customer
--    Master All' / 'Item Master All') already exist and are reused as-is.
IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE Operation = 'Sales Person Master All')
BEGIN
    INSERT INTO [PLS].[QueryMaster] (QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
    VALUES (N'Sales Person Master All', N'Sales Person Master All',
            N'Sales person dropdown (Item Customer Sales report filter)',
            N'SELECT SalesID, SalesName FROM ACR.SalesMaster WHERE 1=1 {FILTER} ORDER BY SalesName;', 'Lookup', NULL);
END
GO

-- 3. Standing rule: every QueryMaster row needs matching PLS.QueryFields rows
--    (see feedback_queryfields_registration_rule) -- this lookup was added by
--    hand, not through SaveQueryMaster/CreateQueryView, so populate manually.
DECLARE @SPQueryID INT = (SELECT QueryID FROM [PLS].[QueryMaster] WHERE Operation = 'Sales Person Master All');
IF @SPQueryID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [PLS].[QueryFields] WHERE QueryID = @SPQueryID)
BEGIN
    INSERT INTO [PLS].[QueryFields] (QueryID, FieldName, DataType)
    VALUES
    (@SPQueryID, 'SalesID', 'int'),
    (@SPQueryID, 'SalesName', 'nvarchar');
END
GO
