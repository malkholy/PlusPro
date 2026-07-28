USE [ERPMega]
GO
/****** Object:  StoredProcedure [dbo].[APIPlusJournalOperation]    Script Date: 17/07/2026 12:44:50 ص ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER   PROCEDURE [dbo].[APIPlusJournalOperation]
    @Operation          nvarchar(250),
    @LineData           nvarchar(max) = '',
    @LineMember         nvarchar(max) = '',
	@User nvarchar(150) ='' , 
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
    SET NOCOUNT ON;
	set @State  =0
    set @Message =''

    -- =============================================
    -- DECLARE ALL VARIABLES
    -- =============================================
    DECLARE @JournalPrefix              nvarchar(100),
            @JournalDate                date,
            @JournalDescription         nvarchar(max),
            @JournalCurrency            nvarchar(3),
            @JournalExchangeRate        float,
            @OrginalDoucmentPrefix      nvarchar(2),
            @OrginalDoucmentNumber      int,
            @JournalSource              nvarchar(50),
            @JournalModelID             int,
            @Line                       int,
            @LineType                   nvarchar(max),
            @DebitBook                  float,
            @CreditBook                 float,
            @DebitTransaction           float,
            @CreditTransaction          float,
            @LineDescription            nvarchar(max),
            @Reference1                 nvarchar(max),
            @Reference2                 nvarchar(max),
            @Account                    nvarchar(50),
            @DebitorCreditor            nvarchar(50),
            @Customer                   nvarchar(50),
            @Vendor                     nvarchar(50),
            @Bank                       nvarchar(50),
            @Tax                        nvarchar(50),
            @Segment7                   nvarchar(50),
            @Segment8                   nvarchar(50),
            @Segment9                   nvarchar(50),
            @Segment10                  nvarchar(50),
            @Segment11                  nvarchar(50),
            @Segment12                  nvarchar(50),
            @Segment13                  nvarchar(50),
            @Segment14                  nvarchar(50),
            @Segment15                  nvarchar(50),
            @Segment16                  nvarchar(50),
            @IsLocked                   int,
            @AttachmentID               int,
            @Cnt                        int,
            @YearState                  int,
            @TotalDebitsBook            float,
            @TotalCreditsBook           float,
            @TotalDebitsTransaction     float,
            @TotalCreditsTransaction    float,
            @TotalLines                 int,
            @JournalInUse               int,
            @JournalInUseBy             nvarchar(50),
            @JournalYear                int,
            @JournalState               int,
            @LineState                  int,
            @JournalSeq                 int,
            @IsDocRelated               int,
            @CurrDebit                  decimal(18,5),
            @CurrCredit                 decimal(18,5),
            @CurrCurrency               nvarchar(5),
            @CurrRate                   decimal(18,5),
            @LineNumber                 int,
            @NewLineNumber              int ,
			@JournalNumber nvarchar (100)= '' , 
			@EventNumber int =0 ,
			@jNo nvarchar(100) = '',
			@eNo int = 0

    -- =============================================
    -- INITIALIZE STATE
    -- =============================================
    SET @State = 0
    SET @Message = ''

    -- =============================================
    -- LOG SP CALL
    -- =============================================
    --INSERT INTO SPUserLog (Username, ModuleName, SPName, SPOperation, AndroidVersion, DeskTopVerion, WebVersion, IOSVersion, CreatedDate, platForm, FireBaseToken, SqlStatement, lineData)
    --VALUES (@User, 'Control Panel', 'JournalOperation', @Operation, @AppVersionAndroid, @AppVersionDesktop, @AppVersionWeb, @AppVersionIos, GETDATE(), @PlatForm, @FireBaseToken, @SqlStatement, @LineData)
	insert into pro.SPlog 
		( Operation ,SqlStatement )
		Values 
		( @Operation , @SqlStatement ) 

    -- =============================================
    -- TEMP TABLES
    -- =============================================
    CREATE TABLE #TempHeader (JournalPrefix nvarchar(100), JournalDate date, JournalDescription nvarchar(max), JournalCurrency nvarchar(3), JournalExchangeRate float, OrginalDoucmentPrefix nvarchar(2), OrginalDoucmentNumber int, JournalSource nvarchar(50), JournalModelID int, AttachmentID int)
    CREATE TABLE #TempLine (Line int, LineType nvarchar(max), DebitBook float, CreditBook float, DebitTransaction float, CreditTransaction float, LineDescription nvarchar(max), Reference1 nvarchar(max), Reference2 nvarchar(max), Account nvarchar(50), DebitorCreditor nvarchar(50), Customer nvarchar(50), Vendor nvarchar(50), Bank nvarchar(50), Tax nvarchar(50), Segment7 nvarchar(50), Segment8 nvarchar(50), Segment9 nvarchar(50), Segment10 nvarchar(50), Segment11 nvarchar(50), Segment12 nvarchar(50), Segment13 nvarchar(50), Segment14 nvarchar(50), Segment15 nvarchar(50), Segment16 nvarchar(50), IsLocked int, LineCurrency nvarchar(3), LineExchangeRate float, IsDoucmentRelated int)

    -- =============================================
    -- GET JOURNAL NUMBER
    -- =============================================
    IF @Operation = 'Get Journal Number'
    BEGIN
        INSERT INTO #TempHeader
        SELECT * FROM OPENJSON(@LineData) WITH (JournalPrefix nvarchar(100), JournalDate date, JournalDescription nvarchar(max), JournalCurrency nvarchar(3), JournalExchangeRate float, OrginalDoucmentPrefix nvarchar(2), OrginalDoucmentNumber int, JournalSource nvarchar(50), JournalModelID int, AttachmentID int)

        SELECT TOP 1 @JournalPrefix = JournalPrefix, @JournalDate = JournalDate
        FROM #TempHeader

        SET @JournalDate = CONVERT(date, @JournalDate, 112)

        IF @JournalDate > CONVERT(date, GETDATE(), 112)
        BEGIN
            SET @State = 1
            SET @Message = 'Date is not valid'
            RETURN
        END

        SET @JournalYear = YEAR(@JournalDate)

        SELECT @Cnt = COUNT(*)
        FROM acc.JournalYearMasterHeader a
        WHERE a.JournalYear = @JournalYear

        IF @Cnt = 0
        BEGIN
            SET @State = 1
            SET @Message = 'No Journal Year is Opened'
            RETURN
        END

        SELECT @YearState = YearState
        FROM acc.JournalYearMasterHeader a
        WHERE a.JournalYear = @JournalYear

        IF @YearState <> 0
        BEGIN
            SET @State = 1
            SET @Message = 'Journal Year is Locked'
            RETURN
        END

        EXEC acc.JournalNumberGet @JournalYear, @JournalPrefix, @JournalNumber OUT, @Message OUT

        IF @JournalNumber <> ''
        BEGIN
            EXEC GetSequenceNo 29, @EventNumber OUT
        END
        RETURN
    END

    -- =============================================
    -- OPEN JOURNAL
    -- =============================================
    IF @Operation = 'Open Journal'
    BEGIN
        create Table #TempOpen ( JournalNo nvarchar(100), EventNo int )
		
		INSERT INTO #TempOpen
        SELECT * FROM OPENJSON(@LineData) WITH (JournalNo nvarchar(100), EventNo int )

        SELECT TOP 1 @JournalNumber = JournalNo , @EventNumber = EventNo
        FROM #TempOpen

        SELECT @JournalInUse = JournalInUse
        FROM acc.JournalHeader
        WHERE JournalNumber = @JournalNumber AND EventNumber = @EventNumber

        IF @JournalInUse <> 0
        BEGIN
            SELECT @JournalInUseBy = JournalInUseBy
            FROM acc.JournalHeader
            WHERE JournalNumber = @JournalNumber AND EventNumber = @EventNumber

            SET @State = 1
            SET @Message = 'Journal in Use By ' + @JournalInUseBy
            RETURN
        END

        UPDATE ACC.JournalHeader SET JournalInUse = 1, JournalInUseBy = @User
        WHERE JournalNumber = @JournalNumber AND EventNumber = @EventNumber

        DELETE FROM ACC.JournalLineWF
        WHERE JournalNo = @JournalNumber AND EventNo = @EventNumber

        INSERT INTO ACC.JournalLineWF 
		(EventNo, JournalNo, LineState, Line, DebitBook, CreditBook, DebitTransaction, CreditTransaction, LineDescription, Reference1, Reference2, Account, DebitorCreditor, Customer, Vendor, Bank, Tax, Segment7, Segment8, Segment9, Segment10, Segment11, Segment12, Segment13, Segment14, Segment15, Segment16, LineCreatedBy, LineCreatedDate, LineLastMaintBy, LineLastMaintDate, IsLocked, LineType, LineCurrency, LineExchangeRate, JournalDate, IsDoucmentRelated)
        SELECT 
		EventNo, JournalNo, LineState, Line, DebitBook, CreditBook, DebitTransaction, CreditTransaction, LineDescription, Reference1, Reference2, Account, DebitorCreditor, Customer, Vendor, Bank, Tax, Segment7, Segment8, Segment9, Segment10, Segment11, Segment12, Segment13, Segment14, Segment15, Segment16, LineCreatedBy, LineCreatedDate, LineLastMaintBy, LineLastMaintDate, IsLocked, LineType, LineCurrency, LineExchangeRate, JournalDate, IsDoucmentRelated
        FROM [PLS].[QJournalLine]
        WHERE JournalNo = @JournalNumber AND EventNo = @EventNumber
		select * from [PLS].[QJournalHeader] where JournalNumber=@JournalNumber and EventNumber=@EventNumber


			SELECT        JL.EventNo,   jl.JournalNo, JL.LineState, 
                         JL.Line, JL.DebitBook, JL.CreditBook, JL.DebitTransaction, JL.CreditTransaction, JL.LineDescription, JL.Reference1, JL.Reference2, JL.Account, JL.DebitorCreditor, JL.Customer, JL.Vendor, JL.Bank, JL.Tax, JL.Segment7, 
                         JL.Segment8, JL.Segment9, JL.Segment10, JL.Segment11, JL.Segment12, JL.Segment13, JL.Segment14, JL.Segment15, JL.Segment16, JL.LineCreatedBy, JL.LineCreatedDate, JL.LineLastMaintBy, JL.LineLastMaintDate, 
                         JL.IsLocked, JL.IsDoucmentRelated, AM.AccountDescription, DCM.DRName, CM.CustomerExtraName, VM.VendorExtraName, BAM.BankAccountName, S7.ValueDescription AS Segment7Description, S8.ValueDescription AS Segment8Description, 
                         S9.ValueDescription AS Segment9Description, S10.ValueDescription AS Segment10Description, S11.ValueDescription AS Segment11Description, JL.LineCurrency, JL.LineExchangeRate, 
                         S12.ValueDescription AS Segment12Description, S13.ValueDescription AS Segment13Description, S14.ValueDescription AS Segment14Description, S15.ValueDescription AS Segment15Description, 
                         S16.ValueDescription AS Segment16Description, CM.AccountantID AS CustomerAccountantID, VM.AccountantID AS VendorAccountantID, AM.AccountType, AM.AllowPostingJournal, CASE WHEN jl.Customer = '10063' THEN
                             (SELECT        CustomerExtraName
                                FROM            ACR.CustomerMaster mm
                                WHERE        mm.CustomerNo = JL.Reference1) ELSE '' END AS ManarahCustomerExtraName, T.TaxAccountDescription
FROM           
                         ACC.JournalLineWf AS JL  LEFT OUTER JOIN
                         ACC.AccountsMaster AS AM ON AM.AccountNumber = JL.Account LEFT OUTER JOIN
                         ACC.DebetorCreditorMaster AS DCM ON DCM.DRNumber = JL.DebitorCreditor LEFT OUTER JOIN
                         ACR.CustomerMaster AS CM ON CM.CustomerNo = JL.Customer LEFT OUTER JOIN
                         ACP.VendorMaster AS VM ON VM.VendorNumber = JL.Vendor LEFT OUTER JOIN
                         ACC.BankAccountsMaster AS BAM ON BAM.BankAccountNumber = JL.Bank LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S7 ON JL.Segment7 = S7.SegmentValue AND S7.SegmentID = 7 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S8 ON JL.Segment8 = S8.SegmentValue AND S8.SegmentID = 8 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S9 ON JL.Segment9 = S9.SegmentValue AND S9.SegmentID = 9 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S10 ON JL.Segment10 = S10.SegmentValue AND S10.SegmentID = 10 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S11 ON JL.Segment11 = S11.SegmentValue AND S11.SegmentID = 11 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S12 ON JL.Segment12 = S12.SegmentValue AND S12.SegmentID = 12 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S13 ON JL.Segment13 = S13.SegmentValue AND S13.SegmentID = 13 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S14 ON JL.Segment14 = S14.SegmentValue AND S14.SegmentID = 14 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S15 ON JL.Segment15 = S15.SegmentValue AND S15.SegmentID = 15 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S16 ON JL.Segment16 = S16.SegmentValue AND S16.SegmentID = 16 LEFT OUTER JOIN
                         ACC.TaxAccountMaster AS T ON JL.Tax = T.TaxAccount WHERE JournalNo = @JournalNumber AND EventNo = @EventNumber







        RETURN
    END

    -- =============================================
    -- OPEN ERROR JOURNAL
    -- =============================================
    IF @Operation = 'Open Error Journal'
    BEGIN
        INSERT INTO #TempHeader
        SELECT * FROM OPENJSON(@LineData) WITH (JournalPrefix nvarchar(100), JournalDate date, JournalDescription nvarchar(max), JournalCurrency nvarchar(3), JournalExchangeRate float, OrginalDoucmentPrefix nvarchar(2), OrginalDoucmentNumber int, JournalSource nvarchar(50), JournalModelID int, AttachmentID int)

        SELECT TOP 1 @JournalNumber = JournalPrefix, @EventNumber = OrginalDoucmentNumber
        FROM #TempHeader

        SELECT @JournalInUse = JournalInUse
        FROM acc.JournalHeader
        WHERE JournalNumber = @JournalNumber AND EventNumber = @EventNumber

        IF @JournalInUse <> 0
        BEGIN
            SELECT @JournalInUseBy = JournalInUseBy
            FROM acc.JournalHeader
            WHERE JournalNumber = @JournalNumber AND EventNumber = @EventNumber

            SET @State = 1
            SET @Message = 'Journal in Use By ' + @JournalInUseBy
            RETURN
        END

        UPDATE ACC.JournalHeader SET JournalInUse = 1, JournalInUseBy = @User
        WHERE JournalNumber = @JournalNumber

        DELETE FROM ACC.JournalLineWF
        WHERE JournalNo = @JournalNumber

        INSERT INTO ACC.JournalLineWF (EventNo, JournalNo, LineState, Line, DebitBook, CreditBook, DebitTransaction, CreditTransaction, LineDescription, Reference1, Reference2, Account, DebitorCreditor, Customer, Vendor, Bank, Tax, Segment7, Segment8, Segment9, Segment10, Segment11, Segment12, Segment13, Segment14, Segment15, Segment16, LineCreatedBy, LineCreatedDate, LineLastMaintBy, LineLastMaintDate, IsLocked, LineType, LineCurrency, LineExchangeRate, JournalDate, IsDoucmentRelated)
        SELECT EventNo, JournalNo, LineState, Line, DebitBook, CreditBook, DebitTransaction, CreditTransaction, LineDescription, Reference1, Reference2, Account, DebitorCreditor, Customer, Vendor, Bank, Tax, Segment7, Segment8, Segment9, Segment10, Segment11, Segment12, Segment13, Segment14, Segment15, Segment16, LineCreatedBy, LineCreatedDate, LineLastMaintBy, LineLastMaintDate, IsLocked, LineType, LineCurrency, LineExchangeRate, JournalDate, IsDoucmentRelated
        FROM [PLS].[QJournalLineError]
        WHERE JournalNo = @JournalNumber
        RETURN
    END

    -- =============================================
    -- CLOSE JOURNAL
    -- =============================================
    IF @Operation = 'Close Journal'
    BEGIN
        create Table #TempClose ( JournalNo nvarchar(100), EventNo int )
		
		INSERT INTO #TempClose
        SELECT * FROM OPENJSON(@LineData) WITH (JournalNo nvarchar(100), EventNo int )

        SELECT TOP 1 @JournalNumber = JournalNo , @EventNumber = EventNo
        FROM #TempClose


        UPDATE ACC.JournalHeader SET JournalInUse = 0
        WHERE JournalNumber = @JournalNumber AND EventNumber = @EventNumber
        RETURN
    END

    -- =============================================
    -- NEW / EDIT JOURNAL HEADER
    -- =============================================
    IF @Operation IN ('New Journal Header', 'Edit Journal Header')
    BEGIN
        

        INSERT INTO #TempLine
        SELECT * FROM OPENJSON(@LineMember)
		 WITH (Line int, LineType nvarchar(max), DebitBook float, CreditBook float, DebitTransaction float, CreditTransaction float,
		  LineDescription nvarchar(max), Reference1 nvarchar(max), Reference2 nvarchar(max), Account nvarchar(50), DebitorCreditor nvarchar(50), Customer nvarchar(50), Vendor nvarchar(50), Bank nvarchar(50), Tax nvarchar(50), Segment7 nvarchar(50), Segment8 nvarchar(50), Segment9 nvarchar(50), Segment10 nvarchar(50), Segment11 nvarchar(50), Segment12 nvarchar(50), Segment13 nvarchar(50), Segment14 nvarchar(50), Segment15 nvarchar(50), Segment16 nvarchar(50), IsLocked int, LineCurrency nvarchar(3), LineExchangeRate float, IsDoucmentRelated int)
		   SELECT @TotalDebitsBook = SUM(DebitBook), @TotalCreditsBook = SUM(CreditBook), @TotalDebitsTransaction = SUM(DebitTransaction),
			 @TotalCreditsTransaction = SUM(CreditTransaction), @TotalLines = COUNT(*)
			  FROM #TempLine
        

       

        IF (ABS(@TotalDebitsBook - @TotalCreditsBook) >= 0.01) OR (ABS(@TotalDebitsTransaction - @TotalCreditsTransaction) >= 0.01) OR (@TotalLines = 0)
        BEGIN
            SET @State = 1
            SET @Message = 'Error in Total Debit or Credit'
            RETURN
        END

        IF @Operation = 'New Journal Header'
        BEGIN
            
			 CREATE TABLE #TempHeader1
			  (JournalPrefix nvarchar(100), JournalDate date, JournalDescription nvarchar(max) )

              INSERT INTO #TempHeader1
              SELECT * FROM OPENJSON(@LineData)
              WITH (JournalPrefix nvarchar(100), JournalDate date, JournalDescription nvarchar(max))

			  select @JournalPrefix= JournalPrefix ,@JournalDate= JournalDate , @JournalDescription= JournalDescription from #TempHeader1 
			  set @JournalYear=year ( @JournalDate) 
			  EXEC acc.JournalNumberGet @JournalYear, @JournalPrefix, @JournalNumber OUT, @Message OUT

			IF @JournalNumber <> ''
			BEGIN
				EXEC GetSequenceNo 29, @EventNumber OUT
			END
            
			IF @JournalNumber = '' OR @EventNumber = 0
			BEGIN
				SET @State = 1
				SET @Message = 'Failed to generate Journal Number or Event Number'
				RETURN
			END

            INSERT INTO [ACC].JournalHeader (
			EventNumber, JournalYear, JournalDate, JournalNumber, JournalDescription, TotalDebitsBook, TotalCreditsBook, TotalDebitsTransaction, 
			TotalCreditsTransaction, TotalLines, JournalCurrency, JournalExchangeRate, JournalCreatedBy, JournalCreatedDate, 
			OrginalDoucmentPrefix, OrginalDoucmentNumber, JournalSource, JournalModelID , PostBy , JournalState , JournalLastMaintBy , JournalInUse
			, JournalInUseBy , AttachmentID)
            select 
			@EventNumber, @JournalYear, JournalDate, @JournalNumber, JournalDescription, @TotalDebitsBook, @TotalCreditsBook, @TotalDebitsTransaction, 
			@TotalCreditsTransaction, @TotalLines, '', 0 , @User, GETDATE(), '', 0, '', 0 , '' , 0 , '' , 0 , '' , 0
			from #TempHeader1


            INSERT INTO [ACC].JournalLine (EventNo, JournalNo, Line, LineType, DebitBook, CreditBook, DebitTransaction, CreditTransaction, LineDescription, Reference1, Reference2, Account, DebitorCreditor, Customer, Vendor, Bank, Tax, Segment7, Segment8, Segment9, Segment10, Segment11, Segment12, Segment13, Segment14, Segment15, Segment16, LineCreatedBy, LineCreatedDate, IsLocked, JournalDate, LineCurrency, LineExchangeRate, IsDoucmentRelated, LineState, LineLastMaintBy, LineLastMaintDate)
            SELECT @EventNumber, @JournalNumber, Line, LineType, DebitBook, CreditBook, DebitTransaction, CreditTransaction, LineDescription, Reference1, Reference2, Account, DebitorCreditor, Customer, Vendor, Bank, Tax, Segment7, Segment8, Segment9, Segment10, Segment11, Segment12, Segment13, Segment14, Segment15, Segment16, @User, GETDATE(), IsLocked, @JournalDate, LineCurrency, LineExchangeRate, IsDoucmentRelated, 0, @User, GETDATE()
            FROM #TempLine
          

            SELECT *
            FROM [PLS].[QJournalHeader]
            WHERE JournalNumber = @JournalNumber AND EventNumber = @EventNumber

            SELECT        JL.EventNo,   jl.JournalNo, JL.LineState, 
                         JL.Line, JL.DebitBook, JL.CreditBook, JL.DebitTransaction, JL.CreditTransaction, JL.LineDescription, JL.Reference1, JL.Reference2, JL.Account, JL.DebitorCreditor, JL.Customer, JL.Vendor, JL.Bank, JL.Tax, JL.Segment7, 
                         JL.Segment8, JL.Segment9, JL.Segment10, JL.Segment11, JL.Segment12, JL.Segment13, JL.Segment14, JL.Segment15, JL.Segment16, JL.LineCreatedBy, JL.LineCreatedDate, JL.LineLastMaintBy, JL.LineLastMaintDate, 
                         JL.IsLocked, JL.IsDoucmentRelated, AM.AccountDescription, DCM.DRName, CM.CustomerExtraName, VM.VendorExtraName, BAM.BankAccountName, S7.ValueDescription AS Segment7Description, S8.ValueDescription AS Segment8Description, 
                         S9.ValueDescription AS Segment9Description, S10.ValueDescription AS Segment10Description, S11.ValueDescription AS Segment11Description, JL.LineCurrency, JL.LineExchangeRate, 
                         S12.ValueDescription AS Segment12Description, S13.ValueDescription AS Segment13Description, S14.ValueDescription AS Segment14Description, S15.ValueDescription AS Segment15Description, 
                         S16.ValueDescription AS Segment16Description, CM.AccountantID AS CustomerAccountantID, VM.AccountantID AS VendorAccountantID, AM.AccountType, AM.AllowPostingJournal, CASE WHEN jl.Customer = '10063' THEN
                             (SELECT        CustomerExtraName
                                FROM            ACR.CustomerMaster mm
                                WHERE        mm.CustomerNo = JL.Reference1) ELSE '' END AS ManarahCustomerExtraName, T.TaxAccountDescription
FROM           
                         ACC.JournalLine AS JL  LEFT OUTER JOIN
                         ACC.AccountsMaster AS AM ON AM.AccountNumber = JL.Account LEFT OUTER JOIN
                         ACC.DebetorCreditorMaster AS DCM ON DCM.DRNumber = JL.DebitorCreditor LEFT OUTER JOIN
                         ACR.CustomerMaster AS CM ON CM.CustomerNo = JL.Customer LEFT OUTER JOIN
                         ACP.VendorMaster AS VM ON VM.VendorNumber = JL.Vendor LEFT OUTER JOIN
                         ACC.BankAccountsMaster AS BAM ON BAM.BankAccountNumber = JL.Bank LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S7 ON JL.Segment7 = S7.SegmentValue AND S7.SegmentID = 7 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S8 ON JL.Segment8 = S8.SegmentValue AND S8.SegmentID = 8 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S9 ON JL.Segment9 = S9.SegmentValue AND S9.SegmentID = 9 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S10 ON JL.Segment10 = S10.SegmentValue AND S10.SegmentID = 10 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S11 ON JL.Segment11 = S11.SegmentValue AND S11.SegmentID = 11 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S12 ON JL.Segment12 = S12.SegmentValue AND S12.SegmentID = 12 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S13 ON JL.Segment13 = S13.SegmentValue AND S13.SegmentID = 13 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S14 ON JL.Segment14 = S14.SegmentValue AND S14.SegmentID = 14 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S15 ON JL.Segment15 = S15.SegmentValue AND S15.SegmentID = 15 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S16 ON JL.Segment16 = S16.SegmentValue AND S16.SegmentID = 16 LEFT OUTER JOIN
                         ACC.TaxAccountMaster AS T ON JL.Tax = T.TaxAccount WHERE JournalNo = @JournalNumber AND EventNo = @EventNumber
            RETURN
        END

        IF @Operation = 'Edit Journal Header'
        BEGIN
              
			  create table #TempJrn  ( JournalNo nvarchar(100), JournalDate date, JournalDescription nvarchar(max) , EventNo int ) 
				INSERT INTO #TempJrn
				 SELECT * FROM OPENJSON(@LineData)
				 WITH (JournalNo nvarchar(100), JournalDate date, JournalDescription nvarchar(max) , EventNo int )
			  
			  
			  
			  
			  
			  
			  SELECT TOP 1 @JournalNumber = JournalNo , @EventNumber = EventNo , @JournalDescription = JournalDescription , @JournalDate=JournalDate
			  FROM #TempJrn
			  set @JournalYear=year(@JournalDate ) 
            SELECT @OrginalDoucmentNumber = OrginalDoucmentNumber
            FROM acc.JournalHeader
            WHERE EventNumber = @EventNumber AND JournalNumber = @JournalNumber

            SELECT @Cnt = COUNT(*)
            FROM acc.JournalLine
            WHERE JournalNo = @JournalNumber AND IsDoucmentRelated = 1

            IF NOT ((@OrginalDoucmentNumber = 0) OR (@OrginalDoucmentNumber <> 0 AND @Cnt <> 0))
            BEGIN
                SET @State = 1
                SET @Message = 'There is Error in Journal Check with Support'
                RETURN
            END

            -- ── Begin transaction with full TRY/CATCH/ROLLBACK ──────────────
            BEGIN TRANSACTION

            BEGIN TRY

                UPDATE [ACC].JournalHeader
                SET    JournalYear              = @JournalYear,
                       JournalDate              = @JournalDate,
                       JournalDescription       = @JournalDescription,
                       TotalDebitsBook          = @TotalDebitsBook,
                       TotalCreditsBook         = @TotalCreditsBook,
                       TotalDebitsTransaction   = @TotalDebitsTransaction,
                       TotalCreditsTransaction  = @TotalCreditsTransaction,
                       TotalLines               = @TotalLines,
                       JournalCurrency          = '',
                       JournalExchangeRate      = 1,
                       JournalLastMaintBy       = @User,
                       JournalLastMaintDate     = GETDATE()
                WHERE  EventNumber = @EventNumber AND JournalNumber = @JournalNumber

                DELETE FROM acc.JournalLineWF
                WHERE  EventNo = @EventNumber AND JournalNo = @JournalNumber

                INSERT INTO [ACC].JournalLineWF
                    (EventNo, JournalNo, Line, LineType, DebitBook, CreditBook, DebitTransaction, CreditTransaction,
                     LineDescription, Reference1, Reference2, Account, DebitorCreditor, Customer, Vendor, Bank, Tax,
                     Segment7, Segment8, Segment9, Segment10, Segment11, Segment12, Segment13, Segment14, Segment15, Segment16,
                     LineCreatedBy, LineCreatedDate, IsLocked, JournalDate, LineCurrency, LineExchangeRate, IsDoucmentRelated , LineState , 
					 LineLastMaintBy , LineLastMaintDate  )
                SELECT @EventNumber, @JournalNumber, Line, LineType, DebitBook, CreditBook, DebitTransaction, CreditTransaction,
                       LineDescription, Reference1, Reference2, Account, DebitorCreditor, Customer, Vendor, Bank, Tax,
                       Segment7, Segment8, Segment9, Segment10, Segment11, Segment12, Segment13, Segment14, Segment15, Segment16,
                       @User, GETDATE(), IsLocked, @JournalDate, LineCurrency, LineExchangeRate, IsDoucmentRelated , 0  , @user , getdate() 
                FROM   #TempLine

                DELETE FROM [ACC].JournalLine
                WHERE  JournalNo = @JournalNumber AND EventNo = @EventNumber

                INSERT INTO [ACC].JournalLine
                    (EventNo, JournalNo, Line, LineType, DebitBook, CreditBook, DebitTransaction, CreditTransaction,
                     LineDescription, Reference1, Reference2, Account, DebitorCreditor, Customer, Vendor, Bank, Tax,
                     Segment7, Segment8, Segment9, Segment10, Segment11, Segment12, Segment13, Segment14, Segment15, Segment16,
                     LineCreatedBy, LineCreatedDate, IsLocked, JournalDate, LineCurrency, LineExchangeRate, IsDoucmentRelated , LineState , LineLastMaintBy , LineLastMaintDate)
                SELECT EventNo, JournalNo, Line, LineType, DebitBook, CreditBook, DebitTransaction, CreditTransaction,
                       LineDescription, Reference1, Reference2, Account, DebitorCreditor, Customer, Vendor, Bank, Tax,
                       Segment7, Segment8, Segment9, Segment10, Segment11, Segment12, Segment13, Segment14, Segment15, Segment16,
                       LineCreatedBy, LineCreatedDate, IsLocked, JournalDate, LineCurrency, LineExchangeRate, IsDoucmentRelated , LineState , LineLastMaintBy , LineLastMaintDate
                FROM   [PLS].[QJournalLineWF]
                WHERE  JournalNo = @JournalNumber AND EventNo = @EventNumber

                -- Release lock only on success
                UPDATE ACC.JournalHeader SET JournalInUse = 0
                WHERE  JournalNumber = @JournalNumber AND EventNumber = @EventNumber

                COMMIT TRANSACTION

                -- Return committed data to the caller
                SELECT * FROM [PLS].[QJournalHeader]
                WHERE  JournalNumber = @JournalNumber AND EventNumber = @EventNumber

                SELECT        JL.EventNo,   jl.JournalNo, JL.LineState, 
                         JL.Line, JL.DebitBook, JL.CreditBook, JL.DebitTransaction, JL.CreditTransaction, JL.LineDescription, JL.Reference1, JL.Reference2, JL.Account, JL.DebitorCreditor, JL.Customer, JL.Vendor, JL.Bank, JL.Tax, JL.Segment7, 
                         JL.Segment8, JL.Segment9, JL.Segment10, JL.Segment11, JL.Segment12, JL.Segment13, JL.Segment14, JL.Segment15, JL.Segment16, JL.LineCreatedBy, JL.LineCreatedDate, JL.LineLastMaintBy, JL.LineLastMaintDate, 
                         JL.IsLocked, JL.IsDoucmentRelated, AM.AccountDescription, DCM.DRName, CM.CustomerExtraName, VM.VendorExtraName, BAM.BankAccountName, S7.ValueDescription AS Segment7Description, S8.ValueDescription AS Segment8Description, 
                         S9.ValueDescription AS Segment9Description, S10.ValueDescription AS Segment10Description, S11.ValueDescription AS Segment11Description, JL.LineCurrency, JL.LineExchangeRate, 
                         S12.ValueDescription AS Segment12Description, S13.ValueDescription AS Segment13Description, S14.ValueDescription AS Segment14Description, S15.ValueDescription AS Segment15Description, 
                         S16.ValueDescription AS Segment16Description, CM.AccountantID AS CustomerAccountantID, VM.AccountantID AS VendorAccountantID, AM.AccountType, AM.AllowPostingJournal, CASE WHEN jl.Customer = '10063' THEN
                             (SELECT        CustomerExtraName
                                FROM            ACR.CustomerMaster mm
                                WHERE        mm.CustomerNo = JL.Reference1) ELSE '' END AS ManarahCustomerExtraName, T.TaxAccountDescription
FROM           
                         ACC.JournalLineWf AS JL  LEFT OUTER JOIN
                         ACC.AccountsMaster AS AM ON AM.AccountNumber = JL.Account LEFT OUTER JOIN
                         ACC.DebetorCreditorMaster AS DCM ON DCM.DRNumber = JL.DebitorCreditor LEFT OUTER JOIN
                         ACR.CustomerMaster AS CM ON CM.CustomerNo = JL.Customer LEFT OUTER JOIN
                         ACP.VendorMaster AS VM ON VM.VendorNumber = JL.Vendor LEFT OUTER JOIN
                         ACC.BankAccountsMaster AS BAM ON BAM.BankAccountNumber = JL.Bank LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S7 ON JL.Segment7 = S7.SegmentValue AND S7.SegmentID = 7 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S8 ON JL.Segment8 = S8.SegmentValue AND S8.SegmentID = 8 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S9 ON JL.Segment9 = S9.SegmentValue AND S9.SegmentID = 9 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S10 ON JL.Segment10 = S10.SegmentValue AND S10.SegmentID = 10 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S11 ON JL.Segment11 = S11.SegmentValue AND S11.SegmentID = 11 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S12 ON JL.Segment12 = S12.SegmentValue AND S12.SegmentID = 12 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S13 ON JL.Segment13 = S13.SegmentValue AND S13.SegmentID = 13 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S14 ON JL.Segment14 = S14.SegmentValue AND S14.SegmentID = 14 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S15 ON JL.Segment15 = S15.SegmentValue AND S15.SegmentID = 15 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S16 ON JL.Segment16 = S16.SegmentValue AND S16.SegmentID = 16 LEFT OUTER JOIN
                         ACC.TaxAccountMaster AS T ON JL.Tax = T.TaxAccount WHERE JournalNo = @JournalNumber AND EventNo = @EventNumber

            END TRY
            BEGIN CATCH

                IF @@TRANCOUNT > 0
                    ROLLBACK TRANSACTION

                -- Always release the lock even on failure so the user is not stuck
                UPDATE ACC.JournalHeader SET JournalInUse = 0
                WHERE  JournalNumber = @JournalNumber AND EventNumber = @EventNumber

                SET @State   = 1
                SET @Message = 'Save failed: ' + ERROR_MESSAGE()
                            + ' (Line ' + CAST(ERROR_LINE() AS nvarchar) + ')'
                RETURN

            END CATCH
            -- ────────────────────────────────────────────────────────────────

            RETURN
        END
    END


    -- =============================================
    -- DELETE JOURNAL HEADER
    -- =============================================
    IF @Operation = 'Delete Journal Header'
    BEGIN
        INSERT INTO #TempHeader
        SELECT * FROM OPENJSON(@LineData) WITH (JournalPrefix nvarchar(100), JournalDate date, JournalDescription nvarchar(max), JournalCurrency nvarchar(3), JournalExchangeRate float, OrginalDoucmentPrefix nvarchar(2), OrginalDoucmentNumber int, JournalSource nvarchar(50), JournalModelID int, AttachmentID int)

        SELECT TOP 1 @JournalNumber = JournalPrefix, @EventNumber = OrginalDoucmentNumber
        FROM #TempHeader

        SELECT @OrginalDoucmentNumber = OrginalDoucmentNumber
        FROM acc.JournalHeader
        WHERE EventNumber = @EventNumber AND JournalNumber = @JournalNumber

        IF @OrginalDoucmentNumber <> 0
        BEGIN
            SET @State = 1
            SET @Message = 'Journal is linked to document'
            RETURN
        END

        DELETE FROM acc.JournalHeader
        WHERE EventNumber = @EventNumber AND JournalNumber = @JournalNumber

        DELETE FROM acc.JournalLine
        WHERE EventNo = @EventNumber AND JournalNo = @JournalNumber

        DELETE FROM acc.JournalLineWF
        WHERE EventNo = @EventNumber AND JournalNo = @JournalNumber
        RETURN
    END

    -- =============================================
    -- SAVE ATTACHMENT
    -- =============================================
    IF @Operation = 'Save Attachment'
    BEGIN
        INSERT INTO #TempHeader
        SELECT * FROM OPENJSON(@LineData) WITH (JournalPrefix nvarchar(100), JournalDate date, JournalDescription nvarchar(max), JournalCurrency nvarchar(3), JournalExchangeRate float, OrginalDoucmentPrefix nvarchar(2), OrginalDoucmentNumber int, JournalSource nvarchar(50), JournalModelID int, AttachmentID int)

        SELECT TOP 1 @JournalNumber = JournalPrefix, @EventNumber = OrginalDoucmentNumber, @AttachmentID = AttachmentID
        FROM #TempHeader

        UPDATE ACC.JournalHeader SET AttachmentID = @AttachmentID, JournalLastMaintBy = @User, JournalLastMaintDate = GETDATE()
        WHERE JournalNumber = @JournalNumber AND EventNumber = @EventNumber
        RETURN
    END

    -- =============================================
    -- POST JOURNAL
    -- =============================================
    IF @Operation = 'Post Journal'
    BEGIN
        INSERT INTO #TempHeader
        SELECT * FROM OPENJSON(@LineData) WITH (JournalPrefix nvarchar(100), JournalDate date, JournalDescription nvarchar(max), JournalCurrency nvarchar(3), JournalExchangeRate float, OrginalDoucmentPrefix nvarchar(2), OrginalDoucmentNumber int, JournalSource nvarchar(50), JournalModelID int, AttachmentID int)

        SELECT TOP 1 @JournalNumber = JournalPrefix, @EventNumber = OrginalDoucmentNumber
        FROM #TempHeader

        SELECT @JournalState = JournalState
        FROM acc.JournalHeader
        WHERE JournalNumber = @JournalNumber

        IF @JournalState <> 0
        BEGIN
            SET @State = 1
            SET @Message = 'Journal is Posted'
            RETURN
        END

        UPDATE acc.JournalHeader SET JournalState = 10, PostBy = @User, PostDate = GETDATE()
        WHERE JournalNumber = @JournalNumber
        RETURN
    END

    -- =============================================
    -- UNPOST JOURNAL
    -- =============================================
    IF @Operation = 'Unpost Journal'
    BEGIN
        INSERT INTO #TempHeader
        SELECT * FROM OPENJSON(@LineData) WITH (JournalPrefix nvarchar(100), JournalDate date, JournalDescription nvarchar(max), JournalCurrency nvarchar(3), JournalExchangeRate float, OrginalDoucmentPrefix nvarchar(2), OrginalDoucmentNumber int, JournalSource nvarchar(50), JournalModelID int, AttachmentID int)

        SELECT TOP 1 @JournalNumber = JournalPrefix, @EventNumber = OrginalDoucmentNumber
        FROM #TempHeader

        SELECT @JournalState = JournalState
        FROM acc.JournalHeader
        WHERE JournalNumber = @JournalNumber

        IF @JournalState <> 10
        BEGIN
            SET @State = 1
            SET @Message = 'Journal is Not Posted'
            RETURN
        END

        UPDATE acc.JournalHeader SET JournalState = 0, PostBy = '', PostDate = NULL
        WHERE JournalNumber = @JournalNumber
        RETURN
    END

		if @operation='Get Journal For Edit'
	begin
		set @jNo = json_value(@LineData, '$.JournalNo')
		set @eNo = json_value(@LineData, '$.EventNo')
		
		select * from [PLS].[QJournalHeader] where JournalNumber=@jNo and EventNumber=@eNo
		select * from [PLS].[QJournalLineWF]  WHERE JournalNo = @jNo AND EventNo = @eNo
		return 
	end
	if @operation='Get Journal For View'
	begin
		set @jNo = json_value(@LineData, '$.JournalNo')
		set @eNo = json_value(@LineData, '$.EventNo')
		
		select * from acc.JournalHeader where JournalNumber=@jNo and EventNumber=@eNo
		SELECT        JL.EventNo,   jl.JournalNo, JL.EventNo, JL.LineState, 
                         JL.Line, JL.DebitBook, JL.CreditBook, JL.DebitTransaction, JL.CreditTransaction, JL.LineDescription, JL.Reference1, JL.Reference2, JL.Account, JL.DebitorCreditor, JL.Customer, JL.Vendor, JL.Bank, JL.Tax, JL.Segment7, 
                         JL.Segment8, JL.Segment9, JL.Segment10, JL.Segment11, JL.Segment12, JL.Segment13, JL.Segment14, JL.Segment15, JL.Segment16, JL.LineCreatedBy, JL.LineCreatedDate, JL.LineLastMaintBy, JL.LineLastMaintDate, 
                         JL.IsLocked, AM.AccountDescription, DCM.DRName, CM.CustomerExtraName, VM.VendorExtraName, BAM.BankAccountName, S7.ValueDescription AS Segment7Description, S8.ValueDescription AS Segment8Description, 
                         S9.ValueDescription AS Segment9Description, S10.ValueDescription AS Segment10Description, S11.ValueDescription AS Segment11Description, JL.LineCurrency, JL.LineExchangeRate, 
                         S12.ValueDescription AS Segment12Description, S13.ValueDescription AS Segment13Description, S14.ValueDescription AS Segment14Description, S15.ValueDescription AS Segment15Description, 
                         S16.ValueDescription AS Segment16Description, CM.AccountantID AS CustomerAccountantID, VM.AccountantID AS VendorAccountantID, AM.AccountType, AM.AllowPostingJournal, CASE WHEN jl.Customer = '10063' THEN
                             (SELECT        CustomerExtraName
                                FROM            ACR.CustomerMaster mm
                                WHERE        mm.CustomerNo = JL.Reference1) ELSE '' END AS ManarahCustomerExtraName, T.TaxAccountDescription
FROM           
                         ACC.JournalLine AS JL  LEFT OUTER JOIN
                         ACC.AccountsMaster AS AM ON AM.AccountNumber = JL.Account LEFT OUTER JOIN
                         ACC.DebetorCreditorMaster AS DCM ON DCM.DRNumber = JL.DebitorCreditor LEFT OUTER JOIN
                         ACR.CustomerMaster AS CM ON CM.CustomerNo = JL.Customer LEFT OUTER JOIN
                         ACP.VendorMaster AS VM ON VM.VendorNumber = JL.Vendor LEFT OUTER JOIN
                         ACC.BankAccountsMaster AS BAM ON BAM.BankAccountNumber = JL.Bank LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S7 ON JL.Segment7 = S7.SegmentValue AND S7.SegmentID = 7 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S8 ON JL.Segment8 = S8.SegmentValue AND S8.SegmentID = 8 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S9 ON JL.Segment9 = S9.SegmentValue AND S9.SegmentID = 9 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S10 ON JL.Segment10 = S10.SegmentValue AND S10.SegmentID = 10 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S11 ON JL.Segment11 = S11.SegmentValue AND S11.SegmentID = 11 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S12 ON JL.Segment12 = S12.SegmentValue AND S12.SegmentID = 12 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S13 ON JL.Segment13 = S13.SegmentValue AND S13.SegmentID = 13 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S14 ON JL.Segment14 = S14.SegmentValue AND S14.SegmentID = 14 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S15 ON JL.Segment15 = S15.SegmentValue AND S15.SegmentID = 15 LEFT OUTER JOIN
                         ACC.SegmentsMaster AS S16 ON JL.Segment16 = S16.SegmentValue AND S16.SegmentID = 16 LEFT OUTER JOIN
                         ACC.TaxAccountMaster AS T ON JL.Tax = T.TaxAccount WHERE JournalNo = @jNo AND EventNo = @eNo
		return 
	end










    -- =============================================
    -- JOURNAL MODEL OPERATIONS
    -- =============================================
    
    IF @Operation = 'Debug Schema'
    BEGIN
        SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME IN ('AccountingFunctionsHeader', 'AccountingFunctionDoucmentHeader', 'AccountingFunctionDoucmentDetails', 'AccountingFunctionDoucmentSequence')
        RETURN
    END
    
    IF @Operation = 'Get Active Segment Definitions'
    BEGIN
        SELECT SegmentID, SegmentDescription, IsActive, SourceType, SourceFile, KeyField, DisplayField 
        FROM [PLS].[QGetActiveSegmentDefinitions]
        ORDER BY SegmentID
        RETURN
    END

    IF @Operation = 'Get Table Columns'
    BEGIN
        DECLARE @FullName nvarchar(max) = JSON_VALUE(@LineData, '$.TableName')
        DECLARE @Schema nvarchar(max) = ISNULL(PARSENAME(@FullName, 2), 'dbo')
        DECLARE @Table nvarchar(max) = PARSENAME(@FullName, 1)

        IF @Table IS NULL
        BEGIN
            SET @Table = @FullName
        END

        SELECT 
            ColumnName as Name, 
            ColumnName as Description 
        FROM [PLS].[QGetTableColumns]
        WHERE TableSchema = @Schema AND TableName = @Table
        ORDER BY OrdinalPosition

        RETURN
    END

    IF @Operation = 'Get Model Segment Lookup'
    BEGIN
        DECLARE @LookupTable nvarchar(max) = JSON_VALUE(@LineData, '$.TableName')
        DECLARE @LookupVal nvarchar(max) = JSON_VALUE(@LineData, '$.ValueField')
        DECLARE @LookupDesc nvarchar(max) = JSON_VALUE(@LineData, '$.DescriptionField')
        DECLARE @LookupCond nvarchar(max) = JSON_VALUE(@LineData, '$.Condition')

        -- Fallbacks in case details are misconfigured
        IF ISNULL(@LookupTable, '') = '' SET @LookupTable = 'ACC.SegmentsMaster'
        IF ISNULL(@LookupVal, '') = '' SET @LookupVal = 'SegmentValue'
        IF ISNULL(@LookupDesc, '') = '' SET @LookupDesc = 'ValueDescription'

        DECLARE @DynSql nvarchar(max) = 'SELECT ' + QUOTENAME(@LookupVal) + ' as value, ' + QUOTENAME(@LookupDesc) + ' as label FROM ' + @LookupTable
        
        IF ISNULL(@LookupCond, '') <> ''
        BEGIN
            SET @DynSql = @DynSql + ' WHERE ' + @LookupCond
        END

        EXEC sp_executesql @DynSql
        RETURN
    END

    IF @Operation = 'Get Journal Model List'
    BEGIN
        DECLARE @SQLFilter_ModelList NVARCHAR(MAX) = NULL;
        DECLARE @IsAdmin_ModelList BIT = 0;
        IF @User = 'sysadmin'
        BEGIN
            SET @IsAdmin_ModelList = 1;
        END
        ELSE
        BEGIN
            SELECT @IsAdmin_ModelList = ISNULL(IsAdmin, 0)
            FROM ERPManagement25.System.UserMaster
            WHERE Username = @User;
        END

        IF @IsAdmin_ModelList = 0
        BEGIN
            SELECT @SQLFilter_ModelList = SQLFilter
            FROM [PLS].[UserQueryPermissions] UQP
            INNER JOIN [PLS].[QueryMaster] QM ON UQP.QueryID = QM.QueryID
            WHERE UQP.Username = @User AND QM.Operation = 'Get Journal Model List';
        END

        IF @SQLFilter_ModelList IS NOT NULL AND LTRIM(RTRIM(@SQLFilter_ModelList)) <> ''
        BEGIN
            DECLARE @DynSQL_ModelList NVARCHAR(MAX) = N'SELECT * FROM [PLS].[QGetJournalModelList] WHERE ' + @SQLFilter_ModelList;
            EXEC sp_executesql @DynSQL_ModelList;
        END
        ELSE
        BEGIN
            SELECT * FROM [PLS].[QGetJournalModelList];
        END
        RETURN
    END

    IF @Operation = 'Get Journal Model For View'
    BEGIN
        DECLARE @View_ModelID int
        SELECT @View_ModelID = ModelID FROM OPENJSON(@LineData) WITH (ModelID int)

        SELECT * FROM [PLS].[QModelHeader] WHERE ModelID = @View_ModelID
        SELECT * FROM [PLS].[QModelLine] WHERE ModelID = @View_ModelID
        SELECT * FROM [PLS].[QModelLineDetails] WHERE ModelID = @View_ModelID
        RETURN
    END

    IF @Operation = 'Open Journal Model'
    BEGIN
        DECLARE @Open_ModelID int
        SELECT @Open_ModelID = ModelID FROM OPENJSON(@LineData) WITH (ModelID int)

        DECLARE @ModelInUse int, @ModelInUseBy nvarchar(50)
        SELECT @ModelInUse = ModelInUse, @ModelInUseBy = ModelInUseBy FROM [ACC].ModelHeader WHERE ModelID = @Open_ModelID
        
        IF @ModelInUse = 1 AND @ModelInUseBy <> @User
        BEGIN
            SET @State = 1
            SET @Message = 'Model in use by ' + @ModelInUseBy
            RETURN
        END

        UPDATE [ACC].ModelHeader SET ModelInUse = 1, ModelInUseBy = @User WHERE ModelID = @Open_ModelID
        SELECT * FROM [PLS].[QModelHeader] WHERE ModelID = @Open_ModelID
        SELECT * FROM [PLS].[QModelLine] WHERE ModelID = @Open_ModelID
        SELECT * FROM [PLS].[QModelLineDetails] WHERE ModelID = @Open_ModelID
        RETURN
    END

    IF @Operation = 'Close Journal Model'
    BEGIN
        DECLARE @Close_ModelID int
        SELECT @Close_ModelID = ModelID FROM OPENJSON(@LineData) WITH (ModelID int)
        UPDATE [ACC].ModelHeader SET ModelInUse = 0 WHERE ModelID = @Close_ModelID
        RETURN
    END

    IF @Operation = 'New Journal Model Header'
    BEGIN
        DECLARE @New_ModelID int
        EXEC GetSequenceNo 36, @New_ModelID OUT

        DECLARE @New_ModelName nvarchar(max), @New_ModelDescription nvarchar(max), @New_JournalPrefix nvarchar(100)
        SELECT @New_ModelName = ModelName, @New_ModelDescription = ModelDescription, @New_JournalPrefix = JournalPrefix
        FROM OPENJSON(@LineData) WITH (ModelName nvarchar(max), ModelDescription nvarchar(max), JournalPrefix nvarchar(100))

        INSERT INTO [ACC].ModelHeader (ModelID, ModelName, ModelDescription, JournalPrefix, ModelCreatedBy, ModelCreatedDate)
        VALUES (@New_ModelID, @New_ModelName, @New_ModelDescription, @New_JournalPrefix, @User, GETDATE())

        INSERT INTO [ACC].ModelLine (ModelID, Line, LineType)
        SELECT @New_ModelID, Line, LineType
        FROM OPENJSON(@LineMember) WITH (Line int, LineType nvarchar(50))

        INSERT INTO [ACC].ModelLineDetails (ModelID, Line, SegmentID, IsStatic, TableName, ValueField, DescriptionField, Condtion, IsMandatory, LineCreatedBy, LineCreatedDate)
        SELECT @New_ModelID, L.Line, D.SegmentID, D.IsStatic, D.TableName, D.ValueField, D.DescriptionField, D.Condtion, D.IsMandatory, @User, GETDATE()
        FROM OPENJSON(@LineMember) WITH (Line int, Details nvarchar(max) AS JSON) AS L
        CROSS APPLY OPENJSON(L.Details) WITH (SegmentID int, IsStatic int, TableName nvarchar(max), ValueField nvarchar(max), DescriptionField nvarchar(max), Condtion nvarchar(max), IsMandatory int) AS D

        SELECT * FROM [PLS].[QModelHeader] WHERE ModelID = @New_ModelID
        SELECT * FROM [PLS].[QModelLine] WHERE ModelID = @New_ModelID
        SELECT * FROM [PLS].[QModelLineDetails] WHERE ModelID = @New_ModelID
        RETURN
    END

    IF @Operation = 'Edit Journal Model Header'
    BEGIN
        DECLARE @Edit_ModelID int, @Edit_ModelName nvarchar(max), @Edit_ModelDescription nvarchar(max), @Edit_JournalPrefix nvarchar(100)
        SELECT @Edit_ModelID = ModelID, @Edit_ModelName = ModelName, @Edit_ModelDescription = ModelDescription, @Edit_JournalPrefix = JournalPrefix
        FROM OPENJSON(@LineData) WITH (ModelID int, ModelName nvarchar(max), ModelDescription nvarchar(max), JournalPrefix nvarchar(100))

        UPDATE [ACC].ModelHeader
        SET ModelName = @Edit_ModelName, ModelDescription = @Edit_ModelDescription, JournalPrefix = @Edit_JournalPrefix, ModelLastMaintBy = @User, ModelLastMaintDate = GETDATE(), ModelInUse = 0
        WHERE ModelID = @Edit_ModelID

        DELETE FROM [ACC].ModelLine WHERE ModelID = @Edit_ModelID
        DELETE FROM [ACC].ModelLineDetails WHERE ModelID = @Edit_ModelID

        INSERT INTO [ACC].ModelLine (ModelID, Line, LineType)
        SELECT @Edit_ModelID, Line, LineType
        FROM OPENJSON(@LineMember) WITH (Line int, LineType nvarchar(50))

        INSERT INTO [ACC].ModelLineDetails (ModelID, Line, SegmentID, IsStatic, TableName, ValueField, DescriptionField, Condtion, IsMandatory, LineCreatedBy, LineCreatedDate)
        SELECT @Edit_ModelID, L.Line, D.SegmentID, D.IsStatic, D.TableName, D.ValueField, D.DescriptionField, D.Condtion, D.IsMandatory, @User, GETDATE()
        FROM OPENJSON(@LineMember) WITH (Line int, Details nvarchar(max) AS JSON) AS L
        CROSS APPLY OPENJSON(L.Details) WITH (SegmentID int, IsStatic int, TableName nvarchar(max), ValueField nvarchar(max), DescriptionField nvarchar(max), Condtion nvarchar(max), IsMandatory int) AS D

        SELECT * FROM [PLS].[QModelHeader] WHERE ModelID = @Edit_ModelID
        SELECT * FROM [PLS].[QModelLine] WHERE ModelID = @Edit_ModelID
        SELECT * FROM [PLS].[QModelLineDetails] WHERE ModelID = @Edit_ModelID
        RETURN
    END



    IF @Operation = 'Get Events List'
    BEGIN
        DECLARE @SQLFilter_Events NVARCHAR(MAX) = NULL;
        DECLARE @IsAdmin_Events BIT = 0;
        IF @User = 'sysadmin'
        BEGIN
            SET @IsAdmin_Events = 1;
        END
        ELSE
        BEGIN
            SELECT @IsAdmin_Events = ISNULL(IsAdmin, 0)
            FROM ERPManagement25.System.UserMaster
            WHERE Username = @User;
        END

        IF @IsAdmin_Events = 0
        BEGIN
            SELECT @SQLFilter_Events = SQLFilter
            FROM [PLS].[UserQueryPermissions] UQP
            INNER JOIN [PLS].[QueryMaster] QM ON UQP.QueryID = QM.QueryID
            WHERE UQP.Username = @User AND QM.Operation = 'Get Events List';
        END

        IF @SQLFilter_Events IS NOT NULL AND LTRIM(RTRIM(@SQLFilter_Events)) <> ''
        BEGIN
            DECLARE @DynSQL_Events NVARCHAR(MAX) = N'SELECT [EventID], [EventName] FROM [PLS].[QGetEventsList] WHERE ' + @SQLFilter_Events;
            EXEC sp_executesql @DynSQL_Events;
        END
        ELSE
        BEGIN
            SELECT [EventID], [EventName] FROM [PLS].[QGetEventsList];
        END
        RETURN
    END

    -- =============================================
    -- ACCOUNTING FUNCTIONS OPERATIONS
    -- =============================================
    IF @Operation = 'Get Accounting Functions List'
    BEGIN
        DECLARE @SQLFilter_Functions NVARCHAR(MAX) = NULL;
        DECLARE @IsAdmin_Functions BIT = 0;
        IF @User = 'sysadmin'
        BEGIN
            SET @IsAdmin_Functions = 1;
        END
        ELSE
        BEGIN
            SELECT @IsAdmin_Functions = ISNULL(IsAdmin, 0)
            FROM ERPManagement25.System.UserMaster
            WHERE Username = @User;
        END

        IF @IsAdmin_Functions = 0
        BEGIN
            SELECT @SQLFilter_Functions = SQLFilter
            FROM [PLS].[UserQueryPermissions] UQP
            INNER JOIN [PLS].[QueryMaster] QM ON UQP.QueryID = QM.QueryID
            WHERE UQP.Username = @User AND QM.Operation = 'Get Accounting Functions List';
        END

        IF @SQLFilter_Functions IS NOT NULL AND LTRIM(RTRIM(@SQLFilter_Functions)) <> ''
        BEGIN
            DECLARE @DynSQL_Functions NVARCHAR(MAX) = N'SELECT * FROM [PLS].[QGetAccountingFunctionsList] WHERE ' + @SQLFilter_Functions;
            EXEC sp_executesql @DynSQL_Functions;
        END
        ELSE
        BEGIN
            SELECT * FROM [PLS].[QGetAccountingFunctionsList];
        END
        RETURN
    END

    IF @Operation = 'Get Accounting Function For Edit'
    BEGIN
        DECLARE @Get_FunctionPrefix nvarchar(255)
        SET @Get_FunctionPrefix = JSON_VALUE(@LineData, '$.FunctionPrefix')

        SELECT * FROM [PLS].[QAccountingFunctionsHeader] WHERE FunctionPrefix = @Get_FunctionPrefix
        SELECT * FROM [PLS].[QAccountingFunctionDocumentHeader] WHERE FunctionPrefix = @Get_FunctionPrefix
        SELECT * FROM [PLS].[QAccountingFunctionDocumentDetails] WHERE FunctionPrefix = @Get_FunctionPrefix
        SELECT * FROM [PLS].[QAccountingFunctionDocumentSequence] WHERE FunctionPrefix = @Get_FunctionPrefix
        RETURN
    END



    IF @Operation = 'Save Accounting Function'
    BEGIN
        SET ANSI_WARNINGS OFF;
        DECLARE @AccFunc_Prefix nvarchar(255), @AccFunc_Desc nvarchar(max), @AccFunc_Type nvarchar(255), @AccFunc_DocPrefix nvarchar(255)
        DECLARE @AccFunc_EventID int, @AccFunc_HasDocType int, @AccFunc_QuickFlag int, @AccFunc_IsNew int

        SELECT 
            @AccFunc_Prefix = FunctionPrefix, 
            @AccFunc_Desc = FunctionDescription, 
            @AccFunc_Type = FuctionType, 
            @AccFunc_DocPrefix = DoucmentPrefix,
            @AccFunc_EventID = EventID,
            @AccFunc_HasDocType = HasDocumentType,
            @AccFunc_QuickFlag = QuickFlag,
            @AccFunc_IsNew = IsNew
        FROM OPENJSON(@LineData) WITH (
            FunctionPrefix nvarchar(255), FunctionDescription nvarchar(max), FuctionType nvarchar(255),
            DoucmentPrefix nvarchar(255), EventID int, HasDocumentType int, QuickFlag int, IsNew int
        )

        IF @AccFunc_IsNew = 1
        BEGIN
            DECLARE @FuncExist int
            SELECT @FuncExist = COUNT(*) FROM [ACC].AccountingFunctionsHeader WHERE FunctionPrefix = LEFT(@AccFunc_Prefix, 50)
            IF @FuncExist > 0
            BEGIN
                SET @State = 1
                SET @Message = 'Function Already Exists'
                RETURN
            END

            INSERT INTO [ACC].AccountingFunctionsHeader (FunctionPrefix, FunctionDescription, FuctionType, DoucmentPrefix, EventID, HasDocumentType, QuickFlag)
            VALUES (LEFT(@AccFunc_Prefix, 50), @AccFunc_Desc, LEFT(@AccFunc_Type, 50), LEFT(@AccFunc_DocPrefix, 50), @AccFunc_EventID, @AccFunc_HasDocType, @AccFunc_QuickFlag)
        END
        ELSE
        BEGIN
            UPDATE [ACC].AccountingFunctionsHeader 
            SET FunctionDescription = @AccFunc_Desc, FuctionType = LEFT(@AccFunc_Type, 50), DoucmentPrefix = LEFT(@AccFunc_DocPrefix, 50),
                LastMaintUser = @User, LastMaintDate = GETDATE(), EventID = @AccFunc_EventID, HasDocumentType = @AccFunc_HasDocType, QuickFlag = @AccFunc_QuickFlag
            WHERE FunctionPrefix = LEFT(@AccFunc_Prefix, 50)
        END

        -- Delete old documents/lines/sequences to replace with new payload
        DELETE FROM [ACC].AccountingFunctionDoucmentDetails WHERE FunctionPrefix = LEFT(@AccFunc_Prefix, 50)
        DELETE FROM [ACC].AccountingFunctionDoucmentHeader WHERE FunctionPrefix = LEFT(@AccFunc_Prefix, 50)
        DELETE FROM [ACC].AccountingFunctionDoucmentSequence WHERE FunctionPrefix = LEFT(@AccFunc_Prefix, 50)

        -- Re-insert Document Types
        INSERT INTO [ACC].AccountingFunctionDoucmentHeader (FunctionPrefix, DocumentType, DocumentDescription, Tax, DoucmentCreatedBy, DoucmentCreatedDate)
        SELECT LEFT(@AccFunc_Prefix, 50), DocumentType, DocumentDescription, Tax, LEFT(@User, 50), GETDATE()
        FROM OPENJSON(@LineMember, '$.DocumentTypes') WITH (
            DocumentType int, DocumentDescription nvarchar(max), Tax int
        )

        -- Re-insert Document Details (Lines/Segments)
        INSERT INTO [ACC].AccountingFunctionDoucmentDetails (FunctionPrefix, DocumentType, Line, SegmentID, SegmentCondition, DetailsCreatedBy, DetailCreatedDate)
        SELECT LEFT(@AccFunc_Prefix, 50), DocumentType, Line, SegmentID, SegmentCondition, LEFT(@User, 50), GETDATE()
        FROM OPENJSON(@LineMember, '$.DocumentDetails') WITH (
            DocumentType int, Line int, SegmentID int, SegmentCondition nvarchar(max)
        )

        -- Re-insert Sequences
        INSERT INTO [ACC].AccountingFunctionDoucmentSequence (FunctionPrefix, DoucmentYear, DoucmentSequence, DoucmentPrefix, SequneceCreatedBy, SequenceCreatedDate)
        SELECT LEFT(@AccFunc_Prefix, 50), DoucmentYear, DoucmentSequence, LEFT(DoucmentPrefix, 50), LEFT(@User, 50), GETDATE()
        FROM OPENJSON(@LineMember, '$.Sequences') WITH (
            DoucmentYear int, DoucmentSequence int, DoucmentPrefix nvarchar(255)
        )

        -- Return the saved function
        SELECT * FROM [PLS].[QAccountingFunctionsHeader] WHERE FunctionPrefix = LEFT(@AccFunc_Prefix, 50)
        SELECT * FROM [PLS].[QAccountingFunctionDocumentHeader] WHERE FunctionPrefix = LEFT(@AccFunc_Prefix, 50)
        SELECT * FROM [PLS].[QAccountingFunctionDocumentDetails] WHERE FunctionPrefix = LEFT(@AccFunc_Prefix, 50)
        SELECT * FROM [PLS].[QAccountingFunctionDocumentSequence] WHERE FunctionPrefix = LEFT(@AccFunc_Prefix, 50)
        RETURN
    END


    -- =============================================
    
    -- =============================================
    
    IF @Operation = 'Get Database Tables'
    BEGIN
        SELECT TableName FROM [PLS].[QGetDatabaseTables] ORDER BY TableName
        RETURN
    END


    IF @Operation = 'Get Table Columns'
    BEGIN
        DECLARE @SelectedTable nvarchar(255) = JSON_VALUE(@LineData, '$.TableName')

        SELECT ColumnName
        FROM [PLS].[QGetTableColumns]
        WHERE TableSchema + '.' + TableName = @SelectedTable
           OR TableName = @SelectedTable
        ORDER BY OrdinalPosition
        RETURN
    END

-- MACRO OPERATIONS
    -- =============================================
    IF @Operation = 'Get Macros List'
    BEGIN
        DECLARE @SQLFilter_Macros NVARCHAR(MAX) = NULL;
        DECLARE @IsAdmin_Macros BIT = 0;
        IF @User = 'sysadmin'
        BEGIN
            SET @IsAdmin_Macros = 1;
        END
        ELSE
        BEGIN
            SELECT @IsAdmin_Macros = ISNULL(IsAdmin, 0)
            FROM ERPManagement25.System.UserMaster
            WHERE Username = @User;
        END

        IF @IsAdmin_Macros = 0
        BEGIN
            SELECT @SQLFilter_Macros = SQLFilter
            FROM [PLS].[UserQueryPermissions] UQP
            INNER JOIN [PLS].[QueryMaster] QM ON UQP.QueryID = QM.QueryID
            WHERE UQP.Username = @User AND QM.Operation = 'Get Macros List';
        END

        IF @SQLFilter_Macros IS NOT NULL AND LTRIM(RTRIM(@SQLFilter_Macros)) <> ''
        BEGIN
            DECLARE @DynSQL_Macros NVARCHAR(MAX) = N'SELECT MacroID, MacroName, MacroDescription, MacroTable, MacroPrefix, MacroDocumnet, ReturnedValueType FROM [PLS].[QGetMacrosList] WHERE ' + @SQLFilter_Macros;
            EXEC sp_executesql @DynSQL_Macros;
        END
        ELSE
        BEGIN
            SELECT MacroID, MacroName, MacroDescription, MacroTable, MacroPrefix, MacroDocumnet, ReturnedValueType FROM [PLS].[QGetMacrosList];
        END
        RETURN
    END

    IF @Operation = 'Get Macro For Edit'
    BEGIN
        DECLARE @Get_MacroID int = JSON_VALUE(@LineData, '$.MacroID')

        SELECT * FROM [PLS].[QMacroHeader] WHERE MacroID = @Get_MacroID
        SELECT * FROM [PLS].[QMacroLine] WHERE MacroID = @Get_MacroID ORDER BY Line ASC
        RETURN
    END

    IF @Operation = 'Save Macro'
    BEGIN
        SET ANSI_WARNINGS OFF;
        DECLARE @Mac_ID int, @Mac_Name nvarchar(max), @Mac_Desc nvarchar(max), @Mac_Table nvarchar(255)
        DECLARE @Mac_Prefix nvarchar(255), @Mac_Doc nvarchar(255), @Mac_Dynamic1 nvarchar(255)
        DECLARE @Mac_RetType int, @Mac_SingleRet nvarchar(max), @Mac_IsNew int

        SELECT 
            @Mac_ID = MacroID, 
            @Mac_Name = MacroName, 
            @Mac_Desc = MacroDescription, 
            @Mac_Table = MacroTable,
            @Mac_Prefix = MacroPrefix,
            @Mac_Doc = MacroDocumnet,
            @Mac_Dynamic1 = MacroDynamicKey1,
            @Mac_RetType = ReturnedValueType,
            @Mac_SingleRet = SingleReturnedValue,
            @Mac_IsNew = IsNew
        FROM OPENJSON(@LineData) WITH (
            MacroID int, MacroName nvarchar(max), MacroDescription nvarchar(max), MacroTable nvarchar(255),
            MacroPrefix nvarchar(255), MacroDocumnet nvarchar(255), MacroDynamicKey1 nvarchar(255),
            ReturnedValueType int, SingleReturnedValue nvarchar(max), IsNew int
        )

        -- Validation: Prevent duplicate MacroName
        IF EXISTS (SELECT 1 FROM [ACC].MacroHeader WHERE MacroName = @Mac_Name AND MacroID <> @Mac_ID)
        BEGIN
            SELECT 1 AS State, 'A Macro with this name already exists. Please choose a unique name.' AS Message
            RETURN
        END

        IF @Mac_IsNew = 1
        BEGIN
            EXEC GetSequenceNo 30, @Mac_ID OUT
            
            INSERT INTO [ACC].MacroHeader (
                MacroID, MacroName, MacroDescription, MacroTable, MacroPrefix, MacroDocumnet, MacroDynamicKey1,
                ReturnedValueType, SingleReturnedValue, CreatedByUser, CreatedDate
            )
            VALUES (
                @Mac_ID, @Mac_Name, @Mac_Desc, LEFT(@Mac_Table, 50), LEFT(@Mac_Prefix, 50), LEFT(@Mac_Doc, 50), LEFT(@Mac_Dynamic1, 50),
                @Mac_RetType, @Mac_SingleRet, LEFT(@User, 50), GETDATE()
            )
        END
        ELSE
        BEGIN
            UPDATE [ACC].MacroHeader 
            SET MacroName = @Mac_Name, 
                MacroDescription = @Mac_Desc, 
                MacroTable = LEFT(@Mac_Table, 50), 
                MacroPrefix = LEFT(@Mac_Prefix, 50), 
                MacroDocumnet = LEFT(@Mac_Doc, 50), 
                MacroDynamicKey1 = LEFT(@Mac_Dynamic1, 50),
                ReturnedValueType = @Mac_RetType, 
                SingleReturnedValue = @Mac_SingleRet, 
                LastMaintBy = LEFT(@User, 50), 
                LastMaintDate = GETDATE()
            WHERE MacroID = @Mac_ID
        END

        -- Clean up existing lines
        DELETE FROM [ACC].MacroLine WHERE MacroID = @Mac_ID

        -- Insert new lines (if any)
        INSERT INTO [ACC].MacroLine (MacroID, Line, LineCondtion, LineReturnedValue, LineCreatedBy, LineCreatedDate)
        SELECT @Mac_ID, Line, LineCondtion, LineReturnedValue, LEFT(@User, 50), GETDATE()
        FROM OPENJSON(@LineMember) WITH (
            Line int, LineCondtion nvarchar(max), LineReturnedValue nvarchar(max)
        )

        -- Return saved data
        SELECT * FROM [PLS].[QMacroHeader] WHERE MacroID = @Mac_ID
        SELECT * FROM [PLS].[QMacroLine] WHERE MacroID = @Mac_ID ORDER BY Line ASC

        SET @State = 0
        SET @Message = 'Success'
        SET ANSI_WARNINGS ON;
        RETURN
    END

    --------------------------------------------------------------------------------
    -- EVENT OPERATIONS (Accounting Events)
    --------------------------------------------------------------------------------
    IF @Operation = 'Get Full Events List'
    BEGIN
        SELECT EventID, EventName, JournalDate, JournalState, JournalPrefix, JournalDescription, JournalCurrency, JournalExchangeRate, IsSummarized, EventlnUse, EventInUseBy
        FROM [PLS].[QGetFullEventsList]
        RETURN
    END

    IF @Operation = 'Get Event For Edit'
    BEGIN
        DECLARE @Get_EventID int = JSON_VALUE(@LineData, '$.EventID')
        SELECT * FROM [PLS].[QEventHeader] WHERE EventID = @Get_EventID
        SELECT * FROM [PLS].[QEventLine] WHERE EventID = @Get_EventID ORDER BY Line ASC
        SELECT 0 AS State, 'Success' AS Message
        RETURN
    END

    IF @Operation = 'Event DH'
    BEGIN
        DECLARE @EventID_DH int = JSON_VALUE(@LineData, '$.EventID')
        UPDATE acc.EventHeader SET inActive = 1 WHERE EventID = @EventID_DH
        SELECT 0 AS State, 'Deleted successfully' AS Message
        RETURN
    END 

    IF @Operation = 'Save Event'
    BEGIN
        DECLARE @Ev_ID int, @Ev_Name nvarchar(max), @Ev_Date nvarchar(max), @Ev_State nvarchar(max), @Ev_Prefix nvarchar(max), @Ev_Desc nvarchar(max), @Ev_Currency nvarchar(max), @Ev_ExRate nvarchar(max), @Ev_Summarized int, @Ev_IsNew int

        SELECT 
            @Ev_ID = EventID, @Ev_Name = EventName, @Ev_Date = JournalDate, @Ev_State = JournalState, @Ev_Prefix = JournalPrefix, @Ev_Desc = JournalDescription, @Ev_Currency = JournalCurrency, @Ev_ExRate = JournalExchangeRate, @Ev_Summarized = IsSummarized, @Ev_IsNew = IsNew
        FROM OPENJSON(@LineData) WITH (
            EventID int, EventName nvarchar(max), JournalDate nvarchar(max), JournalState nvarchar(max), JournalPrefix nvarchar(max), JournalDescription nvarchar(max), JournalCurrency nvarchar(max), JournalExchangeRate nvarchar(max), IsSummarized int, IsNew int
        )

        IF ISNULL(@Ev_Prefix, '') = '' OR ISNULL(@Ev_Name, '') = ''
        BEGIN
            SELECT 1 AS State, 'Event Name and Journal Prefix are required' AS Message
            RETURN
        END

        BEGIN TRY
            BEGIN TRANSACTION

            IF @Ev_IsNew = 1 OR @Ev_ID = 0
            BEGIN
                EXEC GetSequenceNo 32, @Ev_ID OUT
                
                INSERT INTO [ACC].EventHeader (EventID, EventName, JournalDate, JournalState, JournalPrefix, JournalDescription, JournalCurrency, JournalExchangeRate, IsSummarized, EventCreatedBy, EventCreatedDate)
                VALUES (@Ev_ID, @Ev_Name, @Ev_Date, @Ev_State, @Ev_Prefix, @Ev_Desc, @Ev_Currency, @Ev_ExRate, @Ev_Summarized, @User, GETDATE())
            END
            ELSE
            BEGIN
                UPDATE [ACC].EventHeader 
                SET EventName = @Ev_Name, JournalDate = @Ev_Date, JournalState = @Ev_State, JournalPrefix = @Ev_Prefix, JournalDescription = @Ev_Desc, JournalCurrency = @Ev_Currency, JournalExchangeRate = @Ev_ExRate, IsSummarized = @Ev_Summarized, EventLastMaintBy = @User, EventlLastMaintDate = GETDATE()
                WHERE EventID = @Ev_ID
            END

            -- Clean up existing lines
            DELETE FROM [ACC].EventLine WHERE EventID = @Ev_ID

            -- Insert new lines
            INSERT INTO [ACC].EventLine (EventID, Line, IsDynamicLine, TotalDynamicLines, JournalLine, DebitTransaction, CreditTransaction, LineDescription, Reference1, Reference2, Account, DebitorCreditor, Customer, Vendor, Bank, Segment6, Segment7, Segment8, Segment9, Segment10, Segment11, Segment12, Segment13, Segment14, Segment15, Segment16, LineCreatedBy, LineCreatedDate, IsLocked, IsDoucmentRelated)
            SELECT @Ev_ID, Line, IsDynamicLine, TotalDynamicLines, JournalLine, DebitTransaction, CreditTransaction, LineDescription, Reference1, Reference2, Account, DebitorCreditor, Customer, Vendor, Bank, Segment6, Segment7, Segment8, Segment9, Segment10, Segment11, Segment12, Segment13, Segment14, Segment15, Segment16, @User, GETDATE(), IsLocked, IsDoucmentRelated
            FROM OPENJSON(@LineMember) WITH (
                Line int, IsDynamicLine int, TotalDynamicLines nvarchar(max), JournalLine nvarchar(max), DebitTransaction nvarchar(max), CreditTransaction nvarchar(max), LineDescription nvarchar(max), Reference1 nvarchar(max), Reference2 nvarchar(max), Account nvarchar(max), DebitorCreditor nvarchar(max), Customer nvarchar(max), Vendor nvarchar(max), Bank nvarchar(max), Segment6 nvarchar(max), Segment7 nvarchar(max), Segment8 nvarchar(max), Segment9 nvarchar(max), Segment10 nvarchar(max), Segment11 nvarchar(max), Segment12 nvarchar(max), Segment13 nvarchar(max), Segment14 nvarchar(max), Segment15 nvarchar(max), Segment16 nvarchar(max), IsLocked nvarchar(max), IsDoucmentRelated int
            )

            -- Validation
            -- DECLARE @Cnt_Related int
            -- SELECT @Cnt_Related = COUNT(*) FROM acc.EventLine WHERE EventID = @Ev_ID AND IsDoucmentRelated = 1
            -- IF @Cnt_Related = 0 
            -- BEGIN 
            --    ROLLBACK TRANSACTION
            --    SELECT 1 AS State, 'At least one related document line is required.' AS Message
            --    RETURN
            -- END

            COMMIT TRANSACTION

            SELECT * FROM [PLS].[QEventHeader] WHERE EventID = @Ev_ID
            SELECT * FROM [PLS].[QEventLine] WHERE EventID = @Ev_ID ORDER BY Line ASC

            SELECT 0 AS State, 'Success' AS Message
            RETURN
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
            SELECT 1 AS State, ERROR_MESSAGE() AS Message
            RETURN
        END CATCH
    END


    -- CASH RECEIVE OPERATIONS
    -- =============================================
    IF @Operation = 'Get Cash Receives List'
    BEGIN
        DECLARE @SQLFilter_Cash NVARCHAR(MAX) = NULL;
        DECLARE @IsAdmin_Cash BIT = 0;
        IF @User = 'sysadmin'
        BEGIN
            SET @IsAdmin_Cash = 1;
        END
        ELSE
        BEGIN
            SELECT @IsAdmin_Cash = ISNULL(IsAdmin, 0)
            FROM ERPManagement25.System.UserMaster
            WHERE Username = @User;
        END

        IF @IsAdmin_Cash = 0
        BEGIN
            SELECT @SQLFilter_Cash = SQLFilter
            FROM [PLS].[UserQueryPermissions] UQP
            INNER JOIN [PLS].[QueryMaster] QM ON UQP.QueryID = QM.QueryID
            WHERE UQP.Username = @User AND QM.Operation = 'Get Cash Receives List';
        END

        IF @SQLFilter_Cash IS NOT NULL AND LTRIM(RTRIM(@SQLFilter_Cash)) <> ''
        BEGIN
            DECLARE @DynSQL_Cash NVARCHAR(MAX) = N'SELECT InternalID, RequestDate, RecievedDate, Note, Contact, TreasureyCode, Currency, ExchangeRate, ReceievedAmountTransaction, DoucmentState, DoucmentNumber, JournalNumber FROM [PLS].[QGetCashReceivesList] WHERE ' + @SQLFilter_Cash + N' ORDER BY InternalID DESC';
            EXEC sp_executesql @DynSQL_Cash;
        END
        ELSE
        BEGIN
            SELECT InternalID, RequestDate, RecievedDate, Note, Contact, TreasureyCode, Currency, ExchangeRate, 
                   ReceievedAmountTransaction, DoucmentState, DoucmentNumber, JournalNumber
            FROM [PLS].[QGetCashReceivesList]
            ORDER BY InternalID DESC;
        END
        RETURN
    END

    IF @Operation = 'Get Cash Receive For Edit'
    BEGIN
        DECLARE @Get_CashID int = JSON_VALUE(@LineData, '$.InternalID')
        SELECT * FROM [PLS].[QCashReceivableHeader] WHERE InternalID = @Get_CashID
        SELECT * FROM [PLS].[QCashReceivableLine] WHERE IntID = @Get_CashID ORDER BY Line ASC
        RETURN
    END

    IF @Operation = 'Delete Cash Receive'
    BEGIN
        DECLARE @Del_CashID int = JSON_VALUE(@LineData, '$.InternalID')
        DECLARE @Del_State int
        DECLARE @Del_Journ nvarchar(50)
        DECLARE @Del_Ev int
        
        SELECT @Del_State = DoucmentState, @Del_Journ = JournalNumber, @Del_Ev = EventNumber
        FROM [ACC].CashReceivableHeader WHERE InternalID = @Del_CashID
        
        IF @Del_State = 0 
        BEGIN
            DELETE FROM [ACC].CashReceivableHeader WHERE InternalID = @Del_CashID
            DELETE FROM [ACC].CashReceivableLine WHERE IntID = @Del_CashID
            SELECT 0 AS State, 'Deleted successfully' AS Message
        END
        ELSE
        BEGIN
            UPDATE [ACC].CashReceivableHeader SET DoucmentState = 90 WHERE InternalID = @Del_CashID
            DELETE FROM [ACC].CashReceivableLine WHERE IntID = @Del_CashID
            DELETE FROM [ACC].JournalHeader WHERE JournalNumber = @Del_Journ AND EventNumber = @Del_Ev
            DELETE FROM [ACC].JournalLine WHERE JournalNo = @Del_Journ AND EventNo = @Del_Ev
            SELECT 0 AS State, 'Reversed successfully' AS Message
        END
        RETURN
    END

    IF @Operation = 'Save Cash Receive'
    BEGIN
        BEGIN TRY
            BEGIN TRANSACTION
            
            DECLARE @CR_ID int = ISNULL(JSON_VALUE(@LineData, '$.InternalID'), 0)
            DECLARE @CR_ReqDate date = JSON_VALUE(@LineData, '$.RequestDate')
            DECLARE @CR_RecDate date = JSON_VALUE(@LineData, '$.RecievedDate')
            DECLARE @CR_Note nvarchar(max) = JSON_VALUE(@LineData, '$.Note')
            DECLARE @CR_Contact nvarchar(max) = JSON_VALUE(@LineData, '$.Contact')
            DECLARE @CR_Currency nvarchar(10) = JSON_VALUE(@LineData, '$.Currency')
            DECLARE @CR_ExRate float = ISNULL(JSON_VALUE(@LineData, '$.ExchangeRate'), 1)
            DECLARE @CR_Treasury nvarchar(10) = JSON_VALUE(@LineData, '$.TreasureyCode')
            DECLARE @CR_ReqFlag int = ISNULL(JSON_VALUE(@LineData, '$.RequestFlag'), 0)
            DECLARE @CR_RecFlag int = ISNULL(JSON_VALUE(@LineData, '$.RecievedFlag'), 0)
            DECLARE @CR_RecBy nvarchar(max) = ISNULL(JSON_VALUE(@LineData, '$.RecievedBy'), @User)
            
            IF @CR_ID = 0
            BEGIN
                EXEC GetSequenceNo 37, @CR_ID OUT
                INSERT INTO [ACC].CashReceivableHeader 
                (InternalID, RequestDate, Note, Contact, Currency, ExchangeRate, TreasureyCode, RequestFlag, CreatedByUser, CreatedDate, TransactionDate, RecievedBy, DoucmentState)
                VALUES 
                (@CR_ID, @CR_ReqDate, @CR_Note, @CR_Contact, @CR_Currency, @CR_ExRate, @CR_Treasury, @CR_ReqFlag, @User, GETDATE(), GETDATE(), @CR_RecBy, 0)
            END
            ELSE
            BEGIN
                UPDATE [ACC].CashReceivableHeader 
                SET RequestDate = @CR_ReqDate, Note = @CR_Note, Contact = @CR_Contact, 
                    Currency = @CR_Currency, ExchangeRate = @CR_ExRate, TreasureyCode = @CR_Treasury, 
                    RequestFlag = @CR_ReqFlag, LastMaintBy = @User, LastMainyDate = GETDATE()
                WHERE InternalID = @CR_ID
            END
            
            -- WIPE LINES
            DELETE FROM [ACC].CashReceivableLine WHERE IntID = @CR_ID
            
            -- RE-INSERT LINES
            IF @LineMember IS NOT NULL AND @LineMember <> '' AND @LineMember <> '[]'
            BEGIN
                INSERT INTO [ACC].CashReceivableLine 
                (IntID, Line, DoucmentType, AmountTransaction, Account, CredtorDebitor, Customer, Vendor, Bank, Tax, 
                 Segment7, Segment8, Segment9, Segment10, Segment11, Segment12, Segment13, Segment14, Segment15, Segment16, 
                 Currency, TaxCode, TaxRate, LineCreatedBy, LineCreatedDate, CustomerType, VendorType, CreditorType)
                SELECT 
                    @CR_ID, 
                    ISNULL(M.Line, ROW_NUMBER() OVER(ORDER BY (SELECT NULL))),
                    ISNULL(M.DoucmentType, 0),
                    ISNULL(M.AmountTransaction, 0),
                    ISNULL(M.Account, ''),
                    ISNULL(M.CredtorDebitor, ''),
                    ISNULL(M.Customer, ''),
                    ISNULL(M.Vendor, ''),
                    ISNULL(M.Bank, ''),
                    ISNULL(M.Tax, ''),
                    ISNULL(M.Segment7, ''), ISNULL(M.Segment8, ''), ISNULL(M.Segment9, ''), ISNULL(M.Segment10, ''),
                    ISNULL(M.Segment11, ''), ISNULL(M.Segment12, ''), ISNULL(M.Segment13, ''), ISNULL(M.Segment14, ''),
                    ISNULL(M.Segment15, ''), ISNULL(M.Segment16, ''),
                    @CR_Currency,
                    ISNULL(M.TaxCode, ''),
                    ISNULL(M.TaxRate, 0),
                    @User,
                    GETDATE(),
                    (SELECT TOP 1 CustomerType FROM acr.CustomerMaster WHERE CustomerNo = M.Customer),
                    (SELECT TOP 1 VendorType FROM ACP.VendorMaster WHERE VendorNumber = M.Vendor),
                    (SELECT TOP 1 DRType FROM ACC.DebetorCreditorMaster WHERE DRNumber = M.CredtorDebitor)
                FROM OPENJSON(@LineMember) WITH (
                    Line int, DoucmentType int, AmountTransaction float, Account nvarchar(50), 
                    CredtorDebitor nvarchar(50), Customer nvarchar(50), Vendor nvarchar(50), Bank nvarchar(50), Tax nvarchar(50),
                    Segment7 nvarchar(50), Segment8 nvarchar(50), Segment9 nvarchar(50), Segment10 nvarchar(50),
                    Segment11 nvarchar(50), Segment12 nvarchar(50), Segment13 nvarchar(50), Segment14 nvarchar(50),
                    Segment15 nvarchar(50), Segment16 nvarchar(50), TaxCode nvarchar(10), TaxRate decimal(18,5)
                ) M
            END

            -- RECALCULATE TOTALS
            DECLARE @TotAcc float = ISNULL((SELECT SUM(AmountTransaction) FROM [ACC].CashReceivableLine WHERE IntID = @CR_ID AND TaxCode = ''), 0)
            DECLARE @TotTax float = ISNULL((SELECT SUM(AmountTransaction) FROM [ACC].CashReceivableLine WHERE IntID = @CR_ID AND TaxCode <> ''), 0)
            DECLARE @RecAmount float = @TotAcc + @TotTax
            DECLARE @RecBook float = @RecAmount * @CR_ExRate
            
            UPDATE [ACC].CashReceivableHeader 
            SET ReceievedAmountTransaction = @RecAmount,
                TotalTaxAmountTransaction = @TotTax,
                TotalAcountAmountTransaction = @TotAcc,
                ReceivedAmountBook = @RecBook
            WHERE InternalID = @CR_ID

            -- PROCESS RECEIVED FLAG (POSTING)
            IF @CR_RecFlag = 1
            BEGIN
                DECLARE @CR_DocState int
                DECLARE @CR_DocNum int
                DECLARE @CR_DocPfx nvarchar(50)
                DECLARE @CR_JournNum nvarchar(50)
                DECLARE @CR_EvNum int
                DECLARE @CR_Err int
                DECLARE @CR_Msg nvarchar(150)
                DECLARE @CR_DocYear int = YEAR(ISNULL(@CR_RecDate, GETDATE()))
                
                SELECT @CR_DocState = DoucmentState, @CR_DocNum = DoucmentNumber, @CR_DocPfx = DoucmentPrefix, @CR_JournNum = JournalNumber
                FROM [ACC].CashReceivableHeader WHERE InternalID = @CR_ID
                
                UPDATE [ACC].CashReceivableHeader 
                SET RecievedDate = ISNULL(@CR_RecDate, GETDATE()), RecievedBy = @CR_RecBy, TransactionDate = ISNULL(@CR_RecDate, GETDATE())
                WHERE InternalID = @CR_ID
                
                IF @CR_DocState = 0 OR @CR_DocNum IS NULL OR @CR_DocNum = 0
                BEGIN
                    SELECT @CR_DocPfx = DoucmentPrefix FROM acc.AccountingFunctionsHeader WHERE FunctionPrefix = 'ACR600'
                    EXEC acc.DoucmentNumberGet @CR_DocPfx, @CR_DocYear, @CR_DocNum OUT, @CR_Msg OUT
                    
                    IF @CR_DocNum <> 0
                    BEGIN
                        UPDATE [ACC].CashReceivableHeader SET DoucmentNumber = @CR_DocNum, DoucmentPrefix = @CR_DocPfx, DoucmentState = 10 WHERE InternalID = @CR_ID
                        UPDATE [ACC].CashReceivableLine SET DoucmentNo = @CR_DocNum, DoucmentPfx = @CR_DocPfx WHERE IntID = @CR_ID
                    END
                END
                
                IF @CR_DocNum <> 0
                BEGIN
                    DECLARE @OPType nvarchar(1) = CASE WHEN ISNULL(@CR_JournNum, '') <> '' THEN 'R' ELSE 'N' END
                    EXEC acc.EventEcxutionV3 @OPType, 'ACR600', @CR_DocNum, @CR_DocPfx, @User, @CR_Err OUT, @CR_JournNum OUT, @CR_EvNum OUT, @CR_Msg OUT
                    
                    IF @CR_Err = 0
                    BEGIN
                        UPDATE [ACC].CashReceivableHeader SET JournalNumber = @CR_JournNum, EventNumber = @CR_EvNum, DoucmentState = 20 WHERE InternalID = @CR_ID
                    END
                    ELSE
                    BEGIN
                        UPDATE [ACC].CashReceivableHeader SET DoucmentState = 10 WHERE InternalID = @CR_ID
                    END
                END
            END

            COMMIT TRANSACTION
            
            SELECT * FROM [PLS].[QCashReceivableHeader] WHERE InternalID = @CR_ID
            SELECT * FROM [PLS].[QCashReceivableLine] WHERE IntID = @CR_ID ORDER BY Line ASC

            SELECT 0 AS State, 'Success' AS Message
            RETURN
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
            SELECT 1 AS State, ERROR_MESSAGE() AS Message
            RETURN
        END CATCH
    END

    -- INVALID OPERATION
    -- =============================================
    SET @State = 1
    SET @Message = 'Invalid Operation: ' + @Operation

END
