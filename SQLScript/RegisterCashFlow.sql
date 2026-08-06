USE [ERPMega25]
GO

-- ============================================================================
-- Cash Flow: read-only Grid browse onto pro.V0070 (a pre-aggregated monthly
-- cash-flow/financial-summary view -- one row per Year+Month), under the
-- existing Accounting sidebar group. Scoped to Grid only (GetGridData,
-- read-only), same pattern as RegisterItemBalance.sql.
-- ============================================================================

-- 1. Wrapper view -- verbatim from the user-supplied query.
IF OBJECT_ID('[PLS].[QCashFlowGrid]', 'V') IS NOT NULL
    DROP VIEW [PLS].[QCashFlowGrid];
GO

CREATE VIEW [PLS].[QCashFlowGrid] AS
SELECT * FROM pro.V0070;
GO

-- 2. Register the page, under the existing Accounting group.
IF NOT EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = 'cash_flow')
BEGIN
    INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
    VALUES ('cash_flow', 'accounting_group', 5, N'Cash Flow', N'💵', N'Monthly cash-flow / financial summary (read-only Grid onto pro.V0070)', 0);
END
GO

-- 3. Register the Grid query.
DECLARE @CFQueryID INT;

DELETE m FROM [PLS].[QueryFilterMappings] m INNER JOIN [PLS].[QueryMaster] q ON m.QueryID = q.QueryID WHERE q.Operation = 'Cash Flow Grid';
DELETE pq FROM [PLS].[PageQueries] pq INNER JOIN [PLS].[QueryMaster] q ON pq.QueryID = q.QueryID WHERE q.Operation = 'Cash Flow Grid';
DELETE FROM [PLS].[QueryMaster] WHERE Operation = 'Cash Flow Grid';

INSERT INTO [PLS].[QueryMaster]
(QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
VALUES
('Cash Flow Grid', 'Cash Flow Grid', 'Monthly cash-flow summary grid', 'SELECT * FROM PLS.QCashFlowGrid WHERE 1=1 {FILTER};', 'Grid', NULL);

SET @CFQueryID = SCOPE_IDENTITY();

INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
VALUES ('cash_flow', @CFQueryID);
GO

SELECT * FROM [PLS].[QueryMaster] WHERE Operation = 'Cash Flow Grid';
GO
