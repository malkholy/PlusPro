USE [ERPMega25]
GO
/****** Object:  StoredProcedure [dbo].[APIPlusOperation]    Script Date: 19/07/2026 09:02:57 م ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
alter    PROCEDURE [dbo].[APIPlusLoadingOperation]
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
    SET @Message = ''
    SET @State = 0


	declare @Carrier nvarchar(10) ,  @OrderType int ,@NeedRelease int ,@Avaliable float ,  @OnHand float,@Allocated float ,@NeedINV int,@Debit nvarchar(1) , @LoadLineNo int,
	@Customer int,@ItemNetWeight float,@ItemGorssWeight  float ,@Cnt int, @Facility nvarchar(5) , @AllocatedQty float , @OrderAllocated float ,@Counter1 int , @Counter2 int ,
	@NeedConfirm int,@QtyShipped float , @Conversion int,@QtySelling float , @AllowBackOrder int,@ShipToId int ,@TransactionType nvarchar(2) ,@TotalWight float ,
	@RestQty float , @PromotionFlag int,@RelatedToLine int,@ConfirmedRelatedQty float, @OrderRelatedQty float,@TotalLines int ,@TotalConfirmed float,@QtyOrdered float,@InUse nvarchar(1) ,
	@InUse_BY nvarchar(10) ,@OrderRef int, @Nolon int, @PickNo INT , @Rowcount int , @I int , @NoLoad int , @GrossWeight float , @NotConfirmed int , @OrderLine int , @NeedAccountingApproval int , @NeedToBeScheduled int ,
	@Line int  ,  @ItemID int  , @Qty float , @UM nvarchar(5) , @Cnt1 int , @Cnt2 int ,  @Cnt3 int , @OrderState int=0 , @Cnt4 int ,
	@WarehouseTransaction nvarchar(3) , @ShipToAddress nvarchar(max) 	, @BarcodeLoading int ,@UnloadedID int =0 , @QtyOrder dec(18,5) =0 ,
	@ItemCode nvarchar(50) , @SellingUM nvarchar(5)  , @SellingConversion int , @Order int =0 , @Warehouse nvarchar (50)=''

	IF @Operation = 'Open'  ---Openong Fourm
	begin
		set @order=convert ( int , @LineData )
		select @InUse= InUse    from COR.CustomerOrderHeader WHERE OrderNumber = @Order ;
		IF @InUse = 0
		begin
			update COR.CustomerOrderHeader set InUseBy = @User , InUse = 1 WHERE OrderNumber = @Order ;
		end
		ELSE
		begin
			select @InUse_BY  = InUseBy   from COR.CustomerOrderHeader WHERE OrderNumber = @Order ;
			set @Message = 'Order   use by ' +  @InUse_BY ;
			set @state= 1
		end
	end

	IF @Operation = 'Close'
	begin  ---Closing


		set @order=convert ( int , @LineData )
		update COR.CustomerOrderHeader set InUseBy = '' , InUse = 0 WHERE OrderNumber = @Order ;
	end












	if @Operation='New Release' ------New Relaesa
	begin
		create table #TempLine (orderno int, warehouse nvarchar(20), line int, itemid int, qty numeric(18,4))
		insert into #TempLine
		select * from openjson(@LineData)
		with (
			orderno   int            '$.orderno',
			warehouse nvarchar(20)   '$.warehouse',
			line      int            '$.line',
			itemid    int            '$.itemid',
			qty       numeric(18,4)  '$.qty'
		)

		select top 1 @Order = orderno , @Warehouse = warehouse from #TempLine
		select @OrderType= OrderType  , @AllowBackOrder=BackOrderCode ,    @Carrier=OrderCarrier ,  @ShipToId = ShipToID  ,@Customer= CustomerNumber from COR.CustomerOrderHeader WHERE OrderNumber = @Order 
		select @NeedRelease  = NeedPickRelease , @NeedConfirm=NeedPickConfirm , @NeedINV=NeedInvoice , @Debit= DebitORCredit ,@NeedAccountingApproval= NeedAccountingApproval ,@NeedToBeScheduled= NeedToBeScheduled  from COR.CustomerOrderType WHERE orderTypeID  = @OrderType ;	 

		select @OrderState = orderState from cor.CustomerOrderHeader where OrderNumber=@order
		if @OrderState in (60 , 65 )
		begin
			IF @NeedRelease = 1
			begin
				set @NoLoad=0

				exec GetSequenceNo 18 , @PickNo out
				delete from COR.PickRelease WHERE OrderNumber = @Order ;
				delete from inv.ItemAllocation where OrderNumber=@order and AllocatdSource='C' and BarcodeAllocation=0
				select line , itemid , qty from #TempLine
				select @Facility = WarehouseFacility from inv.WarehouseMaster where Warehouse=@Warehouse

				declare f cursor for  select line , itemid , qty from #TempLine
				open f
				fetch next from f  into  @line , @ItemID , @Qty
				while @@fetch_status =0
				begin
					set  @UM='UN'
					select @ItemCode=ItemCode , @SellingUM= SellingUM  ,@SellingConversion= SellingConversion  from inv.ItemMaster where ItemID=@ItemID
					SET @BarcodeLoading=0
					select @BarcodeLoading= isnull ( BarcodeLoading , 0 )  from COR.CustomerOrderLine WHERE LineOrderNumber =@oRDER AND LineNumber=@LINE
					if @BarcodeLoading=0
					begin

						if @UM=@SellingUM
						begin
							set @Qty=@Qty*@SellingConversion
						end
						select @Cnt =  COUNT ( * )  from Inv.ItemBalance WHERE ItemID = @ItemID AND Warehouse = @Warehouse ;
						IF @Cnt > 0
						begin
							select  @Avaliable = isnull ( ( Adjustment+Reciept+Issue ) , 0 )   from Inv.ItemBalance WHERE ItemID = @ItemID AND Warehouse = @Warehouse ;
						end
						else
						begin
							set @Avaliable = 0 ;
						end
						select  @Allocated = isnull ( SUM ( QuantityAllocated ) , 0 )   from inv.ItemAllocation WHERE ItemID = @ItemID AND @Warehouse = Warehouse ;
						set @OnHand = @Avaliable - @Allocated ;

						IF @OnHand >= @Qty
						begin
							delete from  inv.ItemAllocation where OrderNumber=@Order and LineNumber=@Line and  AllocatdSource ='C' and BarcodeAllocation=0
							select @GrossWeight= GrossWeight from INV.ItemMaster WHERE ItemID = @ItemID
							insert   inv.ItemAllocation
							(  AllocatdSource , OrderNumber , SequenceNumber ,  LineNumber ,  ItemID , Warehouse , QuantityAllocated )
							values
							(       'C' ,			@Order ,            0 ,         @Line ,     @ItemID , @Warehouse , @Qty )

							update COR.CustomerOrderLine set QuantityAllocated = @Qty WHERE LineOrderNumber = @Order AND LineNumber = @Line ;

							insert into    COR.PickRelease ( Warehouse , OrderNumber , OrderLineNumber ,ItemID ,  PickQuantity , Carrier , PickDate , OriginalPickWeight , PickByUser , PickNo )
							select                      Warehouse , @Order ,     LineNumber , ItemID , QuantityAllocated , @Carrier , getdate() ,   QuantityAllocated *@GrossWeight , @User , @PickNo
							from inv.ItemAllocation WHERE OrderNumber = @Order AND AllocatdSource = 'C' and LineNumber=@Line;

							set @Message = ''
						end
						else
						begin
							set @Message = 'NOT ALLOCATED Line Number ' + CONVERT (nvarchar ,  @lINE ) ;
							delete from inv.ItemAllocation WHERE OrderNumber = @Order AND AllocatdSource = 'C' and BarcodeAllocation=0  ;
							delete from COR.PickRelease WHERE OrderNumber = @Order ;
							update COR.CustomerOrderLine set QuantityAllocated = 0 WHERE LineOrderNumber = @Order and BarcodeLoading=0    ;
							set @NoLoad =1
							set @State=1
							break
						end

					end
					fetch next from f  into  @line , @ItemID , @Qty
				end
				close f
				deallocate f
				drop table #TempLine

				if @NoLoad =0
				begin
					update COR.CustomerOrderHeader set orderstate=65 ,  OrderLoadingState = 20 , OrderChangedLocked=1    WHERE OrderNumber = @Order ;
					update COR.CustomerOrderLine set LineState = 20 WHERE LineOrderNumber = @Order AND LineState  in   ( 10 , 0 ) ;
				end
			end
		end
	end


	IF @Operation ='Delete Release' 
	begin  ----delete  RELEASE HEADER 
		create table #TempLineDelete (orderno int, warehouse nvarchar(20))
		insert into #TempLineDelete
		select * from openjson(@LineData)
		with (
			orderno   int            '$.orderno',
			warehouse nvarchar(20)   '$.warehouse'
			
		) 
		select top 1 @Order = orderno , @Warehouse = warehouse from #TempLineDelete 
		select @OrderType= OrderType  , @AllowBackOrder=BackOrderCode ,    @Carrier=OrderCarrier ,  @ShipToId = ShipToID  ,@Customer= CustomerNumber from COR.CustomerOrderHeader WHERE OrderNumber = @Order 
		select @NeedRelease  = NeedPickRelease , @NeedConfirm=NeedPickConfirm , @NeedINV=NeedInvoice , @Debit= DebitORCredit ,@NeedAccountingApproval= NeedAccountingApproval ,@NeedToBeScheduled= NeedToBeScheduled  from COR.CustomerOrderType WHERE orderTypeID  = @OrderType ;	 
		select @OrderState = orderState from cor.CustomerOrderHeader where OrderNumber=@order
		if @OrderState in (60 , 65 )
		begin	
			IF @NeedRelease = 1 
			begin 
				delete from inv.ItemAllocation WHERE OrderNumber = @Order AND AllocatdSource = 'C' and BarcodeAllocation=0 
				delete from COR.PickRelease WHERE OrderNumber = @Order ; 
				 select @Facility = WarehouseFacility from inv.WarehouseMaster where Warehouse=@Warehouse 
				if @NeedToBeScheduled=0 and @NeedAccountingApproval=0 
				begin 
					update COR.CustomerOrderHeader set orderstate=60 ,   OrderLoadingState = 10 , OrderChangedLocked=0  WHERE OrderNumber = @Order ; 
					update COR.CustomerOrderLine set LineState = 10 , QuantityAllocated = 0 WHERE LineOrderNumber = @Order AND LineState in   ( 20 ) and  BarcodeLoading =0 
				end
				else
				begin
					update COR.CustomerOrderHeader set   orderstate=60  ,  OrderLoadingState = 10 , OrderChangedLocked=1  WHERE OrderNumber = @Order ; 
					update COR.CustomerOrderLine set LineState = 10 , QuantityAllocated = 0 WHERE LineOrderNumber = @Order AND LineState in   ( 20 ) and   BarcodeLoading =0    ; 
				end 
			end 
		end 
	end 




IF @Operation='Confirm Order'   ----New  
	begin
		declare @ConfirmDate date , @LoadNo int =0 , @ShiftID int , @TruckID int  , @DriverID int  ,  @LoadingDockID int , @LoadinRequestNo int =0 
		create table #TempCon (RowNo int , orderno int , line int  , ItemID int  ,  Qty float , UnloadedID int , ConfirmDate datetime ,
			ShiftID int , TruckID int , DriverID int , LoadingDockID int )
		insert into #TempCon (orderno, line, ItemID, Qty, UnloadedID, ConfirmDate, ShiftID, TruckID, DriverID, LoadingDockID)
		select * from openjson(@LineData)
		with (
			orderno       int      '$.orderno',
			line          int      '$.line',
			ItemID        int      '$.itemid',
			Qty           float    '$.qty',
			UnloadedID    int      '$.unloadedid',
			ConfirmDate   datetime '$.confirmdate',
			ShiftID       int      '$.shiftid',
			TruckID       int      '$.truckid',
			DriverID      int      '$.driverid',
			LoadingDockID int      '$.loadingdockid'
		)

		select top 1 @Order = orderno , @ConfirmDate = ConfirmDate , @ShiftID = ShiftID , @TruckID = TruckID , @DriverID = DriverID , @LoadingDockID = LoadingDockID from #TempCon

		select @OrderType = OrderType , @Warehouse = Warehouse , @AllowBackOrder = BackOrderCode , @Carrier = OrderCarrier , @ShipToId = ShipToID , @ShipToAddress = ShipToAddress , @Customer = CustomerNumber from COR.CustomerOrderHeader WHERE OrderNumber = @Order
		select @NeedRelease = NeedPickRelease , @NeedConfirm = NeedPickConfirm , @NeedINV = NeedInvoice , @Debit = DebitORCredit , @NeedAccountingApproval = NeedAccountingApproval , @NeedToBeScheduled = NeedToBeScheduled from COR.CustomerOrderType WHERE orderTypeID = @OrderType

		select @OrderState = orderState from cor.CustomerOrderHeader where OrderNumber=@order
		if @OrderState in ( 65 )
		begin
			select @Facility = WarehouseFacility from inv.WarehouseMaster where Warehouse=@Warehouse 
			select @Cnt =count(*) from cor.CustomerOrderLine where LineOrderNumber =@order and BarcodeLoading=1 
			select @Cnt4 = count(*) from Cor.barcodeCustomerOrderHeader where OrderNo=@order and barcodeState<30 
			if (  @Cnt=0 )  or ( @Cnt<>0 and @Cnt4=0 )
			begin
			IF @NeedConfirm = 1 
			begin 
				exec GetSequenceNo 19  , @LoadNo out 
				set @NotConfirmed=0
				delete from COR.DeliveryNoteLineWF WHERE OrderNumber = @Order
				select    @Debit=DebitORCredit from COR.CustomerOrderType WHERE OrderTypeID = @OrderType ;	
				select @Rowcount=count(*) FROM #TempCon
				set @I=1 
				declare f cursor for  select line , ItemID ,   convert ( float , Qty ) , UnloadedID  FROM #TempCon  order by line 
				OPEN F 
				fetch next from f  into   @Line  ,@ItemID , @Qty , @UnloadedID
				while @@fetch_status =0
				begin
					if @Debit='I' 
					begin
						if @Qty<>0
						begin
							set @Avaliable=0 
							set @AllocatedQty = 0 
							set @OrderAllocated = 0  
							set @ConfirmedRelatedQty=0 
							set @OrderRelatedQty=0
							set @RelatedToLine=0 
							set @PromotionFlag=0 
							select   @ItemNetWeight = NetWeight , @ItemGorssWeight=  GrossWeight ,  @Conversion= SellingConversion , @ItemCode=ItemCode   from INV.ItemMaster WHERE ItemID = @ItemID ; 
							set @QtySelling = @Qty / @Conversion 
							select @Avaliable = isnull( (Adjustment + Reciept+Issue  ) ,0)    from Inv.ItemBalance WHERE ItemID = @ItemID AND ItemLot = '' AND Warehouse = @Warehouse  
							select @QtyOrdered =  QuantityOrdered from cor.CustomerOrderLine where LineOrderNumber=@Order and LineNumber=@line 
							select    @AllocatedQty= isnull ( SUM ( QuantityAllocated ) , 0 )   from inv.ItemAllocation WHERE ItemID = @ItemID AND @Warehouse = Warehouse AND LotNumber = ''  
							select   @OrderAllocated=isnull ( SUM ( QuantityAllocated ) , 0 )   from inv.ItemAllocation WHERE ItemID = @ItemID AND @Warehouse = Warehouse AND OrderNumber = @Order AND LineNumber = @Line GROUP BY ItemID , Warehouse ; 
							set @OnHand = @Avaliable - @AllocatedQty + @OrderAllocated  
							IF ( @OnHand >= @Qty  )  and abs( @QtyOrdered ) >= abs(@qty )   
							begin 
								select  @LoadLineNo= isnull ( MAX ( LoadLineNumber ) , 0 ) + 1   from COR.DeliveryNoteLineWF WHERE LoadNumber = @LoadNo AND OrderNumber = @Order ; 
								insert   COR.DeliveryNoteLineWF (guid ,  LineFacility , LineWarehouse ,		LoadNumber , OrderNumber , OrderLineNumber , ItemId ,ItemCode , 
								ShipQuantityStocking , LineCustomerNumber , LineShipDate , LineOrderType , WeightShipped , VolumeShipped , NetWeight , ShippedQuantitySelling ,
								ShipToID , LoadLineNumber , UnloadReasonID , CreatedByUser ) 
								values (		newid() , 			@Facility	, @Warehouse , @LoadNo , @Order , @Line , @ItemID ,@ItemCode ,  @Qty , @Customer , @ConfirmDate , @OrderType ,
								@Qty * @ItemGorssWeight  , 0 , @Qty * @ItemNetWeight , @QtySelling , @ShipToID , @LoadLineNo , @UnloadedID  , @User) 
								set @Message='OK' 
								if @UnloadedID<>0 
								begin
									select  @QtyOrdered=QuantityOrdered from cor.CustomerOrderLine where LineOrderNumber=@Order and LineNumber=@line 
									insert into cor.UnloadQuanityOrderedHistory
									( OrderNumber , LoadNumber , LineNumber , ItemCode   ,  ShipDate , ShippedQty , OrderedQty , UnloadReasonID , Warehouse  )
									values 
									( @Order ,         @LoadNo , @line ,      @itemCode , @ConfirmDate , @Qty , @QtyOrdered , @UnloadedID  , @Warehouse )
								end 

							end
							else  ----NO BALANCE 
							begin
								set @Message = 'Back to allocation NO BALANCE lINE ' + CONVERT ( NVARCHAR , @LINE) + ' Or Quantity Confirmed Greater than Ordered '  ; 
								delete  from COR.DeliveryNoteLineWF WHERE OrderNumber = @Order ; 
								delete from cor.UnloadQuanityOrderedHistory where OrderNumber=@Order and LoadNumber=@LoadNo
								set @NotConfirmed=1 
								set @State=1 
								break
							end 
						end
						else
						begin
							select    @ItemCode=ItemCode   from INV.ItemMaster WHERE ItemID = @ItemID 
							select @QtyOrdered =  QuantityOrdered from cor.CustomerOrderLine where LineOrderNumber=@Order and LineNumber=@line 
							if @UnloadedID<>0
							begin
								insert into cor.UnloadQuanityOrderedHistory
								( OrderNumber , LoadNumber , LineNumber , ItemCode   ,  ShipDate , ShippedQty , OrderedQty , UnloadReasonID , Warehouse )
								values 
								( @Order ,         @LoadNo , @line ,      @itemCode , @ConfirmDate , @Qty , @QtyOrdered , @UnloadedID , @Warehouse )
								update COR.CustomerOrderPromotion  set IsNotActive = 1 WHERE CustomerOrderNumber = @Order AND OrderLineNumber = @Line 
							end 
						end 
							
					end
					IF @Debit = 'R' 
					begin 
						select @ItemCode=ItemCode , @SellingUM= SellingUM  ,@SellingConversion= SellingConversion , @ItemNetWeight = NetWeight , @ItemGorssWeight=  GrossWeight  from inv.ItemMaster where ItemID=@ItemID
						Select   @LoadLineNo = isnull ( MAX ( LoadLineNumber ) , 0 ) + 1   from COR.DeliveryNoteLineWF WHERE LoadLineNumber = @LoadNo AND OrderNumber  = @Order ; 
						if @Qty<>0 
						begin
							insert   COR.DeliveryNoteLineWF 
							(guid ,  LineFacility , LineWarehouse ,		LoadNumber , OrderNumber , OrderLineNumber , ItemId ,ItemCode ,  ShipQuantityStocking , LineCustomerNumber , LineShipDate , 
							LineOrderType , WeightShipped , VolumeShipped , NetWeight , ShippedQuantitySelling , ShipToID , LoadLineNumber , UnloadReasonID , CreatedByUser) 
							values 
							( newid() , @Facility , @Warehouse , @LoadNo , @Order , @Line , @ItemID ,@ItemCode ,  @Qty , @Customer , @ConfirmDate , @OrderType , @Qty * @ItemGorssWeight  , 0 ,
							@Qty * @ItemNetWeight , @QtySelling , @ShipToID , @LoadLineNo , @UnloadedID , @User ) ; 
							set @NotConfirmed=0
							update cor.CustomerOrderLine set QuantityShipped=@Qty , LineState=30 where LineOrderNumber=@order and LineNumber=@line 
						end
						else
						begin
							update COR.CustomerOrderPromotion  set IsNotActive = 1 WHERE CustomerOrderNumber = @Order AND OrderLineNumber = @Line ; 
						end	
					end 
					set @I=@I+1 
					fetch next from f  into   @Line  ,@ItemID , @Qty , @UnloadedID
				end
				close f
				deallocate f

				if @NotConfirmed=0
				begin 
					select @WarehouseTransaction = WarehouseTransaction from cor.CustomerOrderType where OrderTypeID=@OrderType
					insert into COR.DeliveryNoteLine select * from cor.DeliveryNoteLineWF where OrderNumber=@Order and LoadNumber=@LoadNo 
					declare f cursor for select LoadLineNumber  ,OrderLineNumber ,  ItemID , ShipQuantityStocking  from cor.DeliveryNoteLine where OrderNumber=@Order and LoadNumber=@LoadNo order by OrderLineNumber
					open f
					fetch next from f  into @line ,@OrderLine ,  @ItemID , @Qty 
					while @@fetch_status =0
					begin
					
						exec inv.ItemTransactionSystemHistory
						@Operation ='N' ,
						@TransactionType= @warehouseTransaction  ,
						@TransactionDate =@ConfirmDate   ,
						@TransactionWarehouse = @Warehouse  ,
						@Line = @OrderLine  ,
						@ItemID = @ItemID  , 
						@LotNo ='' , 
						@TransactionQty = @Qty  ,
						@Note = '',
						@Customer =@customer   ,
						@Vendor = 0 ,
						@LoadNo  =@LoadNo ,
						@OrderType = @OrderType , 
						@ReleaseNo = 0 , 
						@Seq  =0 , 
						@TransactionNo =@Order   ,
						@FromWarehouse  ='' , 
						@User =@user  , 
						@Message=@Message  out
						update cor.CustomerOrderLine set QuantityShipped=@Qty , LineState =30 where LineOrderNumber =@order and LineNumber=@OrderLine
					
					
						fetch next from f  into @line ,@OrderLine ,  @ItemID , @Qty 
					end
					close f
					deallocate f
				  
					select  @Cnt1= count(*) from inv.TransactionHistory a left outer join cor.DeliveryNoteLine b on a.TransactionNo=b.OrderNumber and a.Line=b.OrderLineNumber 
					and a.ItemID=b.ItemID and a.TransactionQty=-1*b.ShipQuantityStocking
					where TransactionNo=@order and TransactionType=@warehouseTransaction and LoadNo=@LoadNo and b.OrderNumber is null

					select  * from inv.TransactionHistory a left outer join cor.DeliveryNoteLine b on a.TransactionNo=b.OrderNumber and a.Line=b.OrderLineNumber 
					and a.ItemID=b.ItemID and a.TransactionQty=-1*b.ShipQuantityStocking
					where TransactionNo=@order and TransactionType=@warehouseTransaction and LoadNo=@LoadNo and b.OrderNumber is null

					select @Cnt2 = count(*) from  inv.TransactionHistory where TransactionNo=@order and LoadNo=@LoadNo and TransactionType=@warehouseTransaction 
					select @Cnt3= count(*) from cor.DeliveryNoteLine where OrderNumber=@order and LoadNumber=@LoadNo
				 
					if @cnt1=0 and @Cnt2<>0 and @cnt2=@Cnt3 
					begin 
						select @TotalLines = count(*) , @TotalWight=sum(WeightShipped)  from cor.DeliveryNoteLine where OrderNumber=@Order and LoadNumber=@LoadNo
						insert into Cor.DeliveryNoteHeader (  Facility, Warehouse , LoadNumber , OrderNumber , Carrier , ShipDate , TotalLoadLines , CustomerNumber , ShipToID , ShipToAddress , TotalWeightShipped , CreatedByUser , CreatedDate ,
															WorkerShiftID , TruckID , DriverID , NolonOperationID, LoadingDockID ) 
						values (							@Facility , @warehouse , @LoadNo , @order , @Carrier , @ConfirmDate , @TotalLines , @customer ,  @ShipToId , @ShipToAddress , @TotalWight ,@user , getdate() ,
														@ShiftID , @TruckID , @DriverID , 0, @LoadingDockID )
					
				
						delete from inv.ItemAllocation where OrderNumber=@order
						delete from cor.DeliveryNoteLineWF where OrderNumber=@order
						update cor.BarcodeCustomerOrderHeader set BarcodeState=80 where OrderNo=@Order
						update cor.CustomerOrderHeader set OrderState=80 , OrderLoadingState=30, OrderChangedLocked=1  where OrderNumber=@order
						update cor.CustomerOrderLine set QuantityAllocated=0  where LineOrderNumber =@order 
						
						set @LoadinRequestNo=0 
						select @LoadinRequestNo= isnull( a.LoadingRequestNo , 0 )  from cor.LoadingRequestLine a left outer join COR.LoadingRequestHeader b  on a.LoadingRequestNo=b.LoadingRequestNo where OrderNo =@Order 
						update cor.DeliveryNoteHeader set LoadingRequestNo = @LoadinRequestNo where OrderNumber=@Order and LoadNumber=@LoadNo 
						update COR.LoadingRequestLine set LoadNo=@LoadNo where LoadingRequestNo=@LoadinRequestNo and OrderNo=@Order 
						
						IF @NeedINV = 1 
						begin 
							exec cor.CustomerProformaInvoiceOperation 'N' , @order , @loadNo , @ConfirmDate , @user , @message out 
						end 

						if @AllowBackOrder=1
						begin
							exec [COR].[CustomerOrderOperstion] 
							  @Operation ='BACK' , 
							  @User =@User  , 
							  @Order =@order , 
							  @Message =@message out 
						end 

					end
					else
					begin
						set @Message = 'Error Transactions' 
						set @State=1 
						update cor.CustomerOrderHeader set OrderState=60 , OrderLoadingState=20, OrderChangedLocked=1  where OrderNumber=@order
					
						update q set
						QuantityAllocated=isnull ( ( select a.QuantityAllocated  from inv.ItemAllocation a where  a.OrderNumber=q.LineOrderNumber and a.LineNumber=q.LineNumber and a.ItemID=q.ItemID )  , 0 ) ,
						LineState=20 , QuantityShipped=0 
						from  cor.CustomerOrderLine q  where LineOrderNumber =@order 
						delete from cor.DeliveryNoteHeader where OrderNumber=@order and LoadNumber=@LoadNo 
						delete from cor.DeliveryNoteLine where OrderNumber=@order and LoadNumber=@LoadNo
						delete from cor.UnloadQuanityOrderedHistory where OrderNumber=@order and LoadNumber=@LoadNo
						exec inv.TransactionReversOperation 'R' , @order , @warehouseTransaction , @Warehouse ,@LoadNo  , 0 
					end 
				end
			end
			end 
			else 
			begin
				set @Message= 'Barcode Reading is not finished ' 
				set @State=1 
			end 
		end
	end






   end
