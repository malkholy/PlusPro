USE [ERPMega25]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE OR ALTER PROCEDURE [dbo].[APIPlusBOMOperation]
    @Operation nvarchar(250),
    @LineData nvarchar(max) = '',
    @LineMember nvarchar(max) = '',
    @User nvarchar(250),
    @FireBaseToken nvarchar(4000) = '',
    @AppVersionWeb nvarchar(20) = '',
    @AppVersionAndroid nvarchar(20) = '',
    @AppVersionIos nvarchar(20) = '',
    @AppVersionDesktop nvarchar(20) = '',
    @PlatForm nvarchar(50) = '',
    @SqlStatement nvarchar(max) = '',
    @State int = 0 OUT,
    @Message nvarchar(1000) = '' OUT
AS
BEGIN
    SET NOCOUNT ON;

    SET @State = 0
    SET @Message = ''

    -- =============================================
    -- NEW BOM
    -- =============================================
    -- FormulaID is a manually-assigned business key (not identity on
    -- prd.BillOfMaterialHeader, confirmed via sys.columns) -- generated the
    -- same way as every other cross-module sequence in this system.
    IF @Operation = 'New BOM'
    BEGIN
        DECLARE @NB_ParentItemID int, @NB_MachineID int, @NB_BatchQuantity float,
                @NB_ParentItemCode nvarchar(max), @NB_ParentItemType nvarchar(2), @NB_FormulaID int

        SELECT
            @NB_ParentItemID = ParentItemID, @NB_MachineID = MachineID, @NB_BatchQuantity = BatchQuantity
        FROM OPENJSON(@LineData) WITH (
            ParentItemID int '$.ParentItemID',
            MachineID int '$.MachineID',
            BatchQuantity float '$.BatchQuantity'
        )

        SELECT @NB_ParentItemCode = ItemCode, @NB_ParentItemType = ItemType
        FROM inv.ItemMaster
        WHERE ItemID = @NB_ParentItemID

        IF @NB_ParentItemCode IS NULL
        BEGIN
            SET @State = 1
            SET @Message = 'Item not found'
            RETURN
        END

        EXEC GetSequenceNo 23, @NB_FormulaID OUT

        INSERT INTO prd.BillOfMaterialHeader
            (FormulaID, FormulaFacility, FormulaTypeID, MachineID, ParentItemID, ParentItemCode, BatchQuantity, ParentItemType,
             FormulaCreatedBy, FormulaCreatedDate, FormulaLastMaintBy, FormulaLastMaintDate)
        VALUES
            (@NB_FormulaID, 'PRO', 1, @NB_MachineID, @NB_ParentItemID, @NB_ParentItemCode, @NB_BatchQuantity, @NB_ParentItemType,
             @User, GETDATE(), @User, GETDATE())

        IF @LineMember IS NOT NULL AND LTRIM(RTRIM(@LineMember)) <> ''
        BEGIN
            INSERT INTO prd.BillOfMaterialLine
                (LineFormulaID, LineParentItemID, LineParentItemCode, Line, ChildItemID, ChildItemCode, Quantity, ChildItemType)
            SELECT
                @NB_FormulaID, @NB_ParentItemID, @NB_ParentItemCode, nl.Line, nl.ChildItemID, im.ItemCode, nl.Quantity, im.ItemType
            FROM OPENJSON(@LineMember) WITH (
                Line        int             '$.Line',
                ChildItemID int             '$.ChildItemID',
                Quantity    decimal(18,5)   '$.Quantity'
            ) nl
            INNER JOIN inv.ItemMaster im ON im.ItemID = nl.ChildItemID
        END

        SELECT * FROM prd.BillOfMaterialHeader WHERE FormulaID = @NB_FormulaID
        RETURN
    END

    -- =============================================
    -- EDIT BOM
    -- =============================================
    IF @Operation = 'Edit BOM'
    BEGIN
        DECLARE @EB_FormulaID int, @EB_ParentItemID int, @EB_MachineID int, @EB_BatchQuantity float,
                @EB_ParentItemCode nvarchar(max), @EB_ParentItemType nvarchar(2)

        SELECT
            @EB_FormulaID = FormulaID, @EB_ParentItemID = ParentItemID, @EB_MachineID = MachineID, @EB_BatchQuantity = BatchQuantity
        FROM OPENJSON(@LineData) WITH (
            FormulaID int '$.FormulaID',
            ParentItemID int '$.ParentItemID',
            MachineID int '$.MachineID',
            BatchQuantity float '$.BatchQuantity'
        )

        IF @EB_FormulaID IS NULL
        BEGIN
            SET @State = 1
            SET @Message = 'FormulaID is required'
            RETURN
        END

        SELECT @EB_ParentItemCode = ItemCode, @EB_ParentItemType = ItemType
        FROM inv.ItemMaster
        WHERE ItemID = @EB_ParentItemID

        IF @EB_ParentItemCode IS NULL
        BEGIN
            SET @State = 1
            SET @Message = 'Item not found'
            RETURN
        END

        UPDATE prd.BillOfMaterialHeader
        SET MachineID = @EB_MachineID,
            ParentItemID = @EB_ParentItemID,
            ParentItemCode = @EB_ParentItemCode,
            BatchQuantity = @EB_BatchQuantity,
            ParentItemType = @EB_ParentItemType,
            FormulaLastMaintBy = @User,
            FormulaLastMaintDate = GETDATE()
        WHERE FormulaID = @EB_FormulaID

        -- Replace the line list wholesale, same pattern as Planning History's shift plan.
        DELETE FROM prd.BillOfMaterialLine WHERE LineFormulaID = @EB_FormulaID

        IF @LineMember IS NOT NULL AND LTRIM(RTRIM(@LineMember)) <> ''
        BEGIN
            INSERT INTO prd.BillOfMaterialLine
                (LineFormulaID, LineParentItemID, LineParentItemCode, Line, ChildItemID, ChildItemCode, Quantity, ChildItemType)
            SELECT
                @EB_FormulaID, @EB_ParentItemID, @EB_ParentItemCode, nl.Line, nl.ChildItemID, im.ItemCode, nl.Quantity, im.ItemType
            FROM OPENJSON(@LineMember) WITH (
                Line        int             '$.Line',
                ChildItemID int             '$.ChildItemID',
                Quantity    decimal(18,5)   '$.Quantity'
            ) nl
            INNER JOIN inv.ItemMaster im ON im.ItemID = nl.ChildItemID
        END

        SELECT * FROM prd.BillOfMaterialHeader WHERE FormulaID = @EB_FormulaID
        RETURN
    END

    -- =============================================
    -- DELETE BOM
    -- =============================================
    IF @Operation = 'Delete BOM'
    BEGIN
        DECLARE @DB_FormulaID int
        SELECT @DB_FormulaID = CAST(@LineData AS int)

        DELETE FROM prd.BillOfMaterialLine WHERE LineFormulaID = @DB_FormulaID
        DELETE FROM prd.BillOfMaterialHeader WHERE FormulaID = @DB_FormulaID
        RETURN
    END

    -- =============================================
    -- INVALID OPERATION
    -- =============================================
    SET @State = 1
    SET @Message = 'Invalid Operation: ' + @Operation

END
GO
