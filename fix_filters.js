const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Replace <button class="tpl-filter-btn" type="button" data-filter="economic">
// with <button class="tpl-filter-btn" type="button" id="filter-economic" data-filter="economic">
html = html.replace(/<button class="tpl-filter-btn" type="button" data-filter="([^"]+)">/g, '<button class="tpl-filter-btn" type="button" id="filter-$1" data-filter="$1">');

// The GPS button might be slightly different: 
// <button class="tpl-filter-btn primary" id="filter-gps" ...
// We can just rely on the IDs already there if any, but let's ensure they are added if missing.

fs.writeFileSync('index.html', html);
console.log('Fixed data-filter buttons in index.html');
