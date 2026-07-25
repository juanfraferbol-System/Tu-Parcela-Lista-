const fs = require('fs');

const css = `
<style>
/* Map Sidebar & Cards CSS */
.map-sidebar {
  position: absolute;
  top: 0;
  left: 0;
  width: 320px;
  height: 100%;
  background: var(--tpl-surface, #fff);
  z-index: 1000;
  overflow-y: auto;
  box-shadow: 2px 0 10px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
}
#map-results {
  padding: 15px;
  font-weight: 700;
  border-bottom: 1px solid var(--tpl-border, #eee);
  background: var(--tpl-surface, #fff);
  position: sticky;
  top: 0;
  z-index: 10;
}
#map-cards {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.map-card {
  border: 1px solid var(--tpl-border, #eee);
  border-radius: 8px;
  padding: 12px;
  background: var(--tpl-surface, #fff);
  transition: border-color 0.2s, box-shadow 0.2s;
  cursor: pointer;
}
.map-card:hover, .map-card.active {
  border-color: var(--tpl-primary, #2b6cb0);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.map-card-main {
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  cursor: pointer;
}
.map-card-title {
  font-weight: 600;
  color: var(--tpl-text, #333);
  font-size: 0.95rem;
}
.map-card-price {
  font-weight: 700;
  color: var(--tpl-primary, #2b6cb0);
  font-size: 1.1rem;
}
.map-card-meta {
  font-size: 0.85rem;
  color: var(--tpl-text-muted, #777);
  margin-top: 4px;
}
</style>
`;

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('</head>', css + '\n</head>');
fs.writeFileSync('index.html', html);
console.log('Appended map CSS to index.html');
