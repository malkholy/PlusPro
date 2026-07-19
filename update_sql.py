import re

with open("APIPlusJournalOperation.sql", "r") as f:
    content = f.read()

# Prepare the new block
new_sql = """
    -- =============================================
    -- ACCOUNTING FUNCTIONS OPERATIONS
    -- =============================================
    IF @Operation = 'Get Accounting Functions List'
    BEGIN
        SELECT * FROM [ACC].AccountingFunctionsHeader
        RETURN
    END

    IF @Operation = 'Get Accounting Function For Edit'
    BEGIN
        DECLARE @Get_FunctionPrefix nvarchar(50)
        SET @Get_FunctionPrefix = JSON_VALUE(@LineData, '$.FunctionPrefix')

        SELECT * FROM [ACC].AccountingFunctionsHeader WHERE FunctionPrefix = @Get_FunctionPrefix
        SELECT * FROM [ACC].AccountingFunctionDoucmentHeader WHERE FunctionPrefix = @Get_FunctionPrefix
        SELECT * FROM [ACC].AccountingFunctionDoucmentDetails WHERE FunctionPrefix = @Get_FunctionPrefix
        SELECT * FROM [ACC].AccountingFunctionDoucmentSequence WHERE FunctionPrefix = @Get_FunctionPrefix
        RETURN
    END

    IF @Operation = 'Save Accounting Function'
    BEGIN
        DECLARE @AccFunc_Prefix nvarchar(50), @AccFunc_Desc nvarchar(max), @AccFunc_Type nvarchar(50), @AccFunc_DocPrefix nvarchar(50)
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
            FunctionPrefix nvarchar(50), FunctionDescription nvarchar(max), FuctionType nvarchar(50),
            DoucmentPrefix nvarchar(50), EventID int, HasDocumentType int, QuickFlag int, IsNew int
        )

        IF @AccFunc_IsNew = 1
        BEGIN
            DECLARE @FuncExist int
            SELECT @FuncExist = COUNT(*) FROM [ACC].AccountingFunctionsHeader WHERE FunctionPrefix = @AccFunc_Prefix
            IF @FuncExist > 0
            BEGIN
                SET @State = 1
                SET @Message = 'Function Already Exists'
                RETURN
            END

            INSERT INTO [ACC].AccountingFunctionsHeader (FunctionPrefix, FunctionDescription, FuctionType, DoucmentPrefix, EventID, HasDocumentType, QuickFlag)
            VALUES (@AccFunc_Prefix, @AccFunc_Desc, @AccFunc_Type, @AccFunc_DocPrefix, @AccFunc_EventID, @AccFunc_HasDocType, @AccFunc_QuickFlag)
        END
        ELSE
        BEGIN
            UPDATE [ACC].AccountingFunctionsHeader 
            SET FunctionDescription = @AccFunc_Desc, FuctionType = @AccFunc_Type, DoucmentPrefix = @AccFunc_DocPrefix,
                LastMaintUser = @User, LastMaintDate = GETDATE(), EventID = @AccFunc_EventID, HasDocumentType = @AccFunc_HasDocType, QuickFlag = @AccFunc_QuickFlag
            WHERE FunctionPrefix = @AccFunc_Prefix
        END

        -- Delete old documents/lines/sequences to replace with new payload
        DELETE FROM [ACC].AccountingFunctionDoucmentDetails WHERE FunctionPrefix = @AccFunc_Prefix
        DELETE FROM [ACC].AccountingFunctionDoucmentHeader WHERE FunctionPrefix = @AccFunc_Prefix
        DELETE FROM [ACC].AccountingFunctionDoucmentSequence WHERE FunctionPrefix = @AccFunc_Prefix

        -- Re-insert Document Types
        INSERT INTO [ACC].AccountingFunctionDoucmentHeader (FunctionPrefix, DocumentType, DocumentDescription, Tax, DoucmentCreatedBy, DoucmentCreatedDate)
        SELECT @AccFunc_Prefix, DocumentType, DocumentDescription, Tax, @User, GETDATE()
        FROM OPENJSON(@LineMember, '$.DocumentTypes') WITH (
            DocumentType int, DocumentDescription nvarchar(max), Tax int
        )

        -- Re-insert Document Details (Lines/Segments)
        INSERT INTO [ACC].AccountingFunctionDoucmentDetails (FunctionPrefix, DocumentType, Line, SegmentID, SegmentCondition, DetailsCreatedBy, DetailCreatedDate)
        SELECT @AccFunc_Prefix, DocumentType, Line, SegmentID, SegmentCondition, @User, GETDATE()
        FROM OPENJSON(@LineMember, '$.DocumentDetails') WITH (
            DocumentType int, Line int, SegmentID int, SegmentCondition nvarchar(max)
        )

        -- Re-insert Sequences
        INSERT INTO [ACC].AccountingFunctionDoucmentSequence (FunctionPrefix, DoucmentYear, DoucmentSequence, DoucmentPrefix, SequneceCreatedBy, SequenceCreatedDate)
        SELECT @AccFunc_Prefix, DoucmentYear, DoucmentSequence, DoucmentPrefix, @User, GETDATE()
        FROM OPENJSON(@LineMember, '$.Sequences') WITH (
            DoucmentYear int, DoucmentSequence int, DoucmentPrefix nvarchar(50)
        )

        -- Return the saved function
        SELECT * FROM [ACC].AccountingFunctionsHeader WHERE FunctionPrefix = @AccFunc_Prefix
        SELECT * FROM [ACC].AccountingFunctionDoucmentHeader WHERE FunctionPrefix = @AccFunc_Prefix
        SELECT * FROM [ACC].AccountingFunctionDoucmentDetails WHERE FunctionPrefix = @AccFunc_Prefix
        SELECT * FROM [ACC].AccountingFunctionDoucmentSequence WHERE FunctionPrefix = @AccFunc_Prefix
        RETURN
    END

    IF @Operation = 'Delete Accounting Function'
    BEGIN
        DECLARE @Del_FunctionPrefix nvarchar(50)
        SET @Del_FunctionPrefix = JSON_VALUE(@LineData, '$.FunctionPrefix')

        DELETE FROM [ACC].AccountingFunctionDoucmentDetails WHERE FunctionPrefix = @Del_FunctionPrefix
        DELETE FROM [ACC].AccountingFunctionDoucmentHeader WHERE FunctionPrefix = @Del_FunctionPrefix
        DELETE FROM [ACC].AccountingFunctionDoucmentSequence WHERE FunctionPrefix = @Del_FunctionPrefix
        DELETE FROM [ACC].AccountingFunctionsHeader WHERE FunctionPrefix = @Del_FunctionPrefix
        RETURN
    END

"""

# Replace
split_target = "    -- =============================================\n    -- INVALID OPERATION"
if split_target in content:
    content = content.replace(split_target, new_sql + "\n" + split_target)
    with open("APIPlusJournalOperation.sql", "w") as f:
        f.write(content)
    print("Injected SQL blocks successfully.")
else:
    print("Could not find the target split location in SQL.")
