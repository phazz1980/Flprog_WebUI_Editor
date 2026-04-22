/**
 * Собирает клиент с homepage = базовый URL редактора + "/viewer",
 * затем копирует viewer/build в build/viewer для совместного деплоя.
 * Запуск: после сборки редактора (npm run build), из корня репо: node scripts/build-viewer-into-build.js
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const viewerDir = path.join(rootDir, 'viewer');
const editorBuildDir = path.join(rootDir, 'build');
const viewerBuildDir = path.join(viewerDir, 'build');
const viewerPackagePath = path.join(viewerDir, 'package.json');

// Для GitHub Pages в подпапке viewer используем относительные пути
const viewerPackage = JSON.parse(fs.readFileSync(viewerPackagePath, 'utf8'));
viewerPackage.homepage = ".";
fs.writeFileSync(viewerPackagePath, JSON.stringify(viewerPackage, null, 2));
console.log('Client homepage: . (относительные пути для подпапки viewer)');

execSync('npm run build', { cwd: viewerDir, stdio: 'inherit' });

if (!fs.existsSync(editorBuildDir)) {
  console.error('Сначала соберите редактор: npm run build');
  process.exit(1);
}

const destViewerDir = path.join(editorBuildDir, 'viewer');
if (fs.existsSync(destViewerDir)) {
  fs.rmSync(destViewerDir, { recursive: true });
}
fs.mkdirSync(destViewerDir, { recursive: true });
copyDir(viewerBuildDir, destViewerDir);

// Исправляем пути в index.html viewer для работы в подпапке
fixViewerIndexPaths(destViewerDir);

console.log('Скопировано viewer/build → build/viewer (с исправленными путями)');

function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(src, e.name);
    const destPath = path.join(dest, e.name);
    if (e.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function fixViewerIndexPaths(viewerDir) {
  const indexPath = path.join(viewerDir, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Исправляем пути для работы в подпапке
  html = html.replace(/\/Flprog_WebUI_Editor\/viewer\//g, './');
  html = html.replace(/href="\/Flprog_WebUI_Editor\/viewer\/manifest\.json"/g, 'href="./manifest.json"');
  html = html.replace(/href="\/Flprog_WebUI_Editor\/viewer/g, 'href=".');
  html = html.replace(/src="\/Flprog_WebUI_Editor\/viewer/g, 'src=".');
  
  fs.writeFileSync(indexPath, html);
  console.log('Исправлены пути в viewer/index.html для работы в подпапке');
}