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




