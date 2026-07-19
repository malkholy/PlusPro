USE [ERPMega25]
GO

-- =========================================================================
-- Description: Template script to register a query to Query Master 
--              and link it with a Page Group using APIPlusQueryOperation
-- =========================================================================

-- 1. Configure the Query and Link parameters
DECLARE @PageGroupID VARCHAR(50)       = 'user_permissions'; -- ID of the target page/group
DECLARE @QueryOperation VARCHAR(100)   = 'GetSystemUsers'; -- Unique Operation identifier
DECLARE @QueryName NVARCHAR(150)       = 'Get System Users'; -- Display Name
DECLARE @SPName NVARCHAR(250)          = '[PLS].[APIPlusOperation]'; -- Stored Procedure name executing the query
DECLARE @Description NVARCHAR(500)     = 'Get the list of active system users and their groups';
DECLARE @QuerySQL NVARCHAR(MAX)        = 'SELECT a.Username, a.Name, a.IsAdmin, b.GroupName FROM ERPManagement25.System.UserMaster a LEFT OUTER JOIN ERPManagement25.System.GroupMaster b ON a.GroupID = b.GroupID ORDER BY a.Username;';
DECLARE @DatabaseName VARCHAR(100)     = 'ERPManagement25';
DECLARE @SchemaName VARCHAR(100)       = 'System';
DECLARE @TableOrViewName VARCHAR(150)   = 'UserMaster';
DECLARE @QueryType VARCHAR(50)         = 'Grid'; -- Grid, Form, chart, etc.
DECLARE @ApiUrl VARCHAR(500)           = '';

-- 2. Build the metadata JSON payload
DECLARE @LineData NVARCHAR(MAX) = (
    SELECT 
        @PageGroupID AS PageGroupID,
        @QueryName AS QueryName,
        @SPName AS SPName,
        @QueryOperation AS QueryOperation,
        @Description AS Description,
        @QuerySQL AS QuerySQL,
        @DatabaseName AS DatabaseName,
        @SchemaName AS SchemaName,
        @TableOrViewName AS TableOrViewName,
        @QueryType AS QueryType,
        @ApiUrl AS ApiUrl
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
);

-- 3. Execute CreateQueryView operation
DECLARE @State INT;
DECLARE @Message NVARCHAR(500);

EXEC [dbo].[APIPlusQueryOperation]
    @Operation = 'CreateQueryView',
    @LineData = @LineData,
    @User = 'sysadmin',
    @SqlStatement = NULL, -- Put View DDL here if you want to create a SQL View automatically (e.g. 'CREATE VIEW PLS.V_MyView AS ...')
    @State = @State OUTPUT,
    @Message = @Message OUTPUT;

-- 4. Review registration results
SELECT @State AS State, @Message AS Message;
GO
