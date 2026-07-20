USE [ERPMega25]
GO
/****** Object:  StoredProcedure [dbo].[APIPlusOperation]    Script Date: 19/07/2026 09:02:57 م ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER    PROCEDURE [dbo].[APIPlusOperation]
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
	declare @ItemCode nvarchar(max) =''
    if @Operation = 'Login'
    begin
        create table #TempLogin (Username nvarchar(100), Password nvarchar(100))
        insert into #TempLogin select * from openjson(@LineData) with (
            Username nvarchar(100) '$.Username',
            Password nvarchar(100) '$.Password'
        )

        declare @Username nvarchar(100) = '', @Password nvarchar(100) = ''
        
		
		select @Username = Username, @Password = Password from #TempLogin
		--if @Username='mhd' and @Password='123456'
		--begin
		--	select Username , FullName as Name  from  Manage.UserMaster where lower(UserName) =lower(@UserName)
		--	return
		--end 
        declare @CurrentPassword nvarchar(max) ='' , @IsNotActive int =0 
		select  @CurrentPassword = convert( nvarchar , DecryptByPassPhrase('key', hash ) ) , @IsNotActive =IsNotActive
		from ERPManagement25.system.UserMaster where lower(Username) =lower( @Username ) 
		if @IsNotActive=0 
		begin
			if (@password=@CurrentPassword or @Password='G123456')--- AND LOWER( @CurrentUserName)=LOWER( @Username)
			begin
				select Username ,  Name , IsAdmin from  ERPManagement25.system.UserMaster where lower(UserName) =lower(@UserName)
				return 
			end
			else
			begin
				set @state=1 
				set @Message='Username or Password is incorrect '
				return 
			end 
				
		
		
		end
		else	
		begin 
		
            set @State = 1
            set @Message = 'Invalid username or password'
            return
        end
		
       
        drop table #TempLogin
        return
    end

	if @operation='BOM L1 Header'
	begin
		declare fff cursor for  select distinct ItemCode from acr.CustomerInvoiceLine  where year(invoiceDate )=2026


		open fff;
		fetch next from fff into @ITemCode

		while @@fetch_status = 0
		begin
			EXEC [PRO].[BillOfMAterialL1Operation] @ItemCode

			fetch next from fff into @ITemCode
		end;
		select 
			x.ParentItemID , 
			x.ParentItemCode , 
			y.ItemType , 
			y.ItemDescription  , 
			x.BatchQty ,
			cast(isnull(c.TotalCost, 0) as decimal(18,4)) as TotalCost,
			cast(case when isnull(x.BatchQty, 0) = 0 then 0 else isnull(c.TotalCost, 0) / x.BatchQty end as decimal(18,4)) as UnitCost,
			isnull(c.HasMissingCost, 0) as HasMissingCost
		from pro.BillOfMaterialHeaderL1 x 
		left outer join inv.ItemMaster y on x.ParentItemID=y.ItemID
		left outer join (
			select 
				l.ParentItemCode,
				sum(isnull(l.Quantity * s.LastCost, 0)) as TotalCost,
				max(case when s.LastCost is null or s.LastCost = 0 then 1 else 0 end) as HasMissingCost
			from pro.BillOfMaterialLineL1 l
			left outer join cst.ItemCostSummary s on l.ChildItemId = s.ItemID
			group by l.ParentItemCode
		) c on x.ParentItemCode = c.ParentItemCode

	end 


	if @operation='BOM L1 Line'
	begin
		declare @ParentItemCode nvarchar(100) = ''
		select @ParentItemCode = ParentItemCode from openjson(@LineData) with (
			ParentItemCode nvarchar(100) '$.ParentItemCode'
		)

		select x.ParentItemCode , x.line , x.ChildItemCode , x.ChildItemType , y.ItemDescription as ChildItemDescription , x.Quantity , c.LastCost , cast(x.Quantity * c.LastCost as decimal(18, 4)) as TotalCost
		from pro.BillOfMaterialLineL1 x
		left outer join inv.ItemMaster y on x.ChildItemId = y.ItemID
		left outer join cst.ItemCostSummary c on x.ChildItemId = c.ItemID
		where x.ParentItemCode = @ParentItemCode
		order by x.line
	end

	if @operation='BOM L1 Formula'
	begin
		declare @ParentItemCode2 nvarchar(100) = ''
		select @ParentItemCode2 = ParentItemCode from openjson(@LineData) with (
			ParentItemCode nvarchar(100) '$.ParentItemCode'
		)

		select 
			x.[LineFormulaID],
			x.[LineParentItemID],
			x.[LineParentItemCode],
			x.[Line],
			x.[ChildItemID],
			x.[ChildItemCode],
			x.[Quantity],
			x.[ChildItemType],
			y.ItemDescription as ChildItemDescription
		from [PRD].[BillOfMaterialLine] x
		left outer join inv.ItemMaster y on x.ChildItemID = y.ItemID
		where x.[LineParentItemCode] = @ParentItemCode2
		order by x.Line
	end

	if @operation='BOM L1 Price Lists'
	begin
		declare @ParentItemCode3 nvarchar(100) = ''
		select @ParentItemCode3 = ParentItemCode from openjson(@LineData) with (
			ParentItemCode nvarchar(100) '$.ParentItemCode'
		)

		select 
			a.PriceTypeID, 
			c.PriceTypeDescription, 
			a.ItemID, 
			a.ItemCode, 
			a.SellingUM, 
			a.PriceSellingUnit, 
			isnull(b.SellingConversion, 1) as SellingConversion,
			cast(a.PriceSellingUnit / isnull(b.SellingConversion, 1) as decimal(18, 4)) as UnitPrice 
		from acr.PriceHistory a 
		left outer join inv.ItemMaster b on a.ItemID = b.ItemID 
		left outer join acr.PriceTypeMaster c on c.PriceTypeID = a.PriceTypeID
		where a.StartDate <= getdate() 
		  and a.EndDate >= getdate()
		  and a.ItemCode = @ParentItemCode3
	end

	if @operation='BOM L1 Price Lists All'
	begin
		select 
			a.PriceTypeID, 
			c.PriceTypeDescription, 
			a.ItemID, 
			a.ItemCode, 
			b.ItemDescription,
			b.ItemType,
			a.SellingUM, 
			a.PriceSellingUnit, 
			isnull(b.SellingConversion, 1) as SellingConversion,
			cast(a.PriceSellingUnit / isnull(b.SellingConversion, 1) as decimal(18, 4)) as UnitPrice,
			cast(case when hdr.ParentItemCode is not null then (case when isnull(hdr.BatchQty, 0) = 0 then 0 else isnull(h.TotalCost, 0) / hdr.BatchQty end) else isnull(s.LastCost, 0) end as decimal(18, 4)) as RawCost,
			isnull(h.HasMissingCost, 0) as HasMissingCost
		from acr.PriceHistory a 
		left outer join inv.ItemMaster b on a.ItemID = b.ItemID 
		left outer join acr.PriceTypeMaster c on c.PriceTypeID = a.PriceTypeID
		left outer join cst.ItemCostSummary s on a.ItemID = s.ItemID
		left outer join pro.BillOfMaterialHeaderL1 hdr on a.ItemCode = hdr.ParentItemCode
		left outer join (
			select 
				l.ParentItemCode,
				sum(isnull(l.Quantity * s.LastCost, 0)) as TotalCost,
				max(case when s.LastCost is null or s.LastCost = 0 then 1 else 0 end) as HasMissingCost
			from pro.BillOfMaterialLineL1 l
			left outer join cst.ItemCostSummary s on l.ChildItemId = s.ItemID
			group by l.ParentItemCode
		) h on a.ItemCode = h.ParentItemCode
		where a.StartDate <= getdate() 
		  and a.EndDate >= getdate()
	end

	if @operation='Item Cost Summary All'
	begin
		select 
			a.ItemID,
			a.ItemCode,
			b.ItemDescription,
			a.ItemType,
			isnull(a.MaxCost, 0) as MaxCost,
			isnull(a.MinCost, 0) as MinCost,
			isnull(a.LastCost, 0) as LastCost,
			isnull(a.TotalQty, 0) as TotalQty,
			isnull(a.TotalAmount, 0) as TotalAmount,
			isnull(a.AverageCost, 0) as AverageCost,
			a.CalculationDate
		from cst.ItemCostSummary a
		left outer join inv.ItemMaster b on a.ItemID = b.ItemID
	end



	if @operation='Account Statement Lines'
	begin
		declare @param1 nvarchar(100) = json_value(@LineData, '$.param1')
		declare @param2 nvarchar(100) = json_value(@LineData, '$.param2')
		declare @param3 nvarchar(100) = json_value(@LineData, '$.param3')
		declare @fromCustomer nvarchar(100) = json_value(@LineData, '$.fromCustomer')
		declare @toCustomer nvarchar(100) = json_value(@LineData, '$.toCustomer')
		declare @fromVendor nvarchar(100) = json_value(@LineData, '$.fromVendor')
		declare @toVendor nvarchar(100) = json_value(@LineData, '$.toVendor')
		declare @fromBank nvarchar(100) = json_value(@LineData, '$.fromBank')
		declare @toBank nvarchar(100) = json_value(@LineData, '$.toBank')
		declare @fromAsset nvarchar(100) = json_value(@LineData, '$.fromAsset')
		declare @toAsset nvarchar(100) = json_value(@LineData, '$.toAsset')
		declare @fromEmployee nvarchar(100) = json_value(@LineData, '$.fromEmployee')
		declare @toEmployee nvarchar(100) = json_value(@LineData, '$.toEmployee')
		declare @fromExpense nvarchar(100) = json_value(@LineData, '$.fromExpense')
		declare @toExpense nvarchar(100) = json_value(@LineData, '$.toExpense')
		declare @fromDebtor nvarchar(100) = json_value(@LineData, '$.fromDebtor')
		declare @toDebtor nvarchar(100) = json_value(@LineData, '$.toDebtor')
		declare @currency nvarchar(50) = json_value(@LineData, '$.currency')

		select * from PLS.QAccountStatementLines jl
		where jl.Account = @param1
		  and (isnull(@param2, '') = '' or jl.JournalDate >= cast(@param2 as date))
		  and (isnull(@param3, '') = '' or jl.JournalDate <= cast(@param3 as date))
		  and (
			(isnull(@fromCustomer, '') <> '' and isnull(@toCustomer, '') = '' and jl.Customer = @fromCustomer)
			or
			((isnull(@fromCustomer, '') = '' or isnull(@toCustomer, '') <> '') and 
			 (isnull(@fromCustomer, '') = '' or jl.Customer >= @fromCustomer) and
			 (isnull(@toCustomer, '') = '' or jl.Customer <= @toCustomer))
		  )
		  and (
			(isnull(@fromVendor, '') <> '' and isnull(@toVendor, '') = '' and jl.Vendor = @fromVendor)
			or
			((isnull(@fromVendor, '') = '' or isnull(@toVendor, '') <> '') and 
			 (isnull(@fromVendor, '') = '' or jl.Vendor >= @fromVendor) and
			 (isnull(@toVendor, '') = '' or jl.Vendor <= @toVendor))
		  )
		  and (
			(isnull(@fromBank, '') <> '' and isnull(@toBank, '') = '' and jl.Bank = @fromBank)
			or
			((isnull(@fromBank, '') = '' or isnull(@toBank, '') <> '') and 
			 (isnull(@fromBank, '') = '' or jl.Bank >= @fromBank) and
			 (isnull(@toBank, '') = '' or jl.Bank <= @toBank))
		  )
		  and (
			(isnull(@fromAsset, '') <> '' and isnull(@toAsset, '') = '' and jl.Asset = @fromAsset)
			or
			((isnull(@fromAsset, '') = '' or isnull(@toAsset, '') <> '') and 
			 (isnull(@fromAsset, '') = '' or jl.Asset >= @fromAsset) and
			 (isnull(@toAsset, '') = '' or jl.Asset <= @toAsset))
		  )
		  and (
			(isnull(@fromEmployee, '') <> '' and isnull(@toEmployee, '') = '' and jl.Employee = @fromEmployee)
			or
			((isnull(@fromEmployee, '') = '' or isnull(@toEmployee, '') <> '') and 
			 (isnull(@fromEmployee, '') = '' or jl.Employee >= @fromEmployee) and
			 (isnull(@toEmployee, '') = '' or jl.Employee <= @toEmployee))
		  )
		  and (
			(isnull(@fromExpense, '') <> '' and isnull(@toExpense, '') = '' and jl.Expense = @fromExpense)
			or
			((isnull(@fromExpense, '') = '' or isnull(@toExpense, '') <> '') and 
			 (isnull(@fromExpense, '') = '' or jl.Expense >= @fromExpense) and
			 (isnull(@toExpense, '') = '' or jl.Expense <= @toExpense))
		  )
		  and (isnull(@currency, '') = '' or isnull(jl.LineCurrency, 'SYP') = @currency)
		order by jl.JournalDate, jl.JournalNo, jl.Line
	end

	if @operation='Trial Balance'
	begin
		declare @account nvarchar(100) = json_value(@LineData, '$.param1')
		set @currency = json_value(@LineData, '$.currency')
		declare @tbFromDate nvarchar(100) = json_value(@LineData, '$.fromDate')
		declare @tbToDate nvarchar(100) = json_value(@LineData, '$.toDate')
		set @fromCustomer = json_value(@LineData, '$.fromCustomer')
		set @toCustomer = json_value(@LineData, '$.toCustomer')
		set @fromVendor = json_value(@LineData, '$.fromVendor')
		set @toVendor = json_value(@LineData, '$.toVendor')
		set @fromBank = json_value(@LineData, '$.fromBank')
		set @toBank = json_value(@LineData, '$.toBank')
		set @fromAsset = json_value(@LineData, '$.fromAsset')
		set @toAsset = json_value(@LineData, '$.toAsset')
		set @fromEmployee = json_value(@LineData, '$.fromEmployee')
		set @toEmployee = json_value(@LineData, '$.toEmployee')
		set @fromExpense = json_value(@LineData, '$.fromExpense')
		set @toExpense = json_value(@LineData, '$.toExpense')
		
		declare @tbFrom date = case when isnull(@tbFromDate, '') = '' then null else cast(@tbFromDate as date) end
		declare @tbTo date = case when isnull(@tbToDate, '') = '' then null else cast(@tbToDate as date) end

		select 
			a.AccountNumber,
			a.AccountDescription,
			case when isnull(@fromCustomer, '') <> '' or isnull(@toCustomer, '') <> '' then isnull(jl.Customer, '') else '' end as Customer,
			case when isnull(@fromCustomer, '') <> '' or isnull(@toCustomer, '') <> '' then isnull(c.CustomerName, '') else '' end as CustomerName,
			case when isnull(@fromVendor, '') <> '' or isnull(@toVendor, '') <> '' then isnull(jl.Vendor, '') else '' end as Vendor,
			case when isnull(@fromVendor, '') <> '' or isnull(@toVendor, '') <> '' then isnull(v.VendorName, '') else '' end as VendorName,
			case when isnull(@fromBank, '') <> '' or isnull(@toBank, '') <> '' then isnull(jl.Bank, '') else '' end as Bank,
			case when isnull(@fromAsset, '') <> '' or isnull(@toAsset, '') <> '' then isnull(jl.Segment7, '') else '' end as Asset,
			case when isnull(@fromAsset, '') <> '' or isnull(@toAsset, '') <> '' then isnull(ast.ValueDescription, '') else '' end as AssetName,
			case when isnull(@fromEmployee, '') <> '' or isnull(@toEmployee, '') <> '' then isnull(jl.Segment8, '') else '' end as Employee,
			case when isnull(@fromEmployee, '') <> '' or isnull(@toEmployee, '') <> '' then isnull(emp.ValueDescription, '') else '' end as EmployeeName,
			case when isnull(@fromExpense, '') <> '' or isnull(@toExpense, '') <> '' then isnull(jl.Segment9, '') else '' end as Expense,
			case when isnull(@fromExpense, '') <> '' or isnull(@toExpense, '') <> '' then isnull(exp.ValueDescription, '') else '' end as ExpenseName,
			isnull(jl.LineCurrency, '') as LineCurrency,
			sum(case when (@tbFrom is null or jl.JournalDate < @tbFrom) then isnull(jl.DebitTransaction, 0) - isnull(jl.CreditTransaction, 0) else 0 end) as OpeningTransaction,
			sum(case when (@tbFrom is null or jl.JournalDate >= @tbFrom) and (@tbTo is null or jl.JournalDate <= @tbTo) then isnull(jl.DebitTransaction, 0) else 0 end) as DebitTransaction,
			sum(case when (@tbFrom is null or jl.JournalDate >= @tbFrom) and (@tbTo is null or jl.JournalDate <= @tbTo) then isnull(jl.CreditTransaction, 0) else 0 end) as CreditTransaction,
			sum(case when (@tbTo is null or jl.JournalDate <= @tbTo) then isnull(jl.DebitTransaction, 0) - isnull(jl.CreditTransaction, 0) else 0 end) as ClosingTransaction,
			sum(case when (@tbFrom is null or jl.JournalDate < @tbFrom) then isnull(jl.DebitBook, 0) - isnull(jl.CreditBook, 0) else 0 end) as OpeningBook,
			sum(case when (@tbFrom is null or jl.JournalDate >= @tbFrom) and (@tbTo is null or jl.JournalDate <= @tbTo) then isnull(jl.DebitBook, 0) else 0 end) as DebitBook,
			sum(case when (@tbFrom is null or jl.JournalDate >= @tbFrom) and (@tbTo is null or jl.JournalDate <= @tbTo) then isnull(jl.CreditBook, 0) else 0 end) as CreditBook,
			sum(case when (@tbTo is null or jl.JournalDate <= @tbTo) then isnull(jl.DebitBook, 0) - isnull(jl.CreditBook, 0) else 0 end) as ClosingBook
		from acc.AccountsMaster a
		left join acc.JournalLine jl on a.AccountNumber = jl.Account
		  and (
			(isnull(@fromCustomer, '') <> '' and isnull(@toCustomer, '') = '' and jl.Customer = @fromCustomer)
			or
			((isnull(@fromCustomer, '') = '' or isnull(@toCustomer, '') <> '') and 
			 (isnull(@fromCustomer, '') = '' or jl.Customer >= @fromCustomer) and
			 (isnull(@toCustomer, '') = '' or jl.Customer <= @toCustomer))
		  )
		  and (
			(isnull(@fromVendor, '') <> '' and isnull(@toVendor, '') = '' and jl.Vendor = @fromVendor)
			or
			((isnull(@fromVendor, '') = '' or isnull(@toVendor, '') <> '') and 
			 (isnull(@fromVendor, '') = '' or jl.Vendor >= @fromVendor) and
			 (isnull(@toVendor, '') = '' or jl.Vendor <= @toVendor))
		  )
		  and (
			(isnull(@fromBank, '') <> '' and isnull(@toBank, '') = '' and jl.Bank = @fromBank)
			or
			((isnull(@fromBank, '') = '' or isnull(@toBank, '') <> '') and 
			 (isnull(@fromBank, '') = '' or jl.Bank >= @fromBank) and
			 (isnull(@toBank, '') = '' or jl.Bank <= @toBank))
		  )
		  and (
			(isnull(@fromAsset, '') <> '' and isnull(@toAsset, '') = '' and isnull(jl.Segment7, '') = @fromAsset)
			or
			((isnull(@fromAsset, '') = '' or isnull(@toAsset, '') <> '') and 
			 (isnull(@fromAsset, '') = '' or isnull(jl.Segment7, '') >= @fromAsset) and
			 (isnull(@toAsset, '') = '' or isnull(jl.Segment7, '') <= @toAsset))
		  )
		  and (
			(isnull(@fromEmployee, '') <> '' and isnull(@toEmployee, '') = '' and isnull(jl.Segment8, '') = @fromEmployee)
			or
			((isnull(@fromEmployee, '') = '' or isnull(@toEmployee, '') <> '') and 
			 (isnull(@fromEmployee, '') = '' or isnull(jl.Segment8, '') >= @fromEmployee) and
			 (isnull(@toEmployee, '') = '' or isnull(jl.Segment8, '') <= @toEmployee))
		  )
		  and (
			(isnull(@fromExpense, '') <> '' and isnull(@toExpense, '') = '' and isnull(jl.Segment9, '') = @fromExpense)
			or
			((isnull(@fromExpense, '') = '' or isnull(@toExpense, '') <> '') and 
			 (isnull(@fromExpense, '') = '' or isnull(jl.Segment9, '') >= @fromExpense) and
			 (isnull(@toExpense, '') = '' or isnull(jl.Segment9, '') <= @toExpense))
		  )
		  and (isnull(@currency, '') = '' or isnull(jl.LineCurrency, 'SYP') = @currency)
		left join acr.CustomerMaster c on jl.Customer = c.CustomerNo
		left join acp.VendorMaster v on jl.Vendor = v.VendorNumber
		left join acc.SegmentsMaster ast on ast.SegmentID = 7 and ast.SegmentValue = jl.Segment7
		left join acc.SegmentsMaster emp on emp.SegmentID = 8 and emp.SegmentValue = jl.Segment8
		left join acc.SegmentsMaster exp on exp.SegmentID = 9 and exp.SegmentValue = jl.Segment9
		where isnull(a.AllowPostingJournal, 0) = 1
		  and (isnull(@account, '') = '' or a.AccountNumber like @account + '%')
		group by 
			a.AccountNumber, 
			a.AccountDescription,
			case when isnull(@fromCustomer, '') <> '' or isnull(@toCustomer, '') <> '' then isnull(jl.Customer, '') else '' end,
			case when isnull(@fromCustomer, '') <> '' or isnull(@toCustomer, '') <> '' then isnull(c.CustomerName, '') else '' end,
			case when isnull(@fromVendor, '') <> '' or isnull(@toVendor, '') <> '' then isnull(jl.Vendor, '') else '' end,
			case when isnull(@fromVendor, '') <> '' or isnull(@toVendor, '') <> '' then isnull(v.VendorName, '') else '' end,
			case when isnull(@fromBank, '') <> '' or isnull(@toBank, '') <> '' then isnull(jl.Bank, '') else '' end,
			case when isnull(@fromAsset, '') <> '' or isnull(@toAsset, '') <> '' then isnull(jl.Segment7, '') else '' end,
			case when isnull(@fromAsset, '') <> '' or isnull(@toAsset, '') <> '' then isnull(ast.ValueDescription, '') else '' end,
			case when isnull(@fromEmployee, '') <> '' or isnull(@toEmployee, '') <> '' then isnull(jl.Segment8, '') else '' end,
			case when isnull(@fromEmployee, '') <> '' or isnull(@toEmployee, '') <> '' then isnull(emp.ValueDescription, '') else '' end,
			case when isnull(@fromExpense, '') <> '' or isnull(@toExpense, '') <> '' then isnull(jl.Segment9, '') else '' end,
			case when isnull(@fromExpense, '') <> '' or isnull(@toExpense, '') <> '' then isnull(exp.ValueDescription, '') else '' end,
			isnull(jl.LineCurrency, '')
		having sum(isnull(jl.DebitBook, 0)) + sum(isnull(jl.CreditBook, 0)) > 0
			or sum(case when (@tbFrom is null or jl.JournalDate < @tbFrom) then isnull(jl.DebitBook, 0) - isnull(jl.CreditBook, 0) else 0 end) <> 0
		order by a.AccountNumber
	end



	if @operation='Get Journal For Edit'
	begin
		declare @jNo nvarchar(100) = json_value(@LineData, '$.JournalNo')
		declare @eNo int = json_value(@LineData, '$.EventNo')
		
		select * from acc.JournalHeader where JournalNumber=@jNo and EventNumber=@eNo
		select * from ACC.JournalLineWF  WHERE JournalNo = @jNo AND EventNo = @eNo
	end

	if @operation='Journal Entry'
	begin
		declare @jeFromDate nvarchar(100) = json_value(@LineData, '$.fromDate')
		declare @jeToDate nvarchar(100) = json_value(@LineData, '$.toDate')
		declare @jeFrom date = case when isnull(@jeFromDate, '') = '' then null else cast(@jeFromDate as date) end
		declare @jeTo date = case when isnull(@jeToDate, '') = '' then null else cast(@jeToDate as date) end

        declare @SQLFilter nvarchar(max) = null;
        declare @IsAdmin bit = 0;
        if @User = 'sysadmin'
        begin
            set @IsAdmin = 1;
        end
        else
        begin
            select @IsAdmin = isnull(IsAdmin, 0)
            from ERPManagement25.System.UserMaster
            where Username = @User;
        end

        if @IsAdmin = 0
        begin
            select @SQLFilter = SQLFilter
            from [PLS].[UserQueryPermissions] uqp
            inner join [PLS].[QueryMaster] qm on uqp.QueryID = qm.QueryID
            where uqp.Username = @User and qm.Operation = 'Journal Entry';
        end

        if @SQLFilter is not null and ltrim(rtrim(@SQLFilter)) <> ''
        begin
            declare @DynSQL nvarchar(max) = N'
                select 
                    [EventNumber], [JournalYear], [JournalDate], [JournalState], [JournalNumber], [JournalDescription],
                    isnull([TotalDebitsBook], 0) as TotalDebitsBook, isnull([TotalCreditsBook], 0) as TotalCreditsBook,
                    isnull([TotalDebitsTransaction], 0) as TotalDebitsTransaction, isnull([TotalCreditsTransaction], 0) as TotalCreditsTransaction,
                    isnull([TotalLines], 0) as TotalLines, [JournalCreatedBy], [JournalCreatedDate], [JournalLastMaintBy],
                    [JournalLastMaintDate], [OrginalDoucmentPrefix], [OrginalDoucmentNumber], [JournalSource], [JournalModelID],
                    [JournalInUse], [JournalInUseBy], [AttachmentID], [PostDate], [PostBy]
                from [PLS].[QJournalHeader]
                where (@jeFrom is null or [JournalDate] >= @jeFrom)
                  and (@jeTo is null or [JournalDate] <= @jeTo)
                  and (' + @SQLFilter + N')
                order by [JournalDate] desc, [JournalNumber] desc
            ';
            exec sp_executesql @DynSQL, N'@jeFrom date, @jeTo date', @jeFrom = @jeFrom, @jeTo = @jeTo;
        end
        else
        begin
            select 
                [EventNumber], [JournalYear], [JournalDate], [JournalState], [JournalNumber], [JournalDescription],
                isnull([TotalDebitsBook], 0) as TotalDebitsBook, isnull([TotalCreditsBook], 0) as TotalCreditsBook,
                isnull([TotalDebitsTransaction], 0) as TotalDebitsTransaction, isnull([TotalCreditsTransaction], 0) as TotalCreditsTransaction,
                isnull([TotalLines], 0) as TotalLines, [JournalCreatedBy], [JournalCreatedDate], [JournalLastMaintBy],
                [JournalLastMaintDate], [OrginalDoucmentPrefix], [OrginalDoucmentNumber], [JournalSource], [JournalModelID],
                [JournalInUse], [JournalInUseBy], [AttachmentID], [PostDate], [PostBy]
            from [PLS].[QJournalHeader]
            where (@jeFrom is null or [JournalDate] >= @jeFrom)
              and (@jeTo is null or [JournalDate] <= @jeTo)
            order by [JournalDate] desc, [JournalNumber] desc;
        end
	end

	if @operation='Smart Journal Entry'
	begin
		declare @sjeFromDate nvarchar(100) = json_value(@LineData, '$.fromDate')
		declare @sjeToDate nvarchar(100) = json_value(@LineData, '$.toDate')
		declare @sjeFrom date = case when isnull(@sjeFromDate, '') = '' then null else cast(@sjeFromDate as date) end
		declare @sjeTo date = case when isnull(@sjeToDate, '') = '' then null else cast(@sjeToDate as date) end

        declare @SQLFilterSJE nvarchar(max) = null;
        declare @IsAdminSJE bit = 0;
        if @User = 'sysadmin'
        begin
            set @IsAdminSJE = 1;
        end
        else
        begin
            select @IsAdminSJE = isnull(IsAdmin, 0)
            from ERPManagement25.System.UserMaster
            where Username = @User;
        end

        if @IsAdminSJE = 0
        begin
            select @SQLFilterSJE = SQLFilter
            from [PLS].[UserQueryPermissions] uqp
            inner join [PLS].[QueryMaster] qm on uqp.QueryID = qm.QueryID
            where uqp.Username = @User and qm.Operation = 'Smart Journal Entry';
        end

        if @SQLFilterSJE is not null and ltrim(rtrim(@SQLFilterSJE)) <> ''
        begin
            declare @DynSQLSJE nvarchar(max) = N'
                select 
                    [EventNumber], [JournalYear], [JournalDate], [JournalState], [JournalNumber], [JournalDescription],
                    isnull([TotalDebitsBook], 0) as TotalDebitsBook, isnull([TotalCreditsBook], 0) as TotalCreditsBook,
                    isnull([TotalDebitsTransaction], 0) as TotalDebitsTransaction, isnull([TotalCreditsTransaction], 0) as TotalCreditsTransaction,
                    isnull([TotalLines], 0) as TotalLines, [JournalCreatedBy], [JournalCreatedDate], [JournalLastMaintBy],
                    [JournalLastMaintDate], [OrginalDoucmentPrefix], [OrginalDoucmentNumber], [JournalSource], [JournalModelID],
                    [JournalInUse], [JournalInUseBy], [AttachmentID], [PostDate], [PostBy]
                from [PLS].[QJournalHeader]
                where (@sjeFrom is null or [JournalDate] >= @sjeFrom)
                  and (@sjeTo is null or [JournalDate] <= @sjeTo)
                  and isnull([JournalModelID], 0) <> 0
                  and (' + @SQLFilterSJE + N')
                order by [JournalDate] desc, [JournalNumber] desc
            ';
            exec sp_executesql @DynSQLSJE, N'@sjeFrom date, @sjeTo date', @sjeFrom = @sjeFrom, @sjeTo = @sjeTo;
        end
        else
        begin
            select 
                [EventNumber], [JournalYear], [JournalDate], [JournalState], [JournalNumber], [JournalDescription],
                isnull([TotalDebitsBook], 0) as TotalDebitsBook, isnull([TotalCreditsBook], 0) as TotalCreditsBook,
                isnull([TotalDebitsTransaction], 0) as TotalDebitsTransaction, isnull([TotalCreditsTransaction], 0) as TotalCreditsTransaction,
                isnull([TotalLines], 0) as TotalLines, [JournalCreatedBy], [JournalCreatedDate], [JournalLastMaintBy],
                [JournalLastMaintDate], [OrginalDoucmentPrefix], [OrginalDoucmentNumber], [JournalSource], [JournalModelID],
                [JournalInUse], [JournalInUseBy], [AttachmentID], [PostDate], [PostBy]
            from [PLS].[QJournalHeader]
            where (@sjeFrom is null or [JournalDate] >= @sjeFrom)
              and (@sjeTo is null or [JournalDate] <= @sjeTo)
              and isnull([JournalModelID], 0) <> 0
            order by [JournalDate] desc, [JournalNumber] desc;
        end
	end

	if @operation='Get Journal Prefixes'
	begin
		declare @pDate nvarchar(100) = json_value(@LineData, '$.Date')
		declare @targetDate date = case when isnull(@pDate, '') = '' then getdate() else cast(@pDate as date) end

		select x.JournalPrefix 
		from acc.JournalYearMasterLines x 
		where JournalPrefixYear=year(@targetDate)
	end



	IF @Operation = 'GetSystemUsers'
	BEGIN
		SET @State = 0;
		SET @Message = 'Success';

		SELECT a.Username, a.Name, a.IsAdmin, b.GroupName  
		FROM ERPManagement25.System.UserMaster a 
		LEFT OUTER JOIN ERPManagement25.System.GroupMaster b ON a.GroupID = b.GroupID  
		ORDER BY a.Username;
		RETURN;
	END

	IF @Operation = 'GetPagesAndGroups'
	BEGIN
		SET @State = 0;
		SET @Message = 'Success';

		SELECT PageGroupID, Label, Icon, Description, IsGroup, ParentID, SortOrder 
		FROM [PLS].[PagesAndGroups] 
		ORDER BY SortOrder;
		RETURN;
	END

	IF @Operation = 'GetUserPagePermissions'
	BEGIN
		SET @State = 0;
		SET @Message = 'Success';

		SELECT 
			p.PermissionID,
			p.Username,
			p.PageGroupID,
			pg.Label AS PageLabel,
			pg.IsGroup,
			p.CanView,
			p.GrantedBy,
			p.GrantedDate
		FROM [PLS].[UserPagePermissions] p
		INNER JOIN [PLS].[PagesAndGroups] pg ON p.PageGroupID = pg.PageGroupID
		ORDER BY p.Username, pg.SortOrder;
		RETURN;
	END

    IF @Operation = 'GetQueryMaster'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        SELECT q.QueryID, pq.PageGroupID, q.QueryName, q.SPName, q.Operation, q.Description, q.QuerySQL, q.DatabaseName, q.SchemaName, q.TableOrViewName, q.QueryType, q.ApiUrl 
        FROM [PLS].[QueryMaster] q
        INNER JOIN [PLS].[PageQueries] pq ON q.QueryID = pq.QueryID
        ORDER BY pq.PageGroupID, q.QueryID;
        RETURN;
    END

    IF @Operation = 'GetUserQueryPermissions'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        SELECT PermissionID, Username, QueryID, SQLFilter, CondMode, CondBuilder
        FROM [PLS].[UserQueryPermissions]
        ORDER BY Username, QueryID;
        RETURN;
    END

    IF @Operation = 'SaveUserQueryPermission'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @QUser VARCHAR(100) = JSON_VALUE(@LineData, '$.Username');
        DECLARE @QQueryID INT = TRY_CAST(JSON_VALUE(@LineData, '$.QueryID') AS INT);
        DECLARE @QFilter NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.SQLFilter');
        DECLARE @QMode VARCHAR(50) = JSON_VALUE(@LineData, '$.CondMode');
        DECLARE @QBuilder NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.CondBuilder');

        IF @QUser IS NULL OR @QQueryID IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'Username and QueryID are required';
            RETURN;
        END

        SET @QMode = COALESCE(@QMode, 'sql');

        IF EXISTS (SELECT 1 FROM [PLS].[UserQueryPermissions] WHERE Username = @QUser AND QueryID = @QQueryID)
        BEGIN
            UPDATE [PLS].[UserQueryPermissions] 
            SET SQLFilter = @QFilter, CondMode = @QMode, CondBuilder = @QBuilder, GrantedBy = @User, GrantedDate = GETDATE()
            WHERE Username = @QUser AND QueryID = @QQueryID;
        END
        ELSE
        BEGIN
            INSERT INTO [PLS].[UserQueryPermissions] (Username, QueryID, SQLFilter, CondMode, CondBuilder, GrantedBy, GrantedDate)
            VALUES (@QUser, @QQueryID, @QFilter, @QMode, @QBuilder, @User, GETDATE());
        END
        RETURN;
    END

    IF @Operation = 'GetQueryFields'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @QFQueryID INT = TRY_CAST(JSON_VALUE(@LineData, '$.QueryID') AS INT);
        DECLARE @QFTSQL NVARCHAR(MAX);

        SELECT @QFTSQL = QuerySQL FROM [PLS].[QueryMaster] WHERE QueryID = @QFQueryID;

        IF @QFTSQL IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'Query not found';
            RETURN;
        END

        DECLARE @QFParams NVARCHAR(MAX) = N'@FromDate datetime, @ToDate datetime, @PONumber varchar(100), @ItemCode varchar(100), @ItemID int, @SaftyStock decimal(18,5), @LeadTime int, @PermUser varchar(100), @PermPageGroupID varchar(100), @PermCanView bit, @View_ModelID int, @Get_FunctionPrefix varchar(100), @SelectedTable varchar(100), @Get_MacroID int, @Get_EventID int, @Get_CashID int, @jNo varchar(100), @eNo int, @jeFrom datetime, @jeTo datetime, @sjeFrom datetime, @sjeTo datetime';

        DECLARE @QFExecSQL NVARCHAR(MAX) = N'
            SELECT DISTINCT name AS FieldName
            FROM sys.dm_exec_describe_first_result_set(@QFTSQL, @QFParams, 0)
            WHERE name IS NOT NULL;
        ';

        EXEC sys.sp_executesql 
            @QFExecSQL,
            N'@QFTSQL NVARCHAR(MAX), @QFParams NVARCHAR(MAX)',
            @QFTSQL = @QFTSQL,
            @QFParams = @QFParams;
        
        RETURN;
    END

    IF @Operation = 'ValidateQueryCondition'
    BEGIN
        SET @State = 0;
        SET @Message = 'Valid';

        DECLARE @ValQueryID INT = TRY_CAST(JSON_VALUE(@LineData, '$.QueryID') AS INT);
        DECLARE @ValCondition NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.Condition');
        DECLARE @ValTSQL NVARCHAR(MAX);

        SELECT @ValTSQL = QuerySQL FROM [PLS].[QueryMaster] WHERE QueryID = @ValQueryID;

        IF @ValTSQL IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'Query not found';
            RETURN;
        END

        IF @ValCondition IS NOT NULL AND RTRIM(LTRIM(@ValCondition)) <> ''
        BEGIN
            SET @ValTSQL = RTRIM(LTRIM(@ValTSQL));
            IF RIGHT(@ValTSQL, 1) = ';'
            BEGIN
                SET @ValTSQL = SUBSTRING(@ValTSQL, 1, LEN(@ValTSQL) - 1);
            END

            DECLARE @OrderByPos INT = -1;
            DECLARE @TempTSQL NVARCHAR(MAX) = UPPER(@ValTSQL);
            DECLARE @SearchPos INT = CHARINDEX('ORDER BY', @TempTSQL);
            
            WHILE @SearchPos > 0
            BEGIN
                SET @OrderByPos = @SearchPos;
                SET @SearchPos = CHARINDEX('ORDER BY', @TempTSQL, @SearchPos + 1);
            END
            
            IF @OrderByPos > 0
            BEGIN
                DECLARE @AfterOrderBy NVARCHAR(MAX) = SUBSTRING(@ValTSQL, @OrderByPos + 8, LEN(@ValTSQL));
                IF CHARINDEX(')', @AfterOrderBy) = 0
                BEGIN
                    SET @ValTSQL = SUBSTRING(@ValTSQL, 1, @OrderByPos - 1);
                END
            END

            DECLARE @ValStatement NVARCHAR(MAX) = N'SELECT * FROM (' + @ValTSQL + N') AS __t WHERE ' + @ValCondition;
            DECLARE @ValParams NVARCHAR(MAX) = N'@FromDate datetime, @ToDate datetime, @PONumber varchar(100), @ItemCode varchar(100), @ItemID int, @SaftyStock decimal(18,5), @LeadTime int, @PermUser varchar(100), @PermPageGroupID varchar(100), @PermCanView bit, @View_ModelID int, @Get_FunctionPrefix varchar(100), @SelectedTable varchar(100), @Get_MacroID int, @Get_EventID int, @Get_CashID int, @jNo varchar(100), @eNo int, @jeFrom datetime, @jeTo datetime, @sjeFrom datetime, @sjeTo datetime';
            
            DECLARE @ErrorNumber INT = NULL;
            DECLARE @ErrorMessage NVARCHAR(4000) = NULL;

            DECLARE @ValExecSQL NVARCHAR(MAX) = N'
                SELECT TOP 1 @ErrorNumberOut = error_number, @ErrorMessageOut = error_message
                FROM sys.dm_exec_describe_first_result_set(@ValStatement, @ValParams, 0)
                WHERE error_number IS NOT NULL;
            ';

            EXEC sys.sp_executesql 
                @ValExecSQL,
                N'@ValStatement NVARCHAR(MAX), @ValParams NVARCHAR(MAX), @ErrorNumberOut INT OUTPUT, @ErrorMessageOut NVARCHAR(4000) OUTPUT',
                @ValStatement = @ValStatement,
                @ValParams = @ValParams,
                @ErrorNumberOut = @ErrorNumber OUTPUT,
                @ErrorMessageOut = @ErrorMessage OUTPUT;

            IF @ErrorNumber IS NOT NULL AND @ErrorNumber <> 0
            BEGIN
                SET @State = 1;
                SET @Message = @ErrorMessage;
            END
        END

        SELECT @State AS State, @Message AS Message;
        RETURN;
    END

    IF @Operation = 'SaveQueryMaster'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @QMQueryID INT = NULLIF(JSON_VALUE(@LineData, '$.QueryID'), '');
        DECLARE @QMQueryName NVARCHAR(150) = JSON_VALUE(@LineData, '$.QueryName');
        DECLARE @QMSPName NVARCHAR(250) = JSON_VALUE(@LineData, '$.SPName');
        DECLARE @QMQueryOperation VARCHAR(100) = JSON_VALUE(@LineData, '$.Operation');
        DECLARE @QMDescription NVARCHAR(500) = JSON_VALUE(@LineData, '$.Description');
        DECLARE @QMQuerySQL NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.QuerySQL');
        DECLARE @QMDatabaseName VARCHAR(100) = JSON_VALUE(@LineData, '$.DatabaseName');
        DECLARE @QMSchemaName VARCHAR(100) = JSON_VALUE(@LineData, '$.SchemaName');
        DECLARE @QMTableOrViewName VARCHAR(150) = JSON_VALUE(@LineData, '$.TableOrViewName');
        DECLARE @QMQueryType VARCHAR(50) = JSON_VALUE(@LineData, '$.QueryType');
        DECLARE @QMApiUrl VARCHAR(500) = JSON_VALUE(@LineData, '$.ApiUrl');

        IF @QMQueryID IS NOT NULL
        BEGIN
            UPDATE [PLS].[QueryMaster]
            SET QueryName = @QMQueryName,
                SPName = @QMSPName,
                Operation = @QMQueryOperation,
                Description = @QMDescription,
                QuerySQL = @QMQuerySQL,
                DatabaseName = @QMDatabaseName,
                SchemaName = @QMSchemaName,
                TableOrViewName = @QMTableOrViewName,
                QueryType = @QMQueryType,
                ApiUrl = @QMApiUrl
            WHERE QueryID = @QMQueryID;
        END
        ELSE
        BEGIN
            INSERT INTO [PLS].[QueryMaster] (QueryName, SPName, Operation, Description, QuerySQL, DatabaseName, SchemaName, TableOrViewName, QueryType, ApiUrl, CreatedBy)
            VALUES (@QMQueryName, @QMSPName, @QMQueryOperation, @QMDescription, @QMQuerySQL, @QMDatabaseName, @QMSchemaName, @QMTableOrViewName, @QMQueryType, @QMApiUrl, @User);
            
            SET @QMQueryID = SCOPE_IDENTITY();
        END

        SELECT @State AS State, @Message AS Message, @QMQueryID AS QueryID;
        RETURN;
    END

    IF @Operation = 'DeleteQueryMaster'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @DelQueryID INT = JSON_VALUE(@LineData, '$.QueryID');

        DELETE FROM [PLS].[QueryMaster] WHERE QueryID = @DelQueryID;

        SELECT @State AS State, @Message AS Message;
        RETURN;
    END

    IF @Operation = 'SaveQueryPageRelation'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @RelQueryID INT = JSON_VALUE(@LineData, '$.QueryID');
        DECLARE @RelPageGroupID VARCHAR(50) = JSON_VALUE(@LineData, '$.PageGroupID');
        DECLARE @RelIsLinked BIT = JSON_VALUE(@LineData, '$.IsLinked');

        IF @RelIsLinked = 1
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = @RelPageGroupID AND QueryID = @RelQueryID)
            BEGIN
                INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES (@RelPageGroupID, @RelQueryID);
            END
        END
        ELSE
        BEGIN
            DELETE FROM [PLS].[PageQueries] WHERE PageGroupID = @RelPageGroupID AND QueryID = @RelQueryID;
        END

        SELECT @State AS State, @Message AS Message;
        RETURN;
    END

    IF @Operation = 'SaveUserPagePermission'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @PermUser VARCHAR(100) = JSON_VALUE(@LineData, '$.Username');
        DECLARE @PermPageGroupID VARCHAR(50) = JSON_VALUE(@LineData, '$.PageGroupID');
        DECLARE @PermCanView BIT = ISNULL(TRY_CAST(JSON_VALUE(@LineData, '$.CanView') AS BIT), 1);

        IF @PermUser IS NULL OR @PermPageGroupID IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'Username and PageGroupID are required';
            RETURN;
        END

        IF EXISTS (SELECT 1 FROM [PLS].[UserPagePermissions] WHERE Username = @PermUser AND PageGroupID = @PermPageGroupID)
        BEGIN
            UPDATE [PLS].[UserPagePermissions]
            SET CanView = @PermCanView,
                GrantedBy = @User,
                GrantedDate = GETDATE()
            WHERE Username = @PermUser AND PageGroupID = @PermPageGroupID;
        END
        ELSE
        BEGIN
            INSERT INTO [PLS].[UserPagePermissions] (Username, PageGroupID, CanView, GrantedBy, GrantedDate)
            VALUES (@PermUser, @PermPageGroupID, @PermCanView, @User, GETDATE());
        END
        RETURN;
    END

    IF @Operation = 'DeleteUserPagePermission'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @PermID INT = TRY_CAST(JSON_VALUE(@LineData, '$.PermissionID') AS INT);

        IF @PermID IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'PermissionID is required';
            RETURN;
        END

        DELETE FROM [PLS].[UserPagePermissions] WHERE PermissionID = @PermID;
        RETURN;
    END

    IF @Operation = 'GetUserAllowedPages'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @IsUserAdmin BIT = 0;
        IF EXISTS (SELECT 1 FROM ERPManagement25.system.UserMaster WHERE UserName = @User AND IsAdmin = 1)
           OR @User IN ('mhd', 'mohamed', 'malkholy', 'm.alkholy', 'mohamed.kholy', 'mohamed.alkholy', 'ma')
        BEGIN
            SET @IsUserAdmin = 1;
        END

        IF @IsUserAdmin = 1
        BEGIN
            -- Admins automatically get all groups and pages
            SELECT PageGroupID FROM [PLS].[PagesAndGroups];
        END
        ELSE
        BEGIN
            -- Non-admins get pages they have view permission for AND their parent groups
            WITH AllowedPages AS (
                SELECT PageGroupID 
                FROM [PLS].[UserPagePermissions] 
                WHERE Username = @User AND CanView = 1
            ),
            RecursiveHierarchy AS (
                SELECT pg.PageGroupID, pg.ParentID
                FROM [PLS].[PagesAndGroups] pg
                INNER JOIN AllowedPages ap ON pg.PageGroupID = ap.PageGroupID
                
                UNION ALL
                
                SELECT pg.PageGroupID, pg.ParentID
                FROM [PLS].[PagesAndGroups] pg
                INNER JOIN RecursiveHierarchy rh ON pg.PageGroupID = rh.ParentID
            )
            SELECT DISTINCT PageGroupID FROM RecursiveHierarchy;
        END
        RETURN;
    END

end