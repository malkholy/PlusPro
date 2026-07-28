USE [ERPMega25]
GO
/****** Object:  StoredProcedure [COR].[CustomerOrderPricePromotionOperationV2]    Script Date: 7/26/2026 8:32:52 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
alter  PROCEDURE [COR].[APIPlusCustomerOrderPricePromotionOperation]
@Operation nvarchar(500) ,
@LineData nvarchar(max) ,   -- JSON object: order, pricebookdate, defaultpricetype, line, itemid, customer, currency, rate, warehouse, ship_to, qty, um, promontionno, promontionline, manualpromotiontype, manualdiscountpercentage, manualpromotionamount, manualpromotiondescription
@User nvarchar(50) ,


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
	set @State=0
	set @Message=''

declare @Order int , @PriceBookDate date , @DefaultPriceType int =0 , @Line int , @ItemID nvarchar(50) , @Customer int ,
	@Currency nvarchar(5) , @Rate dec(18,5) , @Warehouse nvarchar(5) , @SHIP_TO int , @Qty DECIMAL(15,5) , @UM nvarchar(2) ,
	@PromontionNo int =0 , @PromontionLine int =0 , @ManualPromotionType int =0 , @ManualDiscountPercentage dec(18,5) =0 ,
	@ManualPromotionAmount dec(18,5) =0 , @ManualPromotionDescription nvarchar(max) ='' ,
	@ListPrice dec (18,5)  =0 ,
@FreeGoodFlag int =0   ,
@FreeGoodQuantity dec (18,5)=0  ,
@FreeGoodItemID int =0   , @Price dec (18,5)  =0

------------------------------------------------------------------
-- Parse @LineData (JSON object) into scalars
------------------------------------------------------------------
select
	@Order = [order], @PriceBookDate = pricebookdate, @DefaultPriceType = isnull(defaultpricetype, 0),
	@Line = line, @ItemID = itemid, @Customer = customer, @Currency = currency, @Rate = rate,
	@Warehouse = warehouse, @SHIP_TO = ship_to, @Qty = qty, @UM = um,
	@PromontionNo = isnull(promontionno, 0), @PromontionLine = isnull(promontionline, 0),
	@ManualPromotionType = isnull(manualpromotiontype, 0), @ManualDiscountPercentage = isnull(manualdiscountpercentage, 0),
	@ManualPromotionAmount = isnull(manualpromotionamount, 0), @ManualPromotionDescription = isnull(manualpromotiondescription, '')
from openjson(@LineData)
with (
	[order]                       int             '$.order',
	pricebookdate                 date            '$.pricebookdate',
	defaultpricetype              int             '$.defaultpricetype',
	line                          int             '$.line',
	itemid                        nvarchar(50)    '$.itemid',
	customer                      int             '$.customer',
	currency                      nvarchar(5)     '$.currency',
	rate                          dec(18,5)       '$.rate',
	warehouse                     nvarchar(5)     '$.warehouse',
	ship_to                       int             '$.ship_to',
	qty                           dec(15,5)       '$.qty',
	um                            nvarchar(2)     '$.um',
	promontionno                  int             '$.promontionno',
	promontionline                int             '$.promontionline',
	manualpromotiontype           int             '$.manualpromotiontype',
	manualdiscountpercentage      dec(18,5)       '$.manualdiscountpercentage',
	manualpromotionamount         dec(18,5)       '$.manualpromotionamount',
	manualpromotiondescription    nvarchar(max)   '$.manualpromotiondescription'
)

declare @Facility nvarchar(5)   declare @ItemClass nvarchar(2)   declare @CustomerType nvarchar(10)   declare @ItemDiscountCode nvarchar(50) declare @CustomerDiscountCode nvarchar(10)
declare @LineState int  declare @PermissionID  int , @PERMISSIONFlag int , @ManualPrice dec (18,5)  declare @FinalPrice dec (18,5)    declare @FinalPricePro dec (18,5)
declare @DiscountValue dec (18,5)    declare @Conversion int   declare @SellingUM nvarchar(2)  declare @StockUM nvarchar(2)
declare @LineDiscountAmount dec (18,5)    declare @NetPriceStock dec (18,5)    declare @ListPriceStock dec (18,5)    declare @LineAmount dec (18,5)    declare @LineDiscount dec (18,5)
declare @Conversion1 int   declare @ItemTaxCode nvarchar(10)   declare @TaxtableAmount dec (18,5)    declare @LineTax dec (18,5)    declare @QtySelling dec (18,5)
declare @LineFinal dec (18,5)     declare @Counter1 int   declare @orderState int
declare @Counter3 int   declare @Counter4 int
declare @FreeQty dec (18,5)    declare @QtyStock dec (18,5)      declare @DiscountRate int declare @DiscountPercentage dec (18,5)  declare  @PromotionNumber  int
declare @TaxCode nvarchar(10) , @RateCode nvarchar(10)  , @TaxRate dec (18,5)  , @CustomerTaxCode nvarchar(10) declare @PromotionLineNumber int
declare @FreeGoodItemIDTemp int , @loadno int ,  @shipDate date declare @ItemIDTemp int , @LoadTemp int
declare @MinmumQty int  , @MaximumQty int , @FreeGoodQtyTemp int , @OrderType int , @NeedConfirm int , @NeedInv int , @I int  , @FreeGoodsQuantity int , @PromotionType int ,
@PromotionDescription nvarchar(max)
declare @ManualPriceStock dec (18,5)  ,  @PromotioNumber int , @Manual int , @ListPriceSelling dec(18,5) ,  @NetPriceSelling dec(18,5) , @TotalLines int , @Cnt int

create table  #tempload ( loadno int )

create table #TempPrice (
  PromotionType int 	, PromotionDescription nvarchar(max) , 	PromotionNumber int    ,    ItemID int  null ,  ItemCode nvarchar(150) null ,  ItemClass nvarchar(10) null  ,  CustomerNumber int  null ,  CustomerType nvarchar(50) null ,
  ShipToID int null  ,  CustomerDiscountCode nvarchar(10) null ,  ItemDiscountCode nvarchar(50) null ,  StartDate date null ,  EndDate date null ,  Facility nvarchar(10) null ,  Warehouse nvarchar(10) null ,  MinimumAmount  dec (18,5)  null
,  MaximumAmount dec (18,5)  null ,  DiscountPercentage dec (18,5)  null ,  MinimumQuantity dec (18,5)  null  ,  MaximumQuantity dec (18,5)  null ,  DiscountAmount dec (18,5)  null  ,  DiscountPrice dec (18,5)   null ,  FreeGoodItemID  int null ,  FreeGoodQty int null  ,  PromoDescription nvarchar(max) null ,
Currency  nvarchar(10) null , ManualPromotion int  )
delete from #TempPrice
set @DiscountValue = 0
set @FinalPrice = 0
set @FreeGoodFlag = 0
set @FreeGoodQuantity = 0
set @FinalPricePro = 0
set @NetPriceStock = 0
SET @LineDiscount=0
if @Operation = 'Get Price'
begin
		delete from COR.CustomerOrderPromotionWF where CustomerOrderNumber = @Order AND OrderLineNumber = @Line
		insert into  #TempPrice exec cor.CustomerOrderPromotionCalcuation @Warehouse , @Customer , @ItemID  , @PriceBookDate  , @Currency
		insert into #TempPrice
		(  PromotionType	, PromotionDescription	        ,DiscountPercentage   , PromotionNumber  ,   ManualPromotion )
		select a.PromotionType , a.PromotionDescription ,100- a.DiscountPercentage , a.PromotioNumber , 1  from cor.CustomerOrderManualPromotion a where CustomerOrderNumber=@Order and (line=0 or line=@line  )
		select @SellingUM = SellingUM  , @StockUM= StockUM , @Conversion= SellingConversion   from INV.ItemMaster where ItemID = @ItemID
		set @price=0
		exec cor.CustomerOrderPriceCalcuation @ItemId , @Qty , @uM , @PriceBookdate , @DefaultPriceType , @QtyStock out , @QtySelling out , @ListPriceSelling out ,@listPriceStock out ,
		@Price out , @NetPriceStock out , @NetPriceSelling out
		set  @LineAmount=@ListPriceStock * @QtyStock
		select @Counter1 = COUNT ( * )    from #TempPrice
		if @Counter1 > 0
		begin
			select PromotionType , PromotionDescription , DiscountPercentage , PromotionNumber ,itemid ,   FreeGoodItemID , MinimumQuantity , MaximumQuantity , FreeGoodQty , ManualPromotion  from #TempPrice
			declare f cursor for  select PromotionType , PromotionDescription , DiscountPercentage , PromotionNumber ,itemid ,   FreeGoodItemID , MinimumQuantity , MaximumQuantity , FreeGoodQty , ManualPromotion  from #TempPrice
			open f
			fetch next from f  into	@PromotionType	, @PromotionDescription	        ,@DiscountPercentage   , @PromotionNumber  ,  @ItemIDTemp ,  @FreeGoodItemIDTemp , @MinmumQty , @MaximumQty , @FreeGoodQtyTemp , @Manual
			while @@fetch_status =0
			begin
				if @PromotionType=1
				begin
					if @QtyStock<0
					begin
						set @LineAmount =@QtyStock*@ListPriceStock
						set @LineDiscountAmount =abs ( @LineAmount)  * (  ( 100 - @DiscountPercentage  ) / 100  )
						set @NetPriceStock = (  ( @ListPriceStock )  * (  ( @DiscountPercentage  ) / 100  ) )
					end
					else
					begin
						set @LineAmount =@QtyStock*@ListPriceStock
						set @LineDiscountAmount=-1 * ( @LineAmount)  *  ( ( 100 - @DiscountPercentage  ) / 100  )
						set @NetPriceStock =  (  ( @ListPriceStock )  * (  ( @DiscountPercentage  ) / 100  ) )
					end
					set @DiscountValue = @DiscountValue + ( @LineDiscountAmount )
					select @Counter3 = COUNT ( * )    from COR.CustomerOrderPromotionWF where CustomerOrderNumber = @Order AND OrderLineNumber = @Line AND PromotioNumber =@PromotionNumber
					insert into   COR.CustomerOrderPromotionWF
					( guid ,  PromotioNumber , PromotionDescription , CustomerOrderNumber , OrderLineNumber , ItemID , CustomerNumber ,  CreatedDate , CreatedByUser ,
					OrderedQtyStockingUM , LineAmount , DiscountAmount , ListPriceTranscationStocking , NetPriceTranscationStocking , DiscountPercentage , ManualPromotion )
					VALUES (newid() ,  @PromotionNumber, @PromotionDescription , @Order , @Line , @ItemID , @Customer ,getdate() , @User ,
					@QtyStock , @LineAmount , @LineDiscountAmount , @ListPriceStock , @NetPriceStock , 100 - @DiscountPercentage  , @Manual )
					SELECT * FROM COR.CustomerOrderPromotionWF WHERE CustomerOrderNumber = @Order
				end

				if @PromotionType=3
				begin
					if @QtyStock >= @MinmumQty AND @MinmumQty > 0
					begin
						set @FreeQty =  ( ( @QtyStock / @MinmumQty ) ) * @FreeGoodQtyTemp
						set @FreeGoodQuantity = @FreeQty
						set @FreeGoodFlag = 1
						set @FreeGoodItemID = @FreeGoodItemIDTemp
						set @LineDiscountAmount = 0
						set @NetPriceStock = @ListPriceStock
						insert into   COR.CustomerOrderPromotionWF (
						guid ,   PromotioNumber , PromotionDescription ,  CustomerOrderNumber , OrderLineNumber , ItemID , CustomerNumber , FreeGoodsQuantity , CreatedDate ,  CreatedByUser ,
						OrderedQtyStockingUM ,  ListPriceTranscationStocking , NetPriceTranscationStocking , FreeGoodItemID )
						VALUES (newid() ,   @PromotionNumber, @PromotionDescription ,  @Order , @Line , @ItemID , @Customer , @FreeGoodQuantity , getdate() ,   @User ,
						@QtyStock ,  @ListPriceStock , @NetPriceStock , @FreeGoodItemIDTemp )

					end
				end
				fetch next from f  into @PromotionType	, @PromotionDescription	  ,  @DiscountPercentage   , @PromotionNumber  , @ItemIDTemp ,  @FreeGoodItemIDTemp , @MinmumQty , @MaximumQty , @FreeGoodQtyTemp , @Manual
			end
			close f
			deallocate f
			set @NetPriceStock = ( ABS ( @LineAmount ) - ABS ( @DiscountValue ) ) / ABS ( @QtyStock )
			if @UM = @SellingUM
			begin
				set @Price = @NetPriceStock * @Conversion
				set @ListPrice=@ListPriceSelling
			end
			else
			begin
				set @Price = @NetPriceStock
				set @ListPrice=@ListPriceStock
			end
			PRINT '@Price' + CONVERT (NVARCHAR , @Price )
			PRINT '@ListPrice' + CONVERT ( NVARCHAR , @ListPrice )
		end
		update COR.CustomerOrderLineWF
		set ManualPriceTransStocking = 0 , ManualPriceBaseStocking = 0
			where LineOrderNumber = @Order AND LineNumber = @Line
		set @LineState = 0
		select	@LineState = isnull ( LineState , 0 )    from COR.CustomerOrderLine where LineOrderNumber = @Order AND LineNumber = @Line
		if @LineState = 30
		begin
			exec cor.CustomerOrderPriceCalcuation @ItemId , @Qty , @uM , @PriceBookdate , @DefaultPriceType , @QtyStock out , @QtySelling out , @ListPriceSelling out ,@listPriceStock out ,
			@Price out , @NetPriceStock out , @NetPriceSelling out
			PRINT '@NetPriceStock' + CONVERT (NVARCHAR , @NetPriceStock )

			set @LineTax = 0
			set @LineAmount = @listPriceStock * @QtyStock
			select @LineDiscount = isnull ( sum( DiscountAmount) ,0 )   from cor.CustomerOrderPromotionWF where CustomerOrderNumber=@order and OrderLineNumber=@Line and IsNotActive=0 and FreeGoodsQuantity=0
			set @LineFinal = @LineAmount + (@LineDiscount  ) + ( @LineTax )
			select  @ListPriceSelling= isnull ( PriceSellingUnit , 0 )   from ACR.PriceHistory where PriceTypeID=@DefaultPriceType and  PriceIsNotActive = 0 AND ItemID = @ItemID  AND StartDate <= @PriceBookDate AND EndDate >= @PriceBookDate
			update COR.CustomerOrderLineWF set
			NetPriceTransStocking = @NetPriceStock , NetPriceBaseStocking =@NetPriceStock*@Rate , NetPriceBaseSelling = @NetPriceSelling*@Rate , NetPriceTransSelling = @NetPriceSelling ,
			ListPriceTransStocking = @ListPriceStock , ListPriceBaseStocking = @ListPriceStock*@rate , ListPriceTransSelling=@ListPriceSelling ,
			ManualPriceTransStocking = 0 , ManualPriceBaseStocking = 0 , LineAmountTransaction = @LineAmount , LineDiscountTransaction = @LineDiscount
			where LineOrderNumber = @Order AND LineNumber = @Line

			exec cor.CustomerOrderTaxlineCalcuation @order  ,0 ,  @ItemID  ,  @line , @QtyStock  , @NetPriceStock

		end
		select @Price as Price ,   @ListPrice as ListPrice ,  @FreeGoodFlag   as FreeGoodFlag ,  @FreeGoodQuantity as FreeGoodQuantity , @FreeGoodItemID as FreeGoodItemID
end
end
