USE [ERPMega25]
GO

-- ============================================================================
-- One-time backfill for PLS.QueryFields.
--
-- Most queries already in PLS.QueryMaster were registered via direct INSERT
-- scripts (RegisterXXX.sql), not through the 'SaveQueryMaster'/'CreateQueryView'
-- API operations -- the two places that now auto-populate QueryFields going
-- forward (see APIPlusOperation.sql). Run this once, after
-- RegisterQueryFields.sql creates the table, to catch every query that
-- predates that rule.
--
-- Safe to re-run: only processes QueryIDs that have zero QueryFields rows yet.
-- ============================================================================

DECLARE @QueryID INT, @QuerySQL NVARCHAR(MAX);
DECLARE @Params NVARCHAR(MAX) = N'@FromDate datetime, @ToDate datetime, @PONumber varchar(100), @ItemCode varchar(100), @ItemID int, @SaftyStock decimal(18,5), @LeadTime int, @PermUser varchar(100), @PermPageGroupID varchar(100), @PermCanView bit, @View_ModelID int, @Get_FunctionPrefix varchar(100), @SelectedTable varchar(100), @Get_MacroID int, @Get_EventID int, @Get_CashID int, @jNo varchar(100), @eNo int, @jeFrom datetime, @jeTo datetime, @sjeFrom datetime, @sjeTo datetime';

DECLARE backfill_cur CURSOR LOCAL FAST_FORWARD FOR
    SELECT q.QueryID, q.QuerySQL
    FROM PLS.QueryMaster q
    WHERE q.QuerySQL IS NOT NULL AND LTRIM(RTRIM(q.QuerySQL)) <> ''
      AND NOT EXISTS (SELECT 1 FROM PLS.QueryFields f WHERE f.QueryID = q.QueryID);

OPEN backfill_cur;
FETCH NEXT FROM backfill_cur INTO @QueryID, @QuerySQL;

WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @FieldSQL NVARCHAR(MAX) = @QuerySQL;
    IF CHARINDEX('{FILTER}', @FieldSQL) > 0
        SET @FieldSQL = REPLACE(@FieldSQL, '{FILTER}', N'');

    BEGIN TRY
        DECLARE @ExecSQL NVARCHAR(MAX) = N'
            INSERT INTO PLS.QueryFields (QueryID, FieldName, DataType, Length)
            SELECT ' + CAST(@QueryID AS NVARCHAR(20)) + N', name, system_type_name, CASE WHEN max_length = -1 THEN NULL ELSE max_length END
            FROM sys.dm_exec_describe_first_result_set(@FieldSQL, @Params, 0)
            WHERE name IS NOT NULL;
        ';
        EXEC sys.sp_executesql @ExecSQL, N'@FieldSQL NVARCHAR(MAX), @Params NVARCHAR(MAX)', @FieldSQL = @FieldSQL, @Params = @Params;
    END TRY
    BEGIN CATCH
        PRINT 'Skipped QueryID ' + CAST(@QueryID AS VARCHAR(10)) + ': ' + ERROR_MESSAGE();
    END CATCH

    FETCH NEXT FROM backfill_cur INTO @QueryID, @QuerySQL;
END

CLOSE backfill_cur;
DEALLOCATE backfill_cur;
GO
