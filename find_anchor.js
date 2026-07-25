const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
const line = lines.findIndex(l => l.includes('id="parcelas-anchor"'));
if (line !== -1) {
  console.log(`Found parcelas-anchor at line ${line}`);
} else {
  console.log("NOT FOUND parcelas-anchor");
}
