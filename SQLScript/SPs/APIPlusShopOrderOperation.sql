USE [ERPMega25]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE OR ALTER   PROCEDURE [PRO].[APIPlusShopOrderOperation]
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
    DECLARE @Cnt int , @ShopOrderFacility nvarchar(5),@ParentItemCode nvarchar(50),@ParentItemType nvarchar(1) , @LotControl int , @OnHand float , @Allocated float , @OrderState int , @ProducationAllow int , @ParentOrginalQty float
	declare  @Line int  ,@Seq int ,  @ItemID int  , @lot nvarchar(150) ,@Qty Float , @Warehouse nvarchar(5) , @ChildIssueTransaction nvarchar(5) , @ParentTransaction nvarchar(5) , @ErrorLine int , @LineType  int  ,
	@ChildReceiptTransaction nvarchar(5) , @childTransaction nvarchar(5) , @ChildCorrection nvarchar(5) , @Batchsize float , @Factor float , @SumQtyIssued  float ,  @TotalQtyIssued dec(15,5) , @quantityOrdered dec(15,5) ,
	@FormulaID int =0 , @MachineID int , @ShopOrderNumber int =0 , @ShopOrderDate date , @ParentItemID int , @ShiftNo int

	create Table #TempHeader
	( ShopOrderNo int , ShopOrderDate date ,  Warehouse nvarchar(50) ,  ParentITemID int , FormulaID int , MAchineID int ,
	Qty dec(18,5) , ShiftNo int )

    -- =============================================
    -- INITIALIZE STATE
    -- =============================================
    SET @State = 0
    SET @Message = ''

   if @operation='New Shop Order'
   begin
		INSERT INTO #TempHeader
        SELECT * FROM OPENJSON(@LineData)
		WITH (ShopOrderNo int , ShopOrderDate date ,  Warehouse nvarchar(50) ,  ParentITemID int , FormulaID int , MAchineID int , Qty dec(18,5) , ShiftNo int )

        SELECT TOP 1 @ShopOrderDate=ShopOrderDate ,   @ParentItemID  = ParentITemID, @FormulaID= FormulaID , @MachineID =MAchineID , @Qty =Qty , @Warehouse=Warehouse , @ShiftNo=ShiftNo
        FROM #TempHeader
		select  @Batchsize = BatchQuantity  FROM prd.BillOfMaterialHeader  WHERE FormulaID=@FormulaID
		set @Factor=@Qty / @Batchsize
		select @ParentItemCode=ItemCode ,@ParentItemType=ItemType from inv.ItemMaster where itemid=@ParentItemID

		exec GetSequenceNo 21 , @ShopOrderNumber out


		Insert into pro.[ShopOrderHeader] (
		ShopOrderNumber,ShopOrderDate,ShopOrderWarehouse,ParentItemID,ParentItemCode,ParentItemType,QuantityRequired,
		MachineID,FlormulaID,ShiftID,OrderCreatedBy,OrderCreatedDate)
		values(
		@ShopOrderNumber,@ShopOrderDate,@Warehouse,@ParentItemID,@ParentItemCode,@ParentItemType,@Qty,
		@MachineID,@FormulaID,@ShiftNo,@User,GETDATE())

		Insert into PRO.ShopOrderLine
		(ShopOrderNumber,ParentItemID,ParentItemCode,Line,ChildItemID,ChildItemCode ,   ChildQuantityRequired,LineWarehouse,ChildItemType,
		LineCreatedBy,LineCreatedDate , FormulaLine , OrginalFormulaQty )
		select
		@ShopOrderNumber ,   @ParentItemID , @ParentItemCode , line ,ChildItemID , ItemCode , @Factor*Quantity , @Warehouse , ItemType ,
		@user , getdate() , line , Quantity
		from PRd.BillOfMaterialLine a left outer join inv.ItemMaster on ChildItemID=ItemID
		where  LineFormulaID=@FormulaID ORDER BY a.Line

		SELECT * FROM pro.ShopOrderHeader WHERE ShopOrderNumber = @ShopOrderNumber

	end

	-- =============================================
	-- EDIT SHOP ORDER (only allowed while OrderState = 0)
	-- =============================================
	if @operation='Edit Shop Order'
	begin
		DELETE FROM #TempHeader

		INSERT INTO #TempHeader
        SELECT * FROM OPENJSON(@LineData)
		WITH (ShopOrderNo int , ShopOrderDate date ,  Warehouse nvarchar(50) ,  ParentITemID int , FormulaID int , MAchineID int , Qty dec(18,5) , ShiftNo int )

        SELECT TOP 1 @ShopOrderNumber = ShopOrderNo, @ShopOrderDate=ShopOrderDate ,   @ParentItemID  = ParentITemID, @FormulaID= FormulaID , @MachineID =MAchineID , @Qty =Qty , @Warehouse=Warehouse , @ShiftNo=ShiftNo
        FROM #TempHeader

		IF @ShopOrderNumber IS NULL
		BEGIN
			SET @State = 1
			SET @Message = 'ShopOrderNo is required'
			RETURN
		END

		SELECT @OrderState = OrderState FROM pro.ShopOrderHeader WHERE ShopOrderNumber = @ShopOrderNumber

		IF @OrderState IS NULL
		BEGIN
			SET @State = 1
			SET @Message = 'Shop Order not found'
			RETURN
		END

		IF @OrderState <> 0
		BEGIN
			SET @State = 1
			SET @Message = 'Only draft shop orders (state 0) can be edited'
			RETURN
		END

		select @ParentItemCode=ItemCode ,@ParentItemType=ItemType from inv.ItemMaster where itemid=@ParentItemID

		UPDATE pro.ShopOrderHeader
		SET ShopOrderDate=@ShopOrderDate, ShopOrderWarehouse=@Warehouse, ParentItemID=@ParentItemID, ParentItemCode=@ParentItemCode,
			ParentItemType=@ParentItemType, QuantityRequired=@Qty, MachineID=@MachineID, FlormulaID=@FormulaID, ShiftID=@ShiftNo,
			OrderLastMaintBy=@User, OrderLastMaintDate=GETDATE()
		WHERE ShopOrderNumber=@ShopOrderNumber

		-- Lines are explicitly controlled by the caller here (edit qty, add a
		-- new line, delete a line in the UI) instead of being recomputed from
		-- the formula's batch factor like New Shop Order does. Replace wholesale.
		DELETE FROM PRO.ShopOrderLine WHERE ShopOrderNumber=@ShopOrderNumber

		IF @LineMember IS NOT NULL AND LTRIM(RTRIM(@LineMember)) <> ''
		BEGIN
			INSERT INTO PRO.ShopOrderLine
			(ShopOrderNumber,ParentItemID,ParentItemCode,Line,ChildItemID,ChildItemCode,ChildQuantityRequired,LineWarehouse,ChildItemType,
			LineCreatedBy,LineCreatedDate)
			SELECT
			@ShopOrderNumber, @ParentItemID, @ParentItemCode, nl.Line, nl.ChildItemID, im.ItemCode, nl.Qty, @Warehouse, im.ItemType,
			@User, GETDATE()
			FROM OPENJSON(@LineMember) WITH (
				Line        int             '$.Line',
				ChildItemID int             '$.ChildItemID',
				Qty         decimal(18,5)   '$.Qty'
			) nl
			INNER JOIN inv.ItemMaster im ON im.ItemID = nl.ChildItemID
		END

		SELECT * FROM pro.ShopOrderHeader WHERE ShopOrderNumber = @ShopOrderNumber

	end

	-- =============================================
	-- ISSUE SHOP ORDER (Producation button): records actual IssuedQty on the
	-- header and ChildIssued per line, matched by Line number.
	-- =============================================
	if @operation='Issue Shop Order'
	begin
		DECLARE @ISO_ShopOrderNumber int, @ISO_IssuedQty dec(18,5)

		SELECT @ISO_ShopOrderNumber = ShopOrderNo, @ISO_IssuedQty = IssuedQty
		FROM OPENJSON(@LineData) WITH (ShopOrderNo int '$.ShopOrderNo', IssuedQty dec(18,5) '$.IssuedQty')

		IF @ISO_ShopOrderNumber IS NULL
		BEGIN
			SET @State = 1
			SET @Message = 'ShopOrderNo is required'
			RETURN
		END

		IF NOT EXISTS (SELECT 1 FROM pro.ShopOrderHeader WHERE ShopOrderNumber = @ISO_ShopOrderNumber)
		BEGIN
			SET @State = 1
			SET @Message = 'Shop Order not found'
			RETURN
		END

		DECLARE @ISO_Warehouse nvarchar(50), @ISO_ParentItemID int, @ISO_ParentItemCode nvarchar(50)
		SELECT @ISO_Warehouse = ShopOrderWarehouse, @ISO_ParentItemID = ParentItemID, @ISO_ParentItemCode = ParentItemCode
		FROM pro.ShopOrderHeader WHERE ShopOrderNumber = @ISO_ShopOrderNumber

		-- Reject the whole issue if any line -- existing (matched by Line) or
		-- brand-new (Line is null, added on the fly during this issue) --
		-- would issue more than what's in stock (summed across lots) in the
		-- order's warehouse.
		IF @LineMember IS NOT NULL AND LTRIM(RTRIM(@LineMember)) <> ''
		BEGIN
			DECLARE @ISO_BadItemCode nvarchar(50), @ISO_BadBalance decimal(18,5), @ISO_BadIssued decimal(18,5)

			SELECT TOP 1 @ISO_BadItemCode = x.ChildItemCode, @ISO_BadBalance = x.AvailBalance, @ISO_BadIssued = x.ChildIssued
			FROM (
				SELECT l.ChildItemCode, nl.ChildIssued,
					ISNULL((SELECT SUM(b.ItemBalance) FROM inv.ItemBalance b WHERE b.ItemID = l.ChildItemID AND b.Warehouse = l.LineWarehouse), 0) AS AvailBalance
				FROM OPENJSON(@LineMember) WITH (
					Line        int            '$.Line',
					ChildIssued decimal(18,5)  '$.ChildIssued'
				) nl
				INNER JOIN PRO.ShopOrderLine l ON l.Line = nl.Line AND l.ShopOrderNumber = @ISO_ShopOrderNumber

				UNION ALL

				SELECT im.ItemCode, nl.ChildIssued,
					ISNULL((SELECT SUM(b.ItemBalance) FROM inv.ItemBalance b WHERE b.ItemID = nl.ChildItemID AND b.Warehouse = @ISO_Warehouse), 0)
				FROM OPENJSON(@LineMember) WITH (
					Line        int            '$.Line',
					ChildItemID int            '$.ChildItemID',
					ChildIssued decimal(18,5)  '$.ChildIssued'
				) nl
				INNER JOIN inv.ItemMaster im ON im.ItemID = nl.ChildItemID
				WHERE nl.Line IS NULL
			) x
			WHERE x.ChildIssued > x.AvailBalance

			IF @ISO_BadItemCode IS NOT NULL
			BEGIN
				SET @State = 1
				SET @Message = 'Cannot issue ' + CAST(@ISO_BadIssued AS nvarchar(30)) + ' of ' + @ISO_BadItemCode + ' -- only ' + CAST(@ISO_BadBalance AS nvarchar(30)) + ' available in stock'
				RETURN
			END
		END

		-- Additive: each Issue call is a new release on top of what's already
		-- been issued (Qty Issued = Old Qty Issued + this release's amount),
		-- not a replacement of the running total.
		UPDATE pro.ShopOrderHeader
		SET QuantiftyIssued = QuantiftyIssued + @ISO_IssuedQty, OrderState = 10, NumberOfReleases = NumberOfReleases + 1, OrderLastMaintBy = @User, OrderLastMaintDate = GETDATE()
		WHERE ShopOrderNumber = @ISO_ShopOrderNumber

		IF @LineMember IS NOT NULL AND LTRIM(RTRIM(@LineMember)) <> ''
		BEGIN
			UPDATE l
			SET l.ChildQuantityIssued = l.ChildQuantityIssued + nl.ChildIssued, l.LineLastMaintBy = @User, l.LineLastMaintDate = GETDATE()
			FROM PRO.ShopOrderLine l
			INNER JOIN OPENJSON(@LineMember) WITH (
				Line        int            '$.Line',
				ChildIssued decimal(18,5)  '$.ChildIssued'
			) nl ON nl.Line = l.Line
			WHERE l.ShopOrderNumber = @ISO_ShopOrderNumber

			-- Insert brand-new lines added on the fly during this issue (Line is
			-- null in the payload -- not part of the order's original lines).
			DECLARE @ISO_MaxLine int
			SELECT @ISO_MaxLine = ISNULL(MAX(Line), 0) FROM PRO.ShopOrderLine WHERE ShopOrderNumber = @ISO_ShopOrderNumber

			INSERT INTO PRO.ShopOrderLine
			(ShopOrderNumber, ParentItemID, ParentItemCode, Line, ChildItemID, ChildItemCode, ChildQuantityRequired, ChildQuantityIssued, LineWarehouse, ChildItemType, LineCreatedBy, LineCreatedDate)
			SELECT
				@ISO_ShopOrderNumber, @ISO_ParentItemID, @ISO_ParentItemCode,
				@ISO_MaxLine + ROW_NUMBER() OVER (ORDER BY (SELECT NULL)),
				nl.ChildItemID, im.ItemCode, ISNULL(nl.ChildQuantityRequired, 0), ISNULL(nl.ChildIssued, 0),
				@ISO_Warehouse, im.ItemType, @User, GETDATE()
			FROM OPENJSON(@LineMember) WITH (
				Line                  int             '$.Line',
				ChildItemID           int             '$.ChildItemID',
				ChildQuantityRequired decimal(18,5)   '$.ChildQuantityRequired',
				ChildIssued           decimal(18,5)   '$.ChildIssued'
			) nl
			INNER JOIN inv.ItemMaster im ON im.ItemID = nl.ChildItemID
			WHERE nl.Line IS NULL
		END

		SELECT * FROM pro.ShopOrderHeader WHERE ShopOrderNumber = @ISO_ShopOrderNumber
	end

	-- =============================================
	-- DELETE SHOP ORDER -- draft only (OrderState = 0). Clears the link
	-- back from any Planning shift-plan slot before deleting so that slot
	-- doesn't keep pointing at a deleted Shop Order.
	-- =============================================
	if @operation='Delete Shop Order'
	begin
		DECLARE @DSO_ShopOrderNumber int, @DSO_State int

		SELECT @DSO_ShopOrderNumber = CAST(@LineData AS int)

		SELECT @DSO_State = OrderState FROM pro.ShopOrderHeader WHERE ShopOrderNumber = @DSO_ShopOrderNumber

		IF @DSO_State IS NULL
		BEGIN
			SET @State = 1
			SET @Message = 'Shop Order not found'
			RETURN
		END

		IF @DSO_State <> 0
		BEGIN
			SET @State = 1
			SET @Message = 'Only draft (State 0) Shop Orders can be deleted'
			RETURN
		END

		UPDATE [PRO].[PrdItemPlanningShiftPlan] SET ShopOrderNo = NULL WHERE ShopOrderNo = @DSO_ShopOrderNumber

		DELETE FROM [PRO].[ShopOrderLine] WHERE ShopOrderNumber = @DSO_ShopOrderNumber
		DELETE FROM pro.ShopOrderHeader WHERE ShopOrderNumber = @DSO_ShopOrderNumber

		RETURN
	end
end
GO
