import fs from 'fs';
let content = fs.readFileSync('src/pages/AccountStatement.jsx', 'utf8');
content = content.replace(/<div style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0, gap: 16, position: 'relative' }}>/g, "<div style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0, gap: 16, position: 'relative', border: '5px solid red' }}>");
content = content.replace(/<div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'auto' }}>/g, "<div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'auto', border: '5px solid blue' }}>");
content = content.replace(/<div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 16 }}>/g, "<div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 16, border: '5px solid green' }}>");
fs.writeFileSync('src/pages/AccountStatement.jsx', content);
