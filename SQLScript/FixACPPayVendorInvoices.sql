USE [ERPMega25]
GO

-- ============================================================================
-- Fixes two bugs found in the live 'Pay Vendor Invoices' block of
-- dbo.APIPlusACPOperation before wiring the frontend Save Payment button:
--
-- 1. @InternalID (meant to tag each ACP.InvoicePaymentLine row with which
--    Vendor Invoice Payment header/batch it belongs to) was declared once at
--    the top of the whole SP, defaulting to 0, and only ever set inside the
--    separate 'New Invoice Payment Header' branch. Since 'Pay Vendor Invoices'
--    runs as its own execution, that variable was never populated here --
--    every payment line got InternalID=0 regardless of which header it was
--    paid against. Fixed by adding HeaderInternalID to the incoming LineData
--    array (same value repeated on every line, frontend-supplied) and reading
--    it via OPENJSON/TOP 1, same pattern already used for VendorNo/InvoiceYear
--    in the other two blocks.
-- 2. The validation-failure path returned a bespoke `SELECT 'ERROR' AS
--    Result, ... AS Message` result set instead of using @State/@Message --
--    the output convention every other operation in this SP (and the
--    frontend's res.State !== 0 check) relies on. Fixed to SET @State=1 /
--    @Message and RETURN, matching 'New Invoice Payment Header' above it.
--
-- Everything else in the procedure is unchanged (verbatim from the live
-- definition, confirmed via OBJECT_DEFINITION before this fix).
-- ============================================================================

ALTER PROCEDURE [dbo].[APIPlusACPOperation]
    @Operation      nvarchar(100) = '',
    @LineData       nvarchar(max) = '',
	@LineMember  nvarchar(max) = '' ,
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
	  set @State=0
	  set @Message=''
	  declare @ITemCode Nvarchar(max) , @CNT int , @VendorNo int =0 ,
		 @InvoiceYear int =0 , @InternalID int =0

		CREATE TABLE #TempTable (VendorNo int, InvoiceYear int)

	  IF @Operation = 'New Invoice Payment Header'
		BEGIN
			 INSERT INTO #TempTable
			 SELECT * FROM OPENJSON(@LineData) WITH (VendorNo int, InvoiceYear int )

			SELECT TOP 1 @VendorNo = VendorNo, @InvoiceYear = InvoiceYear
			FROM #TempTable
			select @Cnt= count(*) from acp.InvoicePaymentHeader where VendorNo=@VendorNo and InvoiceYear=@InvoiceYear
			if @Cnt=0
			begin
				 INSERT INTO [ACP].[InvoicePaymentHeader] (VendorNo, InvoiceYear, CreatedBy, CreatedDate)
				 VALUES (@VendorNo, @InvoiceYear, @User, GETDATE())

				 SET @InternalID = SCOPE_IDENTITY()
				 return
			end
			else
			begin
				set @State=1
				set @Message='Vendor and Year Exist'
				return
			end

    END
	if @operation='Available Credit'
	begin

		declare @LastYearBalance dec(18,5) =0 , @TotalCredit dec(18,5)=0 , @TotalDebit dec(18,5) , @TotalInvoicedAmount dec(18,5)=0,
		@ExtraDue dec(18,5)=0 , @PaidAmount dec(18,5)=0 , @OpenInvoiceAmount dec(18,5)=0 , @AvaliableCredit dec(18,5)=0 ,
		@Balance dec(18,5)=0
		create table #Temp (InvoiceYear int,  VendorNo nvarchar(50) );

		insert into #Temp
		select *
		from openjson(@LineData) with (  InvoiceYear int, VendorNo nvarchar(50) )

		select top 1 @InvoiceYear = InvoiceYear, @VendorNo = VendorNo
		from #Temp;

-- Calculate the total credit for the specified customer, account, and year
	select @LastYearBalance =   isnull (  sum(DebitTransaction- CreditTransaction), 0 )
	from acc.JournalLine where Vendor=@VendorNo and Account='2011' and year(journalDate) <@InvoiceYear
	select @TotalCredit =  isnull (  sum( CreditTransaction), 0 )
	from acc.JournalLine where Vendor=@VendorNo and Account='2011' and year(journalDate)>=@InvoiceYear

	select @TotalDebit =  isnull (  sum( DebitTransaction), 0 )   from acc.JournalLine where Vendor=@VendorNo and Account='2011' and year(journalDate)>=@InvoiceYear --- Returned Check
	select @TotalInvoicedAmount= isnull (  sum( TotalFinalAmount), 0 )   from ACP.VendorInvoiceHeader where VendorNumber=@VendorNo and InvoiceYear>=@InvoiceYear and TotalFinalAmount>0  ----TotalInvoices
	set @ExtraDue = @TotalCredit - @TotalInvoicedAmount


	select @PaidAmount= isnull (  sum( PaidAmount), 0 )   from ACP.VendorInvoiceHeader where VendorNumber=@VendorNo and InvoiceYear>=@InvoiceYear

	select @OpenInvoiceAmount= isnull (  sum(TotalFinalAmount- PaidAmount), 0 )   from ACP.VendorInvoiceHeader where VendorNumber=@VendorNo and InvoiceYear>=@InvoiceYear and TotalFinalAmount>0


	set @AvaliableCredit=@TotalDebit-@PaidAmount-(-1*@LastYearBalance) -@ExtraDue ;

	print @TotalCredit;
	if @AvaliableCredit<0
	begin
		set @AvaliableCredit=0
	end ;
-- Get all records where the cumulative sum is less than or equal to @TotalCredit
	--WITH JournalWithRunningTotal AS
	--(
	--SELECT  a.JournalDate , a.JournalNo , a.CreditTransaction , a.LineDescription ,
 --          SUM(CreditTransaction) OVER (PARTITION BY Customer, Account
 --                                       ORDER BY journalDate ASC
 --                                       ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS RunningTotal
	-- FROM acc.JournalLine a
	-- WHERE Customer = @VendorNo AND Account = '2011'  AND YEAR(journalDate) >= @InvoiceYear and CreditTransaction<>0
	--)
	--SELECT * FROM JournalWithRunningTotal WHERE RunningTotal <= @AvaliableCredit ORDER BY journalDate DESC---, JournalLine DESC;

	select @Balance  = -1* isnull (  sum( DebitTransaction-CreditTransaction ), 0 )
	from acc.JournalLine where Vendor=@VendorNo and Account='2011'

	select @AvaliableCredit as AvaliableCredit , @Balance as Balance
	return
	end


	IF @Operation = 'Pay Vendor Invoices'
BEGIN


    CREATE TABLE #PayLines (
        HeaderInternalID   INT,
        InvoiceInternalID  INT,
        PaidAmount         DECIMAL(18,5),
        Note               NVARCHAR(MAX)
    );

    INSERT INTO #PayLines
    SELECT *
    FROM OPENJSON(@LineData) WITH (
        HeaderInternalID   INT,
        InvoiceInternalID  INT,
        PaidAmount         DECIMAL(18,5),
        Note               NVARCHAR(MAX)
    );

    SELECT TOP 1 @InternalID = HeaderInternalID FROM #PayLines;

    -- Validate: reject if any PaidAmount > UnPaidAmount
    IF EXISTS (
        SELECT 1 FROM #PayLines p
        JOIN ACP.VendorInvoiceHeader h ON h.InternalID = p.InvoiceInternalID
        WHERE p.PaidAmount > (h.TotalFinalAmount - h.PaidAmount)
    )
    BEGIN
        SET @State = 1
        SET @Message = 'Pay amount exceeds remaining balance'
        RETURN
    END

    -- Insert payment lines
    INSERT INTO ACP.InvoicePaymentLine
        (InternalID, InvoiceYear, VendorNo, InvoiceInternalID,
         InvoiceAmount, PaidAmount, Note, PaidDate, CreatedBy, CreatedDate)
    SELECT
        @InternalID,                    -- header InternalID
        h.InvoiceYear,
        h.VendorNumber,
        p.InvoiceInternalID,
        h.TotalFinalAmount,
        p.PaidAmount,
        ISNULL(p.Note, ''),
        GETDATE(),                      -- PaidDate
        @User,                          -- CreatedBy from BASE_BODY
        GETDATE()
    FROM #PayLines p
    JOIN ACP.VendorInvoiceHeader h ON h.InternalID = p.InvoiceInternalID
    WHERE p.PaidAmount > 0;

    -- Update PaidAmount + PaidState on each invoice header
    UPDATE h
    SET
        h.PaidAmount = h.PaidAmount + p.PaidAmount,
        h.PaidState  = CASE
            WHEN h.PaidAmount + p.PaidAmount >= h.TotalFinalAmount THEN 2  -- Fully Paid
            WHEN h.PaidAmount + p.PaidAmount > 0                   THEN 1  -- Partial
            ELSE 0                                                          -- Unpaid
        END
    FROM ACP.VendorInvoiceHeader h
    JOIN #PayLines p ON p.InvoiceInternalID = h.InternalID
    WHERE p.PaidAmount > 0;

    -- Return updated invoices so frontend can refresh
    SELECT
        h.InternalID, h.InvoiceDueDate, h.TotalFinalAmount,
        h.PaidAmount, h.TotalFinalAmount - h.PaidAmount AS UnPaidAmount,
        h.PaidState
    FROM ACP.VendorInvoiceHeader h
    JOIN #PayLines p ON p.InvoiceInternalID = h.InternalID;

    RETURN
END
end
GO
