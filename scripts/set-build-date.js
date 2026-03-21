/**
 * Записывает .env.production.local с REACT_APP_BUILD_DATE (YYYY-MM-DD) и REACT_APP_BUILD_TIME (HH:mm:ss локально).
 * Запускать перед react-scripts build из корня или из viewer.
 */
const fs = require('fs');
const path = require('path');

const pad2 = (n) => String(n).padStart(2, '0');
const now = new Date();
const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
const cwd = process.cwd();
const envPath = path.join(cwd, '.env.production.local');
const line = `REACT_APP_BUILD_DATE=${date}\nREACT_APP_BUILD_TIME=${time}\n`;
fs.writeFileSync(envPath, line, 'utf8');
console.log('Set REACT_APP_BUILD_DATE=' + date + ' REACT_APP_BUILD_TIME=' + time + ' in ' + envPath);
