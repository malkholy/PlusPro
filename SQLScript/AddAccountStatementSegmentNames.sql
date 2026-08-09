USE [ERPMega25]
GO

ALTER VIEW PLS.QAccountStatementLines AS
SELECT
    jl.EventNo,
    jl.JournalNo,
    jl.LineState,
    jl.Line,
    isnull(jl.DebitBook, 0) as DebitBook,
    isnull(jl.CreditBook, 0) as CreditBook,
    isnull(jl.DebitTransaction, 0) as DebitTransaction,
    isnull(jl.CreditTransaction, 0) as CreditTransaction,
    isnull(jl.LineDescription, '') as LineDescription,
    isnull(jl.Reference1, '') as Reference1,
    isnull(jl.Reference2, '') as Reference2,
    jl.Account,
    isnull(jl.DebitorCreditor, '') as DebitorCreditor,
    isnull(dr.DRName, '') as DebitorCreditorName,
    isnull(jl.Customer, '') as Customer,
    c.CustomerName as CustomerName,
    isnull(jl.Vendor, '') as Vendor,
    v.VendorName as VendorName,
    isnull(jl.Bank, '') as Bank,
    isnull(coalesce(tm.TreasuryName, bm.BankAccountName), '') as BankName,
    isnull(jl.Tax, '') as Tax,
    isnull(jl.Segment7, '') as Asset,
    isnull(ast.ValueDescription, '') as AssetName,
    isnull(jl.Segment8, '') as Employee,
    isnull(emp.ValueDescription, '') as EmployeeName,
    isnull(jl.Segment9, '') as Expense,
    isnull(exp.ValueDescription, '') as ExpenseName,
    jl.LineCreatedBy,
    jl.LineCreatedDate,
    jl.LineType,
    isnull(jl.LineCurrency, 'SYP') as LineCurrency,
    isnull(jl.LineExchangeRate, 1) as LineExchangeRate,
    jl.JournalDate,
    jl.IsDoucmentRelated
from acc.JournalLine jl
left join acr.CustomerMaster c on jl.Customer = c.CustomerNo
left join acp.VendorMaster v on jl.Vendor = v.VendorNumber
left join acc.TreasuryMaster tm on jl.Bank = tm.TreasuryNumber
left join acc.BankAccountsMaster bm on jl.Bank = bm.BankAccountNumber
left join acc.DebetorCreditorMaster dr on jl.DebitorCreditor = dr.DRNumber
left join acc.SegmentsMaster ast on ast.SegmentID = 7 and ast.SegmentValue = jl.Segment7
left join acc.SegmentsMaster emp on emp.SegmentID = 8 and emp.SegmentValue = jl.Segment8
left join acc.SegmentsMaster exp on exp.SegmentID = 9 and exp.SegmentValue = jl.Segment9;
GO
