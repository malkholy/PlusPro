USE [ERPMega25]
GO

-- Same fix as LinkCustomerVendorBankToAccountStatement.sql: AccountStatement.jsx
-- already lists 'debtor' in its filters array (rendered as a From/To range
-- picker by default), but DebtorCreditor Master All was never linked to
-- 'account_statement' via PageQueries.
IF NOT EXISTS (
    SELECT 1 FROM [PLS].[PageQueries] pq
    INNER JOIN [PLS].[QueryMaster] q ON q.QueryID = pq.QueryID
    WHERE pq.PageGroupID = 'account_statement' AND q.Operation = 'DebtorCreditor Master All'
)
BEGIN
    INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID)
    SELECT 'account_statement', QueryID FROM [PLS].[QueryMaster] WHERE Operation = 'DebtorCreditor Master All';
END
GO
