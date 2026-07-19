import re

with open("src/App.jsx", "r") as f:
    content = f.read()

# Add import
if "import AccountingMacros" not in content:
    content = content.replace("import AccountingFunctions from './pages/AccountingFunctions.jsx';", "import AccountingFunctions from './pages/AccountingFunctions.jsx';\nimport AccountingMacros from './pages/AccountingMacros.jsx';")

# Add to page registry
if "accounting_macros:" not in content:
    content = content.replace("accounting_functions: AccountingFunctions", "accounting_functions: AccountingFunctions,\n  accounting_macros: AccountingMacros")

with open("src/App.jsx", "w") as f:
    f.write(content)
print("Patched App.jsx")
