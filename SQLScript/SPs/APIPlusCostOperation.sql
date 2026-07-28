SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[APIPlusCostOperation]
    @Operation      nvarchar(100) = '',
    @LineData       nvarchar(max) = '',
    @User           nvarchar(100) = '',
    @FireBaseToken  nvarchar(500) = '',
    @AppVersionWeb  nvarchar(50)  = '',
    @AppVersionAndroid nvarchar(50) = '',
    @AppVersionIos  nvarchar(50)  = '',
    @AppVersionDesktop nvarchar(50) = '',
    @PlatForm       nvarchar(50)  = '',
    @SqlStatement   nvarchar(max) = '',
    @State          int            = 0 output,
    @Message        nvarchar(500)  = '' output
AS
BEGIN
    -- Declarations must be at the very top of the block
    DECLARE @FilterYear INT
    DECLARE @FilterQuarter INT
    DECLARE @FilterItemCode NVARCHAR(100)

    SET NOCOUNT ON
    SET @State = 0
    SET @Message = 'OK'
    
    SET @FilterYear = 2026
    SET @FilterQuarter = NULL
    SET @FilterItemCode = NULL

    -- 1. Parse parameters from @LineData
    IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
    BEGIN
        SELECT 
            @FilterYear = COALESCE(TRY_CAST(JSON_VALUE(@LineData, '$.Year') AS INT), @FilterYear),
            @FilterQuarter = TRY_CAST(JSON_VALUE(@LineData, '$.Quarter') AS INT),
            @FilterItemCode = JSON_VALUE(@LineData, '$.ItemCode')