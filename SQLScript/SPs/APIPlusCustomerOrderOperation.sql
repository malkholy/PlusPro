USE [ERPMega25]
GO
/****** Object:  StoredProcedure [dbo].[APIPlusCustomerOrderOperation]    Script Date: 7/27/2026 11:30:49 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER    PROCEDURE [dbo].[APIPlusCustomerOrderOperation]
    @Operation      nvarchar(100) = '',
    @LineData       nvarchar(max) = '',
	@LineMember  nvarchar(max) = '' , 
	@Order       int =0 , 
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
as
	  begin
--BEGIN TRY
--	BEGIN TRANSACTION;	
    set @state=0 
    set @Message=''
	declare @OrderDate date , @PriceBookDate date , @PriceType int=0 , @Customer int , @TaxCode nvarchar(10) ,
		@PaymentTerm nvarchar(10) , @OrderType int , @RequestDate date , @Warehouse nvarchar(5) , @ShipToID int ,
		@Currency nvarchar(5) , @Rate dec(18,5) , @Carrier nvarchar(10) , @ScheduleDate date ,
		@CustomerNote nvarchar(max) , @SalesNote nvarchar(max) , @CompanyNote nvarchar(max) , @AccountingNote nvarchar(max) ,
		@LogisticNote nvarchar(max) , @OrderNote nvarchar(max) , @TruckTypeID int , @DeleteReasonID int ,
		@Facility nvarchar(5) , @RMA int , @OfferNumber int =0 , @OrderRef int , @CustomerPO nvarchar(150) ,
		@CustomerPODescription nvarchar(150) , @NationalID nvarchar(50) , @ProjectID int =0

	declare @Line int , @ItemID int , @Qty dec(18,5) , @UM nvarchar(2) , @Price dec(18,5) , @ListPrice dec(18,5) ,
		@PrmomotionFlag int , @RelatedLine int , @OrderLineReasonID int , @PriceReasonID int , @AllowBackOrder int

	declare @CustomerType nvarchar(10)   , @OfferinternalID int =0 ,
	 @TotalLines int   , @TotalDiscount dec(18,5)   , @TermDescription nvarchar(max)   , @ShipToName nvarchar(max)   , @ShipToAddress nvarchar(max)   , @PaymentWay nvarchar(10)     
	, @CustState nvarchar(10)    , @OrderTotal dec(18,5)   , @Weight dec(18,5)    , @TotalQtySelling dec(18,5)     , @TotalOrderQty dec(18,5)   , @TotalItem dec(18,5)   
	, @NeedINV int   , @NeedConfirm int   , @ListPriceStockTrans dec(18,5)   , @ListPriceStockBase dec(18,5)   , @NetPriceStockTrans dec(18,5)   , @NetPRiceStockBase dec(18,5)   , @NetPriceSellingBase dec(18,5)   , @NetPriceSellingTrans dec(18,5)   
	, @SalesPerson int   , @ItemDescription nvarchar(100)   , @ItemTaxCode nvarchar(10)   , @ItemClass nvarchar(2)   , @BackOrderCode int      , @TaxAmount dec(18,5)   , @QtySelling dec(18,5)   
	, @SellingUM nvarchar(2)   , @Conversion1 int   , @Conversion2 int   , @QtyStock int   , @Counter int   , @Counter1 int   , @Counter2 int   , @Flag int   , @MaxLine int   , @MaxOrderLine int   , @StockingUM CHAR ( 2 )   , @LineDiscount dec(18,5)   
	, @LineAmount dec(18,5)   , @LineFinal dec(18,5)   , @LineTax dec(18,5)   , @TotalLineAmount dec(18,5)   , @TotalLineDiscount dec(18,5)   , @TotalFinalAmount dec(18,5)   , @TotalTax dec(18,5)   
	, @TaxtableAmount dec(18,5)   , @InUseBy nvarchar(50)   , @InUse int   , @OrderState int   , @TotalTaxtable dec(18,5)   , @NolonID int  , @LineNo int 
	, @CustomerState int , @loadno int , @shipdate date , @PaymentType nvarchar(10) , @ListPriceSellingTrans dec(18,5) , @ManualPriceTransStocking dec(18,3) 
	, @RateCode nvarchar(10)  , @TaxRate dec(18,5) , @NeedAccountingApproval int , @NeedToBeScheduled int  , @itemCode  nvarchar(50) , @OrderChangedLocked int ,  @countryID int  , @countryCode nvarchar(5) ,
		@TaxRegistration nvarchar(50) , @CopyOrder int , @NewLine int , @BarcodeLoading int , @OrginalOrderNo int =0 
	set  @RequestDate=GETDATE() 

	create table #TempTax ( TaxCode nvarchar(10) , Rate dec(18,5) )   
	create table #TempLine ( Line  int )  

	------------------------------------------------------------------
	-- Parse @LineData (header JSON object) into scalars
	------------------------------------------------------------------
	if isnull(@LineData,'') <> ''
	begin
		select
			@Order = [order], @Customer = customer, @OrderDate = orderdate, @PriceBookDate = pricebookdate,
			@PriceType = pricetype, @TaxCode = taxcode, @PaymentTerm = paymentterm, @OrderType = ordertype,
			@RequestDate = isnull(requestdate, @RequestDate), @Warehouse = warehouse, @ShipToID = shiptoid, @Currency = currency,
			@Rate = rate, @Carrier = carrier, @ScheduleDate = scheduledate, @CustomerNote = customernote,
			@SalesNote = salesnote, @CompanyNote = companynote, @AccountingNote = accountingnote,
			@LogisticNote = logisticnote, @OrderNote = ordernote, @TruckTypeID = trucktypeid,
			@DeleteReasonID = deletereasonid, @Facility = facility, @RMA = rma, @OfferNumber = isnull(offernumber,0),
			@OrderRef = orderref, @CustomerPO = customerpo, @CustomerPODescription = customerpodescription,
			@NationalID = nationalid, @ProjectID = isnull(projectid,0), @AllowBackOrder = isnull(allowbackorder,0)
		from openjson(@LineData)
		with (
			[order]                int             '$.order',
			customer               int             '$.customer',
			orderdate              date            '$.orderdate',
			pricebookdate          date            '$.pricebookdate',
			pricetype              int             '$.pricetype',
			taxcode                nvarchar(10)    '$.taxcode',
			paymentterm            nvarchar(10)    '$.paymentterm',
			ordertype              int             '$.ordertype',
			requestdate            date            '$.requestdate',
			warehouse              nvarchar(5)     '$.warehouse',
			shiptoid               int             '$.shiptoid',
			currency               nvarchar(5)     '$.currency',
			rate                   dec(18,5)       '$.rate',
			carrier                nvarchar(10)    '$.carrier',
			scheduledate           date            '$.scheduledate',
			customernote           nvarchar(max)   '$.customernote',
			salesnote              nvarchar(max)   '$.salesnote',
			companynote            nvarchar(max)   '$.companynote',
			accountingnote         nvarchar(max)   '$.accountingnote',
			logisticnote           nvarchar(max)   '$.logisticnote',
			ordernote              nvarchar(max)   '$.ordernote',
			trucktypeid            int             '$.trucktypeid',
			deletereasonid         int             '$.deletereasonid',
			facility               nvarchar(5)     '$.facility',
			rma                    int             '$.rma',
			offernumber            int             '$.offernumber',
			orderref               int             '$.orderref',
			customerpo             nvarchar(150)   '$.customerpo',
			customerpodescription  nvarchar(150)   '$.customerpodescription',
			nationalid             nvarchar(50)    '$.nationalid',
			projectid              int             '$.projectid',
			allowbackorder         int             '$.allowbackorder'
		)
	end

	------------------------------------------------------------------
	-- Parse @LineMember (lines JSON array) into #Lines
	------------------------------------------------------------------
	create table #Lines (
		RowNo int identity(1,1),
		line int, itemid int, qty dec(18,5), um nvarchar(2), price dec(18,5), listprice dec(18,5),
		promotionflag int, relatedline int, orderlinereasonid int, pricereasonid int
	)

	if isnull(@LineMember,'') <> ''
	begin
		insert into #Lines (line, itemid, qty, um, price, listprice, promotionflag, relatedline, orderlinereasonid, pricereasonid)
		select * from openjson(@LineMember)
		with (
			line              int         '$.line',
			itemid            int         '$.itemid',
			qty               dec(18,5)   '$.qty',
			um                nvarchar(2) '$.um',
			price             dec(18,5)   '$.price',
			listprice         dec(18,5)   '$.listprice',
			promotionflag     int         '$.promotionflag',
			relatedline       int         '$.relatedline',
			orderlinereasonid int         '$.orderlinereasonid',
			pricereasonid     int         '$.pricereasonid'
		)
	end
if @Operation = 'Gnerate Order No' 
begin  ---GENERate ORDER NO 
		select @CustomerState =CustomerState    from ACR.CustomerMaster where CustomerNo = @Customer  
		if @CustomerState = '0' 
		begin 
			exec GetsequenceNo    12 , @Order out 
			select @Order as OrderNo 
		end
		else
		begin
			set @Message = 'CUSTOMER   HOLD STATE '   
			set @State=1 
		end   
end   
if @Operation = 'New Line' 
begin 
	declare f cursor for  select line, itemid, qty, um, price, listprice, promotionflag, relatedline, orderlinereasonid, pricereasonid from #Lines order by RowNo
	open f
	fetch next from f into @Line, @ItemID, @Qty, @UM, @Price, @ListPrice, @PrmomotionFlag, @RelatedLine, @OrderLineReasonID, @PriceReasonID
	while @@fetch_status = 0
	begin
		Set @OrderState=0  
		select @OrderState= OrderState  , @OrderChangedLocked =  OrderChangedLocked    from COR.CustomerOrderHeaderWF where OrderNumber = @Order 
		if @OrderChangedLocked =0 or @OrderChangedLocked is null 
		begin 
				select @SalesPerson=CustomerSalesPerson				from ACR.CustomerMaster where CustomerNo = @Customer   
				select @ItemClass=ItemClass	, @SellingUM= SellingUM , 	@StockingUM=StockUM	, @Conversion1 = SellingConversion , @ItemDescription= ItemDescription , @ItemTaxCode=ItemTaxCode			from INV.ItemMaster where ItemID = @ItemID   
				set @TaxtableAmount = @Price * @Qty   
				set @LineTax = 0   
				if @UM = @SellingUM
				begin 
					set @QtyStock = @Qty * @Conversion1  
					set @QtySelling = @Qty   
					set @NetPriceStockTrans = @Price / @Conversion1   
					set @NetPriceStockBase =@NetPriceStockTrans * @Rate   
					set @NetPriceSellingTrans = @Price 
					set @NetPriceSellingBase = @NetPriceSellingTrans * @Rate 
				end	  
				else
				begin
					set @QtyStock = @Qty   
					set @QtySelling = @Qty / @Conversion1   
					set @NetPriceStockTrans = @Price   
					set @NetPriceStockBase =@NetPriceStockTrans * @Rate   
					set @NetPriceSellingTrans = @Price * @Conversion1   
					set @NetPriceSellingBase = @NetPriceSellingTrans * @Rate   
				end   
				delete from COR.CustomerOrderTaxWF where OrderLine = @Line AND OrderNumber = @Order   
				delete from  #TempTax 
				insert into  #TempTax select a.RateCode , b.Rate from Tax.TaxMapLine a LEFT OUTER JOIN Tax.TaxRateMaster b ON a.RateCode=b.RateCode left outer join Tax.TaxMapHeader C on c.TaxMapID=a.TaxMapIDLine
				where c.VendorOrCustomerTaxCode=@TaxCode and c.ItemTaxCode=@ItemTaxCode  ORDER BY a.Sequence
				declare g cursor for  select * from  #TempTax 
				open g
				fetch next from g  into @RateCode  , @TaxRate 
				while @@fetch_status =0
				begin
					insert into   COR.CustomerOrderTaxWF ( guid ,            OrderLine , OrderNumber ,QuantityStocking , NetPriceStocking ,  TaxtableAmount , CustometTaxCode , ItemTaxCode , TaxCode , TaxRate , TaxAmount ) 
															VALUES (newid() ,  @Line ,     @Order , @QtyStock ,@NetPriceStockTrans ,     @TaxtableAmount , @TaxCode , @ItemTaxCode , @RateCode ,@TaxRate , @TaxtableAmount * @TaxRate / 100 )   
					fetch next from g  into @RateCode  , @TaxRate 
				end
				close g
				deallocate g	
				select  @LineTax= isnull ( SUM ( TaxAmount ) , 0 )    from COR.CustomerOrderTaxWF where OrderLine = @Line AND OrderNumber = @Order   
				set @ListPriceStockTrans = 0   
				set @ListPriceSellingTrans = 0   
				select  @ListPriceStockTrans= isnull ( PriceSellingUnit , 0 ) / @Conversion1   from ACR.PriceHistory where PriceTypeID=@PriceType and  PriceIsNotActive = 0 AND ItemID = @ItemID  AND StartDate <= @PriceBookDate AND EndDate >= @PriceBookDate  
				select  @ListPriceSellingTrans= isnull ( PriceSellingUnit , 0 )   from ACR.PriceHistory where PriceTypeID=@PriceType and  PriceIsNotActive = 0 AND ItemID = @ItemID  AND StartDate <= @PriceBookDate AND EndDate >= @PriceBookDate  
				set @LineAmount = case when @PrmomotionFlag=0 then (   @ListPriceStockTrans * @QtyStock   ) else 0 end 
				select @LineDiscount =  isnull ( sum( DiscountAmount) ,0 )   from cor.CustomerOrderPromotionWF where CustomerOrderNumber=@order and OrderLineNumber=@Line and IsNotActive=0 and FreeGoodsQuantity=0   
				set @LineFinal = @LineAmount + ( @LineDiscount ) + ( @LineTax )   
				set @ListPriceStockBase = @ListPriceStockTrans * @Rate  	 
				select  @WEIGHT= isnull ( ( GrossWeight ) , 0 ) , @itemCode = ItemCode  from INV.ItemMaster where ItemID = @ItemID 
				set @OfferinternalID=0
				if @OfferNumber<>0 and @RelatedLine=0 
				begin
					select @OfferinternalID =   isnull (  max( OfferinternalID) , 0 )  + 1  from  COR.CustomerOrderLineWF where LineOrderNumber=@Order 
				end
				if @OfferNumber<>0 and @RelatedLine<>0 
				begin
					select @OfferinternalID =     OfferinternalID  from  COR.CustomerOrderLineWF where LineOrderNumber=@Order and LineNumber =@RelatedLine 
				end 
				set @BarcodeLoading=0 
				select @BarcodeLoading =ISNULL (  BarcodeLoading ,0)  from pln.ItemPlanningMaster where Facility=@Facility and ItemID=@ItemID 
				insert into   COR.CustomerOrderLineWF ( 
				GUID , LineOrderNumber , LineNumber , LineWarehouse , LineSalesperson , LineCustomerNumber , ItemID , itemcode , ItemClass , QuantityOrdered , StockingUnitofMeasure , 
				OriginalOrderedQuantity , OriginalOrderedUOM , LineRequestedDate , LineScheduledShipDate , NetPriceTransStocking , NetPriceBaseStocking , 
				NetPriceBaseSelling , NetPriceTransSelling , ListPriceTransStocking , ListPriceBaseStocking , DateEntered , LineShipToID , LineCarrier , LineFacility , 
				LinePriceBookDate , LineCreatedByUser , LineCreatedDate , LineWeight , LineOrderType , LineAmountTransaction , LineDiscountTransaction , LineFinalAmountTransaction , LineTax , PromotionFlag , RelatedToLine , TaxtableAmount , ChangePriceReasonID , OrderReasonID ,
				ListPriceTransOrderdUM , NetPriceTransOrderdUM , SellingUnitOfMeasure , ListPriceTransSelling , OfferNumber , OfferInternalID , BarcodeLoading  ) 
				VALUES ( 
				newid() , @Order , @Line , @Warehouse , @SalesPerson , @Customer , @ItemID ,@itemCode ,  @ItemClass , @QtyStock , @StockingUM , 
				@Qty , @UM , @RequestDate , @ScheduleDate ,@NetPriceStockTrans , @NetPriceStockBase , 
				@NetPriceSellingBase  , @NetPriceSellingTrans , @ListPriceStockTrans , @ListPriceStockBase , @OrderDate ,  @ShipToID , @Carrier , @Facility , 
				@PriceBookDate , @User , getdate() , @Weight * @QtyStock , @OrderType , @LineAmount , @LineDiscount , @LineFinal , @LineTax , @PrmomotionFlag , @RelatedLine , @LineAmount + @LineDiscount , @PriceReasonID , @OrderLineReasonID, 
				@ListPrice , @Price , @SellingUM ,@ListPriceSellingTrans , @OfferNumber , @OfferinternalID ,@BarcodeLoading   )  	 
		end	 
		else 
		begin
			set @Message = 'ORDER STATE IS NOT   NEW STATE  '   
			set @State =1 
		end   

		fetch next from f into @Line, @ItemID, @Qty, @UM, @Price, @ListPrice, @PrmomotionFlag, @RelatedLine, @OrderLineReasonID, @PriceReasonID
	end
	close f
	deallocate f
end   
if @Operation = 'Edit Line' 
begin
	declare f cursor for  select line, itemid, qty, um, price, listprice, promotionflag, relatedline, orderlinereasonid, pricereasonid from #Lines order by RowNo
	open f
	fetch next from f into @Line, @ItemID, @Qty, @UM, @Price, @ListPrice, @PrmomotionFlag, @RelatedLine, @OrderLineReasonID, @PriceReasonID
	while @@fetch_status = 0
	begin
		Set @OrderState=0  
		select @OrderState= OrderState  , @OrderChangedLocked =  OrderChangedLocked    from COR.CustomerOrderHeaderWF where OrderNumber = @Order 
		if @OrderState<110 --- Order Not invoiced 
		begin 
			if @OrderChangedLocked=1 
			begin 
				select @Qty=OriginalOrderedQuantity ,@UM=OriginalOrderedUOM  from cor.CustomerOrderLine where LineOrderNumber=@order and LineNumber=@Line
			end 
			select @SalesPerson=CustomerSalesPerson				from ACR.CustomerMaster where CustomerNo = @Customer   
			select @ItemClass=ItemClass	, @SellingUM= SellingUM , 	@StockingUM=StockUM	, @Conversion1 = SellingConversion , @ItemDescription= ItemDescription , @ItemTaxCode=ItemTaxCode			from INV.ItemMaster where ItemID = @ItemID   
			set @TaxtableAmount = @Price * @Qty   
			set @LineTax = 0 
			if @UM = @SellingUM
			begin 
				set @QtyStock = @Qty * @Conversion1  
				set @QtySelling = @Qty   
				set @NetPriceStockTrans = @Price / @Conversion1   
				set @NetPriceStockBase =@NetPriceStockTrans * @Rate   
				set @NetPriceSellingTrans = @Price 
				set @NetPriceSellingBase = @NetPriceSellingTrans * @Rate 
			end	  
			else
			begin
				set @QtyStock = @Qty   
				set @QtySelling = @Qty / @Conversion1   
				set @NetPriceStockTrans = @Price   
				set @NetPriceStockBase =@NetPriceStockTrans * @Rate   
				set @NetPriceSellingTrans = @Price * @Conversion1   
				set @NetPriceSellingBase = @NetPriceSellingTrans * @Rate   
			end   
			delete from COR.CustomerOrderTaxWF where OrderLine = @Line AND OrderNumber = @Order   
			delete from  #TempTax 
			insert into  #TempTax select a.RateCode , b.Rate from Tax.TaxMapLine a LEFT OUTER JOIN Tax.TaxRateMaster b ON a.RateCode=b.RateCode left outer join Tax.TaxMapHeader C on c.TaxMapID=a.TaxMapIDLine
			where c.VendorOrCustomerTaxCode=@TaxCode and c.ItemTaxCode=@ItemTaxCode  ORDER BY a.Sequence
			declare g cursor for  select * from  #TempTax 
			open g
			fetch next from g  into @RateCode  , @TaxRate 
			while @@fetch_status =0
			begin
				insert into   COR.CustomerOrderTaxWF ( guid ,            OrderLine , OrderNumber ,QuantityStocking , NetPriceStocking  , TaxtableAmount , CustometTaxCode , ItemTaxCode , TaxCode , TaxRate , TaxAmount ) 
														VALUES (newid() ,  @Line ,     @Order ,@QtyStock ,@NetPriceStockTrans ,     @TaxtableAmount , @TaxCode , @ItemTaxCode , @RateCode ,@TaxRate , @TaxtableAmount * @TaxRate / 100 )   
				fetch next from g  into @RateCode  , @TaxRate 
			end
			close g
			deallocate g	
			select  @LineTax= isnull ( SUM ( TaxAmount ) , 0 )    from COR.CustomerOrderTaxWF where OrderLine = @Line AND OrderNumber = @Order    
			set @ListPriceStockTrans = 0  
			set @ListPriceSellingTrans=0 
			select  @ListPriceStockTrans= isnull ( PriceSellingUnit , 0 ) / @Conversion1   from ACR.PriceHistory where PriceTypeID=@PriceType and  PriceIsNotActive = 0 AND ItemID = @ItemID  AND StartDate <= @PriceBookDate AND EndDate >= @PriceBookDate   
			select  @ListPriceSellingTrans= isnull ( PriceSellingUnit , 0 )   from ACR.PriceHistory where PriceTypeID=@PriceType and  PriceIsNotActive = 0 AND ItemID = @ItemID  AND StartDate <= @PriceBookDate AND EndDate >= @PriceBookDate  
			select @ManualPriceTransStocking= ManualPriceTransStocking from cor.CustomerOrderLineWF where LineOrderNumber=@order and LineNumber=@Line
			if @ManualPriceTransStocking<>0  or @PriceReasonID<>0 
			begin 
				set @LineAmount=@ManualPriceTransStocking* @QtyStock 
			end
			else
			begin
				set @LineAmount = @ListPriceStockTrans * @QtyStock   
			end 
			select @LineDiscount = isnull ( sum( DiscountAmount) ,0 )   from cor.CustomerOrderPromotionWF where CustomerOrderNumber=@order and OrderLineNumber=@Line and IsNotActive=0 and FreeGoodsQuantity=0  
			set @LineFinal = @LineAmount + ( @LineDiscount ) + ( @LineTax )   
			set @ListPriceStockBase = @ListPriceStockTrans * @Rate  	 
			select  @WEIGHT= isnull ( ( GrossWeight ) , 0 ) , @itemCode = ItemCode  from INV.ItemMaster where ItemID = @ItemID 
			set @BarcodeLoading=0 
			select @BarcodeLoading =ISNULL (  BarcodeLoading ,0)  from pln.ItemPlanningMaster where Facility=@Facility and ItemID=@ItemID 
			update COR.CustomerOrderLineWF set 
			LineWarehouse = @Warehouse , LineSalesperson = @SalesPerson , LineCustomerNumber = @Customer , ItemID = @ItemID , ItemCode=@ItemCode ,  ItemClass = @ItemClass , QuantityOrdered = @QtyStock , StockingUnitofMeasure = @StockingUM , 
			OriginalOrderedQuantity = @Qty , OriginalOrderedUOM = @UM , LineRequestedDate = @RequestDate , LineScheduledShipDate = @ScheduleDate , NetPriceTransStocking = @NetPriceStockTrans , NetPriceBaseStocking = @NetPriceStockBase , 
			NetPriceBaseSelling = @NetPriceSellingBase , NetPriceTransSelling = @NetPriceSellingTrans , ListPriceTransStocking = @ListPriceStockTrans , ListPriceBaseStocking = @ListPriceStockBase ,  
			LineShipToID = @ShipToID , LineCarrier = @Carrier , LineFacility = @Facility , LinePriceBookDate = @PriceBookDate , LineWeight = @Weight * @QtyStock , LineOrderType = @OrderType , 
			LineLastMaintUser	 = @User , LineLastMaintDate = getdate() , LineAmountTransaction = @LineAmount , LineDiscountTransaction = @LineDiscount , LineFinalAmountTransaction = @LineFinal , LineTax = @LineTax , PromotionFlag = @PrmomotionFlag , RelatedToLine = @RelatedLine , 
			TaxtableAmount = @LineAmount + @LineDiscount , ChangePriceReasonID = @PriceReasonID , OrderReasonID = @OrderLineReasonID , ListPriceTransOrderdUM=@ListPrice  , NetPriceTransOrderdUM=@Price  ,
			SellingUnitOfMeasure=@SellingUM , ListPriceTransSelling =@ListPriceSellingTrans , OfferNumber=@OfferNumber , BarcodeLoading=@BarcodeLoading 
			where LineOrderNumber = @Order AND LineNumber = @Line 
		end 

		fetch next from f into @Line, @ItemID, @Qty, @UM, @Price, @ListPrice, @PrmomotionFlag, @RelatedLine, @OrderLineReasonID, @PriceReasonID
	end
	close f
	deallocate f
end   
if @Operation = 'Delete Line' 
begin 
	declare f cursor for select line from #Lines order by RowNo
	open f
	fetch next from f into @Line
	while @@fetch_status = 0
	begin
		select  @OrderState= OrderState , @OrderChangedLocked =  OrderChangedLocked  from COR.CustomerOrderHeaderWF where OrderNumber = @Order   
		if @OrderChangedLocked =0 or @OrderChangedLocked is null 
		begin
			delete from COR.CustomerOrderLineWF where LineOrderNumber = @Order AND LineNumber = @Line   
			delete from COR.CustomerOrderPromotionWF where CustomerOrderNumber = @Order AND OrderLineNumber = @Line   
			delete from COR.CustomerOrderTaxWF where OrderLine = @Line AND OrderNumber = @Order   
			delete from COR.CustomerOrderLineWF where LineOrderNumber = @Order AND RelatedToLine = @Line   
			set @Flag = 1   
			declare g cursor for  select LineNumber from COR.CustomerOrderLineWF where LineOrderNumber = @Order ORDER BY LineNumber
			open g
			fetch next from g  into @LineNo
			while @@fetch_status =0
			begin
				update COR.CustomerOrderLineWF set LineNumber = @Flag where LineOrderNumber = @Order AND LineNumber = @LineNo  
				update COR.CustomerOrderLineWF set RelatedToLine = @Flag where LineOrderNumber = @Order AND RelatedToLine =@LineNo 
				update COR.CustomerOrderPromotionWF set OrderLineNumber = @Flag where CustomerOrderNumber = @Order AND OrderLineNumber =@LineNo   
				update COR.CustomerOrderTaxWF set OrderLine = @Flag where OrderLine = @LineNo AND OrderNumber = @Order   
				update COR.CustomerOrderManualPromotion SET Line=@FLAG WHERE CustomerOrderNumber=@ORDER AND LINE=@LINE 
				set @Flag = @Flag + 1   
				fetch next from g  into @LineNo
			end
			close g
			deallocate g
		end
		else
		begin
			set @Message = 'Order is not'  
			set @State=1 
		end   

		fetch next from f into @Line
	end
	close f
	deallocate f
end  
if @Operation = 'New Header' 
begin 
	select @CustomerType= CustomerType  , @SalesPerson=CustomerSalesPerson , @PaymentType=PaymentType ,  @TaxRegistration =TaxRegistration  from ACR.CustomerMaster where CustomerNo = @Customer   
	set @ShipToName=''
	set  @ShipToAddress=''
	set @countryID=0 
	select @ShipToName= isnull (ShipToName,'')   , @ShipToAddress=isnull ( ShipToAddress,'')  , @countryID=isnull ( ShipToCountryID ,0)  from ACR.CustomerShipToMaster where CustomerNo = @Customer AND ShipToID = @ShipToID   
	if @countryID=0
		begin 
			set @countryCode=''
		end
		else 
		begin
			select @countryCode = isnull( CountryCode , '' )  from CountryMaster where CountryID=@countryID   
		end
	select @WEIGHT = isnull ( SUM ( QuantityOrdered * GrossWeight ) , 0 )   from COR.CustomerOrderLineWF a LEFT OUTER JOIN INV.ItemMaster b  ON a.ItemID = b.ItemID where LineOrderNumber = @Order   
	select @TermDescription= TermDescription    from ACR.CustomerPaymentTerm where PaymentTerm = @PaymentTerm   
	set @TotalLineAmount = 0   
	set @TotalLineDiscount = 0   
	set @TotalFinalAmount = 0   
	set @TotalTax = 0   
	select  @TotalLineAmount=isnull ( SUM ( LineAmountTransaction ) , 0 )  ,		@TotalLineDiscount= isnull ( SUM ( LineDiscountTransaction ) , 0 ) , @TotalLines= COUNT ( * ) , 
			@TotalFinalAmount= isnull ( SUM ( LineFinalAmountTransaction ) , 0 )  , @TotalTax= isnull ( SUM ( LineTax ) , 0 ) , @TotalTaxTABLE = isnull ( SUM ( TaxtableAmount ) , 0 ) 
	from COR.CustomerOrderLineWF where LineOrderNumber = @Order   	
	insert into   COR.CustomerOrderHeaderWF ( 
	OrderNumber , OrderState , OrderLoadingState , DateOrderEntered , CustomerNumber , CustomerType , RequestShipDate , TotalLines , 
	Salesperson , Warehouse , TermsCode , TermsDescription , ShipToID	 , ShipToName , ShipToAddress , ScheduledShipDate , 
	PaymentCode , CustomerTaxCode , Currency , ExchangeRate , TotalWeight , WeightUnitOfMessure , OrderCarrier , BackOrderCode , 
	PriceBookDate , CreatedByUser , CreatedDate , Facility , OrderTruckType , CustomerNote , SalesNote , CompanyNoteToCustomer , 
	AccountingNote , LogisticNote , InternalNote , OrderType , ToatalItemAmount , TotalFinalAmount , TotalDiscount , TaxAmount , TotalTaxtableAmount , OrderReferenceNumber , RMANumber , CustomerPurchaseOrder , CustomerPurchaseOrderDescription ,
	CustomerNationlID , CountryID , CountryCode , TaxRegistration , PriceType  , ProjectID  ) 
	VALUES ( 
	@Order , 0 , 0 , @OrderDate , @Customer , @CustomerType , @RequestDate , @TotalLines , 
	@SalesPerson , @Warehouse , @PaymentTerm , @TermDescription , @ShipToID , @ShipToName , @ShipToAddress , @ScheduleDate , 
	@PaymentType , @TaxCode , @Currency , @Rate , @Weight , 'KG' , @Carrier , @AllowBackOrder , 
	@PriceBookDate , @User , getdate() ,  @Facility , @TruckTypeID , @CustomerNote , @SalesNote , @CompanyNote ,
	@AccountingNote , @LogisticNote , @OrderNote , @OrderType , @TotalLineAmount , @TotalFinalAmount , @TotalLineDiscount , @TotalTax , @TotalTaxTABLE , @OrderRef	, @RMA , @CustomerPO , @CustomerPODescription ,
	@NationalID , @countryID , @countryCode , @TaxRegistration , @PriceType , @ProjectID )   
	update COR.CustomerOrderLineWF set LineShipToID= @ShipToID , LineCarrier=@Carrier , LineScheduledShipDate=@ScheduleDate , LineWarehouse=@Warehouse , LineFacility=@Facility
	where LineOrderNumber=@Order

	insert into   COR.CustomerOrderHeader select * from cor.CustomerOrderHeaderWF where  OrderNumber=@Order
	insert into   COR.CustomerOrderLine   select * from COR.CustomerOrderLineWF where LineOrderNumber=@Order
	insert into   COR.CustomerOrderPromotion select * from COR.CustomerOrderPromotionWF where CustomerOrderNumber=@order 
	insert into cor.CustomerOrderTax select * from cor.CustomerOrderTaxWF where OrderNumber=@order
	
	delete from COR.CustomerOrderHeaderWF where OrderNumber = @Order   
	delete from COR.CustomerOrderLineWF where LineOrderNumber = @Order   
	delete from COR.CustomerOrderPromotionWF where CustomerOrderNumber = @Order   
	delete from COR.CustomerOrderTaxWF where OrderNumber = @Order   
	 
	if @RMA<>0 
	begin
		update cor.RMAHeader set RMAState=30, customerOrder=@order  where RMANumber=@RMA 
	end 
	
	select @NeedINV= NeedInvoice  ,  @NeedConfirm= NeedPickConfirm ,@NeedAccountingApproval= NeedAccountingApproval ,@NeedToBeScheduled= NeedToBeScheduled from COR.CustomerOrderType where OrderTypeID = @OrderType 
	if   @NeedToBeScheduled=0 
	begin
		update COR.CustomerOrderHeader set OrderState=50 where OrderNumber=@order 
	end
	if @NeedAccountingApproval=0 and  @NeedToBeScheduled=0 
	begin
		update COR.CustomerOrderHeader set OrderState=60 , OrderLoadingState=10  where OrderNumber=@order 
		update COR.CustomerOrderLine set LineState=10 where LineOrderNumber=@order 
	end 
	
	if @NeedINV = 1 AND @NeedConfirm = 0
	begin 
		set @OrderDate=getdate() 
		exec cor.CustomerProformaInvoiceOperation 'N' , @order , 0 , @OrderDate  , @User , @Message out 
		update COR.CustomerOrderHeader set OrderState = 80 , OrderLoadingState = 30 where OrderNumber = @Order   
		update COR.CustomerOrderHeaderWF set OrderState = 80 , OrderLoadingState = 30 where OrderNumber = @Order   
		update COR.CustomerOrderLineWF set LineState = 30 , QuantityShipped = QuantityOrdered where LineOrderNumber = @Order   
	end 
end  	 
  
if @Operation = 'Edit Header' 
begin 
	select    @OrderState=OrderState  ,@OrderChangedLocked =  OrderChangedLocked  from COR.CustomerOrderHeader where OrderNumber = @Order   
	if @OrderChangedLocked =0  
	begin 
		select @CustomerType= CustomerType  , @SalesPerson=CustomerSalesPerson , @PaymentType=PaymentType , @TaxRegistration = TaxRegistration  from ACR.CustomerMaster where CustomerNo = @Customer   
		select @ShipToName= ShipToName   , @ShipToAddress=ShipToAddress  ,  @countryID=ShipToCountryID   from ACR.CustomerShipToMaster where CustomerNo = @Customer AND ShipToID = @ShipToID   
		if @countryID=0
		begin 
			set @countryCode=''
		end
		else 
		begin
			select @countryCode = isnull( CountryCode , '' )  from CountryMaster where CountryID=@countryID   
		end
		select @WEIGHT = isnull ( SUM ( QuantityOrdered * GrossWeight ) , 0 )   from COR.CustomerOrderLineWF a LEFT OUTER JOIN INV.ItemMaster b  ON a.ItemID = b.ItemID where LineOrderNumber = @Order   
		select @TermDescription= TermDescription    from ACR.CustomerPaymentTerm where PaymentTerm = @PaymentTerm   
		set @TotalLineAmount = 0   
		set @TotalLineDiscount = 0   
		set @TotalFinalAmount = 0   
		set @TotalTax = 0   
		select  @TotalLineAmount=isnull ( SUM ( LineAmountTransaction ) , 0 )  ,		@TotalLineDiscount= isnull ( SUM ( LineDiscountTransaction ) , 0 ) ,@TotalLines= COUNT ( * ) ,
				@TotalFinalAmount= isnull ( SUM ( LineFinalAmountTransaction ) , 0 )  , @TotalTax= isnull ( SUM ( LineTax ) , 0 ) , @TotalTaxTABLE = isnull ( SUM ( TaxtableAmount ) , 0 ) 
		from COR.CustomerOrderLineWF where LineOrderNumber = @Order  
		update COR.CustomerOrderHeaderWF set 
		CustomerNumber = @Customer , CustomerType = @CustomerType , RequestShipDate = @RequestDate , TotalLines = @TotalLines , 
		Salesperson = @SalesPerson , Warehouse = @Warehouse , TermsCode = @PaymentTerm , TermsDescription = @TermDescription , ShipToID	 = @ShipToID , ShipToName = @ShipToName , ShipToAddress = @ShipToAddress  , 
		ScheduledShipDate = @ScheduleDate , PaymentCode = @PaymentType , CustomerTaxCode = @TaxCode , Currency = @Currency , ExchangeRate = @Rate , TotalWeight = @Weight , WeightUnitOfMessure = 'KG' ,
		OrderCarrier = @Carrier , BackOrderCode = @AllowBackOrder , 
		PriceBookDate = @PriceBookDate , Facility = @Facility , OrderTruckType = @TruckTypeID , CustomerNote = @CustomerNote , SalesNote = @SalesNote , CompanyNoteToCustomer = @CompanyNote , 
		AccountingNote = @AccountingNote , LogisticNote = @LogisticNote , InternalNote = @OrderNote , OrderType = @OrderType , ToatalItemAmount = @TotalLineAmount , TotalFinalAmount = @TotalFinalAmount ,
		TotalDiscount = @TotalLineDiscount , TaxAmount = @TotalTax , TotalTaxtableAmount = @TotalTaxTABLE , PriceType=@PriceType  , 
		OrderReferenceNumber = @OrderRef , CustomerNationlID=@NationalID, CustomerPurchaseOrder = @CustomerPO , CustomerPurchaseOrderDescription = @CustomerPODescription , CountryID=@countryID , CountryCode=@countryCode , TaxRegistration=@TaxRegistration ,
		ProjectID=@ProjectID
		where OrderNumber = @Order   
		delete from COR.CustomerOrderHeader where OrderNumber = @Order   
		delete from COR.CustomerOrderLine where LineOrderNumber = @Order   
		delete from COR.CustomerOrderPromotion where CustomerOrderNumber = @Order   
		delete from COR.CustomerOrderTax where OrderNumber = @Order   
		insert into   COR.CustomerOrderHeader select * from cor.CustomerOrderHeaderWF where  OrderNumber=@Order
		insert into   COR.CustomerOrderLine   select * from COR.CustomerOrderLineWF where LineOrderNumber=@Order
		insert into   COR.CustomerOrderPromotion select * from COR.CustomerOrderPromotionWF where CustomerOrderNumber=@order 
		insert into cor.CustomerOrderTax select * from cor.CustomerOrderTaxWF where OrderNumber=@order
		delete from COR.CustomerOrderHeaderWF where OrderNumber = @Order   
		delete from COR.CustomerOrderLineWF where LineOrderNumber = @Order   
		delete from COR.CustomerOrderPromotionWF where CustomerOrderNumber = @Order   
		delete from COR.CustomerOrderTaxWF where OrderNumber = @Order 
		select @NeedINV= NeedInvoice  ,  @NeedConfirm= NeedPickConfirm ,@NeedAccountingApproval= NeedAccountingApproval ,@NeedToBeScheduled= NeedToBeScheduled from COR.CustomerOrderType where OrderTypeID = @OrderType   
		if   @NeedToBeScheduled=0 
		begin
			update COR.CustomerOrderHeader set OrderState=50 where OrderNumber=@order 
		end
		if @NeedAccountingApproval=0 and  @NeedToBeScheduled=0 
		begin
			update COR.CustomerOrderHeader set OrderState=60 , OrderLoadingState=10  where OrderNumber=@order 
			update COR.CustomerOrderLine set LineState=10 where LineOrderNumber=@order 
		end  
		if @NeedINV = 1 AND @NeedConfirm = 0
		begin 
			set @OrderDate=getdate() 
			exec cor.CustomerProformaInvoiceOperation 'N' , @order , 0 , @OrderDate  , @User , @Message out 
			update COR.CustomerOrderHeader set OrderState = 80 , OrderLoadingState = 30 where OrderNumber = @Order   
			update COR.CustomerOrderHeaderWF set OrderState = 80 , OrderLoadingState = 30 where OrderNumber = @Order   
			update COR.CustomerOrderLineWF set LineState = 30 , QuantityShipped = QuantityOrdered where LineOrderNumber = @Order   
		end   
	end 	
	else 
	begin 
		delete from COR.CustomerOrderHeader where OrderNumber = @Order   
		delete from COR.CustomerOrderLine where LineOrderNumber = @Order   
		delete from COR.CustomerOrderPromotion where CustomerOrderNumber = @Order   
		delete from COR.CustomerOrderTax where OrderNumber = @Order   
		insert into   COR.CustomerOrderHeader select * from cor.CustomerOrderHeaderWF where  OrderNumber=@Order
		insert into   COR.CustomerOrderLine   select * from COR.CustomerOrderLineWF where LineOrderNumber=@Order
		insert into   COR.CustomerOrderPromotion select * from COR.CustomerOrderPromotionWF where CustomerOrderNumber=@order 
		insert into cor.CustomerOrderTax select * from cor.CustomerOrderTaxWF where OrderNumber=@order
		delete from COR.CustomerOrderHeaderWF where OrderNumber = @Order   
		delete from COR.CustomerOrderLineWF where LineOrderNumber = @Order   
		delete from COR.CustomerOrderPromotionWF where CustomerOrderNumber = @Order   
		delete from COR.CustomerOrderTaxWF where OrderNumber = @Order 
		if @OrderState <>  110 
		begin 
			select @OrderType =OrderType    from COR.CustomerOrderHeader where OrderNumber = @Order   
			select @NeedINV = NeedInvoice  , @NeedConfirm = NeedPickConfirm     from COR.CustomerOrderType where OrderTypeID   = @OrderType   
			if @NeedINV = 1 
			begin 
				SET @loadno=0 
				select @loadno=ISNULL( loadnumber , 0 )  , @shipDate=shipdate from cor.DeliveryNoteHeader where OrderNumber=@order 
				exec cor.CustomerProformaInvoiceOperation 'N' , @order , @LoadNo , @shipDate , @User , @Message out 
			end
		end 
	end 
end   
if @Operation = 'Delete Header' 
begin 
	select    @OrderState=isnull ( OrderState  , 0 )  ,@OrderChangedLocked =  OrderChangedLocked ,  @OrderType =OrderType , @OrderRef= isnull ( OrderReferenceNumber, 0 )   from COR.CustomerOrderHeader where OrderNumber = @Order   
	select @NeedToBeScheduled= NeedToBeScheduled from COR.CustomerOrderType where OrderTypeID = @OrderType   
	if ( @OrderChangedLocked =0 or @OrderChangedLocked is null )   and    @OrderState<=60  and  @OrderRef=0 
	begin 
		if @OrderRef=0 
		begin
			update COR.CustomerOrderHeader set OrderState = 999 , OrderLoadingState = 999 , LastMaintUser = @User , LastMaintDate = getdate()  , DeleteReasonID = @DeleteReasonID , DeletedBy=@user  where OrderNumber = @Order   
			update COR.CustomerOrderLine set LineState = 999 , LineLastMaintUser	 = @User , LineLastMaintDate = getdate()  where LineOrderNumber = @Order 
			if @RMA<>0 
			begin
				update cor.RMAHeader set RMAState=20, customerOrder=0  where RMANumber=@RMA 
			end 
		end
		else
		begin 
			set @Message='Order has a refrence number '
			set @State=1
		end 
	end
	else
	begin
		set @Message = 'you are not able delete this order   '   
		set @state=1 
	end   
end   




if @Operation = 'Open'
	begin  ----oPENING fOURM 
		select @InUse= InUse   from COR.CustomerOrderHeader where OrderNumber = @Order   
		if @InUse = 0 
		begin 
			update COR.CustomerOrderHeader set InUseBy = @User , InUse = 1 where OrderNumber = @Order   
			delete from COR.CustomerOrderHeaderWF where OrderNumber = @Order   
			delete from COR.CustomerOrderLineWF where LineOrderNumber = @Order   
			delete from COR.CustomerOrderPromotionWF where CustomerOrderNumber = @Order   
			delete from COR.CustomerOrderTaxWF where OrderNumber = @Order   
			--insert into   COR.CustomerOrderHeaderWF select * from COR.CustomerOrderHeader where OrderNumber = @Order   
			insert into   COR.CustomerOrderHeaderWF select * from cor.CustomerOrderHeader where OrderNumber=@order 
			insert into   COR.CustomerOrderLineWF   select * from COR.CustomerOrderLine where LineOrderNumber=@order 
			insert into   COR.CustomerOrderPromotionWF select * from COR.CustomerOrderPromotion where CustomerOrderNumber=@order 
			insert into   COR.CustomerOrderTaxWF select * from COR.CustomerOrderTax where OrderNumber = @Order   
		end
		else 
		begin
			select    @InUseBy=InUseBy  from COR.CustomerOrderHeader where OrderNumber = @Order   
			set @Message = 'Order   use by ' + @InUseBY   
			set @State=1 
		end   
end   
  
if @Operation = 'Close'
begin  ---CLOSING FOURM 
	update COR.CustomerOrderHeader set InUseBy = '' , InUse = 0 where OrderNumber = @Order   
end   


end
