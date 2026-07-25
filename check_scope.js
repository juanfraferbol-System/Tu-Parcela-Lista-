const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');
const domIdx = app.indexOf('const DOM =');
const readyIdx = app.indexOf('DOMContentLoaded');
console.log('DOM declared at:', domIdx);
console.log('DOMContentLoaded at:', readyIdx);
