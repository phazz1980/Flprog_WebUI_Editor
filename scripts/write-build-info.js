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
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const m = content.match(/REACT_APP_BUILD_DATE=(.+)/);
  if (m) buildDate = m[1].trim();
}

if (!fs.existsSync(buildDir)) {
  console.error('write-build-info.js: build/ не найден, запускайте после react-scripts build');
  process.exit(1);
}

const info = { buildDate };
fs.writeFileSync(outPath, JSON.stringify(info), 'utf8');
console.log('Wrote build-info.json with buildDate=' + buildDate);

// Подставить дату сборки в index.html (для проверки версии инлайн-скриптом)
const indexPath = path.join(buildDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  if (html.includes('__BUILD_DATE__')) {
    html = html.replace(/__BUILD_DATE__/g, buildDate);
    fs.writeFileSync(indexPath, html, 'utf8');
    console.log('Patched index.html build-date');
  }
}
