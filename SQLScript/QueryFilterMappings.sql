USE [ERPMega25]
GO

-- ============================================================================
-- PLS.QueryFilterMappings
--
-- Stores the FilterPanel-to-column mapping for each Grid query in QueryMaster,
-- so a single generic operation (GetGridData, see APIPlusOperation.sql) can
-- build the WHERE clause dynamically instead of every page needing its own
-- hand-written IF block.
--
-- One row per filter the page exposes. Range filters (the vast majority --
-- account/customer/vendor/item/date/etc.) use FromParam + ToParam; single-value
-- filters (exact/like/asOf) only use FromParam.
-- ============================================================================

IF OBJECT_ID('PLS.QueryFilterMappings', 'U') IS NULL
BEGIN
    CREATE TABLE PLS.QueryFilterMappings (
        MappingID   INT IDENTITY(1,1) PRIMARY KEY,
        QueryID     INT NOT NULL REFERENCES PLS.QueryMaster(QueryID),
        FilterType  VARCHAR(20) NOT NULL DEFAULT 'range',   -- 'range' | 'exact' | 'like' | 'asOf'
        FromParam   VARCHAR(100) NOT NULL,                  -- LineData JSON key (range-from, or the single value for exact/like/asOf)
        ToParam     VARCHAR(100) NULL,                       -- LineData JSON key (range-to only, NULL otherwise)
        GridColumn  VARCHAR(150) NOT NULL,                  -- physical column on the registered view/query to filter on
        DataType    VARCHAR(20) NOT NULL DEFAULT 'string',   -- 'string' | 'date' | 'number'
        SortOrder   INT NOT NULL DEFAULT 0
    );
END
GO
