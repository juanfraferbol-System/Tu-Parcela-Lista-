const fs = require('fs');

const css = `
<style>
/* Map Layout Container Fixes */
.map-layout {
  position: relative;
  width: 100%;
  height: 700px;
  background: var(--tpl-surface, #fff);
  border: 1px solid var(--tpl-border, #eee);
  border-radius: 12px;
  overflow: hidden;
  margin-top: 20px;
}
.map-layout.map-hidden {
  display: none !important;
}
#map-container {
  width: 100%;
  height: 100%;
}
</style>
`;

let html = fs.readFileSync('index.html', 'utf8');
// Insert it just before the </head> tag again.
html = html.replace('</head>', css + '\n</head>');

// Also update the cache buster again just to be 100% sure the browser reloads fully.
html = html.replace(/app\.js\?v=\d+/g, `app.js?v=${Date.now()}`);

fs.writeFileSync('index.html', html);
console.log('Appended map-layout CSS to index.html and bumped cache');
