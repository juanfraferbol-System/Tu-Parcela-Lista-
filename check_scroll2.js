const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');
const start = app.indexOf('scrollIntoView({ behavior: "smooth", block: "start" }');
console.log(app.slice(start - 100, start + 200));
