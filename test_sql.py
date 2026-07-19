import re

with open("SQLScript/APIPlusJournalOperation.sql", "r") as f:
    sql = f.read()

# Validate matching BEGIN/END blocks
lines = sql.split('\n')
stack = []
for i, line in enumerate(lines):
    if re.search(r'\bBEGIN\b', line, re.IGNORECASE) and not re.search(r'--.*BEGIN', line, re.IGNORECASE):
        stack.append(i+1)
    elif re.search(r'\bEND\b', line, re.IGNORECASE) and not re.search(r'--.*END', line, re.IGNORECASE):
        if stack:
            stack.pop()
        else:
            print("Unmatched END at line", i+1)

if stack:
    print("Unmatched BEGIN at lines", stack)
else:
    print("BEGIN/END matched perfectly.")
