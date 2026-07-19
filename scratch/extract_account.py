import re

with open('src/pages/AccountStatement.jsx', 'r') as f:
    text = f.read()

# Extract fmtAmt, fmtDate, exportStatementToExcel, printStatement
header_funcs = text[:text.find('export default function AccountStatement')]

# Extract table part
# We will just grab from `  return (` to the end of the file.
table_match = text[text.find('  return ('):]

with open('scratch/account_header.js', 'w') as f:
    f.write(header_funcs)
    
with open('scratch/account_table.js', 'w') as f:
    f.write(table_match)

