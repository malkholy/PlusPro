# Project-Scoped Agent Rules

- **Default Credentials**: Always use username `sysadmin` and password `1` for the login page of this web application.

- **Testing Credentials**: For testing permissions and non-admin flows, use username `mhd` and password `G123456`.

- **SQL Execution**: Do not execute the `APIPlusJournalOperation` stored procedure from your side to test it.

- **SQL Data Modification**: Do not edit, add, or delete any journal data or run SQL statements that modify journal entries to test your work.

- **Pages and Groups Changes**: Every time a page or group is added or deleted in the application, you must update the insert statements inside [PagesAndGroups.sql](file:///Users/macbookpro/Documents/antigravity/PlusPro/SQLScript/PagesAndGroups.sql) and execute the SQL script on the database to keep the database table in sync.

- **Query Views Creation**: Always use the `APIPlusQueryOperation` stored procedure to create/register views for the dynamic queries used inside the application. Every time a new query is introduced inside any stored procedure, you must:
  1. Create a View for the query.
  2. Register it in the Query Master.
  3. Link it with the corresponding Page.

- **Lookup Query Creation**: Every time a new lookup query is added, you must:
  1. Add it to the `APIPlusLookupOperation` stored procedure.
  2. Register it in the Query Master with `QueryType = 'Lookup'`.
  3. Link it to the corresponding page using the `PageQueries` table.

- **Stored Procedure Signatures**: Any new stored procedure must inherit the standard 12-parameter signature used by `APIPlusOperation` (including `@State` and `@Message` as outputs). Missing parameters will cause the C# `GeneralAPI` controller to throw exceptions.
- **SQL Script Execution**: When executing raw SQL via `ExecuteScript` over the HTTP API, you must strip all `GO` statements and properly pre-escape single quotes (e.g., using a JS string replace script) to avoid silent syntax errors and execution failures caused by the backend proxy parser.
- **Vite Proxy Config**: When adding new API targets in `vite.config.js`, do not hardcode the schema or stored procedure name. Ensure the proxy accurately forwards the exact `SP_Name` header (including schemas like `PLS.`) provided by the frontend `api.js` client.

- **Entity Lookup Fields**: Any dropdown that lets the user pick a real entity from a DB-backed list (Customer, Item, Warehouse, Ship To, Vendor, etc.) must use the shared `src/shared/SearchableSelect.jsx` component, not a native `<select>`. It supports optional `sublabel`/`meta`/`metaSub` fields for a richer two-line row (item code + description + UM, etc.) when the lookup has that data. Native `<select>` remains fine for small fixed-option pickers (year selectors, 2-3 option toggles, in-page client-side filters over already-loaded data) -- those aren't "lookups" and don't benefit from search.

