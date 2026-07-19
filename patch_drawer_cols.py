import re

with open("src/pages/AccountingMacroDrawer.jsx", "r") as f:
    content = f.read()

# 1. Add state for tableColumns
content = content.replace(
    "const [dbTables, setDbTables] = useState([]);",
    "const [dbTables, setDbTables] = useState([]);\n  const [tableColumns, setTableColumns] = useState([]);"
)

# 2. Add useEffect to fetch columns when macTable changes
fetch_cols_effect = """
  useEffect(() => {
    async function loadColumns() {
      if (!macTable) {
        setTableColumns([]);
        return;
      }
      try {
        const res = await apiCall('Get Table Columns', { TableName: macTable }, { User: user?.Username }, 'journal');
        if (res.State === 0) {
          setTableColumns(res.List0 || []);
        }
      } catch(e) {}
    }
    loadColumns();
  }, [macTable, user]);
"""
content = content.replace("  useEffect(() => {\n    if (isEditMode && editRow) {", fetch_cols_effect + "\n  useEffect(() => {\n    if (isEditMode && editRow) {")

# 3. Replace inputs with SearchableSelect
input_prefix = """<input value={macPrefix} onChange={e => setMacPrefix(e.target.value)} maxLength={50} style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6 }} />"""
select_prefix = """<SearchableSelect value={macPrefix} onChange={setMacPrefix} options={tableColumns.map(c => c.ColumnName)} placeholder="Select column..." />"""

input_doc = """<input value={macDoc} onChange={e => setMacDoc(e.target.value)} maxLength={50} style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6 }} />"""
select_doc = """<SearchableSelect value={macDoc} onChange={setMacDoc} options={tableColumns.map(c => c.ColumnName)} placeholder="Select column..." />"""

input_dynamic = """<input value={macDynamic1} onChange={e => setMacDynamic1(e.target.value)} maxLength={50} style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6 }} />"""
select_dynamic = """<SearchableSelect value={macDynamic1} onChange={setMacDynamic1} options={tableColumns.map(c => c.ColumnName)} placeholder="Select column..." />"""

content = content.replace(input_prefix, select_prefix)
content = content.replace(input_doc, select_doc)
content = content.replace(input_dynamic, select_dynamic)

with open("src/pages/AccountingMacroDrawer.jsx", "w") as f:
    f.write(content)
print("Updated AccountingMacroDrawer.jsx with dynamic columns")
