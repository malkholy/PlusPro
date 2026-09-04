USE [ERPMega25]
GO

/****** Object:  StoredProcedure [INV].[ItemTransactionSystemHistoryV2] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================================
-- Transaction-handling fix only -- no logic changes. The original procedure
-- (as supplied) does BEGIN TRANSACTION unconditionally at the top of the TRY
-- block, but every RETURN inside "New Transaction" -- both the success path
-- and every early-exit failure path -- exits before reaching its own
-- COMMIT TRANSACTION (which only sits behind the unrelated "Invalid
-- Operation" fallback at the very bottom). That leaves the transaction
-- dangling one level open on every real call, which throws "Transaction
-- count after EXECUTE indicates a mismatching number of BEGIN and COMMIT
-- statements" the moment any caller wraps this EXEC in its own transaction
-- (e.g. PRO.APIPlusShopOrderOperation's Issue Shop Order).
--
-- Fix: added one COMMIT TRANSACTION immediately before the success-path
-- RETURN, and one ROLLBACK TRANSACTION immediately before each of the four
-- early failure-path RETURNs, so @@TRANCOUNT is always balanced by the time
-- this procedure hands control back to its caller.
-- ============================================================================

CREATE OR ALTER PROCEDURE [INV].[ItemTransactionSystemHistoryV2]
    @Operation  nvarchar(250),
    @LineData   nvarchar(max) = '',
    @User       nvarchar(50),
    @State      int = 0 OUT,
    @Message    nvarchar(500) = '' OUT
AS
BEGIN
    SET NOCOUNT ON;

    -- =============================================
    -- DECLARE ALL VARIABLES
    -- =============================================
    DECLARE @TransactionType        nvarchar(3),
            @TransactionDate        datetime,
            @TransactionWarehouse   nvarchar(10),
            @Line                   int,
            @ItemID                 int,
            @LotNo                  nvarchar(50),
            @TransactionQty         decimal(18,5),
            @Note                   nvarchar(max),
            @Customer               int,
            @Vendor                 int,
            @LoadNo                 int,
            @OrderType              int,
            @ReleaseNo              int,
            @Seq                    int,
            @TransactionNo          int,
            @FromWarehouse          nvarchar(5),
            @ItemCode               nvarchar(50),
            @UnitOfMeasure          nvarchar(2),
            @IsSystem               int,
            @TransactionYear        int,
            @EffectedType           nvarchar(1),
            @IsMultipeTransction    int,
            @RowCount               int,
            @CheckItemBalance       int,
            @LotControl             int,
            @Balance                float,
            @WFQty                  float,
            @Cnt                    int,
            @I                      int

    -- =============================================
    -- INITIALIZE STATE
    -- =============================================
    SET @State = 0
    SET @Message = ''

    -- =============================================
    -- TEMP TABLE
    -- =============================================
    CREATE TABLE #TempTable (
	TransactionType nvarchar(3), TransactionDate datetime, TransactionWarehouse nvarchar(10),
	Line int, ItemID int, LotNo nvarchar(50),
	TransactionQty decimal(18,5), Note nvarchar(max), Customer int, Vendor int, LoadNo int, OrderType int,
	ReleaseNo int, Seq int, TransactionNo int, FromWarehouse nvarchar(5))

    BEGIN TRY
        BEGIN TRANSACTION

        -- =============================================
        -- NEW TRANSACTION
        -- =============================================
        IF @Operation = 'New Transaction'
        BEGIN
            INSERT INTO #TempTable
            SELECT * FROM OPENJSON(@LineData) WITH (TransactionType nvarchar(3), TransactionDate datetime, TransactionWarehouse nvarchar(10), Line int, ItemID int, LotNo nvarchar(50), TransactionQty decimal(18,5), Note nvarchar(max), Customer int, Vendor int, LoadNo int, OrderType int, ReleaseNo int, Seq int, TransactionNo int, FromWarehouse nvarchar(5))

            SELECT TOP 1 @TransactionType = TransactionType, @TransactionDate = TransactionDate, @TransactionWarehouse = TransactionWarehouse, @Line = Line, @ItemID = ItemID, @LotNo = LotNo, @TransactionQty = TransactionQty, @Note = Note, @Customer = Customer, @Vendor = Vendor, @LoadNo = LoadNo, @OrderType = OrderType, @ReleaseNo = ReleaseNo, @Seq = Seq, @TransactionNo = TransactionNo, @FromWarehouse = FromWarehouse
            FROM #TempTable

            SELECT @IsSystem = IsSystemTranaction, @EffectedType = EffectedType, @IsMultipeTransction = IsMultipeTransction, @CheckItemBalance = CheckItemBalance
            FROM INV.TransactionsMaster
            WHERE TransactionType = @TransactionType

            IF @IsSystem <> 1
            BEGIN
                SET @State = 1
                SET @Message = 'Transaction Type is not a System Transaction'
                ROLLBACK TRANSACTION
                RETURN
            END

            SELECT @ItemCode = ItemCode, @LotControl = LotControl, @UnitOfMeasure = StockUM
            FROM inv.ItemMaster
            WHERE ItemID = @ItemID

            IF @LotControl = 0
                SET @LotNo = ''

            -- =============================================
            -- SINGLE TRANSACTION
            -- =============================================
            IF @IsMultipeTransction = 0
            BEGIN
                SELECT @Cnt = COUNT(*)
                FROM inv.TransactionHistory
                WHERE TransactionNo = @TransactionNo AND TransactionType = @TransactionType AND TransactionWarehouse = @TransactionWarehouse AND Line = @Line AND LineSequence = @Seq AND ReleaseNo = @ReleaseNo AND LoadNo = @LoadNo

                SET @Cnt = 0 -- NEED TO BE CONFIGURED

                IF @Cnt <> 0
                BEGIN
                    SET @State = 1
                    SET @Message = 'Transaction already exists'
                    ROLLBACK TRANSACTION
                    RETURN
                END

                IF @EffectedType = 'I'
                BEGIN
                    SET @TransactionQty = ABS(@TransactionQty)
                    SET @TransactionQty = -1 * @TransactionQty
                END

                IF @EffectedType = 'R'
                BEGIN
                    SET @TransactionQty = ABS(@TransactionQty)
                    SET @TransactionQty = 1 * @TransactionQty
                END

                IF @CheckItemBalance = 1
                BEGIN
                    EXEC inv.ItemBlanceCheckOperation @ItemID, @LotNo, @TransactionWarehouse, @Balance OUT

                    IF @Balance >= ABS(@TransactionQty)
                    BEGIN
                        INSERT INTO inv.TransactionHistory (Line, TransactionType, TransactionDate, TransactionNo, TransactionWarehouse, ItemID, ItemCode, LotNo, TransactionQty, UnitOfMeasure, Note, ValueType, Createdby, CreatedDate, CustomerNo, VendorNo, LoadNo, ReleaseNo, OrderType, LineSequence)
                        VALUES (@Line, @TransactionType, @TransactionDate, @TransactionNo, @TransactionWarehouse, @ItemID, @ItemCode, @LotNo, @TransactionQty, @UnitOfMeasure, @Note, @EffectedType, @User, GETDATE(), @Customer, @Vendor, @LoadNo, @ReleaseNo, @OrderType, @Seq)

                        SET @I = 1
                    END
                    ELSE
                    BEGIN
                        SET @State = 1
                        SET @Message = 'No Available Qty ' + @ItemCode + ' in Line no ' + CONVERT(nvarchar, @Line)
                        SET @I = 0
                        ROLLBACK TRANSACTION
                        RETURN
                    END
                END
                ELSE
                BEGIN
                    INSERT INTO inv.TransactionHistory (Line, TransactionType, TransactionDate, TransactionNo, TransactionWarehouse, ItemID, ItemCode, LotNo, TransactionQty, UnitOfMeasure, Note, ValueType, Createdby, CreatedDate, CustomerNo, VendorNo, LoadNo, ReleaseNo, OrderType, LineSequence)
                    VALUES (@Line, @TransactionType, @TransactionDate, @TransactionNo, @TransactionWarehouse, @ItemID, @ItemCode, @LotNo, @TransactionQty, @UnitOfMeasure, @Note, @EffectedType, @User, GETDATE(), @Customer, @Vendor, @LoadNo, @ReleaseNo, @OrderType, @Seq)

                    SET @I = 1
                END

                IF @I = 1
                BEGIN
                    SELECT @Cnt = COUNT(*)
                    FROM Inv.ItemBalance
                    WHERE ItemID = @ItemID AND ItemLot = @LotNo AND Warehouse = @TransactionWarehouse

                    IF @Cnt = 0
                    BEGIN
                        INSERT INTO inv.ItemBalance (ItemID, ItemCode, ItemLot, Warehouse, Issue, Reciept, Adjustment, CreatedBy, CreatedDate)
                        VALUES (@ItemID, @ItemCode, @LotNo, @TransactionWarehouse, CASE WHEN @EffectedType = 'I' THEN @TransactionQty ELSE 0 END, CASE WHEN @EffectedType = 'R' THEN @TransactionQty ELSE 0 END, CASE WHEN @EffectedType = 'A' THEN @TransactionQty ELSE 0 END, @User, GETDATE())
                    END
                    ELSE
                    BEGIN
                        UPDATE inv.ItemBalance SET Issue = Issue + CASE WHEN @EffectedType = 'I' THEN @TransactionQty ELSE 0 END, Reciept = Reciept + CASE WHEN @EffectedType = 'R' THEN @TransactionQty ELSE 0 END, Adjustment = Adjustment + CASE WHEN @EffectedType = 'A' THEN @TransactionQty ELSE 0 END, LastMaintBy = @User, LastMaintDate = GETDATE()
                        WHERE ItemID = @ItemID AND ItemLot = @LotNo AND Warehouse = @TransactionWarehouse
                    END
                END
            END

            -- =============================================
            -- MULTIPLE TRANSACTION
            -- =============================================
            ELSE
            BEGIN
                EXEC inv.ItemBlanceCheckOperation @ItemID, @LotNo, @FromWarehouse, @Balance OUT

                IF @Balance < @TransactionQty
                BEGIN
                    SET @State = 1
                    SET @Message = 'No Available Qty ' + @ItemCode + ' in Line no ' + CONVERT(nvarchar, @Line) + ' ' + CONVERT(nvarchar, @Balance) + '   ' + CONVERT(nvarchar, @TransactionQty)

                    DELETE FROM INV.TransactionHistoryWF
                    WHERE TransactionNo = @TransactionNo

                    ROLLBACK TRANSACTION
                    RETURN
                END

                SELECT @UnitOfMeasure = StockUM
                FROM inv.ItemMaster
                WHERE ItemID = @ItemID

                -- Line 1 - From Warehouse
                INSERT INTO inv.TransactionHistory (Line, TransactionType, TransactionDate, TransactionNo, TransactionWarehouse, ItemID, ItemCode, LotNo, TransactionQty, UnitOfMeasure, FromWarehouse, Note, ValueType, Createdby, CreatedDate, VendorNo)
                VALUES (@Line, @TransactionType, @TransactionDate, @TransactionNo, @FromWarehouse, @ItemID, @ItemCode, @LotNo, -1 * @TransactionQty, @UnitOfMeasure, @TransactionWarehouse, @Note, @EffectedType, @User, GETDATE(), @Vendor)

                SELECT @Cnt = COUNT(*)
                FROM Inv.ItemBalance
                WHERE ItemID = @ItemID AND ItemLot = @LotNo AND Warehouse = @FromWarehouse

                IF @Cnt = 0
                BEGIN
                    INSERT INTO inv.ItemBalance (ItemID, ItemCode, ItemLot, Warehouse, Issue, Reciept, Adjustment, CreatedBy, CreatedDate)
                    VALUES (@ItemID, @ItemCode, @LotNo, @FromWarehouse, CASE WHEN @EffectedType = 'I' THEN @TransactionQty ELSE 0 END, CASE WHEN @EffectedType = 'R' THEN @TransactionQty ELSE 0 END, CASE WHEN @EffectedType = 'A' THEN -1 * @TransactionQty ELSE 0 END, @User, GETDATE())
                END
                ELSE
                BEGIN
                    UPDATE inv.ItemBalance SET Issue = Issue + CASE WHEN @EffectedType = 'I' THEN @TransactionQty ELSE 0 END, Reciept = Reciept + CASE WHEN @EffectedType = 'R' THEN @TransactionQty ELSE 0 END, Adjustment = Adjustment + CASE WHEN @EffectedType = 'A' THEN -1 * @TransactionQty ELSE 0 END, LastMaintBy = @User, LastMaintDate = GETDATE()
                    WHERE ItemID = @ItemID AND ItemLot = @LotNo AND Warehouse = @FromWarehouse
                END

                -- Line 2 - To Warehouse
                INSERT INTO inv.TransactionHistory (Line, TransactionType, TransactionDate, TransactionNo, TransactionWarehouse, ItemID, ItemCode, LotNo, TransactionQty, UnitOfMeasure, FromWarehouse, Note, ValueType, Createdby, CreatedDate, VendorNo)
                VALUES (@Line, @TransactionType, @TransactionDate, @TransactionNo, @TransactionWarehouse, @ItemID, @ItemCode, @LotNo, @TransactionQty, @UnitOfMeasure, @FromWarehouse, @Note, @EffectedType, @User, GETDATE(), @Vendor)

                SELECT @Cnt = COUNT(*)
                FROM Inv.ItemBalance
                WHERE ItemID = @ItemID AND ItemLot = @LotNo AND Warehouse = @TransactionWarehouse

                IF @Cnt = 0
                BEGIN
                    INSERT INTO inv.ItemBalance (ItemID, ItemCode, ItemLot, Warehouse, Issue, Reciept, Adjustment, CreatedBy, CreatedDate)
                    VALUES (@ItemID, @ItemCode, @LotNo, @TransactionWarehouse, CASE WHEN @EffectedType = 'I' THEN @TransactionQty ELSE 0 END, CASE WHEN @EffectedType = 'R' THEN @TransactionQty ELSE 0 END, CASE WHEN @EffectedType = 'A' THEN @TransactionQty ELSE 0 END, @User, GETDATE())
                END
                ELSE
                BEGIN
                    UPDATE inv.ItemBalance SET Issue = Issue + CASE WHEN @EffectedType = 'I' THEN @TransactionQty ELSE 0 END, Reciept = Reciept + CASE WHEN @EffectedType = 'R' THEN @TransactionQty ELSE 0 END, Adjustment = Adjustment + CASE WHEN @EffectedType = 'A' THEN @TransactionQty ELSE 0 END, LastMaintBy = @User, LastMaintDate = GETDATE()
                    WHERE ItemID = @ItemID AND ItemLot = @LotNo AND Warehouse = @TransactionWarehouse
                END
            END

            COMMIT TRANSACTION

            SELECT *
            FROM inv.TransactionHistory
            WHERE TransactionNo = @TransactionNo AND TransactionType = @TransactionType
            RETURN
        END

        -- =============================================
        -- INVALID OPERATION
        -- =============================================
        SET @State = 1
        SET @Message = 'Invalid Operation: ' + @Operation

        COMMIT TRANSACTION

    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage nvarchar(4000) = ERROR_MESSAGE()
        SET @State = 1
        SET @Message = 'Error: ' + @ErrorMessage

        INSERT INTO SPUserErrors (SPName, Operation, ErrorMessage, CreatedUser, CreatedDate)
        VALUES ('INV.ItemTransactionSystemHistory', @Operation, @ErrorMessage, @User, GETDATE())

        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION
    END CATCH

END
GO
