USE [ERPMega25]
GO

-- Same class of bug as LinkAccountFilterToAccountStatement.sql: FilterPanel
-- resolves which filter sections to show via pageGroupId + linked Lookup
-- queries once pageGroupId is set (not the static filters prop alone).
-- AccountStatement.jsx already lists 'customer'/'vendor'/'bank' in its
-- filters array (rendered as From/To range pickers by default), but none of
-- Customer Master All / Vendor Master All / Bank Accounts Master were ever
-- linked to 'account_statement' via PageQueries, so they silently never
-- rendered.
IF NOT EXISTS (
    SELECT 1 FROM [PLS].[PageQueries] pq
    INNER JOIN [PLS].[QueryMaster] q ON q.QueryID = pq.QueryID
    WHERE pq.PageGroupID = 'account_statement' AND q.Operation = 'Customer Master All'
)
BEGIN
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
    SELECT 'account_statement', QueryID FROM [PLS].[QueryMaster] WHERE Operation = 'Customer Master All';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM [PLS].[PageQueries] pq
    INNER JOIN [PLS].[QueryMaster] q ON q.QueryID = pq.QueryID
    WHERE pq.PageGroupID = 'account_statement' AND q.Operation = 'Vendor Master All'
)
BEGIN
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
    SELECT 'account_statement', QueryID FROM [PLS].[QueryMaster] WHERE Operation = 'Vendor Master All';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM [PLS].[PageQueries] pq
    INNER JOIN [PLS].[QueryMaster] q ON q.QueryID = pq.QueryID
    WHERE pq.PageGroupID = 'account_statement' AND q.Operation = 'Bank Accounts Master'
)
BEGIN
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
    SELECT 'account_statement', QueryID FROM [PLS].[QueryMaster] WHERE Operation = 'Bank Accounts Master';
END
GO
