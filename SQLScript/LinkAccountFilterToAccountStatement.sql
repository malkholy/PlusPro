USE [ERPMega25]
GO

-- FilterPanel resolves which filter sections to show for a page via
-- pageGroupId + the Lookup queries linked to it through PLS.PageQueries
-- (not the static `filters` prop, once pageGroupId is set -- see
-- FilterPanel.jsx's hasAccount/hasCustomer/etc.). AccountStatement.jsx
-- already lists 'account' in its filters array, but 'Accounts Master All'
-- was never linked to 'account_statement', so the Account filter never
-- rendered. Same pattern as RegisterItemBalance.sql's Item Master All link.
IF NOT EXISTS (
    SELECT 1 FROM [PLS].[PageQueries] pq
    INNER JOIN [PLS].[QueryMaster] q ON q.QueryID = pq.QueryID
    WHERE pq.PageGroupID = 'account_statement' AND q.Operation = 'Accounts Master All'
)
BEGIN
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
    SELECT 'account_statement', QueryID FROM [PLS].[QueryMaster] WHERE Operation = 'Accounts Master All';
END
GO
