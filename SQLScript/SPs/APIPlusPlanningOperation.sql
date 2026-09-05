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
    -- Historically inserted a PrdItemPlanningHistory header row plus child
    -- shift rows. That header table is gone -- ShiftPlan is now the
    -- standalone source of truth, so each shift row carries its own
    -- Item/Machine/Formula/ProductionTime/Warehouse directly. Kept as the
    -- same operation name/contract since Show Plan's "Assign Item" flow
    -- calls this to create new shift rows.
    IF @Operation = 'New Planning History'
    BEGIN
        DECLARE @PH_ItemID int, @PH_ItemCode nvarchar(50),
                @PH_FormulaID int, @PH_MachineID int,
                @PH_FormulaBatch decimal(18,5), @PH_ProductionTime int, @PH_Warehouse nvarchar(50)

        SELECT
            @PH_ItemID = ItemID, @PH_ItemCode = ItemCode,
            @PH_FormulaID = FormulaID, @PH_MachineID = MachineID,
            @PH_FormulaBatch = FormulaBatch, @PH_ProductionTime = ProductionTime, @PH_Warehouse = Warehouse
        FROM OPENJSON(@LineData) WITH (
            ItemID int '$.ItemID',
            ItemCode nvarchar(50) '$.ItemCode',
            FormulaID int '$.FormulaID',
            MachineID int '$.MachineID',
            FormulaBatch decimal(18,5) '$.FormulaBatch',
            ProductionTime int '$.ProductionTime',
            Warehouse nvarchar(50) '$.Warehouse'
        )

        -- Reject if the incoming shift plan double-books this machine: either
        -- against another plan already on the machine, or against itself
        -- (duplicate slot sent twice in the same payload).
        IF @LineMember IS NOT NULL AND LTRIM(RTRIM(@LineMember)) <> ''
        BEGIN
            IF EXISTS (
                SELECT ShiftDate, ShiftNo
                FROM OPENJSON(@LineMember) WITH (ShiftDate date '$.ShiftDate', ShiftNo int '$.ShiftNo')
                GROUP BY ShiftDate, ShiftNo
                HAVING COUNT(*) > 1
            )
            BEGIN
                SET @State = 1
                SET @Message = 'Duplicate time slots in the submitted shift plan.'
                RETURN
            END

            -- Reject only on a REAL time overlap, not just "same shift" --
            -- a shift's leftover capacity can now be shared by more than
            -- one item (continuous/gap-free packing packs a new item's
            -- segment into whatever time is left after an existing one).
            IF EXISTS (
                SELECT 1
                FROM OPENJSON(@LineMember) WITH (ShiftDate date '$.ShiftDate', ShiftNo int '$.ShiftNo', StartTime datetime '$.StartTime', EndTime datetime '$.EndTime') nl
                INNER JOIN [PRO].[PrdItemPlanningShiftPlan] sp
                    ON sp.ShiftDate = nl.ShiftDate AND sp.ShiftNo = nl.ShiftNo AND sp.MachineID = @PH_MachineID
                    AND sp.StartTime < nl.EndTime AND nl.StartTime < sp.EndTime
            )
            BEGIN
                SET @State = 1
                SET @Message = 'One or more selected time windows overlap an item already scheduled on this machine.'
                RETURN
            END
        END

        IF @LineMember IS NOT NULL AND LTRIM(RTRIM(@LineMember)) <> ''
        BEGIN
            INSERT INTO [PRO].[PrdItemPlanningShiftPlan]
                (ItemID, ItemCode, MachineID, FormulaID, FormulaBatch, ProductionTime, Warehouse, ShiftIndex, ShiftDate, ShiftNo, StartTime, EndTime, PlannedQty, CumulativeQty, CreatedBy, CreatedDate)
            SELECT
                @PH_ItemID, @PH_ItemCode, @PH_MachineID, @PH_FormulaID, ISNULL(@PH_FormulaBatch, 0), ISNULL(@PH_ProductionTime, 0), ISNULL(@PH_Warehouse, ''),
                ShiftIndex, ShiftDate, ShiftNo, StartTime, EndTime, PlannedQty, CumulativeQty, @User, GETDATE()
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
            sp.ShiftPlanID,
            sp.ShopOrderNo,
            sp.MachineID,
            mm.MachineCode,
            mm.MachineType,
            sp.ShiftDate,
            sp.ShiftNo,
            sp.ItemID,
            sp.ItemCode,
            im.ItemDescription,
            im.StockUM,
            sp.PlannedQty,
            sp.FormulaID,
            bh.ParentItemCode AS FormulaCode,
            sp.FormulaBatch,
            sp.ProductionTime,
            sp.Warehouse,
            sp.StartTime,
            sp.EndTime
        FROM [PRO].[PrdItemPlanningShiftPlan] sp
        LEFT OUTER JOIN prd.MachineMaster mm ON sp.MachineID = mm.MachineID
        LEFT OUTER JOIN inv.ItemMaster im ON sp.ItemID = im.ItemID
        LEFT OUTER JOIN prd.BillOfMaterialHeader bh ON sp.FormulaID = bh.FormulaID
        WHERE (@PSC_FromDate IS NULL OR sp.ShiftDate >= @PSC_FromDate)
          AND (@PSC_ToDate IS NULL OR sp.ShiftDate <= @PSC_ToDate)
        ORDER BY sp.MachineID, sp.ShiftDate, sp.ShiftNo
        RETURN
    END

    -- =============================================
    -- LINK SHOP ORDER TO SHIFT
    -- =============================================
    -- Stamps a just-created Shop Order's number back onto the shift-plan row
    -- it was generated from (Show Plan calendar's right-click "Create Shop
    -- Order"), so the calendar can show which slots already have an order.
    IF @Operation = 'Link Shop Order To Shift'
    BEGIN
        DECLARE @LSO_ShiftPlanID int, @LSO_ShopOrderNo int

        SELECT @LSO_ShiftPlanID = ShiftPlanID, @LSO_ShopOrderNo = ShopOrderNo
        FROM OPENJSON(@LineData) WITH (
            ShiftPlanID int '$.ShiftPlanID',
            ShopOrderNo int '$.ShopOrderNo'
        )

        IF @LSO_ShiftPlanID IS NULL
        BEGIN
            SET @State = 1
            SET @Message = 'ShiftPlanID is required'
            RETURN
        END

        UPDATE [PRO].[PrdItemPlanningShiftPlan]
        SET ShopOrderNo = @LSO_ShopOrderNo
        WHERE ShiftPlanID = @LSO_ShiftPlanID

        RETURN
    END

    -- =============================================
    -- DELETE SHIFT PLAN SLOT (Show Plan right-click) -- blocked once a Shop
    -- Order has been created from this slot.
    -- =============================================
    IF @Operation = 'Delete Shift Plan Slot'
    BEGIN
        DECLARE @DSP_ShiftPlanID int, @DSP_ShopOrderNo int

        SELECT @DSP_ShiftPlanID = CAST(@LineData AS int)

        IF @DSP_ShiftPlanID IS NULL OR NOT EXISTS (SELECT 1 FROM [PRO].[PrdItemPlanningShiftPlan] WHERE ShiftPlanID = @DSP_ShiftPlanID)
        BEGIN
            SET @State = 1
            SET @Message = 'Shift plan slot not found'
            RETURN
        END

        SELECT @DSP_ShopOrderNo = ShopOrderNo FROM [PRO].[PrdItemPlanningShiftPlan] WHERE ShiftPlanID = @DSP_ShiftPlanID

        IF @DSP_ShopOrderNo IS NOT NULL
        BEGIN
            SET @State = 1
            SET @Message = 'Cannot delete -- Shop Order ' + CAST(@DSP_ShopOrderNo AS nvarchar(20)) + ' is already linked to this slot'
            RETURN
        END

        DELETE FROM [PRO].[PrdItemPlanningShiftPlan] WHERE ShiftPlanID = @DSP_ShiftPlanID
        RETURN
    END

    -- =============================================
    -- EDIT SHIFT PLAN SLOT (Show Plan right-click) -- blocked once a Shop
    -- Order has been created from this slot, same as Delete.
    -- =============================================
    IF @Operation = 'Edit Shift Plan Slot'
    BEGIN
        DECLARE @ESP_ShiftPlanID int, @ESP_PlannedQty decimal(18,5), @ESP_ShopOrderNo int

        SELECT @ESP_ShiftPlanID = ShiftPlanID, @ESP_PlannedQty = PlannedQty
        FROM OPENJSON(@LineData) WITH (
            ShiftPlanID int '$.ShiftPlanID',
            PlannedQty  decimal(18,5) '$.PlannedQty'
        )

        IF @ESP_ShiftPlanID IS NULL OR NOT EXISTS (SELECT 1 FROM [PRO].[PrdItemPlanningShiftPlan] WHERE ShiftPlanID = @ESP_ShiftPlanID)
        BEGIN
            SET @State = 1
            SET @Message = 'Shift plan slot not found'
            RETURN
        END

        SELECT @ESP_ShopOrderNo = ShopOrderNo FROM [PRO].[PrdItemPlanningShiftPlan] WHERE ShiftPlanID = @ESP_ShiftPlanID

        IF @ESP_ShopOrderNo IS NOT NULL
        BEGIN
            SET @State = 1
            SET @Message = 'Cannot edit -- Shop Order ' + CAST(@ESP_ShopOrderNo AS nvarchar(20)) + ' is already linked to this slot'
            RETURN
        END

        UPDATE [PRO].[PrdItemPlanningShiftPlan]
        SET PlannedQty = ISNULL(@ESP_PlannedQty, 0)
        WHERE ShiftPlanID = @ESP_ShiftPlanID

        RETURN
    END

    -- =============================================
    -- SHIFT MACHINE PLAN (Show Plan "Shift Plan" button) -- moves a whole
    -- machine's shift-plan slots by a uniform offset (1 shift or 1 day,
    -- forward or backward). The frontend computes each slot's new
    -- date/shift/time window and sends the full batch; this operation is
    -- all-or-nothing (one failing slot rolls back the whole move) so the
    -- plan's internal sequencing never ends up half-shifted.
    -- A slot already linked to a Shop Order can still be moved as long as
    -- that order is still in 'New' state (0) -- once Issued/Closed, moving
    -- its slot would misrepresent when production actually happened, so
    -- it's rejected (frontend is expected to exclude those before calling).
    -- =============================================
    IF @Operation = 'Shift Machine Plan'
    BEGIN
        DECLARE @SMP_MachineID int
        SELECT @SMP_MachineID = MachineID FROM OPENJSON(@LineData) WITH (MachineID int '$.MachineID')

        IF @SMP_MachineID IS NULL
        BEGIN
            SET @State = 1
            SET @Message = 'MachineID is required'
            RETURN
        END

        IF @LineMember IS NULL OR LTRIM(RTRIM(@LineMember)) = ''
        BEGIN
            SET @State = 1
            SET @Message = 'No slots to shift'
            RETURN
        END

        DECLARE @SMP_Rows TABLE (ShiftPlanID int, NewShiftDate date, NewShiftNo int, NewStartTime datetime, NewEndTime datetime)
        INSERT INTO @SMP_Rows
        SELECT ShiftPlanID, NewShiftDate, NewShiftNo, NewStartTime, NewEndTime
        FROM OPENJSON(@LineMember) WITH (
            ShiftPlanID  int      '$.ShiftPlanID',
            NewShiftDate date     '$.NewShiftDate',
            NewShiftNo   int      '$.NewShiftNo',
            NewStartTime datetime '$.NewStartTime',
            NewEndTime   datetime '$.NewEndTime'
        )

        IF EXISTS (
            SELECT 1 FROM @SMP_Rows r
            LEFT OUTER JOIN [PRO].[PrdItemPlanningShiftPlan] sp ON sp.ShiftPlanID = r.ShiftPlanID
            LEFT OUTER JOIN [Pro].[ShopOrderHeader] so ON so.ShopOrderNumber = sp.ShopOrderNo
            WHERE sp.ShiftPlanID IS NULL
               OR sp.MachineID <> @SMP_MachineID
               OR (sp.ShopOrderNo IS NOT NULL AND ISNULL(so.OrderState, -1) <> 0)
        )
        BEGIN
            SET @State = 1
            SET @Message = 'One or more slots cannot be shifted -- not found, not on this machine, or linked to a Shop Order that is no longer New.'
            RETURN
        END

        -- A shifted slot's new time window must not overlap any OTHER slot
        -- on this machine that is not itself part of this batch (a
        -- stationary slot left behind because it couldn't move).
        IF EXISTS (
            SELECT 1
            FROM @SMP_Rows r
            INNER JOIN [PRO].[PrdItemPlanningShiftPlan] other
                ON other.MachineID = @SMP_MachineID
                AND other.ShiftPlanID NOT IN (SELECT ShiftPlanID FROM @SMP_Rows)
                AND other.ShiftDate = r.NewShiftDate AND other.ShiftNo = r.NewShiftNo
                AND other.StartTime < r.NewEndTime AND r.NewStartTime < other.EndTime
        )
        BEGIN
            SET @State = 1
            SET @Message = 'Shifting would overlap a slot that is not part of this move.'
            RETURN
        END

        BEGIN TRY
            BEGIN TRANSACTION

            UPDATE sp
            SET sp.ShiftDate = r.NewShiftDate, sp.ShiftNo = r.NewShiftNo, sp.StartTime = r.NewStartTime, sp.EndTime = r.NewEndTime
            FROM [PRO].[PrdItemPlanningShiftPlan] sp
            INNER JOIN @SMP_Rows r ON r.ShiftPlanID = sp.ShiftPlanID

            COMMIT TRANSACTION
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
            SET @State = 1
            SET @Message = 'Failed to shift plan: ' + ERROR_MESSAGE()
            RETURN
        END CATCH

        RETURN
    END

    -- =============================================
    -- SPLIT SHIFT PLAN SLOT (Show Plan drag-and-drop, partial move) --
    -- carves a portion of one slot's Qty/time off into a brand-new slot at
    -- a different (date, shift) on the SAME machine, shrinking the
    -- original slot's Qty/EndTime by that same amount (its StartTime never
    -- changes, so it can only shrink toward its own start -- never creates
    -- a new overlap on that side). Only unlinked slots can be split (same
    -- rule intent as Delete/Edit Shift Plan Slot) since a Shop Order's Qty
    -- bookkeeping assumes exactly one slot's worth of production per line.
    -- =============================================
    IF @Operation = 'Split Shift Plan Slot'
    BEGIN
        DECLARE @SPL_ShiftPlanID int, @SPL_RemainingQty decimal(18,5), @SPL_RemainingEndTime datetime
        SELECT @SPL_ShiftPlanID = ShiftPlanID, @SPL_RemainingQty = RemainingQty, @SPL_RemainingEndTime = RemainingEndTime
        FROM OPENJSON(@LineData) WITH (
            ShiftPlanID      int      '$.ShiftPlanID',
            RemainingQty     decimal(18,5) '$.RemainingQty',
            RemainingEndTime datetime '$.RemainingEndTime'
        )

        DECLARE @SPL_ItemID int, @SPL_ItemCode nvarchar(50), @SPL_MachineID int, @SPL_FormulaID int,
                @SPL_FormulaBatch decimal(18,5), @SPL_ProductionTime int, @SPL_Warehouse nvarchar(50), @SPL_ShopOrderNo int

        SELECT @SPL_ItemID = ItemID, @SPL_ItemCode = ItemCode, @SPL_MachineID = MachineID, @SPL_FormulaID = FormulaID,
               @SPL_FormulaBatch = FormulaBatch, @SPL_ProductionTime = ProductionTime, @SPL_Warehouse = Warehouse, @SPL_ShopOrderNo = ShopOrderNo
        FROM [PRO].[PrdItemPlanningShiftPlan] WHERE ShiftPlanID = @SPL_ShiftPlanID

        IF @SPL_ItemID IS NULL
        BEGIN
            SET @State = 1
            SET @Message = 'Shift plan slot not found'
            RETURN
        END

        IF @SPL_ShopOrderNo IS NOT NULL
        BEGIN
            SET @State = 1
            SET @Message = 'Cannot split -- Shop Order ' + CAST(@SPL_ShopOrderNo AS nvarchar(20)) + ' is already linked to this slot'
            RETURN
        END

        IF @SPL_RemainingQty IS NULL OR @SPL_RemainingQty <= 0
        BEGIN
            SET @State = 1
            SET @Message = 'Remaining Qty must be greater than zero -- use a full move instead of a split.'
            RETURN
        END

        DECLARE @SPL_NewDate date, @SPL_NewShiftNo int, @SPL_NewStart datetime, @SPL_NewEnd datetime, @SPL_NewQty decimal(18,5)
        SELECT @SPL_NewDate = ShiftDate, @SPL_NewShiftNo = ShiftNo, @SPL_NewStart = StartTime, @SPL_NewEnd = EndTime, @SPL_NewQty = PlannedQty
        FROM OPENJSON(@LineMember) WITH (
            ShiftDate  date     '$.ShiftDate',
            ShiftNo    int      '$.ShiftNo',
            StartTime  datetime '$.StartTime',
            EndTime    datetime '$.EndTime',
            PlannedQty decimal(18,5) '$.PlannedQty'
        )

        IF @SPL_NewQty IS NULL OR @SPL_NewQty <= 0
        BEGIN
            SET @State = 1
            SET @Message = 'Split-off Qty must be greater than zero'
            RETURN
        END

        -- Real time-overlap guard against whatever else is on the target
        -- machine/shift (same rule as New Planning History).
        IF EXISTS (
            SELECT 1 FROM [PRO].[PrdItemPlanningShiftPlan] sp
            WHERE sp.MachineID = @SPL_MachineID AND sp.ShiftDate = @SPL_NewDate AND sp.ShiftNo = @SPL_NewShiftNo
              AND sp.StartTime < @SPL_NewEnd AND @SPL_NewStart < sp.EndTime
        )
        BEGIN
            SET @State = 1
            SET @Message = 'Target time window overlaps an item already scheduled on this machine.'
            RETURN
        END

        BEGIN TRY
            BEGIN TRANSACTION

            UPDATE [PRO].[PrdItemPlanningShiftPlan]
            SET PlannedQty = @SPL_RemainingQty, EndTime = @SPL_RemainingEndTime
            WHERE ShiftPlanID = @SPL_ShiftPlanID

            INSERT INTO [PRO].[PrdItemPlanningShiftPlan]
                (ItemID, ItemCode, MachineID, FormulaID, FormulaBatch, ProductionTime, Warehouse, ShiftIndex, ShiftDate, ShiftNo, StartTime, EndTime, PlannedQty, CumulativeQty, CreatedBy, CreatedDate)
            VALUES
                (@SPL_ItemID, @SPL_ItemCode, @SPL_MachineID, @SPL_FormulaID, ISNULL(@SPL_FormulaBatch, 0), ISNULL(@SPL_ProductionTime, 0), ISNULL(@SPL_Warehouse, ''),
                 1, @SPL_NewDate, @SPL_NewShiftNo, @SPL_NewStart, @SPL_NewEnd, @SPL_NewQty, @SPL_NewQty, @User, GETDATE())

            COMMIT TRANSACTION
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
            SET @State = 1
            SET @Message = 'Failed to split slot: ' + ERROR_MESSAGE()
            RETURN
        END CATCH

        RETURN
    END

    -- =============================================
    -- INVALID OPERATION
    -- =============================================
    SET @State = 1
    SET @Message = 'Invalid Operation: ' + @Operation

END
GO
