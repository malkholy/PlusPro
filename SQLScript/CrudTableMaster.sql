USE [ERPMega25]
GO

-- ============================================================================
-- PLS.CrudTableMaster
--
-- One row per PageGroupID that is CRUD-enabled via the generic write engine
-- (GenericRecordSave / GenericRecordDelete, see APIPlusOperation.sql). Records
-- the actual writable base table for that page -- distinct from QueryMaster's
-- TableOrViewName, which describes the READ-side view/query, not necessarily
-- a plain single-table passthrough.
-- ============================================================================

IF OBJECT_ID('PLS.CrudTableMaster', 'U') IS NULL
BEGIN
    CREATE TABLE PLS.CrudTableMaster (
        PageGroupID   VARCHAR(50)  NOT NULL PRIMARY KEY,
        TargetSchema  VARCHAR(50)  NOT NULL DEFAULT 'dbo',
        TargetTable   VARCHAR(150) NOT NULL,
        AllowDelete   BIT          NOT NULL DEFAULT 1,
        CreatedBy     VARCHAR(100) NULL,
        CreatedDate   DATETIME     NOT NULL DEFAULT GETDATE()
    );
END
GO
