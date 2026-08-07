USE [ERPMega25]
GO

UPDATE [PLS].[PagesAndGroups]
SET Label = N'Company Status', Description = N'Company-wide financial position snapshot (read-only Grid onto PRO.V0090)'
WHERE PageGroupID = 'customer_status';
GO
