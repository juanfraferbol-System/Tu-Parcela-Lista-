const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const idx = html.indexOf('parcelas-container');
console.log(html.slice(Math.max(0, idx - 100), idx + 200));
