import sys

with open('src/pages/TrialBalance.jsx', 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if '{/* Left Sidebar Filters Panel */}' in line:
        start_idx = i
    if '{/* Right Side Data Area */}' in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    new_lines = lines[:start_idx]
    new_lines.append("      <FilterPanel\n")
    new_lines.append("        filters={['account', 'date', 'currency', 'customer', 'vendor', 'bank', 'asset', 'employee', 'expense']}\n")
    new_lines.append("        onSearch={handleSearch}\n")
    new_lines.append("        loading={loading}\n")
    new_lines.append("        user={user}\n")
    new_lines.append("        defaultFilters={activeFilters}\n")
    new_lines.append("      />\n\n")
    new_lines.extend(lines[end_idx:])
    
    with open('src/pages/TrialBalance.jsx', 'w') as f:
        f.writelines(new_lines)
    print("Replaced successfully")
else:
    print("Could not find boundaries")
