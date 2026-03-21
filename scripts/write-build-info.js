/**
 * Пишет build-info.json в build/ с датой сборки для проверки обновлений на клиенте.
 * Запускать после react-scripts build (из корня или из viewer).
 */
const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const envPath = path.join(cwd, '.env.production.local');
const buildDir = path.join(cwd, 'build');
const outPath = path.join(buildDir, 'build-info.json');

let buildDate = new Date().toISOString().slice(0, 10);
let buildTime = '';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const m = content.match(/REACT_APP_BUILD_DATE=(.+)/);
  if (m) buildDate = m[1].trim();
  const mt = content.match(/REACT_APP_BUILD_TIME=(.+)/);
  if (mt) buildTime = mt[1].trim();
}

if (!fs.existsSync(buildDir)) {
  console.error('write-build-info.js: build/ не найден, запускайте после react-scripts build');
  process.exit(1);
}

const buildSignature = `${buildDate}|${buildTime || ''}`;
const info = { buildDate, buildTime, buildSignature };
fs.writeFileSync(outPath, JSON.stringify(info), 'utf8');
console.log('Wrote build-info.json with buildDate=' + buildDate + ' buildTime=' + buildTime);

// Подставить дату сборки в index.html (для проверки версии инлайн-скриптом)
const indexPath = path.join(buildDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  if (html.includes('__BUILD_DATE__') || html.includes('__BUILD_SIGNATURE__')) {
    html = html.replace(/__BUILD_DATE__/g, buildDate);
    html = html.replace(/__BUILD_SIGNATURE__/g, buildSignature);
    fs.writeFileSync(indexPath, html, 'utf8');
    console.log('Patched index.html build-date / build-signature');
  }
}
