USE [ERPMega25]
GO

-- ============================================================================
-- PLS.QueryFields
--
-- One row per column of every registered QueryMaster query (Grid/Detail/
-- Lookup). Populated automatically -- see the auto-population block added to
-- 'SaveQueryMaster' and 'CreateQueryView' in APIPlusOperation.sql, which
-- re-discovers a query's result-set columns via sys.dm_exec_describe_first_
-- result_set (same DMV GetQueryFields/ValidateQueryCondition already use) and
-- rewrites this table's rows for that QueryID every time the query is saved.
--
-- Label/Format/Width/ColorRules are NOT derived from the DMV -- they start
-- NULL/blank and are meant to be edited by hand afterwards (grid column
-- display metadata), so re-saving a query only refreshes FieldName/DataType/
-- Length, never touches those four.
-- ============================================================================

IF OBJECT_ID('PLS.QueryFields', 'U') IS NULL
BEGIN
    CREATE TABLE PLS.QueryFields (
        ID          INT IDENTITY(1,1) PRIMARY KEY,
        QueryID     INT NOT NULL REFERENCES PLS.QueryMaster(QueryID),
        FieldName   NVARCHAR(150) NOT NULL,
        DataType    VARCHAR(50) NULL,
        Length      INT NULL,
        Label       NVARCHAR(150) NULL,
        Format      NVARCHAR(100) NULL,
        Width       INT NULL,
        ColorRules  NVARCHAR(MAX) NULL
    );
END
GO
