USE [ERPMega25]
GO

/****** Object:  StoredProcedure [PLS].[APIPlusInvOperation] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [PLS].[APIPlusInvOperation]
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
    @State          int            output,
    @Message        nvarchar(500)  output
AS
BEGIN
    SET NOCOUNT ON;
    SET @Message = '';
    SET @State = 0;

    -- =========================================================
    -- Add your Inventory Operations below
    -- =========================================================

    IF @Operation = 'Item Balance Grid'
    BEGIN
        DECLARE @ibFromItem nvarchar(100) = json_value(@LineData, '$.fromItem')
        DECLARE @ibToItem nvarchar(100) = json_value(@LineData, '$.toItem')

        SELECT * FROM [PLS].[QItemBalanceGrid]
        WHERE (@ibFromItem IS NULL OR @ibFromItem = '' OR ItemCode >= @ibFromItem)
          AND (@ibToItem IS NULL OR @ibToItem = '' OR ItemCode <= @ibToItem)
        RETURN;
    END

END
GO
