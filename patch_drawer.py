import re

with open("src/pages/AccountingMacroDrawer.jsx", "r") as f:
    content = f.read()

# Add tables state
content = content.replace(
    "const [macDesc, setMacDesc] = useState('');",
    "const [macDesc, setMacDesc] = useState('');\n  const [dbTables, setDbTables] = useState([]);"
)

# Fetch tables on mount
fetch_tables = """
  useEffect(() => {
    async function loadTables() {
      try {
        const res = await apiCall('Get Database Tables', null, { User: user?.Username }, 'journal');
        if (res.State === 0) {
          setDbTables(res.List0 || []);
        }
      } catch(e) {}
    }
    loadTables();
  }, [user]);

  useEffect(() => {
"""
content = content.replace("  useEffect(() => {\n    if (isEditMode && editRow) {", fetch_tables + "    if (isEditMode && editRow) {")

# Update MacroTable input to use datalist
input_html = """<input value={macTable} onChange={e => setMacTable(e.target.value)} maxLength={50} style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6 }} />"""

datalist_html = """<input 
                      list="db-tables-list"
                      value={macTable} 
                      onChange={e => setMacTable(e.target.value)} 
                      maxLength={50} 
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6 }} 
                      placeholder="Search tables..."
                    />
                    <datalist id="db-tables-list">
                      {dbTables.map(t => (
                        <option key={t.TableName} value={t.TableName} />
                      ))}
                    </datalist>"""

content = content.replace(input_html, datalist_html)

with open("src/pages/AccountingMacroDrawer.jsx", "w") as f:
    f.write(content)
print("Updated AccountingMacroDrawer.jsx")
