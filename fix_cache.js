const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('app.js?v=20260723-cotizador-v2', `app.js?v=${Date.now()}`);
fs.writeFileSync('index.html', html);
console.log('Updated app.js cache buster');
