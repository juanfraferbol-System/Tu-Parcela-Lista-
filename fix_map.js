const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const mapLayoutRegex = /<div class="map-layout map-hidden" id="map-layout">\s*<div id="map-container"><\/div>/;
const mapLayoutReplacement = `<div class="map-layout map-hidden" id="map-layout">
  <div class="map-sidebar" style="position:absolute; top:0; left:0; width:300px; height:100%; background:white; z-index:1000; overflow-y:auto; box-shadow: 2px 0 10px rgba(0,0,0,0.1); display:flex; flex-direction:column;">
    <div id="map-results" style="padding: 15px; font-weight: bold; border-bottom: 1px solid #eee;"></div>
    <div id="map-cards" style="flex:1; padding: 10px; display:flex; flex-direction:column; gap:10px;"></div>
  </div>
  <div id="map-container"></div>`;

html = html.replace(mapLayoutRegex, mapLayoutReplacement);
fs.writeFileSync('index.html', html);
console.log('Fixed map layout in index.html');
