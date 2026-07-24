const fs = require('fs');

const css = `
<style>
/* Location Filter Bar Styles */
.location-filter-bar {
  display: flex;
  justify-content: center;
  padding: 12px 20px;
  background: var(--tpl-surface);
  border-bottom: 1px solid var(--tpl-border);
  overflow-x: auto;
  white-space: nowrap;
}
.loc-bar-container {
  display: flex;
  align-items: center;
  gap: 12px;
}
.loc-divider {
  width: 1px;
  height: 24px;
  background: var(--tpl-border);
  margin: 0 4px;
}
.loc-region-group {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
}
.loc-global-btn, .loc-region-title, .loc-commune-btn {
  background: none;
  border: none;
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--tpl-text);
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 20px;
  transition: all 0.2s ease;
}
.loc-region-title {
  font-weight: 700;
  color: var(--tpl-primary);
}
.loc-commune-btn {
  border: 1px solid var(--tpl-border);
}
.loc-global-btn:hover, .loc-region-title:hover, .loc-commune-btn:hover {
  background: var(--tpl-surface-hover);
}
.loc-global-btn.active, .loc-region-title.active, .loc-commune-btn.active {
  background: var(--tpl-primary);
  color: #fff;
  border-color: var(--tpl-primary);
}
</style>
`;

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('</head>', css + '\n</head>');
fs.writeFileSync('index.html', html);
console.log('Appended CSS to index.html');
