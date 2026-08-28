USE [ERPMega25]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE OR ALTER PROCEDURE [PRO].[APIPlusPlanningOperation]
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

    -- =============================================
    -- DECLARE ALL VARIABLES
    -- =============================================
    DECLARE @ID                 int,
            @ItemID             int,
            @ItemCode           nvarchar(50),
            @ItemType           nvarchar(50),
            @DefaultMachine     int,
            @DefaultFormula     int,
            @SaftyStock         int,
            @LeadTime           int,
            @NetWeight          decimal(18,5),
            @ColorName          nvarchar(150),
            @ColorPriority      int,
            @ProducationTime    int,
            @Count              int

    -- =============================================
    -- INITIALIZE STATE
    -- =============================================
    SET @State = 0
    SET @Message = ''

    -- =============================================
    -- LOG SP CALL
    -- =============================================
    -- SPUserLog does not exist unqualified in this database (confirmed via
    -- OBJECT_ID lookup -- same issue already fixed the same way in
    -- APIPlusJournalOperation.sql). Left disabled to match that precedent
    -- rather than guessing at a qualified name.
    --INSERT INTO SPUserLog (Username, ModuleName, SPName, SPOperation, AndroidVersion, DeskTopVerion, WebVersion, IOSVersion, CreatedDate, platForm, FireBaseToken, SqlStatement, lineData)
    --VALUES (@User, 'Control Panel', 'APIItemPlanningMasterOperation', @Operation, @AppVersionAndroid, @AppVersionDesktop, @AppVersionWeb, @AppVersionIos, GETDATE(), @PlatForm, @FireBaseToken, @SqlStatement, @LineData)

    -- =============================================
    -- ITEM PLANNING MASTER TEMP TABLE
    -- =============================================
    CREATE TABLE #TempTable (ID int, ItemID int, ItemCode nvarchar(50), ItemType nvarchar(50), DefaultMachine int, DefaultFormula int, SaftyStock int, LeadTime int, NetWeight decimal(18,5), ColorName nvarchar(150), ColorPriority int, ProducationTime int)

    -- =============================================
    -- GET ITEM PLANNING
    -- =============================================
    IF @Operation = 'Get Item Planning'
    BEGIN
        SELECT *
        FROM [PRO].[ItemPlanningMaster]
        ORDER BY ItemCode ASC
        RETURN
    END

    -- =============================================
    -- NEW ITEM PLANNING
    -- =============================================
    IF @Operation = 'New Item Planning'
    BEGIN
        INSERT INTO #TempTable
        SELECT * FROM OPENJSON(@LineData) WITH (ID int, ItemID int, ItemCode nvarchar(50), ItemType nvarchar(50), DefaultMachine int, DefaultFormula int, SaftyStock int, LeadTime int, NetWeight decimal(18,5), ColorName nvarchar(150), ColorPriority int, ProducationTime int)

        SELECT TOP 1 @ItemID = ItemID, @ItemCode = ItemCode, @ItemType = ItemType, @DefaultMachine = DefaultMachine, @DefaultFormula = DefaultFormula, @SaftyStock = SaftyStock, @LeadTime = LeadTime, @NetWeight = NetWeight, @ColorName = ColorName, @ColorPriority = ColorPriority, @ProducationTime = ProducationTime
        FROM #TempTable

        SELECT @Count = COUNT(*)
        FROM [PRO].[ItemPlanningMaster]
        WHERE ItemCode = @ItemCode

        IF @Count > 0
        BEGIN
            SET @State = 1
            SET @Message = 'Item Code already exists'
            RETURN
        END

        INSERT INTO [PRO].[ItemPlanningMaster] (ItemID, ItemCode, ItemType, DefaultMachine, DefaultFormula, SaftyStock, LeadTime, NetWeight, ColorName, ColorPriority, ProducationTime, CreatedBy, CreatedDate, LastMaintBy, LastMaintDate)
        VALUES (@ItemID, @ItemCode, @ItemType, @DefaultMachine, @DefaultFormula, @SaftyStock, @LeadTime, @NetWeight, @ColorName, @ColorPriority, @ProducationTime, @User, GETDATE(), @User, GETDATE())

        SET @ID = SCOPE_IDENTITY()

        SELECT *
        FROM [PRO].[ItemPlanningMaster]
        WHERE ID = @ID
        RETURN
    END

    -- =============================================
    -- EDIT ITEM PLANNING
    -- =============================================
    IF @Operation = 'Edit Item Planning'
    BEGIN
        INSERT INTO #TempTable
        SELECT * FROM OPENJSON(@LineData) WITH (ID int, ItemID int, ItemCode nvarchar(50), ItemType nvarchar(50), DefaultMachine int, DefaultFormula int, SaftyStock int, LeadTime int, NetWeight decimal(18,5), ColorName nvarchar(150), ColorPriority int, ProducationTime int)

        SELECT TOP 1 @ID = ID, @ItemID = ItemID, @ItemCode = ItemCode, @ItemType = ItemType, @DefaultMachine = DefaultMachine, @DefaultFormula = DefaultFormula, @SaftyStock = SaftyStock, @LeadTime = LeadTime, @NetWeight = NetWeight, @ColorName = ColorName, @ColorPriority = ColorPriority, @ProducationTime = ProducationTime
        FROM #TempTable

        SELECT @Count = COUNT(*)
        FROM [PRO].[ItemPlanningMaster]
        WHERE ItemCode = @ItemCode AND ID <> @ID

        IF @Count > 0
        BEGIN
            SET @State = 1
            SET @Message = 'Item Code already exists'
            RETURN
        END

        UPDATE [PRO].[ItemPlanningMaster] SET ItemID = @ItemID, ItemCode = @ItemCode, ItemType = @ItemType, DefaultMachine = @DefaultMachine, DefaultFormula = @DefaultFormula, SaftyStock = @SaftyStock, LeadTime = @LeadTime, NetWeight = @NetWeight, ColorName = @ColorName, ColorPriority = @ColorPriority, ProducationTime = @ProducationTime, LastMaintBy = @User, LastMaintDate = GETDATE()
        WHERE ID = @ID

        SELECT *
        FROM [PRO].[ItemPlanningMaster]
        WHERE ID = @ID
        RETURN
    END

    -- =============================================
    -- DELETE ITEM PLANNING
    -- =============================================
    IF @Operation = 'Delete Item Planning'
    BEGIN
        SELECT @ID = CAST(@LineData AS int)

        DELETE FROM [PRO].[ItemPlanningMaster]
        WHERE ID = @ID
        RETURN
    END

    -- =============================================
    -- NEW PLANNING HISTORY
    -- =============================================
    IF @Operation = 'New Planning History'
    BEGIN
        DECLARE @PH_ItemID int, @PH_ItemCode nvarchar(50), @PH_StartDate date, @PH_EndDate date,
                @PH_PlannedQty decimal(18,5), @PH_FormulaID int, @PH_MachineID int, @PH_PlanningID int,
                @PH_FormulaBatch decimal(18,5), @PH_ProductionTime int, @PH_Warehouse nvarchar(50)

        SELECT
            @PH_ItemID = ItemID, @PH_ItemCode = ItemCode, @PH_StartDate = StartDate, @PH_EndDate = EndDate,
            @PH_PlannedQty = PlannedQty, @PH_FormulaID = FormulaID, @PH_MachineID = MachineID,
            @PH_FormulaBatch = FormulaBatch, @PH_ProductionTime = ProductionTime, @PH_Warehouse = Warehouse
        FROM OPENJSON(@LineData) WITH (
            ItemID int '$.ItemID',
            ItemCode nvarchar(50) '$.ItemCode',
            StartDate date '$.StartDate',
            EndDate date '$.EndDate',
            PlannedQty decimal(18,5) '$.PlannedQty',
            FormulaID int '$.FormulaID',
            MachineID int '$.MachineID',
            FormulaBatch decimal(18,5) '$.FormulaBatch',
            ProductionTime int '$.ProductionTime',
            Warehouse nvarchar(50) '$.Warehouse'
        )

        -- PlanningState isn't collected on this form yet; defaulted to 0 until it's wired up.
        INSERT INTO [PRO].[PrdItemPlanningHistory]
            (ItemID, ItemCode, PlanningState, PlannedQty, StartDate, EndDate, MachineID, FormulaID, FormulaBatch, ProductionTime, Warehouse, CreatedBy, CreatedDate, LastMaintBy, LastMaintDate)
        VALUES
            (@PH_ItemID, @PH_ItemCode, 0, @PH_PlannedQty, @PH_StartDate, @PH_EndDate, @PH_MachineID, @PH_FormulaID, ISNULL(@PH_FormulaBatch, 0), ISNULL(@PH_ProductionTime, 0), ISNULL(@PH_Warehouse, ''), @User, GETDATE(), @User, GETDATE())

        SET @PH_PlanningID = SCOPE_IDENTITY()

        -- Persist the computed shift-by-shift schedule, if the caller sent one.
        IF @LineMember IS NOT NULL AND LTRIM(RTRIM(@LineMember)) <> ''
        BEGIN
            INSERT INTO [PRO].[PrdItemPlanningShiftPlan]
                (PlanningID, ItemCode, ShiftIndex, ShiftDate, ShiftNo, StartTime, EndTime, PlannedQty, CumulativeQty, CreatedBy, CreatedDate)
            SELECT
                @PH_PlanningID, @PH_ItemCode, ShiftIndex, ShiftDate, ShiftNo, StartTime, EndTime, PlannedQty, CumulativeQty, @User, GETDATE()
            FROM OPENJSON(@LineMember) WITH (
                ShiftIndex   int          '$.ShiftIndex',
                ShiftDate    date         '$.ShiftDate',
                ShiftNo      int          '$.ShiftNo',
                StartTime    datetime     '$.StartTime',
                EndTime      datetime     '$.EndTime',
                PlannedQty   decimal(18,5) '$.PlannedQty',
                CumulativeQty decimal(18,5) '$.CumulativeQty'
            )
        END

        SELECT *
        FROM [PRO].[PrdItemPlanningHistory]
        WHERE PlanningID = @PH_PlanningID
        RETURN
    END

    -- =============================================
    -- EDIT PLANNING HISTORY
    -- =============================================
    IF @Operation = 'Edit Planning History'
    BEGIN
        DECLARE @EPH_PlanningID int, @EPH_ItemID int, @EPH_ItemCode nvarchar(50), @EPH_StartDate date, @EPH_EndDate date,
                @EPH_PlannedQty decimal(18,5), @EPH_FormulaID int, @EPH_MachineID int,
                @EPH_FormulaBatch decimal(18,5), @EPH_ProductionTime int, @EPH_Warehouse nvarchar(50)

        SELECT
            @EPH_PlanningID = PlanningID, @EPH_ItemID = ItemID, @EPH_ItemCode = ItemCode, @EPH_StartDate = StartDate, @EPH_EndDate = EndDate,
            @EPH_PlannedQty = PlannedQty, @EPH_FormulaID = FormulaID, @EPH_MachineID = MachineID,
            @EPH_FormulaBatch = FormulaBatch, @EPH_ProductionTime = ProductionTime, @EPH_Warehouse = Warehouse
        FROM OPENJSON(@LineData) WITH (
            PlanningID int '$.PlanningID',
            ItemID int '$.ItemID',
            ItemCode nvarchar(50) '$.ItemCode',
            StartDate date '$.StartDate',
            EndDate date '$.EndDate',
            PlannedQty decimal(18,5) '$.PlannedQty',
            FormulaID int '$.FormulaID',
            MachineID int '$.MachineID',
            FormulaBatch decimal(18,5) '$.FormulaBatch',
            ProductionTime int '$.ProductionTime',
            Warehouse nvarchar(50) '$.Warehouse'
        )

        IF @EPH_PlanningID IS NULL
        BEGIN
            SET @State = 1
            SET @Message = 'PlanningID is required'
            RETURN
        END

        UPDATE [PRO].[PrdItemPlanningHistory]
        SET ItemID = @EPH_ItemID,
            ItemCode = @EPH_ItemCode,
            PlannedQty = @EPH_PlannedQty,
            StartDate = @EPH_StartDate,
            EndDate = @EPH_EndDate,
            MachineID = @EPH_MachineID,
            FormulaID = @EPH_FormulaID,
            FormulaBatch = ISNULL(@EPH_FormulaBatch, 0),
            ProductionTime = ISNULL(@EPH_ProductionTime, 0),
            Warehouse = ISNULL(@EPH_Warehouse, ''),
            LastMaintBy = @User,
            LastMaintDate = GETDATE()
        WHERE PlanningID = @EPH_PlanningID

        -- Replace the shift plan wholesale with the recalculated one.
        DELETE FROM [PRO].[PrdItemPlanningShiftPlan] WHERE PlanningID = @EPH_PlanningID

        IF @LineMember IS NOT NULL AND LTRIM(RTRIM(@LineMember)) <> ''
        BEGIN
            INSERT INTO [PRO].[PrdItemPlanningShiftPlan]
                (PlanningID, ItemCode, ShiftIndex, ShiftDate, ShiftNo, StartTime, EndTime, PlannedQty, CumulativeQty, CreatedBy, CreatedDate)
            SELECT
                @EPH_PlanningID, @EPH_ItemCode, ShiftIndex, ShiftDate, ShiftNo, StartTime, EndTime, PlannedQty, CumulativeQty, @User, GETDATE()
            FROM OPENJSON(@LineMember) WITH (
                ShiftIndex   int          '$.ShiftIndex',
                ShiftDate    date         '$.ShiftDate',
                ShiftNo      int          '$.ShiftNo',
                StartTime    datetime     '$.StartTime',
                EndTime      datetime     '$.EndTime',
                PlannedQty   decimal(18,5) '$.PlannedQty',
                CumulativeQty decimal(18,5) '$.CumulativeQty'
            )
        END

        SELECT *
        FROM [PRO].[PrdItemPlanningHistory]
        WHERE PlanningID = @EPH_PlanningID
        RETURN
    END

    -- =============================================
    -- GET PLANNING SHIFT CALENDAR
    -- =============================================
    IF @Operation = 'Get Planning Shift Calendar'
    BEGIN
        DECLARE @PSC_FromDate date, @PSC_ToDate date

        SELECT @PSC_FromDate = FromDate, @PSC_ToDate = ToDate
        FROM OPENJSON(@LineData) WITH (
            FromDate date '$.FromDate',
            ToDate   date '$.ToDate'
        )

        SELECT
            h.MachineID,
            mm.MachineCode,
            sp.ShiftDate,
            sp.ShiftNo,
            sp.ItemCode,
            im.ItemDescription,
            sp.PlannedQty,
            h.FormulaID,
            bh.ParentItemCode AS FormulaCode,
            h.FormulaBatch,
            h.ProductionTime
        FROM [PRO].[PrdItemPlanningShiftPlan] sp
        INNER JOIN [PRO].[PrdItemPlanningHistory] h ON sp.PlanningID = h.PlanningID
        LEFT OUTER JOIN prd.MachineMaster mm ON h.MachineID = mm.MachineID
        LEFT OUTER JOIN inv.ItemMaster im ON h.ItemID = im.ItemID
        LEFT OUTER JOIN prd.BillOfMaterialHeader bh ON h.FormulaID = bh.FormulaID
        WHERE (@PSC_FromDate IS NULL OR sp.ShiftDate >= @PSC_FromDate)
          AND (@PSC_ToDate IS NULL OR sp.ShiftDate <= @PSC_ToDate)
        ORDER BY h.MachineID, sp.ShiftDate, sp.ShiftNo
        RETURN
    END

    -- =============================================
    -- INVALID OPERATION
    -- =============================================
    SET @State = 1
    SET @Message = 'Invalid Operation: ' + @Operation

END
GO
