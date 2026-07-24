const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const appJs = fs.readFileSync('app.js', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

const domDef = appJs.match(/const DOM = \{([^}]+)\};/);
if (!domDef) {
  console.error("DOM definition not found");
  process.exit(1);
}

const domObjectString = "({" + domDef[1] + "})";
const domRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const idsInAppJs = [];
while ((match = domRegex.exec(domObjectString)) !== null) {
  idsInAppJs.push(match[1]);
}

const dom = new JSDOM(indexHtml);
const document = dom.window.document;

const missingIds = [];
for (const id of idsInAppJs) {
  if (!document.getElementById(id)) {
    missingIds.push(id);
  }
}

console.log("Missing IDs in index.html:");
console.log(missingIds.join("\n"));
