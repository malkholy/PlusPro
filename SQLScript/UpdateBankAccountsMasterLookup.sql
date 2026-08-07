USE [ERPMega25]
GO

-- ============================================================================
-- Switches the 'Bank Accounts Master' Lookup (used by Journal Entry's Bank
-- filter, among others) from acc.BankAccountsMaster directly to
-- pls.QBankAccountMaster -- a view that already unions in acc.TreasuryMaster
-- accounts alongside bank accounts, with AllowPostingJournal = 1 baked in on
-- both sides internally (the view doesn't expose that column, so it can't be
-- re-filtered outside -- it's already applied).
-- ============================================================================

UPDATE [PLS].[QueryMaster]
SET QuerySQL = N'SELECT BankAccountNumber, BankAccountName FROM pls.QBankAccountMaster WHERE 1=1 {FILTER} ORDER BY BankAccountNumber;'
WHERE Operation = 'Bank Accounts Master';
GO
