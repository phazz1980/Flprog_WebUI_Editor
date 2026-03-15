/**
 * Записывает .env.production.local с REACT_APP_BUILD_DATE (YYYY-MM-DD) в текущую директорию.
 * Запускать перед react-scripts build из корня или из viewer.
 */
const fs = require('fs');
const path = require('path');

const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const cwd = process.cwd();
const envPath = path.join(cwd, '.env.production.local');
const line = `REACT_APP_BUILD_DATE=${date}\n`;
fs.writeFileSync(envPath, line, 'utf8');
console.log('Set REACT_APP_BUILD_DATE=' + date + ' in ' + envPath);
