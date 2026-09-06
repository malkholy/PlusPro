USE [ERPMega25]
GO

-- ============================================================================
-- 'Item Master All' is the single generic Lookup query behind every item
-- search/picker in the app (13+ frontend call sites -- ShopOrderFormDrawer,
-- PlanningShowPlan, ProductionBulkModal, RMADrawer, BillOfMaterial*, etc.
-- all reuse this one query rather than each having its own). Restrict it to
-- ItemState = 0 ("Active" per INV.ItemStateMaster -- 0=Active, 10=Hold,
-- 80=Inactive, 99=Deleted) so Hold/Inactive/Deleted items stop showing up
-- as pickable in every item search across the app.
--
-- Deliberately NOT applied to 'Item Master Grid' / 'Planning Item Master
-- Grid' (the Item Master management grids themselves, where seeing
-- inactive/deleted items is the point) or 'Shop Order Lines' (existing
-- order lines must keep displaying even if their item later went inactive).
-- ============================================================================

UPDATE [PLS].[QueryMaster]
SET QuerySQL = 'SELECT ItemID, ItemCode, ItemDescription AS ItemName, LotControl, SellingConversion, SellingUM, StockUM , ItemType

FROM inv.ItemMaster WHERE ItemState = 0 {FILTER} ORDER BY ItemID'
WHERE Operation = 'Item Master All' AND QueryType = 'Lookup';
GO
