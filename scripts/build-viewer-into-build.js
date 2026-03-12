/**
 * Собирает просмотрщик с homepage = базовый URL редактора + "/viewer",
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

// Базовый URL из homepage редактора (например https://user.github.io/Flprog_WebUI_Editor)
const rootPackage = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const baseUrl = (rootPackage.homepage || '').replace(/\/$/, '');
const viewerHomepage = baseUrl ? `${baseUrl}/viewer` : '';

if (!viewerHomepage) {
  console.warn('В корневом package.json нет "homepage". Просмотрщик соберётся без базового пути.');
}

const viewerPackage = JSON.parse(fs.readFileSync(viewerPackagePath, 'utf8'));
viewerPackage.homepage = viewerHomepage;
fs.writeFileSync(viewerPackagePath, JSON.stringify(viewerPackage, null, 2));
console.log('Viewer homepage:', viewerHomepage || '(не задан)');

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
console.log('Скопировано viewer/build → build/viewer');

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
