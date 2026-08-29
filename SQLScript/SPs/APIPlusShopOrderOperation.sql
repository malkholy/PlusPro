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

		select  @Batchsize = BatchQuantity  FROM prd.BillOfMaterialHeader  WHERE FormulaID=@FormulaID
		set @Factor=@Qty / @Batchsize
		select @ParentItemCode=ItemCode ,@ParentItemType=ItemType from inv.ItemMaster where itemid=@ParentItemID

		UPDATE pro.ShopOrderHeader
		SET ShopOrderDate=@ShopOrderDate, ShopOrderWarehouse=@Warehouse, ParentItemID=@ParentItemID, ParentItemCode=@ParentItemCode,
			ParentItemType=@ParentItemType, QuantityRequired=@Qty, MachineID=@MachineID, FlormulaID=@FormulaID, ShiftID=@ShiftNo,
			OrderLastMaintBy=@User, OrderLastMaintDate=GETDATE()
		WHERE ShopOrderNumber=@ShopOrderNumber

		-- Replace the line list wholesale, same pattern as New Shop Order (and
		-- Planning History's Edit operation).
		DELETE FROM PRO.ShopOrderLine WHERE ShopOrderNumber=@ShopOrderNumber

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
end
GO
