use ERPMega25
-- =========================================================================
-- Author:      Plus Beta Developer
-- Create date: 2026-07-08
-- Description: Dynamic Query Views and Query Master registration operations
-- =========================================================================
CREATE OR ALTER PROCEDURE [dbo].[APIPlusQueryOperation]
    @Operation VARCHAR(100),
    @LineData NVARCHAR(MAX) = '',
    @User           nvarchar(100) = '',
    @FireBaseToken  nvarchar(500) = '',
    @AppVersionWeb  nvarchar(50)  = '',
    @AppVersionAndroid nvarchar(50) = '',
    @AppVersionIos  nvarchar(50)  = '',
    @AppVersionDesktop nvarchar(50) = '',
    @PlatForm       nvarchar(50)  = '',
    @SqlStatement   nvarchar(max) = '',
    @State          int            output,
    @Message        nvarchar(500)  output
AS
BEGIN
    SET NOCOUNT ON;
    SET ANSI_WARNINGS OFF;
    
    SET @State = 0;
    SET @Message = 'Success';

    BEGIN TRY
        -- ---------------------------------------------------------------------
        -- Operation: CreateQueryView
        -- Compiles the SQL View DDL and registers/updates query metadata in PLS.QueryMaster
        -- ---------------------------------------------------------------------
        IF @Operation = 'CreateQueryView'
        BEGIN
            -- 1. Execute the View creation DDL if provided
            IF @SqlStatement IS NOT NULL AND LTRIM(RTRIM(@SqlStatement)) <> ''
            BEGIN
                EXEC(@SqlStatement);
            END

            -- 2. Extract metadata and update PLS.QueryMaster
            IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
            BEGIN
                DECLARE @PageGroupID VARCHAR(50) = JSON_VALUE(@LineData, '$.PageGroupID');
                DECLARE @QueryName NVARCHAR(150) = JSON_VALUE(@LineData, '$.QueryName');
                DECLARE @SPName NVARCHAR(250) = JSON_VALUE(@LineData, '$.SPName');
                DECLARE @QueryOperation VARCHAR(100) = JSON_VALUE(@LineData, '$.QueryOperation');
                DECLARE @Description NVARCHAR(500) = JSON_VALUE(@LineData, '$.Description');
                DECLARE @QuerySQL NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.QuerySQL');
                DECLARE @DatabaseName VARCHAR(100) = JSON_VALUE(@LineData, '$.DatabaseName');
                DECLARE @SchemaName VARCHAR(100) = JSON_VALUE(@LineData, '$.SchemaName');
                DECLARE @TableOrViewName VARCHAR(150) = JSON_VALUE(@LineData, '$.TableOrViewName');
                DECLARE @QueryType VARCHAR(50) = JSON_VALUE(@LineData, '$.QueryType');

                IF @PageGroupID IS NOT NULL AND @QueryOperation IS NOT NULL
                BEGIN
                    DECLARE @ExistingQueryID INT;
                    SELECT @ExistingQueryID = QueryID FROM [PLS].[QueryMaster] WHERE Operation = @QueryOperation;

                    IF @ExistingQueryID IS NOT NULL
                    BEGIN
                        UPDATE [PLS].[QueryMaster]
                        SET QueryName = COALESCE(@QueryName, QueryName),
                            SPName = COALESCE(@SPName, SPName),
                            Description = COALESCE(@Description, Description),
                            QuerySQL = COALESCE(@QuerySQL, QuerySQL),
                            DatabaseName = COALESCE(@DatabaseName, DatabaseName),
                            SchemaName = COALESCE(@SchemaName, SchemaName),
                            TableOrViewName = COALESCE(@TableOrViewName, TableOrViewName),
                            QueryType = COALESCE(@QueryType, QueryType)
                        WHERE QueryID = @ExistingQueryID;

                        IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = @PageGroupID AND QueryID = @ExistingQueryID)
                        BEGIN
                            INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES (@PageGroupID, @ExistingQueryID);
                        END
                        
                        SET @Message = 'View compiled and QueryMaster updated successfully';
                    END
                    ELSE
                    BEGIN
                        INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, CreatedBy)
                        VALUES (COALESCE(@QueryName, @QueryOperation), COALESCE(@SPName, N'[PLS].[APIPlusOperation]'), @QueryOperation, @Description, @QuerySQL, @DatabaseName, @SchemaName, @TableOrViewName, COALESCE(@QueryType, 'Grid'), @User);
                        
                        SET @ExistingQueryID = SCOPE_IDENTITY();
                        INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES (@PageGroupID, @ExistingQueryID);
                        
                        SET @Message = 'View compiled and QueryMaster registered successfully';
                    END
                END
                ELSE
                BEGIN
                    SET @Message = 'View compiled successfully (QueryMaster registration skipped: PageGroupID or QueryOperation missing)';
                END
            END
            ELSE
            BEGIN
                SET @Message = 'View compiled successfully (QueryMaster registration skipped: LineData JSON empty)';
            END
            
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Operation: ExecuteScript
        -- Compiles and executes an arbitrary SQL batch statement
        -- ---------------------------------------------------------------------
        IF @Operation = 'ExecuteScript'
        BEGIN
            IF @SqlStatement IS NULL OR LTRIM(RTRIM(@SqlStatement)) = ''
            BEGIN
                SET @State = 1;
                SET @Message = 'SqlStatement is required';
                RETURN;
            END

            EXEC(@SqlStatement);
            
            SET @Message = 'SQL executed successfully';
            RETURN;
        END

        -- ---------------------------------------------------------------------
        -- Fallback: Unsupported Operation
        -- ---------------------------------------------------------------------
        SET @Message = 'Unsupported Operation: ' + COALESCE(@Operation, 'NULL');
        SET @State = 1;

    END TRY
    BEGIN CATCH
        -- Database Exception Handler
        SET @State = ERROR_NUMBER();
        SET @Message = 'SQL Exception: ' + ERROR_MESSAGE() + ' (Line: ' + CAST(ERROR_LINE() AS VARCHAR(10)) + ')';
    END CATCH
END
GO
