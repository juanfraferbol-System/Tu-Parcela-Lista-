const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const idsToCheck = ['map-layout', 'map-container', 'map-cards', 'map-results', 'btn-map-view', 'parcelas-container'];

console.log('--- HTML IDs ---');
idsToCheck.forEach(id => {
  console.log(`${id}:`, html.includes(`id="${id}"`) || html.includes(`id='${id}'`));
});
