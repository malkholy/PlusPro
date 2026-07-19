with open("SQLScript/APIPlusJournalOperation.sql", "r") as f:
    content = f.read()

target = """
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

if target in content:
    content = content.replace(target, "")
    with open("SQLScript/APIPlusJournalOperation.sql", "w") as f:
        f.write(content)
    print("Removed Delete block successfully.")
else:
    print("Could not find the target block.")
