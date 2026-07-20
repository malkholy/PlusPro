CREATE OR ALTER PROCEDURE [PLS].[APIPlusLookupOperation]
    @Operation NVARCHAR(100),
    @LineData NVARCHAR(MAX) = NULL,
    @User NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @State INT = 0;
    DECLARE @Message NVARCHAR(MAX) = 'Success';

    BEGIN TRY
        DECLARE @IsAdmin BIT = 0;
        DECLARE @SQLFilter NVARCHAR(MAX) = NULL;
        DECLARE @DynSQL NVARCHAR(MAX);

        IF @User = 'sysadmin'
        BEGIN
            SET @IsAdmin = 1;
        END
        ELSE
        BEGIN
            SELECT @IsAdmin = ISNULL(IsAdmin, 0)
            FROM ERPManagement25.System.UserMaster
            WHERE Username = @User;
        END

        IF @IsAdmin = 0
        BEGIN
            SELECT @SQLFilter = SQLFilter
            FROM [PLS].[UserQueryPermissions] uqp
            INNER JOIN [PLS].[QueryMaster] qm ON uqp.QueryID = qm.QueryID
            WHERE uqp.Username = @User AND qm.Operation = @Operation;
        END

        SELECT TOP 1 @DynSQL = QuerySQL
        FROM [PLS].[QueryMaster]
        WHERE Operation = @Operation AND QueryType = 'Lookup';

        IF @DynSQL IS NULL OR LTRIM(RTRIM(@DynSQL)) = ''
        BEGIN
            RAISERROR('Lookup operation not found or QuerySQL is empty.', 16, 1);
        END

        IF @SQLFilter IS NOT NULL AND LTRIM(RTRIM(@SQLFilter)) <> ''
        BEGIN
            SET @DynSQL = REPLACE(@DynSQL, '{FILTER}', N' AND (' + @SQLFilter + N')');
        END
        ELSE
        BEGIN
            SET @DynSQL = REPLACE(@DynSQL, '{FILTER}', N'');
        END

        -- Execute the dynamic SQL
        -- We will pass parameters commonly used in lookups (like param1)
        DECLARE @param1 NVARCHAR(100) = JSON_VALUE(@LineData, '$.param1');
        
        EXEC sp_executesql @DynSQL, N'@param1 NVARCHAR(100)', @param1 = @param1;

    END TRY
    BEGIN CATCH
        SET @State = -1;
        SET @Message = ERROR_MESSAGE();
        SELECT @State AS State, @Message AS Message;
    END CATCH
END;
GO
