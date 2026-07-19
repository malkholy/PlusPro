import re

with open("src/pages/AccountingMacroDrawer.jsx", "r") as f:
    content = f.read()

# I will build a simple SearchableSelect component and inject it
searchable_select = """
function SearchableSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input 
        value={open ? search : value}
        onChange={e => { setSearch(e.target.value); setOpen(true); onChange(e.target.value); }}
        onFocus={() => { setOpen(true); setSearch(''); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder}
        maxLength={50}
        style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, backgroundColor: '#fff' }}
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 200, overflowY: 'auto', backgroundColor: '#fff', border: '1px solid #CBD5E1', borderRadius: 6, marginTop: 4, zIndex: 9999, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          {filtered.map(opt => (
            <div 
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9' }}
              onMouseEnter={e => e.target.style.backgroundColor = '#F8FAFC'}
              onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
            >
              {opt}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: '8px 12px', color: '#94A3B8' }}>No tables found...</div>}
        </div>
      )}
    </div>
  );
}

export default function AccountingMacroDrawer"""

content = content.replace("export default function AccountingMacroDrawer", searchable_select)

# Replace datalist with SearchableSelect
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

new_select_html = """<SearchableSelect 
                      value={macTable}
                      onChange={setMacTable}
                      options={dbTables.map(t => t.TableName)}
                      placeholder="Search tables..."
                    />"""

content = content.replace(datalist_html, new_select_html)

with open("src/pages/AccountingMacroDrawer.jsx", "w") as f:
    f.write(content)
print("Updated AccountingMacroDrawer.jsx with SearchableSelect")

