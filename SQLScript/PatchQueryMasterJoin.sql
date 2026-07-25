USE [ERPManagement25]
GO

/****** Object:  StoredProcedure [PLS].[APIPlusOperation] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [PLS].[APIPlusOperation]
    @Operation NVARCHAR(100),
    @User NVARCHAR(100) = NULL,
    @LineData NVARCHAR(MAX) = NULL,
    @FilterData NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    -- [ ... Rest of the SP remains exactly the same ... ]
    -- You only need to find the 'GetQueryMaster' block and change INNER JOIN to LEFT JOIN.
    
    -- IF @Operation = 'GetQueryMaster'
    -- BEGIN
    --     SET @State = 0;
    --     SET @Message = 'Success';
    -- 
    --     SELECT q.QueryID, pq.PageGroupID, q.QueryName, q.SPName, q.Operation, q.Description, q.QuerySQL, q.DatabaseName, q.SchemaName, q.TableOrViewName, q.QueryType, q.ApiUrl 
    --     FROM [PLS].[QueryMaster] q
    --     LEFT JOIN [PLS].[PageQueries] pq ON q.QueryID = pq.QueryID
    --     ORDER BY pq.PageGroupID, q.QueryID;
    --     RETURN;
    -- END
END
GO
