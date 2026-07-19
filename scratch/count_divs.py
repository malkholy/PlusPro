import re
with open('src/pages/AccountStatement.jsx', 'r') as f:
    text = f.read()

# Only consider the part inside the `return (` statement at the end
start = text.find("  return (\n")
if start != -1:
    jsx_part = text[start:]
    open_divs = len(re.findall(r'<div\b', jsx_part))
    close_divs = len(re.findall(r'</div>', jsx_part))
    print(f"Open divs: {open_divs}")
    print(f"Close divs: {close_divs}")
else:
    print("Return not found")
