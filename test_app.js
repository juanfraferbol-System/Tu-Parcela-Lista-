const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously" });
const window = dom.window;
global.document = window.document;
global.window = window;

try {
  const appJs = fs.readFileSync('app.js', 'utf8');
  // Mock dependencies
  window.lucide = { createIcons: () => {} };
  window.L = { 
    map: () => ({ setView: () => {}, on: () => {}, invalidateSize: () => {} }), 
    tileLayer: () => ({ addTo: () => {} }), 
    marker: () => ({ addTo: () => {}, bindPopup: () => {} }),
    icon: () => {} 
  };
  
  // execute app.js
  const script = document.createElement("script");
  script.textContent = appJs;
  document.body.appendChild(script);

  // Trigger DOMContentLoaded
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  
  console.log("DOMContentLoaded executed without throwing!");
} catch(e) {
  console.error("Error running app.js:", e);
}
