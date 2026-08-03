USE [ERPMega25]
GO

-- ============================================================================
-- Lookups for the "New Invoice Payment Header" form (Vendor Invoice Payment
-- page): Vendor Master and Year Master search dropdowns, served by the
-- generic Lookup engine folded into APIPlusOperation.sql (same as every other
-- dropdown in the app) -- NOT the dedicated APIPlusACPOperation SP, which is
-- reserved for the actual New/Edit mutations.
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE Operation = 'Vendor Master All')
BEGIN
    INSERT INTO [PLS].[QueryMaster] (QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
    VALUES (N'Vendor Master All', N'Vendor Master All',
            N'Vendor dropdown (Vendor Invoice Payment New form)',
            N'SELECT VendorNumber, VendorName, VendorExtraName FROM ACP.VendorMaster WHERE 1=1 {FILTER} ORDER BY VendorName;', 'Lookup', NULL);
END
GO

IF NOT EXISTS (SELECT 1 FROM [PLS].[QueryMaster] WHERE Operation = 'Year Master All')
BEGIN
    INSERT INTO [PLS].[QueryMaster] (QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl)
    VALUES (N'Year Master All', N'Year Master All',
            N'Year dropdown (Vendor Invoice Payment New form)',
            N'SELECT YID, Year FROM dbo.YearMaster WHERE 1=1 {FILTER} ORDER BY Year DESC;', 'Lookup', NULL);
END
GO

-- Standing rule: every QueryMaster row needs matching PLS.QueryFields rows
-- (see feedback_queryfields_registration_rule) -- backfilled via
-- BackfillQueryFields.sql after this script runs, not inserted by hand here.
