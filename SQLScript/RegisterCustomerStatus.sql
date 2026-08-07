USE [ERPMega25]
GO

-- ============================================================================
-- Customer Status: read-only Grid browse onto PRO.V0090 (a single-row,
-- company-wide financial position snapshot -- CustomerBalance, VendorBalance,
-- BankCashEGP, TreasuryCashEGP, NoteReceivable, NotePayable, Loans, Custody,
-- Debtors, Creditors, Due, WorkingCapitalFunds), under the existing
-- Accounting sidebar group. No FilterPanel/filters -- CustomerStatus.jsx
-- auto-loads on mount, same pattern as Cash Flow.
-- ============================================================================

-- 1. Wrapper view -- verbatim from the user-supplied query.
IF OBJECT_ID('[PLS].[QCustomerStatusGrid]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QCustomerStatusGrid];
GO

CREATE VIEW [PLS].[QCustomerStatusGrid] AS
SELECT * FROM PRO.V0090;
GO

-- 2. Register the page, under the existing Accounting group.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'customer_status')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('customer_status', 'accounting_group', 6, N'Customer Status', N'📋', N'Company-wide financial position snapshot (read-only Grid onto PRO.V0090)', 0);
END
GO

-- 3. Register the Grid query.
DECLARE @CSQueryID INT;

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Customer Status Grid';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Customer Status Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Customer Status Grid';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Customer Status Grid', 'Customer Status Grid', 'Company-wide financial position snapshot', 'SELECT * FROM PLS.QCustomerStatusGrid WHERE 1=1 {FILTER};', 'Grid', NULL);

SET @CSQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('customer_status', @CSQueryID);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Customer Status Grid';
GO
