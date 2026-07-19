# Plus Pro

Plus Pro Control Panel — GLC Paints  
Built with React JSX · Hosted on GitHub Pages

## Live
https://malkholy.github.io/pluspro/

## API
`https://sila.silasystem.com:7103/General/GeneralAPI/`  
SP: `APIPanelOperation`

## Pages
| Page | Operation | Status |
|------|-----------|--------|
| Control Page | `Get Control Data` | 🔄 In progress |
| Expenses | TBD | ⏳ Pending |
| Projects | TBD | ⏳ Pending |
| HR | TBD | ⏳ Pending |
| Cash | TBD | ⏳ Pending |

## Structure
```
src/
├── App.jsx          ← Login + Layout + Sidebar + Tabs
├── nav.js           ← Nav config
├── shared/
│   └── api.js       ← apiCall helper
└── pages/
    ├── ControlPage.jsx
    ├── Expenses.jsx
    ├── Projects.jsx
    ├── HR.jsx
    └── Cash.jsx
```
