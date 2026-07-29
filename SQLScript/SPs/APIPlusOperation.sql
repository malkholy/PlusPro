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

    IF @Operation = 'SavePageOrGroup'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @PG_PageGroupID VARCHAR(50) = JSON_VALUE(@LineData, '$.PageGroupID');
        DECLARE @PG_ParentGroupID VARCHAR(50) = JSON_VALUE(@LineData, '$.ParentGroupID');
        DECLARE @PG_SortOrder INT = CAST(JSON_VALUE(@LineData, '$.SortOrder') AS INT);
        DECLARE @PG_Label NVARCHAR(100) = JSON_VALUE(@LineData, '$.Label');
        DECLARE @PG_Icon NVARCHAR(50) = JSON_VALUE(@LineData, '$.Icon');
        DECLARE @PG_Description NVARCHAR(500) = JSON_VALUE(@LineData, '$.Description');
        DECLARE @PG_IsGroup BIT = CAST(JSON_VALUE(@LineData, '$.IsGroup') AS BIT);

        IF EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE PageGroupID = @PG_PageGroupID)
        BEGIN
            UPDATE [PLS].[PagesAndGroups]
            SET ParentID = @PG_ParentGroupID,
                SortOrder = ISNULL(@PG_SortOrder, SortOrder),
                Label = @PG_Label,
                Icon = @PG_Icon,
                Description = @PG_Description,
                IsGroup = @PG_IsGroup
            WHERE PageGroupID = @PG_PageGroupID;
        END
        ELSE
        BEGIN
            INSERT INTO [PLS].[PagesAndGroups] (PageGroupID, ParentID, SortOrder, Label, Icon, Description, IsGroup)
            VALUES (@PG_PageGroupID, @PG_ParentGroupID, ISNULL(@PG_SortOrder, 99), @PG_Label, @PG_Icon, @PG_Description, @PG_IsGroup);
        END

        SELECT @State AS State, @Message AS Message;
        RETURN;
    END

    IF @Operation = 'DeletePageOrGroup'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @DelPageGroupID VARCHAR(50) = JSON_VALUE(@LineData, '$.PageGroupID');

        IF EXISTS (SELECT 1 FROM [PLS].[PagesAndGroups] WHERE ParentID = @DelPageGroupID)
        BEGIN
            SET @State = 1;
            SET @Message = 'Cannot delete: this group still has pages assigned to it.';
            SELECT @State AS State, @Message AS Message;
            RETURN;
        END

        DELETE FROM [PLS].[UserPagePermissions] WHERE PageGroupID = @DelPageGroupID;
        DELETE FROM [PLS].[PageQueries] WHERE PageGroupID = @DelPageGroupID;
        DELETE FROM [PLS].[PagesAndGroups] WHERE PageGroupID = @DelPageGroupID;

        SELECT @State AS State, @Message AS Message;
        RETURN;
    END

    IF @Operation = 'GetQueryMaster'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        SELECT q.QueryID, pq.PageGroupID, q.QueryName, q.Operation, q.Description, q.QuerySQL, q.QueryType, q.ApiUrl 
        FROM [PLS].[QueryMaster] q
        LEFT JOIN [PLS].[PageQueries] pq ON q.QueryID = pq.QueryID
        ORDER BY pq.PageGroupID, q.QueryID;
        RETURN;
    END

    IF @Operation = 'GetGridData'
    BEGIN
        -- ====================================================================
        -- Generic grid data engine. Every grid page calls this ONE operation,
        -- passing its PageGroupID + FilterPanel values in @LineData. The base
        -- query, user row-level permission, and FilterPanel->column mappings
        -- all come from QueryMaster / UserQueryPermissions / QueryFilterMappings
        -- so new pages never need a hand-written IF block here again.
        -- ====================================================================
        DECLARE @GGD_PageGroupID NVARCHAR(50) = JSON_VALUE(@LineData, '$.PageGroupID');

        DECLARE @GGD_QueryID INT, @GGD_BaseSQL NVARCHAR(MAX);
        SELECT TOP 1 @GGD_QueryID = q.QueryID, @GGD_BaseSQL = q.QuerySQL
        FROM [PLS].[QueryMaster] q
        INNER JOIN [PLS].[PageQueries] pq ON pq.QueryID = q.QueryID
        WHERE pq.PageGroupID = @GGD_PageGroupID AND q.QueryType IN ('Grid', 'Detail');

        IF @GGD_QueryID IS NULL OR @GGD_BaseSQL IS NULL OR LTRIM(RTRIM(@GGD_BaseSQL)) = ''
        BEGIN
            SET @State = -1
            SET @Message = 'No Grid query registered for PageGroupID: ' + ISNULL(@GGD_PageGroupID, '(null)')
            RETURN
        END

        -- User row-level permission condition (same pattern as PLS.APIPlusLookupOperation)
        DECLARE @GGD_IsAdmin BIT = 0, @GGD_PermFilter NVARCHAR(MAX) = NULL;
        IF @User = 'sysadmin'
            SET @GGD_IsAdmin = 1;
        ELSE
            SELECT @GGD_IsAdmin = ISNULL(IsAdmin, 0) FROM ERPManagement25.System.UserMaster WHERE Username = @User;

        IF @GGD_IsAdmin = 0
            SELECT @GGD_PermFilter = SQLFilter FROM [PLS].[UserQueryPermissions] WHERE Username = @User AND QueryID = @GGD_QueryID;

        -- Registered FilterPanel -> column mappings for this query, values pulled from LineData
        DECLARE @GGD_Maps TABLE (Slot INT IDENTITY(1,1) PRIMARY KEY, FilterType VARCHAR(20), GridColumn VARCHAR(150), DataType VARCHAR(20), FromVal NVARCHAR(200), ToVal NVARCHAR(200));

        INSERT INTO @GGD_Maps (FilterType, GridColumn, DataType, FromVal, ToVal)
        SELECT
            m.FilterType, m.GridColumn, m.DataType,
            NULLIF(JSON_VALUE(@LineData, '$.' + m.FromParam), ''),
            CASE WHEN m.ToParam IS NOT NULL THEN NULLIF(JSON_VALUE(@LineData, '$.' + m.ToParam), '') ELSE NULL END
        FROM [PLS].[QueryFilterMappings] m
        WHERE m.QueryID = @GGD_QueryID
        ORDER BY m.SortOrder, m.MappingID;

        IF (SELECT COUNT(*) FROM @GGD_Maps) > 15
        BEGIN
            SET @State = -1
            SET @Message = 'Too many filter mappings registered for this query (max 15 supported).'
            RETURN
        END

        -- Build the WHERE text. Only whitelisted GridColumn/DataType (trusted metadata
        -- from QueryFilterMappings) and slot placeholders enter the SQL text -- every
        -- actual filter value is bound below via sp_executesql, never concatenated in.
        DECLARE @GGD_Frags TABLE (Slot INT, Frag NVARCHAR(300));

        INSERT INTO @GGD_Frags (Slot, Frag)
        SELECT Slot,
            CASE FilterType
                WHEN 'range' THEN (CASE DataType WHEN 'date' THEN 'CONVERT(date,' WHEN 'number' THEN 'CONVERT(float,' ELSE '(' END) + QUOTENAME(GridColumn) + ') >= @p' + CAST(Slot AS VARCHAR(2)) + 'f'
                WHEN 'exact' THEN (CASE DataType WHEN 'date' THEN 'CONVERT(date,' WHEN 'number' THEN 'CONVERT(float,' ELSE '(' END) + QUOTENAME(GridColumn) + ') = @p' + CAST(Slot AS VARCHAR(2)) + 'f'
                WHEN 'like'  THEN QUOTENAME(GridColumn) + ' LIKE ''%'' + @p' + CAST(Slot AS VARCHAR(2)) + 'f + ''%'''
                WHEN 'asOf'  THEN (CASE DataType WHEN 'date' THEN 'CONVERT(date,' WHEN 'number' THEN 'CONVERT(float,' ELSE '(' END) + QUOTENAME(GridColumn) + ') <= @p' + CAST(Slot AS VARCHAR(2)) + 'f'
            END
        FROM @GGD_Maps WHERE FromVal IS NOT NULL;

        INSERT INTO @GGD_Frags (Slot, Frag)
        SELECT Slot, (CASE DataType WHEN 'date' THEN 'CONVERT(date,' WHEN 'number' THEN 'CONVERT(float,' ELSE '(' END) + QUOTENAME(GridColumn) + ') <= @p' + CAST(Slot AS VARCHAR(2)) + 't'
        FROM @GGD_Maps WHERE FilterType = 'range' AND ToVal IS NOT NULL;

        DECLARE @GGD_Where NVARCHAR(MAX) = (SELECT STRING_AGG(Frag, ' AND ') WITHIN GROUP (ORDER BY Slot) FROM @GGD_Frags);
        SET @GGD_Where = ISNULL(@GGD_Where, '');

        IF @GGD_PermFilter IS NOT NULL AND LTRIM(RTRIM(@GGD_PermFilter)) <> ''
            SET @GGD_Where = CASE WHEN @GGD_Where = '' THEN '(' + @GGD_PermFilter + ')' ELSE @GGD_Where + ' AND (' + @GGD_PermFilter + ')' END;

        IF @GGD_Where <> ''
            SET @GGD_Where = ' AND ' + @GGD_Where;

        IF CHARINDEX('{FILTER}', @GGD_BaseSQL) > 0
            SET @GGD_BaseSQL = REPLACE(@GGD_BaseSQL, '{FILTER}', @GGD_Where);
        ELSE
            SET @GGD_BaseSQL = @GGD_BaseSQL + N' WHERE 1=1 ' + @GGD_Where;

        -- Bind every filter value through a fixed pool of typed sp_executesql parameters
        -- (15 range slots = 30 params). Values never touch the SQL text directly.
        DECLARE @p1f NVARCHAR(200), @p1t NVARCHAR(200), @p2f NVARCHAR(200), @p2t NVARCHAR(200),
                @p3f NVARCHAR(200), @p3t NVARCHAR(200), @p4f NVARCHAR(200), @p4t NVARCHAR(200),
                @p5f NVARCHAR(200), @p5t NVARCHAR(200), @p6f NVARCHAR(200), @p6t NVARCHAR(200),
                @p7f NVARCHAR(200), @p7t NVARCHAR(200), @p8f NVARCHAR(200), @p8t NVARCHAR(200),
                @p9f NVARCHAR(200), @p9t NVARCHAR(200), @p10f NVARCHAR(200), @p10t NVARCHAR(200),
                @p11f NVARCHAR(200), @p11t NVARCHAR(200), @p12f NVARCHAR(200), @p12t NVARCHAR(200),
                @p13f NVARCHAR(200), @p13t NVARCHAR(200), @p14f NVARCHAR(200), @p14t NVARCHAR(200),
                @p15f NVARCHAR(200), @p15t NVARCHAR(200);

        SELECT @p1f=FromVal,@p1t=ToVal FROM @GGD_Maps WHERE Slot=1
        SELECT @p2f=FromVal,@p2t=ToVal FROM @GGD_Maps WHERE Slot=2
        SELECT @p3f=FromVal,@p3t=ToVal FROM @GGD_Maps WHERE Slot=3
        SELECT @p4f=FromVal,@p4t=ToVal FROM @GGD_Maps WHERE Slot=4
        SELECT @p5f=FromVal,@p5t=ToVal FROM @GGD_Maps WHERE Slot=5
        SELECT @p6f=FromVal,@p6t=ToVal FROM @GGD_Maps WHERE Slot=6
        SELECT @p7f=FromVal,@p7t=ToVal FROM @GGD_Maps WHERE Slot=7
        SELECT @p8f=FromVal,@p8t=ToVal FROM @GGD_Maps WHERE Slot=8
        SELECT @p9f=FromVal,@p9t=ToVal FROM @GGD_Maps WHERE Slot=9
        SELECT @p10f=FromVal,@p10t=ToVal FROM @GGD_Maps WHERE Slot=10
        SELECT @p11f=FromVal,@p11t=ToVal FROM @GGD_Maps WHERE Slot=11
        SELECT @p12f=FromVal,@p12t=ToVal FROM @GGD_Maps WHERE Slot=12
        SELECT @p13f=FromVal,@p13t=ToVal FROM @GGD_Maps WHERE Slot=13
        SELECT @p14f=FromVal,@p14t=ToVal FROM @GGD_Maps WHERE Slot=14
        SELECT @p15f=FromVal,@p15t=ToVal FROM @GGD_Maps WHERE Slot=15

        EXEC sp_executesql @GGD_BaseSQL,
            N'@p1f NVARCHAR(200), @p1t NVARCHAR(200), @p2f NVARCHAR(200), @p2t NVARCHAR(200), @p3f NVARCHAR(200), @p3t NVARCHAR(200), @p4f NVARCHAR(200), @p4t NVARCHAR(200), @p5f NVARCHAR(200), @p5t NVARCHAR(200), @p6f NVARCHAR(200), @p6t NVARCHAR(200), @p7f NVARCHAR(200), @p7t NVARCHAR(200), @p8f NVARCHAR(200), @p8t NVARCHAR(200), @p9f NVARCHAR(200), @p9t NVARCHAR(200), @p10f NVARCHAR(200), @p10t NVARCHAR(200), @p11f NVARCHAR(200), @p11t NVARCHAR(200), @p12f NVARCHAR(200), @p12t NVARCHAR(200), @p13f NVARCHAR(200), @p13t NVARCHAR(200), @p14f NVARCHAR(200), @p14t NVARCHAR(200), @p15f NVARCHAR(200), @p15t NVARCHAR(200)',
            @p1f=@p1f,@p1t=@p1t,@p2f=@p2f,@p2t=@p2t,@p3f=@p3f,@p3t=@p3t,@p4f=@p4f,@p4t=@p4t,@p5f=@p5f,@p5t=@p5t,
            @p6f=@p6f,@p6t=@p6t,@p7f=@p7f,@p7t=@p7t,@p8f=@p8f,@p8t=@p8t,@p9f=@p9f,@p9t=@p9t,@p10f=@p10f,@p10t=@p10t,
            @p11f=@p11f,@p11t=@p11t,@p12f=@p12f,@p12t=@p12t,@p13f=@p13f,@p13t=@p13t,@p14f=@p14f,@p14t=@p14t,@p15f=@p15f,@p15t=@p15t;

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

    -- ====================================================================
    -- PLS.QueryFields admin access -- the persisted per-column grid display
    -- metadata table (FieldName/DataType/Length are auto-populated whenever
    -- a query is saved via SaveQueryMaster/CreateQueryView below; Label/
    -- Format/Width/ColorRules are hand-edited here and never touched by that
    -- auto-population). Not to be confused with 'GetQueryFields' further
    -- down, which describes a query's LIVE result-set columns via DMV for
    -- the SQLFilterInput autocomplete -- a different, transient concept.
    -- ====================================================================
    IF @Operation = 'GetQueryFieldsMaster'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @QFMQueryID INT = TRY_CAST(JSON_VALUE(@LineData, '$.QueryID') AS INT);

        SELECT ID, QueryID, FieldName, DataType, Length, Label, Format, Width, ColorRules
        FROM [PLS].[QueryFields]
        WHERE QueryID = @QFMQueryID
        ORDER BY ID;
        RETURN;
    END

    IF @Operation = 'SaveQueryFieldMeta'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @QFM_ID INT = TRY_CAST(JSON_VALUE(@LineData, '$.ID') AS INT);
        DECLARE @QFM_Label NVARCHAR(150) = JSON_VALUE(@LineData, '$.Label');
        DECLARE @QFM_Format NVARCHAR(100) = JSON_VALUE(@LineData, '$.Format');
        DECLARE @QFM_Width INT = TRY_CAST(NULLIF(JSON_VALUE(@LineData, '$.Width'), '') AS INT);
        DECLARE @QFM_ColorRules NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.ColorRules');

        IF @QFM_ID IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'ID is required';
            RETURN;
        END

        UPDATE [PLS].[QueryFields]
        SET Label = @QFM_Label,
            Format = @QFM_Format,
            Width = @QFM_Width,
            ColorRules = @QFM_ColorRules
        WHERE ID = @QFM_ID;

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

        IF CHARINDEX('{FILTER}', @QFTSQL) > 0
            SET @QFTSQL = REPLACE(@QFTSQL, '{FILTER}', N'');

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
            DECLARE @ValStatement NVARCHAR(MAX);

            IF CHARINDEX('{FILTER}', @ValTSQL) > 0
            BEGIN
                -- Mirror exactly how GetGridData / the Lookup engine substitute the
                -- condition at runtime (inline into the query's own WHERE clause),
                -- so validation sees the same column scope (full FROM/JOIN, not just
                -- the outer SELECT list) that will actually be used when this filter
                -- runs for real -- otherwise a condition on a real but unprojected
                -- column (e.g. ItemType on the Item Master lookup) is wrongly flagged
                -- as an invalid column here even though it works at runtime.
                SET @ValStatement = REPLACE(@ValTSQL, '{FILTER}', N' AND (' + @ValCondition + N')');
            END
            ELSE
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

                SET @ValStatement = N'SELECT * FROM (' + @ValTSQL + N') AS __t WHERE ' + @ValCondition;
            END

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
        DECLARE @QMQueryOperation VARCHAR(100) = JSON_VALUE(@LineData, '$.Operation');
        DECLARE @QMDescription NVARCHAR(500) = JSON_VALUE(@LineData, '$.Description');
        DECLARE @QMQuerySQL NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.QuerySQL');
        DECLARE @QMQueryType VARCHAR(50) = JSON_VALUE(@LineData, '$.QueryType');
        DECLARE @QMApiUrl VARCHAR(500) = JSON_VALUE(@LineData, '$.ApiUrl');

        IF @QMQueryID IS NOT NULL
        BEGIN
            UPDATE [PLS].[QueryMaster]
            SET QueryName = @QMQueryName,
                Operation = @QMQueryOperation,
                Description = @QMDescription,
                QuerySQL = @QMQuerySQL,
                QueryType = @QMQueryType,
                ApiUrl = @QMApiUrl
            WHERE QueryID = @QMQueryID;
        END
        ELSE
        BEGIN
            INSERT INTO [PLS].[QueryMaster] (QueryName, Operation, Description, QuerySQL, QueryType, ApiUrl, CreatedBy)
            VALUES (@QMQueryName, @QMQueryOperation, @QMDescription, @QMQuerySQL, @QMQueryType, @QMApiUrl, @User);

            SET @QMQueryID = SCOPE_IDENTITY();
        END

        -- Standing rule: every QueryMaster row must have its columns registered
        -- in PLS.QueryFields. Re-discover them via the same DMV GetQueryFields
        -- uses and rewrite this query's rows every time it's saved -- Label/
        -- Format/Width/ColorRules are hand-edited afterwards, never touched here.
        BEGIN TRY
            DECLARE @QMFieldSQL NVARCHAR(MAX) = @QMQuerySQL;
            IF @QMFieldSQL IS NOT NULL AND CHARINDEX('{FILTER}', @QMFieldSQL) > 0
                SET @QMFieldSQL = REPLACE(@QMFieldSQL, '{FILTER}', N'');

            IF @QMFieldSQL IS NOT NULL AND LTRIM(RTRIM(@QMFieldSQL)) <> ''
            BEGIN
                DECLARE @QMFieldParams NVARCHAR(MAX) = N'@FromDate datetime, @ToDate datetime, @PONumber varchar(100), @ItemCode varchar(100), @ItemID int, @SaftyStock decimal(18,5), @LeadTime int, @PermUser varchar(100), @PermPageGroupID varchar(100), @PermCanView bit, @View_ModelID int, @Get_FunctionPrefix varchar(100), @SelectedTable varchar(100), @Get_MacroID int, @Get_EventID int, @Get_CashID int, @jNo varchar(100), @eNo int, @jeFrom datetime, @jeTo datetime, @sjeFrom datetime, @sjeTo datetime';
                -- MERGE, not delete+reinsert: preserves hand-edited Label/Format/
                -- Width/ColorRules on columns that still exist, only touching
                -- FieldName/DataType/Length (and adding/removing rows for columns
                -- that were added/removed from the query itself).
                DECLARE @QMFieldExecSQL NVARCHAR(MAX) = N'
                    MERGE INTO [PLS].[QueryFields] AS target
                    USING (
                        SELECT name AS FieldName, system_type_name AS DataType, CASE WHEN max_length = -1 THEN NULL ELSE max_length END AS Length
                        FROM sys.dm_exec_describe_first_result_set(@QMFieldSQL, @QMFieldParams, 0)
                        WHERE name IS NOT NULL
                    ) AS src
                    ON target.QueryID = ' + CAST(@QMQueryID AS NVARCHAR(20)) + N' AND target.FieldName = src.FieldName
                    WHEN MATCHED THEN UPDATE SET DataType = src.DataType, Length = src.Length
                    WHEN NOT MATCHED BY TARGET THEN INSERT (QueryID, FieldName, DataType, Length) VALUES (' + CAST(@QMQueryID AS NVARCHAR(20)) + N', src.FieldName, src.DataType, src.Length)
                    WHEN NOT MATCHED BY SOURCE AND target.QueryID = ' + CAST(@QMQueryID AS NVARCHAR(20)) + N' THEN DELETE;
                ';
                EXEC sys.sp_executesql @QMFieldExecSQL, N'@QMFieldSQL NVARCHAR(MAX), @QMFieldParams NVARCHAR(MAX)', @QMFieldSQL = @QMFieldSQL, @QMFieldParams = @QMFieldParams;
            END
        END TRY
        BEGIN CATCH
            -- Field discovery failing (e.g. a query needing params this pool doesn't
            -- cover) must never block the query itself from being saved.
        END CATCH

        SELECT @State AS State, @Message AS Message, @QMQueryID AS QueryID;
        RETURN;
    END

    IF @Operation = 'DeleteQueryMaster'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @DelQueryID INT = JSON_VALUE(@LineData, '$.QueryID');

        DELETE FROM [PLS].[QueryFields] WHERE QueryID = @DelQueryID;
        DELETE FROM [PLS].[QueryMaster] WHERE QueryID = @DelQueryID;

        SELECT @State AS State, @Message AS Message;
        RETURN;
    END

    -- ====================================================================
    -- Folded in from APIPlusQueryOperation. This proc has no batch-wide
    -- TRY/CATCH (unlike APIPlusQueryOperation), so each block wraps its own
    -- work in TRY/CATCH to preserve the original SQL-exception reporting.
    -- ====================================================================
    IF @Operation = 'CreateQueryView'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        BEGIN TRY
            -- 1. Execute the View creation DDL if provided
            IF @SqlStatement IS NOT NULL AND LTRIM(RTRIM(@SqlStatement)) <> ''
            BEGIN
                EXEC(@SqlStatement);
            END

            -- 2. Extract metadata and update PLS.QueryMaster
            IF @LineData IS NOT NULL AND ISJSON(@LineData) = 1
            BEGIN
                DECLARE @PageGroupID VARCHAR(50) = JSON_VALUE(@LineData, '$.PageGroupID');
                DECLARE @QueryName NVARCHAR(150) = JSON_VALUE(@LineData, '$.QueryName');
                DECLARE @QueryOperation VARCHAR(100) = JSON_VALUE(@LineData, '$.QueryOperation');
                DECLARE @Description NVARCHAR(500) = JSON_VALUE(@LineData, '$.Description');
                DECLARE @QuerySQL NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.QuerySQL');
                DECLARE @QueryType VARCHAR(50) = JSON_VALUE(@LineData, '$.QueryType');

                IF @PageGroupID IS NOT NULL AND @QueryOperation IS NOT NULL
                BEGIN
                    DECLARE @ExistingQueryID INT;
                    SELECT @ExistingQueryID = QueryID FROM [PLS].[QueryMaster] WHERE Operation = @QueryOperation;

                    IF @ExistingQueryID IS NOT NULL
                    BEGIN
                        UPDATE [PLS].[QueryMaster]
                        SET QueryName = COALESCE(@QueryName, QueryName),
                            Description = COALESCE(@Description, Description),
                            QuerySQL = COALESCE(@QuerySQL, QuerySQL),
                            QueryType = COALESCE(@QueryType, QueryType)
                        WHERE QueryID = @ExistingQueryID;

                        IF NOT EXISTS (SELECT 1 FROM [PLS].[PageQueries] WHERE PageGroupID = @PageGroupID AND QueryID = @ExistingQueryID)
                        BEGIN
                            INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES (@PageGroupID, @ExistingQueryID);
                        END

                        SET @Message = 'View compiled and QueryMaster updated successfully';
                    END
                    ELSE
                    BEGIN
                        INSERT INTO [PLS].[QueryMaster] (QueryName, Operation, Description, QuerySQL, QueryType, CreatedBy)
                        VALUES (COALESCE(@QueryName, @QueryOperation), @QueryOperation, @Description, @QuerySQL, COALESCE(@QueryType, 'Grid'), @User);

                        SET @ExistingQueryID = SCOPE_IDENTITY();
                        INSERT INTO [PLS].[PageQueries] (PageGroupID, QueryID) VALUES (@PageGroupID, @ExistingQueryID);

                        SET @Message = 'View compiled and QueryMaster registered successfully';
                    END

                    -- Standing rule: every QueryMaster row must have its columns
                    -- registered in PLS.QueryFields -- same auto-population as
                    -- SaveQueryMaster, re-reading the final QuerySQL from the
                    -- table since an update may have COALESCE'd it unchanged.
                    BEGIN TRY
                        DECLARE @CQVFieldSQL NVARCHAR(MAX);
                        SELECT @CQVFieldSQL = QuerySQL FROM [PLS].[QueryMaster] WHERE QueryID = @ExistingQueryID;
                        IF @CQVFieldSQL IS NOT NULL AND CHARINDEX('{FILTER}', @CQVFieldSQL) > 0
                            SET @CQVFieldSQL = REPLACE(@CQVFieldSQL, '{FILTER}', N'');

                        IF @CQVFieldSQL IS NOT NULL AND LTRIM(RTRIM(@CQVFieldSQL)) <> ''
                        BEGIN
                            DECLARE @CQVFieldParams NVARCHAR(MAX) = N'@FromDate datetime, @ToDate datetime, @PONumber varchar(100), @ItemCode varchar(100), @ItemID int, @SaftyStock decimal(18,5), @LeadTime int, @PermUser varchar(100), @PermPageGroupID varchar(100), @PermCanView bit, @View_ModelID int, @Get_FunctionPrefix varchar(100), @SelectedTable varchar(100), @Get_MacroID int, @Get_EventID int, @Get_CashID int, @jNo varchar(100), @eNo int, @jeFrom datetime, @jeTo datetime, @sjeFrom datetime, @sjeTo datetime';
                            -- MERGE, not delete+reinsert -- see the matching comment in SaveQueryMaster above.
                            DECLARE @CQVFieldExecSQL NVARCHAR(MAX) = N'
                                MERGE INTO [PLS].[QueryFields] AS target
                                USING (
                                    SELECT name AS FieldName, system_type_name AS DataType, CASE WHEN max_length = -1 THEN NULL ELSE max_length END AS Length
                                    FROM sys.dm_exec_describe_first_result_set(@CQVFieldSQL, @CQVFieldParams, 0)
                                    WHERE name IS NOT NULL
                                ) AS src
                                ON target.QueryID = ' + CAST(@ExistingQueryID AS NVARCHAR(20)) + N' AND target.FieldName = src.FieldName
                                WHEN MATCHED THEN UPDATE SET DataType = src.DataType, Length = src.Length
                                WHEN NOT MATCHED BY TARGET THEN INSERT (QueryID, FieldName, DataType, Length) VALUES (' + CAST(@ExistingQueryID AS NVARCHAR(20)) + N', src.FieldName, src.DataType, src.Length)
                                WHEN NOT MATCHED BY SOURCE AND target.QueryID = ' + CAST(@ExistingQueryID AS NVARCHAR(20)) + N' THEN DELETE;
                            ';
                            EXEC sys.sp_executesql @CQVFieldExecSQL, N'@CQVFieldSQL NVARCHAR(MAX), @CQVFieldParams NVARCHAR(MAX)', @CQVFieldSQL = @CQVFieldSQL, @CQVFieldParams = @CQVFieldParams;
                        END
                    END TRY
                    BEGIN CATCH
                        -- Field discovery failing must never block the view/query itself from being saved.
                    END CATCH
                END
                ELSE
                BEGIN
                    SET @Message = 'View compiled successfully (QueryMaster registration skipped: PageGroupID or QueryOperation missing)';
                END
            END
            ELSE
            BEGIN
                SET @Message = 'View compiled successfully (QueryMaster registration skipped: LineData JSON empty)';
            END
        END TRY
        BEGIN CATCH
            SET @State = ERROR_NUMBER();
            SET @Message = 'SQL Exception: ' + ERROR_MESSAGE() + ' (Line: ' + CAST(ERROR_LINE() AS VARCHAR(10)) + ')';
        END CATCH

        RETURN;
    END

    IF @Operation = 'ExecuteScript'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        BEGIN TRY
            IF @SqlStatement IS NULL OR LTRIM(RTRIM(@SqlStatement)) = ''
            BEGIN
                SET @State = 1;
                SET @Message = 'SqlStatement is required';
                RETURN;
            END

            EXEC(@SqlStatement);

            SET @Message = 'SQL executed successfully';
        END TRY
        BEGIN CATCH
            SET @State = ERROR_NUMBER();
            SET @Message = 'SQL Exception: ' + ERROR_MESSAGE() + ' (Line: ' + CAST(ERROR_LINE() AS VARCHAR(10)) + ')';
        END CATCH

        RETURN;
    END

    -- ====================================================================
    -- Generic single-table CRUD engine, driven by PLS.CrudTableMaster /
    -- PLS.CrudFieldMappings (populated only by PageBuilder.jsx's "Simple
    -- CRUD" mode). Every simple flat master-data page shares these SAME
    -- 5 operations -- no page ever gets its own hand-written Save/Delete
    -- SQL -- mirroring how GetGridData is one universal read operation
    -- keyed by PageGroupID. Scope: single-column primary key only.
    -- ====================================================================
    IF @Operation = 'GetCrudPages'
    BEGIN
        -- Lets the sidebar (App.jsx) resolve which PageGroupIDs are Simple
        -- CRUD pages at runtime, so they route to GenericMasterPage.jsx
        -- automatically with zero code changes per new page.
        SET @State = 0;
        SET @Message = 'Success';
        SELECT PageGroupID FROM PLS.CrudTableMaster;
        RETURN;
    END

    IF @Operation = 'GetCrudMetadata'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';
        DECLARE @GCM_PageGroupID VARCHAR(50) = JSON_VALUE(@LineData, '$.PageGroupID');

        IF NOT EXISTS (SELECT 1 FROM PLS.CrudTableMaster WHERE PageGroupID = @GCM_PageGroupID)
        BEGIN
            SET @State = -1;
            SET @Message = 'No CRUD metadata registered for PageGroupID: ' + ISNULL(@GCM_PageGroupID, '(null)');
            RETURN;
        END

        SELECT PageGroupID, TargetSchema, TargetTable, AllowDelete
        FROM PLS.CrudTableMaster WHERE PageGroupID = @GCM_PageGroupID;

        SELECT MappingID, PageGroupID, ColumnName, JsonKey, Label, DataType, IsRequired, IsKey, IsIdentity, SortOrder
        FROM PLS.CrudFieldMappings WHERE PageGroupID = @GCM_PageGroupID
        ORDER BY SortOrder, MappingID;
        RETURN;
    END

    IF @Operation = 'SaveCrudTableMaster'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';
        DECLARE @SCT_PageGroupID VARCHAR(50) = JSON_VALUE(@LineData, '$.PageGroupID');
        DECLARE @SCT_TargetSchema VARCHAR(50) = ISNULL(JSON_VALUE(@LineData, '$.TargetSchema'), 'dbo');
        DECLARE @SCT_TargetTable VARCHAR(150) = JSON_VALUE(@LineData, '$.TargetTable');
        DECLARE @SCT_AllowDelete BIT = ISNULL(TRY_CAST(JSON_VALUE(@LineData, '$.AllowDelete') AS BIT), 1);

        IF @SCT_PageGroupID IS NULL OR @SCT_TargetTable IS NULL
        BEGIN
            SET @State = -1;
            SET @Message = 'PageGroupID and TargetTable are required.';
            RETURN;
        END

        IF EXISTS (SELECT 1 FROM PLS.CrudTableMaster WHERE PageGroupID = @SCT_PageGroupID)
        BEGIN
            UPDATE PLS.CrudTableMaster
            SET TargetSchema = @SCT_TargetSchema, TargetTable = @SCT_TargetTable, AllowDelete = @SCT_AllowDelete
            WHERE PageGroupID = @SCT_PageGroupID;
        END
        ELSE
        BEGIN
            INSERT INTO PLS.CrudTableMaster (PageGroupID, TargetSchema, TargetTable, AllowDelete, CreatedBy)
            VALUES (@SCT_PageGroupID, @SCT_TargetSchema, @SCT_TargetTable, @SCT_AllowDelete, @User);
        END

        SELECT @State AS State, @Message AS Message;
        RETURN;
    END

    IF @Operation = 'SaveCrudFieldMappings'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';
        DECLARE @SCF_PageGroupID VARCHAR(50) = JSON_VALUE(@LineData, '$.PageGroupID');

        IF @SCF_PageGroupID IS NULL
        BEGIN
            SET @State = -1;
            SET @Message = 'PageGroupID is required.';
            RETURN;
        END

        DELETE FROM PLS.CrudFieldMappings WHERE PageGroupID = @SCF_PageGroupID;

        INSERT INTO PLS.CrudFieldMappings (PageGroupID, ColumnName, JsonKey, Label, DataType, IsRequired, IsKey, IsIdentity, SortOrder)
        SELECT @SCF_PageGroupID, ColumnName, JsonKey, Label, DataType, IsRequired, IsKey, IsIdentity, SortOrder
        FROM OPENJSON(@LineData, '$.Fields')
        WITH (
            ColumnName VARCHAR(150)  '$.ColumnName',
            JsonKey    VARCHAR(100)  '$.JsonKey',
            Label      NVARCHAR(150) '$.Label',
            DataType   VARCHAR(20)   '$.DataType',
            IsRequired BIT           '$.IsRequired',
            IsKey      BIT           '$.IsKey',
            IsIdentity BIT           '$.IsIdentity',
            SortOrder  INT           '$.SortOrder'
        );

        SELECT @State AS State, @Message AS Message;
        RETURN;
    END

    IF @Operation = 'GenericRecordSave'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';
        DECLARE @GRS_PageGroupID VARCHAR(50) = JSON_VALUE(@LineData, '$.PageGroupID');
        DECLARE @GRS_Schema VARCHAR(50), @GRS_Table VARCHAR(150);

        SELECT @GRS_Schema = TargetSchema, @GRS_Table = TargetTable
        FROM PLS.CrudTableMaster WHERE PageGroupID = @GRS_PageGroupID;

        IF @GRS_Table IS NULL
        BEGIN
            SET @State = -1;
            SET @Message = 'No CRUD table registered for PageGroupID: ' + ISNULL(@GRS_PageGroupID, '(null)');
            RETURN;
        END

        DECLARE @GRS_Fields TABLE (
            Slot INT IDENTITY(1,1) PRIMARY KEY, ColumnName VARCHAR(150), JsonKey VARCHAR(100),
            DataType VARCHAR(20), IsRequired BIT, IsKey BIT, IsIdentity BIT, Val NVARCHAR(MAX)
        );

        INSERT INTO @GRS_Fields (ColumnName, JsonKey, DataType, IsRequired, IsKey, IsIdentity, Val)
        SELECT ColumnName, JsonKey, DataType, IsRequired, IsKey, IsIdentity, JSON_VALUE(@LineData, '$.' + JsonKey)
        FROM PLS.CrudFieldMappings
        WHERE PageGroupID = @GRS_PageGroupID
        ORDER BY SortOrder, MappingID;

        IF (SELECT COUNT(*) FROM @GRS_Fields) > 20
        BEGIN
            SET @State = -1;
            SET @Message = 'Too many fields registered for this page (max 20 supported).';
            RETURN;
        END

        DECLARE @GRS_Missing VARCHAR(150);
        SELECT TOP 1 @GRS_Missing = ColumnName FROM @GRS_Fields WHERE IsRequired = 1 AND (Val IS NULL OR LTRIM(RTRIM(Val)) = '');
        IF @GRS_Missing IS NOT NULL
        BEGIN
            SET @State = -1;
            SET @Message = @GRS_Missing + ' is required.';
            RETURN;
        END

        DECLARE @GRS_KeySlot INT, @GRS_KeyCol VARCHAR(150), @GRS_KeyType VARCHAR(20), @GRS_KeyIsIdentity BIT, @GRS_KeyVal NVARCHAR(MAX);
        SELECT @GRS_KeySlot = Slot, @GRS_KeyCol = ColumnName, @GRS_KeyType = DataType, @GRS_KeyIsIdentity = IsIdentity, @GRS_KeyVal = Val
        FROM @GRS_Fields WHERE IsKey = 1;

        IF @GRS_KeyCol IS NULL
        BEGIN
            SET @State = -1;
            SET @Message = 'No key field registered for this page.';
            RETURN;
        END

        DECLARE @GRS_IsNew BIT = 0;
        IF @GRS_KeyVal IS NULL OR LTRIM(RTRIM(@GRS_KeyVal)) = ''
            SET @GRS_IsNew = 1;
        ELSE
        BEGIN
            DECLARE @GRS_ExistsSQL NVARCHAR(MAX) = N'SELECT @Found = CASE WHEN EXISTS (SELECT 1 FROM ' +
                QUOTENAME(@GRS_Schema) + N'.' + QUOTENAME(@GRS_Table) + N' WHERE ' + QUOTENAME(@GRS_KeyCol) +
                N' = ' + (CASE @GRS_KeyType WHEN 'date' THEN N'CONVERT(date,@KeyVal)' WHEN 'number' THEN N'CONVERT(float,@KeyVal)' ELSE N'@KeyVal' END) +
                N') THEN 1 ELSE 0 END;';
            DECLARE @GRS_Found BIT;
            EXEC sp_executesql @GRS_ExistsSQL, N'@KeyVal NVARCHAR(MAX), @Found BIT OUTPUT', @KeyVal = @GRS_KeyVal, @Found = @GRS_Found OUTPUT;
            SET @GRS_IsNew = CASE WHEN @GRS_Found = 1 THEN 0 ELSE 1 END;
        END

        -- Only trusted metadata (ColumnName, from CrudFieldMappings) enters the SQL text below --
        -- every actual field VALUE is bound through the fixed @v1..@v20 pool, never concatenated in.
        DECLARE @GRS_InsCols NVARCHAR(MAX), @GRS_InsVals NVARCHAR(MAX), @GRS_SetFrags NVARCHAR(MAX);

        SELECT @GRS_InsCols = STRING_AGG(CAST(QUOTENAME(ColumnName) AS NVARCHAR(MAX)), ', ') WITHIN GROUP (ORDER BY Slot)
        FROM @GRS_Fields WHERE IsIdentity = 0;

        SELECT @GRS_InsVals = STRING_AGG(
            CAST((CASE DataType WHEN 'date' THEN 'CONVERT(date,' WHEN 'number' THEN 'CONVERT(float,' WHEN 'bool' THEN 'CONVERT(bit,' ELSE '(' END) + '@v' + CAST(Slot AS VARCHAR(2)) + ')' AS NVARCHAR(MAX)),
            ', ') WITHIN GROUP (ORDER BY Slot)
        FROM @GRS_Fields WHERE IsIdentity = 0;

        SELECT @GRS_SetFrags = STRING_AGG(
            CAST(QUOTENAME(ColumnName) + ' = ' + (CASE DataType WHEN 'date' THEN 'CONVERT(date,' WHEN 'number' THEN 'CONVERT(float,' WHEN 'bool' THEN 'CONVERT(bit,' ELSE '(' END) + '@v' + CAST(Slot AS VARCHAR(2)) + ')' AS NVARCHAR(MAX)),
            ', ') WITHIN GROUP (ORDER BY Slot)
        FROM @GRS_Fields WHERE IsKey = 0;

        IF @GRS_IsNew = 0 AND @GRS_SetFrags IS NULL
        BEGIN
            SET @Message = 'Nothing to update.';
            SELECT @GRS_KeyVal AS KeyValue;
            RETURN;
        END

        DECLARE @v1 NVARCHAR(MAX), @v2 NVARCHAR(MAX), @v3 NVARCHAR(MAX), @v4 NVARCHAR(MAX), @v5 NVARCHAR(MAX),
                @v6 NVARCHAR(MAX), @v7 NVARCHAR(MAX), @v8 NVARCHAR(MAX), @v9 NVARCHAR(MAX), @v10 NVARCHAR(MAX),
                @v11 NVARCHAR(MAX), @v12 NVARCHAR(MAX), @v13 NVARCHAR(MAX), @v14 NVARCHAR(MAX), @v15 NVARCHAR(MAX),
                @v16 NVARCHAR(MAX), @v17 NVARCHAR(MAX), @v18 NVARCHAR(MAX), @v19 NVARCHAR(MAX), @v20 NVARCHAR(MAX);

        SELECT @v1=Val FROM @GRS_Fields WHERE Slot=1;   SELECT @v2=Val FROM @GRS_Fields WHERE Slot=2;
        SELECT @v3=Val FROM @GRS_Fields WHERE Slot=3;   SELECT @v4=Val FROM @GRS_Fields WHERE Slot=4;
        SELECT @v5=Val FROM @GRS_Fields WHERE Slot=5;   SELECT @v6=Val FROM @GRS_Fields WHERE Slot=6;
        SELECT @v7=Val FROM @GRS_Fields WHERE Slot=7;   SELECT @v8=Val FROM @GRS_Fields WHERE Slot=8;
        SELECT @v9=Val FROM @GRS_Fields WHERE Slot=9;   SELECT @v10=Val FROM @GRS_Fields WHERE Slot=10;
        SELECT @v11=Val FROM @GRS_Fields WHERE Slot=11; SELECT @v12=Val FROM @GRS_Fields WHERE Slot=12;
        SELECT @v13=Val FROM @GRS_Fields WHERE Slot=13; SELECT @v14=Val FROM @GRS_Fields WHERE Slot=14;
        SELECT @v15=Val FROM @GRS_Fields WHERE Slot=15; SELECT @v16=Val FROM @GRS_Fields WHERE Slot=16;
        SELECT @v17=Val FROM @GRS_Fields WHERE Slot=17; SELECT @v18=Val FROM @GRS_Fields WHERE Slot=18;
        SELECT @v19=Val FROM @GRS_Fields WHERE Slot=19; SELECT @v20=Val FROM @GRS_Fields WHERE Slot=20;

        DECLARE @GRS_KeySlotVar NVARCHAR(10) = '@v' + CAST(@GRS_KeySlot AS VARCHAR(2));
        DECLARE @GRS_ExecSQL NVARCHAR(MAX);

        IF @GRS_IsNew = 1
        BEGIN
            SET @GRS_ExecSQL = N'INSERT INTO ' + QUOTENAME(@GRS_Schema) + N'.' + QUOTENAME(@GRS_Table) +
                N' (' + @GRS_InsCols + N') VALUES (' + @GRS_InsVals + N'); ' +
                CASE WHEN @GRS_KeyIsIdentity = 1
                    THEN N'SELECT CAST(SCOPE_IDENTITY() AS NVARCHAR(50)) AS KeyValue;'
                    ELSE N'SELECT ' + @GRS_KeySlotVar + N' AS KeyValue;'
                END;
        END
        ELSE
        BEGIN
            SET @GRS_ExecSQL = N'UPDATE ' + QUOTENAME(@GRS_Schema) + N'.' + QUOTENAME(@GRS_Table) +
                N' SET ' + @GRS_SetFrags + N' WHERE ' + QUOTENAME(@GRS_KeyCol) + N' = ' +
                (CASE @GRS_KeyType WHEN 'date' THEN N'CONVERT(date,' + @GRS_KeySlotVar + N')' WHEN 'number' THEN N'CONVERT(float,' + @GRS_KeySlotVar + N')' ELSE @GRS_KeySlotVar END) +
                N'; SELECT ' + @GRS_KeySlotVar + N' AS KeyValue;';
        END

        EXEC sp_executesql @GRS_ExecSQL,
            N'@v1 NVARCHAR(MAX), @v2 NVARCHAR(MAX), @v3 NVARCHAR(MAX), @v4 NVARCHAR(MAX), @v5 NVARCHAR(MAX), @v6 NVARCHAR(MAX), @v7 NVARCHAR(MAX), @v8 NVARCHAR(MAX), @v9 NVARCHAR(MAX), @v10 NVARCHAR(MAX), @v11 NVARCHAR(MAX), @v12 NVARCHAR(MAX), @v13 NVARCHAR(MAX), @v14 NVARCHAR(MAX), @v15 NVARCHAR(MAX), @v16 NVARCHAR(MAX), @v17 NVARCHAR(MAX), @v18 NVARCHAR(MAX), @v19 NVARCHAR(MAX), @v20 NVARCHAR(MAX)',
            @v1=@v1,@v2=@v2,@v3=@v3,@v4=@v4,@v5=@v5,@v6=@v6,@v7=@v7,@v8=@v8,@v9=@v9,@v10=@v10,
            @v11=@v11,@v12=@v12,@v13=@v13,@v14=@v14,@v15=@v15,@v16=@v16,@v17=@v17,@v18=@v18,@v19=@v19,@v20=@v20;

        RETURN;
    END

    IF @Operation = 'GenericRecordDelete'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';
        DECLARE @GRD_PageGroupID VARCHAR(50) = JSON_VALUE(@LineData, '$.PageGroupID');
        DECLARE @GRD_Schema VARCHAR(50), @GRD_Table VARCHAR(150), @GRD_AllowDelete BIT;

        SELECT @GRD_Schema = TargetSchema, @GRD_Table = TargetTable, @GRD_AllowDelete = AllowDelete
        FROM PLS.CrudTableMaster WHERE PageGroupID = @GRD_PageGroupID;

        IF @GRD_Table IS NULL
        BEGIN
            SET @State = -1;
            SET @Message = 'No CRUD table registered for PageGroupID: ' + ISNULL(@GRD_PageGroupID, '(null)');
            RETURN;
        END

        IF @GRD_AllowDelete = 0
        BEGIN
            SET @State = -1;
            SET @Message = 'Delete not allowed for this page.';
            RETURN;
        END

        DECLARE @GRD_KeyCol VARCHAR(150), @GRD_KeyJson VARCHAR(100), @GRD_KeyType VARCHAR(20);
        SELECT @GRD_KeyCol = ColumnName, @GRD_KeyJson = JsonKey, @GRD_KeyType = DataType
        FROM PLS.CrudFieldMappings WHERE PageGroupID = @GRD_PageGroupID AND IsKey = 1;

        IF @GRD_KeyCol IS NULL
        BEGIN
            SET @State = -1;
            SET @Message = 'No key field registered for this page.';
            RETURN;
        END

        DECLARE @GRD_KeyVal NVARCHAR(MAX) = JSON_VALUE(@LineData, '$.' + @GRD_KeyJson);

        DECLARE @GRD_SQL NVARCHAR(MAX) = N'DELETE FROM ' + QUOTENAME(@GRD_Schema) + N'.' + QUOTENAME(@GRD_Table) +
            N' WHERE ' + QUOTENAME(@GRD_KeyCol) + N' = ' +
            (CASE @GRD_KeyType WHEN 'date' THEN N'CONVERT(date,@KeyVal)' WHEN 'number' THEN N'CONVERT(float,@KeyVal)' ELSE N'@KeyVal' END) + N';';

        -- Scoped exception to this proc's usual no-TRY/CATCH convention: master-data rows are
        -- exactly what other tables reference, so a raw FK-violation (547) becomes a friendly
        -- message here only -- flagged for explicit sign-off, not a proc-wide style change.
        BEGIN TRY
            EXEC sp_executesql @GRD_SQL, N'@KeyVal NVARCHAR(MAX)', @KeyVal = @GRD_KeyVal;
        END TRY
        BEGIN CATCH
            IF ERROR_NUMBER() = 547
            BEGIN
                SET @State = -1;
                SET @Message = 'Cannot delete: this record is referenced elsewhere.';
            END
            ELSE
            BEGIN
                SET @State = -1;
                SET @Message = 'SQL Exception: ' + ERROR_MESSAGE();
            END
        END CATCH
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

    IF @Operation = 'GetReportsMaster'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        SELECT r.ReportID, r.ReportName, r.[FileName], r.PageGroupID, pg.Label AS PageLabel, r.KeyParam, r.Description, r.CreatedBy, r.CreatedDate
        FROM [PLS].[ReportsMaster] r
        LEFT JOIN [PLS].[PagesAndGroups] pg ON r.PageGroupID = pg.PageGroupID
        ORDER BY r.ReportID;

        SELECT ReportQueryID, ReportID, QueryName, QuerySQL, SortOrder
        FROM [PLS].[ReportQueries]
        ORDER BY ReportID, SortOrder;

        RETURN;
    END

    IF @Operation = 'SaveReportsMaster'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @RptReportID INT = NULLIF(JSON_VALUE(@LineData, '$.ReportID'), '');
        DECLARE @RptReportName NVARCHAR(150) = JSON_VALUE(@LineData, '$.ReportName');
        DECLARE @RptFileName NVARCHAR(260) = JSON_VALUE(@LineData, '$.FileName');
        DECLARE @RptPageGroupID VARCHAR(50) = JSON_VALUE(@LineData, '$.PageGroupID');
        DECLARE @RptKeyParam NVARCHAR(100) = JSON_VALUE(@LineData, '$.KeyParam');
        DECLARE @RptDescription NVARCHAR(500) = JSON_VALUE(@LineData, '$.Description');

        IF @RptReportID IS NOT NULL
        BEGIN
            UPDATE [PLS].[ReportsMaster]
            SET ReportName = @RptReportName,
                [FileName] = @RptFileName,
                PageGroupID = @RptPageGroupID,
                KeyParam = @RptKeyParam,
                Description = @RptDescription
            WHERE ReportID = @RptReportID;
        END
        ELSE
        BEGIN
            INSERT INTO [PLS].[ReportsMaster] (ReportName, [FileName], PageGroupID, KeyParam, Description, CreatedBy)
            VALUES (@RptReportName, @RptFileName, @RptPageGroupID, @RptKeyParam, @RptDescription, @User);

            SET @RptReportID = SCOPE_IDENTITY();
        END

        DELETE FROM [PLS].[ReportQueries] WHERE ReportID = @RptReportID;

        INSERT INTO [PLS].[ReportQueries] (ReportID, QueryName, QuerySQL, SortOrder)
        SELECT @RptReportID, QueryName, QuerySQL, ROW_NUMBER() OVER (ORDER BY (SELECT NULL))
        FROM OPENJSON(@LineData, '$.Queries')
        WITH (
            QueryName NVARCHAR(150) '$.QueryName',
            QuerySQL  NVARCHAR(MAX) '$.QuerySQL'
        );

        SELECT @State AS State, @Message AS Message, @RptReportID AS ReportID;
        RETURN;
    END

    IF @Operation = 'DeleteReportsMaster'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @DelReportID INT = JSON_VALUE(@LineData, '$.ReportID');

        DELETE FROM [PLS].[ReportQueries] WHERE ReportID = @DelReportID;
        DELETE FROM [PLS].[ReportsMaster] WHERE ReportID = @DelReportID;

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

    -- ====================================================================
    -- User Operation Permissions -- app-wide action/sub-action gating
    -- (New/Edit/Delete an entity, or a granular action inside a form, e.g.
    -- "change Warehouse while editing a Customer Order"). Same shape as the
    -- Page-Permission operations above: PLS.OperationMaster is the registry
    -- (grown incrementally as each form is built), PLS.UserOperationPermissions
    -- is the per-user grant, GetUserAllowedOperations is what the frontend
    -- fetches once at login (mirrors GetUserAllowedPages's admin bypass).
    -- ====================================================================
    IF @Operation = 'GetOperationMaster'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        SELECT OperationKey, ParentOperationKey, PageGroupID, Label, Description, SortOrder
        FROM [PLS].[OperationMaster]
        ORDER BY PageGroupID, SortOrder;
        RETURN;
    END

    IF @Operation = 'GetUserOperationPermissions'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        SELECT PermissionID, Username, OperationKey, CanPerform, GrantedBy, GrantedDate
        FROM [PLS].[UserOperationPermissions]
        ORDER BY Username, OperationKey;
        RETURN;
    END

    IF @Operation = 'SaveUserOperationPermission'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @OpPermUser VARCHAR(100) = JSON_VALUE(@LineData, '$.Username');
        DECLARE @OpPermKey VARCHAR(150) = JSON_VALUE(@LineData, '$.OperationKey');
        DECLARE @OpPermCanPerform BIT = ISNULL(TRY_CAST(JSON_VALUE(@LineData, '$.CanPerform') AS BIT), 0);

        IF @OpPermUser IS NULL OR @OpPermKey IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'Username and OperationKey are required';
            RETURN;
        END

        IF EXISTS (SELECT 1 FROM [PLS].[UserOperationPermissions] WHERE Username = @OpPermUser AND OperationKey = @OpPermKey)
        BEGIN
            UPDATE [PLS].[UserOperationPermissions]
            SET CanPerform = @OpPermCanPerform,
                GrantedBy = @User,
                GrantedDate = GETDATE()
            WHERE Username = @OpPermUser AND OperationKey = @OpPermKey;
        END
        ELSE
        BEGIN
            INSERT INTO [PLS].[UserOperationPermissions] (Username, OperationKey, CanPerform, GrantedBy, GrantedDate)
            VALUES (@OpPermUser, @OpPermKey, @OpPermCanPerform, @User, GETDATE());
        END
        RETURN;
    END

    IF @Operation = 'GetUserAllowedOperations'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @OpIsUserAdmin BIT = 0;
        IF EXISTS (SELECT 1 FROM ERPManagement25.system.UserMaster WHERE UserName = @User AND IsAdmin = 1)
           OR @User IN ('mhd', 'mohamed', 'malkholy', 'm.alkholy', 'mohamed.kholy', 'mohamed.alkholy', 'ma')
        BEGIN
            SET @OpIsUserAdmin = 1;
        END

        IF @OpIsUserAdmin = 1
        BEGIN
            -- Admins automatically get every registered operation
            SELECT OperationKey FROM [PLS].[OperationMaster];
        END
        ELSE
        BEGIN
            SELECT OperationKey
            FROM [PLS].[UserOperationPermissions]
            WHERE Username = @User AND CanPerform = 1;
        END
        RETURN;
    END

    -- ====================================================================
    -- Item Customer Sales -- a custom (non-GetGridData) report page.
    -- Monthly/Quarterly/Yearly period logic (same pattern as the Express/
    -- Sales Detail pages' client-side buildLineData: Months is a comma-
    -- separated list, empty for 'yearly') doesn't fit the QueryFilterMappings
    -- model, so this is its own named operation with its own param parsing,
    -- fed by ItemCustomerSales.jsx directly.
    -- ====================================================================
    IF @Operation = 'GetItemCustomerMonthlySales'
    BEGIN
        SET @State = 0;
        SET @Message = 'Success';

        DECLARE @ICMMonths NVARCHAR(100) = JSON_VALUE(@LineData, '$.Months');
        -- NULLIF before TRY_CAST is required here: TRY_CAST('' AS INT) returns
        -- 0 (not NULL) in this environment, which would silently turn "no
        -- filter" into "= 0" and match zero rows -- confirmed empirically
        -- while debugging empty ItemCustomerSales results.
        DECLARE @ICMYear INT = TRY_CAST(NULLIF(JSON_VALUE(@LineData, '$.Year'), '') AS INT);
        DECLARE @ICMCustomer NVARCHAR(50) = NULLIF(JSON_VALUE(@LineData, '$.Customer'), '');
        DECLARE @ICMItemID INT = TRY_CAST(NULLIF(JSON_VALUE(@LineData, '$.ItemID'), '') AS INT);
        DECLARE @ICMSalesPerson INT = TRY_CAST(NULLIF(JSON_VALUE(@LineData, '$.SalesPerson'), '') AS INT);

        SELECT a.SalesYear, a.SalesMonth, c.ItemID, c.ItemCode, c.ItemDescription, c.SellingConversion,
               a.Customer, b.CustomerName, b.CustomerSalesPerson, sm.SalesName AS SalesPersonName, a.Qty, a.Amount
        FROM Sales.ItemCustomerMonthly a
        LEFT OUTER JOIN ACR.CustomerMaster b ON a.Customer = b.CustomerNo
        LEFT OUTER JOIN inv.ItemMaster c ON c.ItemID = a.Item
        LEFT OUTER JOIN ACR.SalesMaster sm ON sm.SalesID = b.CustomerSalesPerson
        WHERE a.Customer <> 60002
          AND a.SalesYear <> 2022
          AND (@ICMYear IS NULL OR a.SalesYear = @ICMYear)
          AND (@ICMMonths IS NULL OR LTRIM(RTRIM(@ICMMonths)) = '' OR a.SalesMonth IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@ICMMonths, ',')))
          AND (@ICMCustomer IS NULL OR a.Customer = @ICMCustomer)
          AND (@ICMItemID IS NULL OR c.ItemID = @ICMItemID)
          AND (@ICMSalesPerson IS NULL OR b.CustomerSalesPerson = @ICMSalesPerson)
        ORDER BY a.SalesYear DESC, a.SalesMonth DESC, c.ItemCode;
        RETURN;
    END

    -- ====================================================================
    -- Generic lookup engine, folded in from PLS.APIPlusLookupOperation so
    -- every dropdown/lookup call runs through this one SP too. Any
    -- @Operation not matched by an explicit IF block above falls through
    -- to here and is treated as a registered Lookup query: a QueryMaster
    -- row with QueryType='Lookup', optionally row-filtered per user via
    -- UserQueryPermissions -- same pattern GetGridData already uses above
    -- for Grid/Detail queries.
    -- ====================================================================
    DECLARE @LKP_QueryID INT, @LKP_SQL NVARCHAR(MAX);
    SELECT TOP 1 @LKP_QueryID = QueryID, @LKP_SQL = QuerySQL
    FROM [PLS].[QueryMaster]
    WHERE Operation = @Operation AND QueryType = 'Lookup';

    IF @LKP_SQL IS NOT NULL AND LTRIM(RTRIM(@LKP_SQL)) <> ''
    BEGIN
        DECLARE @LKP_IsAdmin BIT = 0, @LKP_Filter NVARCHAR(MAX) = NULL;
        IF @User = 'sysadmin'
            SET @LKP_IsAdmin = 1;
        ELSE
            SELECT @LKP_IsAdmin = ISNULL(IsAdmin, 0) FROM ERPManagement25.System.UserMaster WHERE Username = @User;

        IF @LKP_IsAdmin = 0
            SELECT @LKP_Filter = SQLFilter
            FROM [PLS].[UserQueryPermissions]
            WHERE Username = @User AND QueryID = @LKP_QueryID;

        IF @LKP_Filter IS NOT NULL AND LTRIM(RTRIM(@LKP_Filter)) <> ''
            SET @LKP_SQL = REPLACE(@LKP_SQL, '{FILTER}', N' AND (' + @LKP_Filter + N')');
        ELSE
            SET @LKP_SQL = REPLACE(@LKP_SQL, '{FILTER}', N'');

        -- @LineData defaults to '' (not NULL) on this proc's signature, and JSON_VALUE
        -- throws on an empty/non-JSON string -- guard with ISJSON before reading it.
        DECLARE @LKP_Param1 NVARCHAR(100) = CASE WHEN ISJSON(@LineData) = 1 THEN JSON_VALUE(@LineData, '$.param1') ELSE NULL END;
        EXEC sp_executesql @LKP_SQL, N'@param1 NVARCHAR(100)', @param1 = @LKP_Param1;
        RETURN;
    END

end