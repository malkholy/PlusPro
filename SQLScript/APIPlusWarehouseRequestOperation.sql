USE [ERPMega25]
GO
/****** Object:  StoredProcedure [dbo].[APIPlusWarehouseRequestOperation]    Script Date: 7/24/2026 7:47:19 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER   PROCEDURE [dbo].[APIPlusWarehouseRequestOperation]
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

	as
	begin
	declare @Line int , @ItemId int , @Qty dec(18,5) , @ItemCode nvarchar(50),@LotNumber nvarchar(250) , @cnt int ,@Inuse int, @UserINUse nvarchar(150) , @OrderAllocated dec(18,5)
declare @Rowcount int , @I int , @Avaliable dec(18,5) , @Allocated dec(18,5) , @OnHand dec(18,5) , @NoAllocated int , @NoConfirm int , @RequestState int  , @lot nvarchar(max)
declare @warehouseTransaction nvarchar(5)  , @ConfirmDate date , @TransitWarehouse nvarchar(5) , @facility nvarchar(50) , @Allow int , @LotControl int ,
@RequestNo int =0 , @RequestDate date  , @RequestedWarehouse nvarchar(5)  , @ToWarehouse nvarchar(5) , @RequestType int , @Note nvarchar(max) = '' , @Warehouse nvarchar(50) 
	set @State=0
	set @Message=''

	if @Operation='Open' --open order
	begin 
		set @RequestNo= convert (int , @lineData ) 
		Select @Inuse=InUse, @UserINUse=InUseBy From INV.TransferRequestHeader Where RequestNo=@RequestNo
		if @Inuse=1
		begin
			Set @Message=Concat('Order In use by ',@UserINUse)
		end
		else 
		begin
			Update INV.TransferRequestHeader set InUse=1 , InUseBy=@User  where RequestNo=@RequestNo
		end
	end
	if @Operation='Close' -- close Order
	begin 
		set @RequestNo= convert (int , @lineData ) 
		Update INV.TransferRequestHeader set InUse=0 , InUseBy='' where RequestNo=@RequestNo
	end








	if @Operation='New Request'   ---New Request
	begin
		create table #TempReq (RowNo int ,  line int   , ItemID int, LotNumber nvarchar(250)  ,  Qty float  ,
			requestdate date , requestedwarehouse nvarchar(5) , towarehouse nvarchar(5) , requesttype int , note nvarchar(max) )
		insert into #TempReq (line, ItemID, LotNumber, Qty, requestdate, requestedwarehouse, towarehouse, requesttype, note)
		select * from openjson(@LineData)
		with (
			line               int             '$.line',
			ItemID             int             '$.itemid',
			LotNumber          nvarchar(250)   '$.lotnumber',
			Qty                float           '$.qty',
			requestdate        date            '$.requestdate',
			requestedwarehouse nvarchar(5)     '$.requestedwarehouse',
			towarehouse        nvarchar(5)     '$.towarehouse',
			requesttype        int             '$.requesttype',
			note               nvarchar(max)   '$.note'
		)

		select top 1 @RequestDate = requestdate, @RequestedWarehouse = requestedwarehouse, @ToWarehouse = towarehouse,
			@RequestType = requesttype, @Note = note from #TempReq

		exec GetSequenceNo 69 , @RequestNo out
		declare f cursor for  select line , ItemID, LotNumber , Qty  from #TempReq order by RowNo
		open f
		fetch next from f  into @Line , @ItemID, @LotNumber , @Qty
		while @@fetch_status =0
		begin
			select @ItemCode =  ItemCode from inv.ItemMaster where itemid=@ItemID
			insert into inv.TransferRequestLine ( RequestNo , Line ,ItemID , ItemCode , QuantityRequested,LotNumber , CreatedBy , CreatedDate )
			values ( @RequestNo , @Line , @ItemId , @ItemCode , @Qty, @LotNumber , @user , getdate() )

			fetch next from f  into @Line , @ItemID, @LotNumber , @Qty
		end
		close f
		deallocate f
		select @cnt=count(*) from inv.TransferRequestLine where RequestNo=@RequestNo
		if @cnt<>0
		begin
			insert into inv.TransferRequestHeader
			( RequestNo , RequestDate , RequestedWarehouse , ToWarehouse,RequestType,Note , TotalLines , CreatedBy , CreatedDate )
			values
			( @RequestNo , @RequestDate , @RequestedWarehouse , @ToWarehouse, @RequestType, @Note , @cnt , @user , getdate() )

			select @RequestNo as RequestNo, 0 as RequestState
		end
		else
		begin
			set @Message='Error Request '
		end
	end

if @Operation='Edit Request'   ---Edit Request
begin
	create table #EditReq (RowNo int , RequestNo int ,  line int   , ItemID int, LotNumber nvarchar(250) ,  Qty float ,
		requestdate date , requestedwarehouse nvarchar(5) , towarehouse nvarchar(5) , requesttype int , note nvarchar(max) )
	insert into #EditReq (RequestNo, line, ItemID, LotNumber, Qty, requestdate, requestedwarehouse, towarehouse, requesttype, note)
	select * from openjson(@LineData)
	with (
		RequestNo          int             '$.requestno',
		line               int             '$.line',
		ItemID             int             '$.itemid',
		LotNumber          nvarchar(250)   '$.lotnumber',
		Qty                float           '$.qty',
		requestdate        date            '$.requestdate',
		requestedwarehouse nvarchar(5)     '$.requestedwarehouse',
		towarehouse        nvarchar(5)     '$.towarehouse',
		requesttype        int             '$.requesttype',
		note               nvarchar(max)   '$.note'
	)

	select top 1 @RequestNo = RequestNo, @RequestDate = requestdate, @RequestedWarehouse = requestedwarehouse,
		@ToWarehouse = towarehouse, @RequestType = requesttype, @Note = note from #EditReq

	delete from INV.TransferRequestLine where RequestNo=@RequestNo
	declare f cursor for  select line , ItemID, LotNumber, Qty  from #EditReq order by RowNo
	open f
	fetch next from f  into @Line , @ItemID, @LotNumber , @Qty
	while @@fetch_status =0
	begin
		select @ItemCode =  ItemCode from inv.ItemMaster where itemid=@ItemID
		insert into inv.TransferRequestLine ( RequestNo , Line ,ItemID , ItemCode , QuantityRequested,LotNumber , CreatedBy , CreatedDate )
		values ( @RequestNo , @Line , @ItemId , @ItemCode , @Qty,@LotNumber , @user , getdate() )

		fetch next from f  into @Line , @ItemID, @LotNumber , @Qty
	end
	close f
	deallocate f
	Update INV.TransferRequestHeader set
		RequestDate = @RequestDate ,
		RequestedWarehouse = @RequestedWarehouse ,
		ToWarehouse = @ToWarehouse ,
		RequestType = @RequestType ,
		Note = @Note ,
		LastMaintBy=@User , LastMaintDate=GETDATE()
	where RequestNo=@RequestNo

	select @RequestState = RequestState from inv.TransferRequestHeader where RequestNo=@RequestNo
	select @RequestNo as RequestNo, @RequestState as RequestState
end

if @Operation='Delete Request'
begin
	set @RequestNo = convert(int, @LineData)

	select @RequestState =RequestState  from inv.TransferRequestHeader where RequestNo=@RequestNo
	if @RequestState=0
	begin
		Update INV.TransferRequestHeader set RequestState=99 , LastMaintBy=@User , LastMaintDate=GETDATE() where RequestNo=@RequestNo
	end
end


if @operation='Transfer Request'
begin
	 set @RequestNo=convert (int , @LineData )
		select @RequestState = RequestState, @RequestedWarehouse = RequestedWarehouse,
			@ToWarehouse = ToWarehouse, @RequestType = RequestType
		from inv.TransferRequestHeader where RequestNo=@RequestNo
		if @RequestState=0
		begin
			select @Cnt= count(*) from inv.TransferRequestUsersAuth where ( username =@User and Warehouse=@RequestedWarehouse )  or ( username =@User and AllWarehouse=1 )
			--select * from inv.TransferRequestUsersAuth where ( username =@User and Warehouse=@ToWarehouse )  or ( username =@User and AllWarehouse=1 )
			if @Cnt<>0
			begin

				set @NoConfirm=0
				create table #TempCon (RowNo int ,  line int   , ItemID int  ,lot  nvarchar(max) ,   QtyConfirmed float  )
				create table #TempWF (  line int   , ItemID int  , lot  nvarchar(max)  ,  QtyConfirmed float  )
				insert into #TempCon (RowNo, line, ItemID, lot, QtyConfirmed)
				select ROW_NUMBER() over (order by Line), Line, ItemID, isnull(LotNumber,''), QuantityRequested
				from INV.TransferRequestLine where RequestNo=@RequestNo
					select @facility =  WarehouseFacility  from inv.WarehouseMaster where Warehouse=@ToWarehouse
				declare xxx cursor for  select line , ItemID , lot ,  QtyConfirmed  from #TempCon where QtyConfirmed <>0  order by RowNo
				open xxx
				fetch next from xxx  into @Line , @ItemID ,@LotNumber ,  @Qty 
				while @@fetch_status =0
				begin
				---reset lot number according to lot control 
					select @LotControl= ISNULL( Lotcontrol,0) from inv.ItemMaster where ItemID=@ItemId 
					if @LotControl=0
					begin	
						set @LotNumber=''
					end
				--- end of lot modification
					exec inv.itemWarehouseAuthorizationCheck @ItemID , @facility , @ToWarehouse , @Allow out 
					SET @Allow=1 
					if @allow=1 
					begin
						select @ItemCode=ItemCode   from inv.ItemMaster where ItemID=@ItemID
						select @Cnt =  COUNT ( * )  from Inv.ItemBalance WHERE ItemID = @ItemID AND Warehouse = @RequestedWarehouse ; 
						IF @Cnt > 0 
						begin 
							select  @Avaliable = isnull ( ( Adjustment+Reciept+Issue ) , 0 )   from Inv.ItemBalance WHERE ItemID = @ItemID AND Warehouse = @RequestedWarehouse and ItemLot=@LotNumber
						end
						else
						begin
							set @Avaliable = 0 ; 
						end 
						select  @Allocated = isnull ( SUM ( QuantityAllocated ) , 0 )   from inv.ItemAllocation WHERE ItemID = @ItemID AND  Warehouse =@RequestedWarehouse and LotNumber=@LotNumber
						--select  @OrderAllocated=isnull ( SUM ( QuantityAllocated ) , 0 )   from inv.ItemAllocation WHERE ItemID = @ItemID AND Warehouse=@RequestedWarehouse  AND OrderNumber = @RequestNo AND LineNumber = @Line and AllocatdSource='R'
						set @OnHand = @Avaliable - @Allocated  
						PRINT @Onhand 
						IF @OnHand >= @Qty 
						begin 
				
							INSERT   #TempWF  (    line , ItemID ,lot ,   QtyConfirmed  ) 
							VALUES (   @Line ,  @ItemID ,@LotNumber ,  @Qty ) ; 
							--update INV.TransferRequestLine set QuanityTransfered = @Qty WHERE RequestNo = @RequestNo AND Line = @Line  
							set @Message = '' 
					
						end
						else
						begin
							set @Message = 'No Enough Qty '  ; 
							set @state=1
				
							update INV.TransferRequestLine set QuanityTransfered = 0   WHERE RequestNo = @RequestNo
							set @NoConfirm=1
							break 
						end
					end
					else
					begin
						set @Message = 'Item not allowed to Transfer To  ' + @ToWarehouse  ; 
						set @State=1
				
							update INV.TransferRequestLine set QuanityTransfered = 0   WHERE RequestNo = @RequestNo
							set @NoConfirm=1
							break 
					end 
						
					fetch next from xxx  into @Line , @ItemID ,@LotNumber ,  @Qty	
				end 
				close xxx
				deallocate xxx
				print @NoConfirm 
				if @NoConfirm=0 
				begin
			
					if @note=''
					begin 
						set @Note='R' 
					end 
					update INV.TransferRequestLine set QuanityTransfered = 0   WHERE RequestNo = @RequestNo
					set @ConfirmDate=getdate() 
					select @warehouseTransaction= TransactionType ,@TransitWarehouse = TransitWarehouse   from inv.TransferRequestType where RequestType=@RequestType
					print '@warehouseTransaction'
					print @warehouseTransaction

					declare zz cursor for  select line , ItemID ,lot ,  QtyConfirmed  from #TempWF
					open zz
					fetch next from zz  into @Line , @ItemID ,@LotNumber ,  @Qty 
					while @@fetch_status =0
					begin
				
						--exec inv.ItemTransactionSystemHistory 'N' , @WarehouseTransaction , @ConfirmDate , @RequestedWarehouse , @line ,@ItemID , '' , @Qty , '' , 0, 0 ,0  , @RequestType , @ToWarehouse , 0 , @RequestNo ,@user , @Message out 
						exec INV.ItemTransactionSystemHistory
						@Operation='N' , 
						@TransactionType =@WarehouseTransaction ,
						@TransactionDate =@ConfirmDate  ,
						@TransactionWarehouse = @TransitWarehouse  ,
						@Line =@line  ,
						@ItemID= @ItemID  , 
						@LotNo=@LotNumber , 
						@TransactionQty=@Qty  ,
						@Note = '',
						@Customer = 0  ,
						@Vendor  = 0 ,
						@LoadNo  =0 ,
						@OrderType =@RequestType, 
						@ReleaseNo = 0 , 
						@Seq  =0 , 
						@TransactionNo  =@RequestNo   ,
						@FromWarehouse=@RequestedWarehouse , 
						@User =@user  , 
						@Message =@Message  out

						update INV.TransferRequestLine set QuanityTransfered = @Qty   WHERE RequestNo = @RequestNo and Line=@line 
					
						fetch next from zz  into  @Line , @ItemID ,@LotNumber ,  @Qty 

					end 
					close zz
					deallocate zz
					update INV.TransferRequestHeader set RequestState=10 where RequestNo=@RequestNo

					select @RequestNo as RequestNo, 10 as RequestState
				end
			end
			else
			begin 
				set @Message ='You are not Authorized to Recieve Request '
				set @state=1 
			end 
			
			
		end 
		else
		begin
			set @Message='State is not correct '
			set @State=1
		end 
	
	end

if @operation='Recieve Request'  ----Recieved   
	begin
		set @RequestNo=convert (int , @LineData )
		select @RequestState = RequestState, @RequestedWarehouse = RequestedWarehouse,
			@ToWarehouse = ToWarehouse, @RequestType = RequestType
		from inv.TransferRequestHeader where RequestNo=@RequestNo
		if @RequestState=10
		begin	
			select @Cnt= count(*) from inv.TransferRequestUsersAuth where ( username =@User and Warehouse=@ToWarehouse )  or ( username =@User and AllWarehouse=1 ) 
			--select * from inv.TransferRequestUsersAuth where ( username =@User and Warehouse=@ToWarehouse )  or ( username =@User and AllWarehouse=1 ) 
			if @Cnt<>0 
			begin
				select @warehouseTransaction= TransactionType ,@TransitWarehouse = TransitWarehouse   from inv.TransferRequestType where RequestType=@RequestType
				set @NoConfirm=0 
				--create table #TempRe (RowNo int ,  line int   , ItemID int  ,  QtyConfirmed float  )   
				create table #TempRec (  line int   , ItemID int  ,lot nvarchar(50) ,   QtyConfirmed float  )   
				--insert into #TempCon exec DataLineV1  @LineData 
				--select * from #TempCon
				declare xxx cursor for  select line , ItemID , LotNumber ,       QuanityTransfered  from inv.TransferRequestLine where RequestNo=@RequestNo 
				open xxx
				fetch next from xxx  into @Line , @ItemID ,@lot ,  @Qty 
				while @@fetch_status =0
				begin
					select @ItemCode=ItemCode,@LotControl = LotControl   from inv.ItemMaster where ItemID=@ItemID
					select @Cnt =  COUNT ( * )  from Inv.ItemBalance WHERE ItemID = @ItemID AND Warehouse =@TransitWarehouse; 
					if (@LotControl = 0 )
					begin
						set @lot = ''
					end
					IF @Cnt > 0 
					begin 
						select  @Avaliable = isnull ( ( Adjustment+Reciept+Issue ) , 0 )   from Inv.ItemBalance WHERE ItemID = @ItemID AND Warehouse = @TransitWarehouse and ItemLot=@lot
					end
					else
					begin
						set @Avaliable = 0 ; 
					end 
					select  @Allocated = isnull ( SUM ( QuantityAllocated ) , 0 )   from inv.ItemAllocation WHERE ItemID = @ItemID AND  Warehouse =@TransitWarehouse
					--select  @OrderAllocated=isnull ( SUM ( QuantityAllocated ) , 0 )   from inv.ItemAllocation WHERE ItemID = @ItemID AND Warehouse=@RequestedWarehouse  AND OrderNumber = @RequestNo AND LineNumber = @Line and AllocatdSource='R'
					set @OnHand = @Avaliable - @Allocated  
					PRINT @Onhand 
					IF @OnHand >= @Qty 
					begin 
				
						INSERT   #TempReC  (    line , ItemID ,lot ,  QtyConfirmed  ) 
						VALUES (   @Line ,  @ItemID ,@lot ,  @Qty ) ; 
						--update INV.TransferRequestLine set QuanityTransfered = @Qty WHERE RequestNo = @RequestNo AND Line = @Line  
						set @Message = '' 
					
					end
					else
					begin
						set @Message = 'No Enough Qty ' + 'Line =  ' + convert ( nvarchar , @Line)  ; 
						--delete from inv.WarehouseRequestWF WHERE RequestNo = @RequestNo 
						--update INV.TransferRequestLine set QuanityTransfered = 0   WHERE RequestNo = @RequestNo
						set @NoConfirm=1
						set @State=1
						break 
					end
					fetch next from xxx  into @Line , @ItemID ,@lot ,  @Qty 
				end 
				close xxx
				deallocate xxx
				print @NoConfirm 
				if @NoConfirm=0 
				begin
			
			
			
					set @ConfirmDate=getdate() 
					select @warehouseTransaction= TransactionType ,@TransitWarehouse = TransitWarehouse   from inv.TransferRequestType where RequestType=@RequestType
					declare zz cursor for  select line , ItemID ,lot ,  QtyConfirmed  from  #TempReC
					open zz
					fetch next from zz  into @Line , @ItemID ,@lot,  @Qty 
					while @@fetch_status =0
					begin
				
						--exec inv.ItemTransactionSystemHistory 'N' , @WarehouseTransaction , @ConfirmDate , @RequestedWarehouse , @line ,@ItemID , '' , @Qty , '' , 0, 0 ,0  , @RequestType , @ToWarehouse , 0 , @RequestNo ,@user , @Message out 
						exec INV.ItemTransactionSystemHistory
						@Operation='N' , 
						@TransactionType =@WarehouseTransaction ,
						@TransactionDate =@ConfirmDate  ,
						@TransactionWarehouse = @ToWarehouse   ,
						@Line =@line  ,
						@ItemID= @ItemID  , 
						@LotNo=@lot  , 
						@TransactionQty=@Qty  ,
						@Note = '',
						@Customer = 0  ,
						@Vendor  = 0 ,
						@LoadNo  =0 ,
						@OrderType =@RequestType, 
						@ReleaseNo = 0 , 
						@Seq  =0 , 
						@TransactionNo  =@RequestNo   ,
						@FromWarehouse=@TransitWarehouse , 
						@User =@user  , 
						@Message =@Message  out

						update INV.TransferRequestLine set QuantityRecieved = @Qty   WHERE RequestNo = @RequestNo and Line=@line 
						fetch next from zz  into @Line , @ItemID ,@lot,  @Qty 

					end 
					close zz
					deallocate zz
					update INV.TransferRequestHeader set RequestState=20, ReceivedBy=@User,ReceivedDate=GETDATE() where RequestNo=@RequestNo
					update inv.TransactionHistory set FromWarehouse ='' where TransactionNo=@RequestNo  and TransactionType=@WarehouseTransaction  
					update inv.TransactionHistory set FromWarehouse =@RequestedWarehouse where TransactionNo=@RequestNo  and TransactionType=@WarehouseTransaction and TransactionQty>0 
					delete from inv.TransactionHistory where TransactionNo=@RequestNo  and TransactionType=@WarehouseTransaction and TransactionWarehouse=@TransitWarehouse
			
				end 
			end
			else
			begin
				set @Message ='You are not Authorized to Recieve Request '
				set @state=1
			end 
		end
		else
		begin
			set @Message='State is not Correct ' 
			set @State=1
		end 
	end 





if @operation='On Hand'
	begin
		create table #TempOn ( ItemID int, LotNumber nvarchar(250)  ,warehouse nvarchar(50) )
		insert into #TempOn ( ItemID, LotNumber,  warehouse )
		select * from openjson(@LineData)
		with (

			ItemID             int             '$.itemid',
			LotNumber          nvarchar(250)   '$.lotnumber',


			Warehouse nvarchar(5)     '$.warehouse'
			)


		select top 1 @ItemId = ItemID, @warehouse=warehouse , @LotNumber=LotNumber  from #TempOn
		select ItemBalance as Onhand from inv.ItemBalance where ItemID=@ItemId and Warehouse=@warehouse and ItemLot=isnull ( @LotNumber , '' ) 
	end
end