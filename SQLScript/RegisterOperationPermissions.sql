USE [ERPMega25]
GO

-- ============================================================================
-- PLS.OperationMaster / PLS.UserOperationPermissions
--
-- App-wide "operation permission" layer, distinct from the existing
-- PLS.UserPagePermissions (whole-page visibility) and PLS.UserQueryPermissions
-- (grid row-filtering). This gates specific ACTIONS -- creating/editing a
-- record, or a granular sub-action inside a form (e.g. "change Warehouse
-- while editing a Customer Order").
--
-- OperationMaster is a living registry: new operations get added here as
-- each form is built, not a fixed enum. ParentOperationKey lets a
-- sub-operation nest under its parent (e.g. edit_order -> change_warehouse)
-- for display grouping in the admin UI -- it's not a deep hierarchy like
-- PagesAndGroups, just one level of nesting.
-- ============================================================================

IF OBJECT_ID('PLS.OperationMaster', 'U') IS NULL
BEGIN
    CREATE TABLE PLS.OperationMaster (
        OperationKey        VARCHAR(150) PRIMARY KEY,
        ParentOperationKey  VARCHAR(150) NULL REFERENCES PLS.OperationMaster(OperationKey),
        PageGroupID         VARCHAR(50) NULL,
        Label               VARCHAR(200) NOT NULL,
        Description         VARCHAR(500) NULL,
        SortOrder           INT NOT NULL DEFAULT 0
    );
END
GO

IF OBJECT_ID('PLS.UserOperationPermissions', 'U') IS NULL
BEGIN
    CREATE TABLE PLS.UserOperationPermissions (
        PermissionID   INT IDENTITY(1,1) PRIMARY KEY,
        Username       VARCHAR(100) NOT NULL,
        OperationKey   VARCHAR(150) NOT NULL REFERENCES PLS.OperationMaster(OperationKey),
        CanPerform     BIT NOT NULL DEFAULT 0,
        GrantedBy      VARCHAR(100) NULL,
        GrantedDate    DATETIME NULL
    );
END
GO

-- Seed the first real consumer: Customer Order New/Edit + one nested
-- sub-operation (Change Warehouse while editing).
IF NOT EXISTS (SELECT 1 FROM PLS.OperationMaster WHERE OperationKey = 'customer_order.new_order')
BEGIN
    INSERT INTO PLS.OperationMaster (OperationKey, ParentOperationKey, PageGroupID, Label, Description, SortOrder)
    VALUES ('customer_order.new_order', NULL, 'customer_order', 'Create New Order', 'Allows creating a new Customer Order', 10);
END
GO

IF NOT EXISTS (SELECT 1 FROM PLS.OperationMaster WHERE OperationKey = 'customer_order.edit_order')
BEGIN
    INSERT INTO PLS.OperationMaster (OperationKey, ParentOperationKey, PageGroupID, Label, Description, SortOrder)
    VALUES ('customer_order.edit_order', NULL, 'customer_order', 'Edit Order', 'Allows opening an existing Customer Order for editing', 20);
END
GO

IF NOT EXISTS (SELECT 1 FROM PLS.OperationMaster WHERE OperationKey = 'customer_order.edit_order.change_warehouse')
BEGIN
    INSERT INTO PLS.OperationMaster (OperationKey, ParentOperationKey, PageGroupID, Label, Description, SortOrder)
    VALUES ('customer_order.edit_order.change_warehouse', 'customer_order.edit_order', 'customer_order', 'Change Warehouse', 'Allows changing the Warehouse field while editing an existing Customer Order', 21);
END
GO
