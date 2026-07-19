import fs from 'fs';

const content = fs.readFileSync('src/pages/AccountStatement.jsx', 'utf8');

const returnIndex = content.lastIndexOf('return (');
const jsx = content.slice(returnIndex);

const lines = jsx.split('\n').slice(0, 30); // Just the top part
lines.forEach(line => console.log(line));

