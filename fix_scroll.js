const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// Replace locBar manual scroll
const locBarRegex = /const elementPosition = parcelasSec\.getBoundingClientRect\(\)\.top;[\s\S]*?\}\);/m;
const locBarReplacement = `parcelasSec.scrollIntoView({ behavior: "smooth", block: "start" });`;
appJs = appJs.replace(locBarRegex, locBarReplacement);

// Replace scrollTo(...)
const scrollToRegex = /scrollTo\(DOM\.parcelasContainer \|\| DOM\.parcelasAnchor\);/g;
const scrollToReplacement = `(DOM.parcelasContainer || DOM.parcelasAnchor)?.scrollIntoView({ behavior: "smooth", block: "start" });`;
appJs = appJs.replace(scrollToRegex, scrollToReplacement);

fs.writeFileSync('app.js', appJs);
console.log('Fixed scroll logic in app.js');
