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

-- NOTE: despite the 'edit_order' prefix on their key (kept for historical/
-- key-stability reasons -- renaming would orphan any grants already made),
-- each of these 7 operations gates its field in BOTH New Order and Edit
-- Order, so they're registered as TOP-LEVEL operations (ParentOperationKey =
-- NULL), not nested under 'customer_order.edit_order' -- nesting them there
-- made them invisible/easy to miss in the admin UI when looking for
-- New-Order-related grants. One grant per field covers a user for both flows.
IF NOT EXISTS (SELECT 1 FROM PLS.OperationMaster WHERE OperationKey = 'customer_order.edit_order.change_warehouse')
BEGIN
    INSERT INTO PLS.OperationMaster (OperationKey, ParentOperationKey, PageGroupID, Label, Description, SortOrder)
    VALUES ('customer_order.edit_order.change_warehouse', NULL, 'customer_order', 'Change Warehouse', 'Allows changing the Warehouse field when creating or editing a Customer Order', 21);
END
GO

IF NOT EXISTS (SELECT 1 FROM PLS.OperationMaster WHERE OperationKey = 'customer_order.edit_order.change_price_type')
BEGIN
    INSERT INTO PLS.OperationMaster (OperationKey, ParentOperationKey, PageGroupID, Label, Description, SortOrder)
    VALUES ('customer_order.edit_order.change_price_type', NULL, 'customer_order', 'Change Price Type', 'Allows changing the Price Type field when creating or editing a Customer Order', 22);
END
GO

IF NOT EXISTS (SELECT 1 FROM PLS.OperationMaster WHERE OperationKey = 'customer_order.edit_order.change_payment_term')
BEGIN
    INSERT INTO PLS.OperationMaster (OperationKey, ParentOperationKey, PageGroupID, Label, Description, SortOrder)
    VALUES ('customer_order.edit_order.change_payment_term', NULL, 'customer_order', 'Change Payment Term', 'Allows changing the Payment Term field when creating or editing a Customer Order', 23);
END
GO

IF NOT EXISTS (SELECT 1 FROM PLS.OperationMaster WHERE OperationKey = 'customer_order.edit_order.change_tax_code')
BEGIN
    INSERT INTO PLS.OperationMaster (OperationKey, ParentOperationKey, PageGroupID, Label, Description, SortOrder)
    VALUES ('customer_order.edit_order.change_tax_code', NULL, 'customer_order', 'Change Tax Code', 'Allows changing the Tax Code field when creating or editing a Customer Order', 24);
END
GO

IF NOT EXISTS (SELECT 1 FROM PLS.OperationMaster WHERE OperationKey = 'customer_order.edit_order.change_facility')
BEGIN
    INSERT INTO PLS.OperationMaster (OperationKey, ParentOperationKey, PageGroupID, Label, Description, SortOrder)
    VALUES ('customer_order.edit_order.change_facility', NULL, 'customer_order', 'Change Facility', 'Allows changing the Facility field when creating or editing a Customer Order', 25);
END
GO

IF NOT EXISTS (SELECT 1 FROM PLS.OperationMaster WHERE OperationKey = 'customer_order.edit_order.change_currency')
BEGIN
    INSERT INTO PLS.OperationMaster (OperationKey, ParentOperationKey, PageGroupID, Label, Description, SortOrder)
    VALUES ('customer_order.edit_order.change_currency', NULL, 'customer_order', 'Change Currency', 'Allows changing the Currency field when creating or editing a Customer Order', 26);
END
GO

IF NOT EXISTS (SELECT 1 FROM PLS.OperationMaster WHERE OperationKey = 'customer_order.edit_order.change_rate')
BEGIN
    INSERT INTO PLS.OperationMaster (OperationKey, ParentOperationKey, PageGroupID, Label, Description, SortOrder)
    VALUES ('customer_order.edit_order.change_rate', NULL, 'customer_order', 'Change Rate', 'Allows changing the exchange Rate field when creating or editing a Customer Order', 27);
END
GO

-- If these rows were already deployed with the old nested-under-edit_order
-- wording/parent before this change, fix them in place (idempotent -- a
-- no-op once already updated).
UPDATE PLS.OperationMaster
SET Description = REPLACE(Description, 'while editing an existing Customer Order', 'when creating or editing a Customer Order'),
    ParentOperationKey = NULL
WHERE OperationKey LIKE 'customer_order.edit_order.change_%'
  AND (ParentOperationKey = 'customer_order.edit_order' OR Description LIKE '%while editing an existing Customer Order%');
GO
