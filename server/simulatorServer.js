/**
 * Симулятор ESP: HTTP-сервер с теми же эндпоинтами, что и прошивка FLProg WebServer.
 * Принимает проект (widgets + canvasConfig) через POST /load, отдаёт /config, /state, обрабатывает /set, /ping.
 * Просмотрщик UI подключается к http://localhost:PORT и работает как с реальным устройством.
 */

const http = require('http');
const url = require('url');
const { exec } = require('child_process');

const PORT = process.env.SIMULATOR_PORT || 31337;

function isBidirectional(w) {
  return w.type === 'switch' || w.type === 'slider' || w.type === 'input';
}

function buildConfig(widgets, tabs) {
  const configWidgets = widgets.filter(
    (w) => w.varType !== 'none' || w.type === 'label' || w.type === 'rect'
  );
  const tabIds = [...new Set(configWidgets.map((w) => w.tabId || 'tab_1'))];

  const tabMeta = tabIds.map((id, index) => {
    const fromTabs = Array.isArray(tabs) ? tabs.find((t) => t && t.id === id) : null;
    const fallbackName = fromTabs && typeof fromTabs.name === 'string' && fromTabs.name.trim()
      ? fromTabs.name.trim()
      : `Вкладка ${index + 1}`;
    return { id, name: fallbackName };
  });

  const compactWidgets = configWidgets.map((w) => {
    const tabId = w.tabId || 'tab_1';
    const tabIndex = Math.max(0, tabIds.indexOf(tabId));
    const typeCode =
      w.type === 'button' ? 0
      : w.type === 'slider' ? 1
      : w.type === 'input' ? 2
      : w.type === 'led' ? 3
      : w.type === 'label' ? 4
      : w.type === 'rect' ? 5
      : w.type === 'switch' ? 6
      : 0;
    const base = [
      w.id,
      typeCode,
      Math.round(w.x),
      Math.round(w.y),
      Math.round(w.width),
      Math.round(w.height),
      w.color,
      w.text ?? '',
      tabIndex,
    ];
    if (w.varType !== 'none' && w.varName) {
      if (w.varName !== w.id || w.type === 'label') {
        base.push(w.varName);
      }
    }
    return base;
  });

  const tabNamesOnly = tabMeta.map((m) => m.name);
  return [tabNamesOnly, compactWidgets];
}

/** Из compactWidgets (массивы [id, typeCode, x, y, width, height, ...]) вычислить минимальные размеры канвы. */
function inferCanvasFromCompact(compactWidgets) {
  let w = 400;
  let h = 300;
  if (Array.isArray(compactWidgets)) {
    for (const row of compactWidgets) {
      if (Array.isArray(row) && row.length >= 6) {
        const x = Number(row[2]) || 0;
        const y = Number(row[3]) || 0;
        const bw = Number(row[4]) || 40;
        const bh = Number(row[5]) || 24;
        w = Math.max(w, x + bw + 20);
        h = Math.max(h, y + bh + 20);
      }
    }
  }
  return [Math.max(100, w), Math.max(100, h), '#ffffff'];
}

/** Конфиг для GET /config: [ tabNames, compactWidgets, [width, height, color] ]. */
function getConfigForClient() {
  if (!project) return null;
  const config = project.config;
  if (!Array.isArray(config) || config.length < 2) return config;
  let canvasArr = null;
  if (config.length >= 3 && Array.isArray(config[2]) && config[2].length >= 3) {
    const w = Number(config[2][0]);
    const h = Number(config[2][1]);
    const c = typeof config[2][2] === 'string' ? config[2][2] : '#ffffff';
    if (w > 0 && h > 0) canvasArr = [w, h, c];
  }
  if (!canvasArr) {
    const inferred = inferCanvasFromCompact(config[1]);
    canvasArr = Array.isArray(inferred) ? inferred : [inferred.width || 400, inferred.height || 300, inferred.color || '#ffffff'];
  }
  return [config[0], config[1], canvasArr];
}

function buildInitialState(widgets) {
  const widgetsWithVars = widgets.filter((w) => w.varType !== 'none');
  const hasSoundEnabled = widgetsWithVars.some((w) => w.varName === 'sound_enabled');

  const state = {};
  widgetsWithVars.forEach((w) => {
    if (isBidirectional(w)) {
      const raw = w.text ?? (w.type === 'slider' ? '0' : w.type === 'switch' ? '0' : '');
      const val = w.varType === 'bool' ? raw === '1' || raw === 'true'
        : w.varType === 'int' ? parseInt(raw, 10) || 0
        : w.varType === 'float' ? parseFloat(raw) || 0
        : String(raw ?? '');
      state[`${w.varName}_out`] = val;
      state[`${w.varName}_in`] = val;
    } else if (w.varName === 'sound_enabled') {
      state.sound_enabled_in = 0;
    } else {
      const raw = w.text ?? (w.type === 'led' ? '0' : '');
      const val = w.varType === 'bool' ? raw === '1' || raw === 'true'
        : w.varType === 'int' ? parseInt(raw, 10) || 0
        : w.varType === 'float' ? parseFloat(raw) || 0
        : String(raw ?? '');
      state[w.varName] = val;
    }
  });
  if (!hasSoundEnabled) {
    state.sound_enabled = 0;
  }
  state.ui_message = '';
  return state;
}

function parseSetValue(varType, value) {
  if (varType === 'bool') {
    return value === '1' || value === 'true';
  }
  if (varType === 'int' || varType === 'byte') {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
  }
  if (varType === 'float') {
    return parseFloat(value) || 0;
  }
  return String(value ?? '');
}

let project = null; // { config, state, widgetsWithVars, hasSoundEnabledWidget }
/** Режим "устройство отключено": /config и /state возвращают 503, вьювер показывает тусклые виджеты. */
let connectionEnabled = true;

function handleLoad(body, res) {
  let data;
  try {
    data = JSON.parse(body);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }
  const widgets = data.widgets || [];
  const tabs = data.tabs || [];
  const canvasConfig = data.canvasConfig || {};
  const configArray = buildConfig(widgets, tabs);
  const hasCanvasFromRequest = canvasConfig.width != null && canvasConfig.height != null &&
    Number(canvasConfig.width) > 0 && Number(canvasConfig.height) > 0;
  if (hasCanvasFromRequest) {
    configArray.push([
      Number(canvasConfig.width),
      Number(canvasConfig.height),
      canvasConfig.color && typeof canvasConfig.color === 'string' ? canvasConfig.color : '#ffffff',
    ]);
  } else {
    configArray.push(inferCanvasFromCompact(configArray[1]));
  }
  const widgetsWithVars = widgets.filter((w) => w.varType !== 'none');
  const hasSoundEnabledWidget = widgetsWithVars.some((w) => w.varName === 'sound_enabled');
  const state = buildInitialState(widgets);

  project = { config: configArray, state, widgetsWithVars, hasSoundEnabledWidget };
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ ok: true, message: 'Project loaded' }));
}

/** State: для slider/switch/input — два слота подряд (_out, _in), ответ через вторую переменную. */
function getStateArray() {
  if (!project) return null;
  const { state, widgetsWithVars, hasSoundEnabledWidget } = project;
  const out = [];
  widgetsWithVars.forEach((w) => {
    if (isBidirectional(w)) {
      out.push(state[`${w.varName}_out`]);
      out.push(state[`${w.varName}_in`]);
    } else {
      const key = w.varName === 'sound_enabled' ? 'sound_enabled_in' : w.varName;
      out.push(state[key]);
    }
  });
  if (!hasSoundEnabledWidget) out.push(state.sound_enabled);
  out.push(state.ui_message);
  return out;
}

/** State short: для slider/switch/input — два ключа подряд (_out, _in). */
function getStateShort() {
  if (!project) return null;
  const { state, widgetsWithVars, hasSoundEnabledWidget } = project;
  const out = {};
  let keyIndex = 0;
  widgetsWithVars.forEach((w) => {
    if (isBidirectional(w)) {
      out[String(keyIndex)] = state[`${w.varName}_out`];
      keyIndex += 1;
      out[String(keyIndex)] = state[`${w.varName}_in`];
      keyIndex += 1;
    } else {
      const key = w.varName === 'sound_enabled' ? 'sound_enabled_in' : w.varName;
      out[String(keyIndex)] = state[key];
      keyIndex += 1;
    }
  });
  if (!hasSoundEnabledWidget) out.s = state.sound_enabled;
  out.m = state.ui_message;
  return out;
}

/** Список переменных в порядке state (один элемент = один слот в state); для bidi — два слота: _out, _in. setKey для /set. */
function getVarsList() {
  if (!project) return null;
  const { widgetsWithVars, hasSoundEnabledWidget } = project;
  const out = [];
  widgetsWithVars.forEach((w) => {
    const setKey = isBidirectional(w) ? `${w.varName}_out` : w.varName;
    if (isBidirectional(w)) {
      out.push({ name: `${w.varName}_out`, type: w.varType, setKey });
      out.push({ name: `${w.varName}_in`, type: w.varType, setKey });
    } else {
      const displayName = w.varName === 'sound_enabled' ? 'sound_enabled' : w.varName;
      out.push({ name: displayName, type: w.varType, setKey });
    }
  });
  if (!hasSoundEnabledWidget) out.push({ name: 'sound_enabled', type: 'byte', setKey: 'sound_enabled' });
  out.push({ name: 'ui_message', type: 'String', setKey: 'ui_message' });
  return out;
}

function findVarInfo(varName) {
  if (!project) return null;
  for (const w of project.widgetsWithVars) {
    const setVarName = isBidirectional(w) ? `${w.varName}_out` : w.varName;
    if (setVarName === varName) return { w, targetKey: setVarName, inKey: isBidirectional(w) ? `${w.varName}_in` : null };
  }
  return null;
}

function handleSet(varName, value, res) {
  if (!varName) {
    res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: "Missing 'var' parameter" }));
    return;
  }
  if (!project) {
    res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'No project loaded. POST /load first.' }));
    return;
  }
  if (varName === 'sound_enabled') {
    const n = parseInt(value, 10);
    project.state.sound_enabled = Number.isFinite(n) ? Math.max(0, Math.min(2, n)) : 0;
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (varName === 'ui_message') {
    project.state.ui_message = String(value ?? '');
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (varName === 'alarm_reset') {
    if (value === '1' || value === 'true') {
      project.state.sound_enabled = 0;
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  const info = findVarInfo(varName);
  if (!info) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  const parsed = parseSetValue(info.w.varType, value);
  project.state[info.targetKey] = parsed;
  if (info.inKey) project.state[info.inKey] = parsed;
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ ok: true }));
}

const CORS = { 'Access-Control-Allow-Origin': '*' };

function getIndexHtml() {
  return `<!DOCTYPE HTML>
<html><head><meta charset="utf-8"><title>ESP32 Web UI — Simulator</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; background: #f1f5f9; }
  h1 { margin-top: 0; color: #1e293b; }
  .card { background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 16px; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
  th { background: #f8fafc; font-weight: 600; color: #475569; }
  tr:hover { background: #f8fafc; }
  .no-project { color: #64748b; }
  .refresh { font-size: 12px; color: #64748b; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .refresh label { margin-right: 4px; display: inline-flex; align-items: center; gap: 4px; }
  input[type="text"], input[type="number"], select { padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; width: 100%; max-width: 200px; box-sizing: border-box; }
  input:focus, select:focus { outline: none; border-color: #6366f1; }
  .cell-value { min-width: 120px; }
  .bool-btn { padding: 6px 10px; border-radius: 999px; border: none; cursor: pointer; font-size: 12px; font-weight: 600; min-width: 80px; }
  .bool-on { background-color: #22c55e; color: #f9fafb; }
  .bool-off { background-color: #e5e7eb; color: #111827; }
</style>
</head><body>
  <div class="card">
    <h1>ESP32 Web UI (Simulator)</h1>
    <p>Use external Web app or viewer to work with this device. Config and state: <code>/config</code>, <code>/state</code>, <code>/set</code>. Значения в таблице можно редактировать.</p>
    <div class="refresh" style="margin-top:12px;">
      <span id="connectionStatus" style="font-weight:600;"></span>
      <button type="button" id="connectionBtn" style="margin-left:8px;padding:6px 12px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-weight:600;">—</button>
    </div>
  </div>
  <div class="card">
    <h2 style="margin-top:0;">Состояние переменных</h2>
    <div class="refresh">
      <label><input type="checkbox" id="autoRefresh" checked> Автообновление</label>
      <label>Интервал, с: <input type="number" id="refreshInterval" min="0.2" step="0.2" value="2"></label>
    </div>
    <div id="tableWrap">
      <p class="no-project" id="noProject">Проект не загружен. Отправьте проект из редактора (Generate Code → Отправить в симулятор).</p>
      <table id="stateTable" style="display:none;">
        <thead><tr><th>#</th><th>Переменная</th><th>Тип</th><th>Значение</th></tr></thead>
        <tbody id="stateBody"></tbody>
      </table>
    </div>
  </div>
  <script>
    var autoRefresh = true;
    var refreshTimer = null;
    var refreshMs = 2000;
    function formatValueForSet(val, type) {
      if (type === 'bool') return (val === true || val === '1' || val === 'true') ? '1' : '0';
      return String(val ?? '');
    }
    function setVar(setKey, value, type, cell) {
      var v = formatValueForSet(value, type);
      fetch('/set?var=' + encodeURIComponent(setKey) + '&value=' + encodeURIComponent(v)).then(function(r) {
        if (r.ok) fetchState();
      }).catch(function() { fetchState(); });
    }
    function makeValueInput(varsItem, val, i) {
      var type = varsItem.type;
      var setKey = varsItem.setKey || varsItem.name;
      var valStr = typeof val === 'string' ? val : (typeof val === 'boolean' ? (val ? '1' : '0') : String(val));
      var wrap = document.createElement('td');
      wrap.className = 'cell-value';
      if (type === 'bool') {
        var currentIsOn = (val === true || val === '1' || val === 'true');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bool-btn ' + (currentIsOn ? 'bool-on' : 'bool-off');
        btn.textContent = currentIsOn ? 'ON (1)' : 'OFF (0)';
        btn.addEventListener('click', function() {
          var next = currentIsOn ? '0' : '1';
          currentIsOn = !currentIsOn;
          btn.className = 'bool-btn ' + (currentIsOn ? 'bool-on' : 'bool-off');
          btn.textContent = currentIsOn ? 'ON (1)' : 'OFF (0)';
          setVar(setKey, next, type, wrap);
        });
        wrap.appendChild(btn);
      } else if (type === 'int' || type === 'float') {
        var inp = document.createElement('input');
        inp.type = 'number';
        if (type === 'int') inp.step = '1'; else inp.step = 'any';
        inp.value = valStr;
        inp.addEventListener('change', function() { setVar(setKey, inp.value, type, wrap); });
        inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') { inp.blur(); } });
        wrap.appendChild(inp);
      } else {
        var textInp = document.createElement('input');
        textInp.type = 'text';
        textInp.value = valStr;
        textInp.addEventListener('change', function() { setVar(setKey, textInp.value, type, wrap); });
        textInp.addEventListener('keydown', function(e) { if (e.key === 'Enter') { textInp.blur(); } });
        wrap.appendChild(textInp);
      }
      return wrap;
    }
    function render(vars, state) {
      var noProject = document.getElementById('noProject');
      var table = document.getElementById('stateTable');
      var body = document.getElementById('stateBody');
      var active = document.activeElement;
      if (active && active.tagName === 'INPUT' && body.contains(active)) {
        // Пользователь редактирует поле ввода — не перерисовываем, чтобы не сбросить текст.
        return;
      }
      if (!vars || !state || state.length === 0) {
        noProject.style.display = 'block';
        table.style.display = 'none';
        return;
      }
      noProject.style.display = 'none';
      table.style.display = 'table';
      body.innerHTML = '';
      for (var i = 0; i < vars.length; i++) {
        var row = document.createElement('tr');
        var val = state[i];
        var num = document.createElement('td');
        num.textContent = i;
        var nameCell = document.createElement('td');
        nameCell.innerHTML = '<code>' + escapeHtml(vars[i].name) + '</code>';
        var typeCell = document.createElement('td');
        typeCell.textContent = vars[i].type;
        row.appendChild(num);
        row.appendChild(nameCell);
        row.appendChild(typeCell);
        row.appendChild(makeValueInput(vars[i], val, i));
        body.appendChild(row);
      }
    }
    function escapeHtml(s) {
      var div = document.createElement('div');
      div.textContent = s;
      return div.innerHTML;
    }
    function fetchState() {
      fetch('/vars').then(function(r) { return r.ok ? r.json() : null; }).then(function(vars) {
        if (!vars) { render(null, null); return; }
        fetch('/state').then(function(r) { return r.ok ? r.json() : null; }).then(function(state) {
          render(vars, Array.isArray(state) ? state : null);
        });
      }).catch(function() { render(null, null); });
    }
    function updateConnectionUI(enabled) {
      var status = document.getElementById('connectionStatus');
      var btn = document.getElementById('connectionBtn');
      if (enabled) {
        status.textContent = 'Устройство подключено.';
        status.style.color = '#059669';
        btn.textContent = 'Отключить устройство';
        btn.style.backgroundColor = '#fef2f2';
        btn.style.borderColor = '#fecaca';
      } else {
        status.textContent = 'Устройство отключено (вьювер покажет тусклые виджеты).';
        status.style.color = '#dc2626';
        btn.textContent = 'Подключить устройство';
        btn.style.backgroundColor = '#f0fdf4';
        btn.style.borderColor = '#bbf7d0';
      }
    }
    function fetchConnection() {
      fetch('/connection').then(function(r) { return r.ok ? r.json() : null; }).then(function(data) {
        if (data) updateConnectionUI(data.enabled);
      }).catch(function() { updateConnectionUI(true); });
    }
    document.getElementById('connectionBtn').addEventListener('click', function() {
      fetch('/connection').then(function(r) { return r.ok ? r.json() : null; }).then(function(data) {
        if (!data) return;
        var next = !data.enabled;
        fetch('/connection?enabled=' + (next ? '1' : '0')).then(function(r2) {
          if (r2.ok) fetchConnection();
        });
      });
    });
    fetchConnection();
    document.getElementById('autoRefresh').addEventListener('change', function() {
      autoRefresh = this.checked;
      if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
      if (autoRefresh) { refreshTimer = setInterval(fetchState, refreshMs); fetchState(); }
      else if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    });
    document.getElementById('refreshInterval').addEventListener('change', function() {
      var v = parseFloat(this.value);
      if (!isFinite(v) || v <= 0) { v = 2; this.value = '2'; }
      refreshMs = Math.max(200, v * 1000);
      if (autoRefresh) {
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(fetchState, refreshMs);
      }
    });
    fetchState();
    if (autoRefresh) refreshTimer = setInterval(fetchState, refreshMs);
  </script>
</body></html>`;
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      ...CORS,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (method === 'POST' && pathname === '/load') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => handleLoad(body, res));
    return;
  }

  if (method === 'GET' && pathname === '/connection') {
    const enabled = parsed.query?.enabled;
    if (enabled === '0' || enabled === 'false') connectionEnabled = false;
    else if (enabled === '1' || enabled === 'true') connectionEnabled = true;
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
    res.end(JSON.stringify({ enabled: connectionEnabled }));
    return;
  }

  if (method === 'GET' && pathname === '/config') {
    if (!connectionEnabled) {
      res.writeHead(503, { 'Content-Type': 'application/json', ...CORS });
      res.end(JSON.stringify({ error: 'Device disconnected' }));
      return;
    }
    const payload = getConfigForClient();
    if (!payload) {
      res.writeHead(503, { 'Content-Type': 'application/json', ...CORS });
      res.end(JSON.stringify({ error: 'No project loaded. POST /load first.' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
    res.end(JSON.stringify(payload));
    return;
  }

  if (method === 'GET' && pathname === '/state') {
    if (!connectionEnabled) {
      res.writeHead(503, { 'Content-Type': 'application/json', ...CORS });
      res.end(JSON.stringify({ error: 'Device disconnected' }));
      return;
    }
    if (!project) {
      res.writeHead(503, { 'Content-Type': 'application/json', ...CORS });
      res.end(JSON.stringify({ error: 'No project loaded. POST /load first.' }));
      return;
    }
    const fmt = parsed.query?.fmt;
    const data = fmt === 'short' ? getStateShort() : getStateArray();
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
    res.end(JSON.stringify(data));
    return;
  }

  if (method === 'GET' && pathname === '/set') {
    const varName = parsed.query?.var;
    const value = parsed.query?.value ?? '';
    handleSet(varName, value, res);
    return;
  }

  if (method === 'POST' && pathname === '/set') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const varName = params.get('var');
      const value = params.get('value') ?? '';
      handleSet(varName, value, res);
    });
    return;
  }

  if (method === 'GET' && pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain', ...CORS });
    res.end('ESP32-WEBUI');
    return;
  }

  if (method === 'GET' && pathname === '/vars') {
    if (!project) {
      res.writeHead(503, { 'Content-Type': 'application/json', ...CORS });
      res.end(JSON.stringify({ error: 'No project loaded. POST /load first.' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
    res.end(JSON.stringify(getVarsList()));
    return;
  }

  if (method === 'GET' && (pathname === '/' || pathname === '')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...CORS });
    res.end(getIndexHtml());
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/html', ...CORS });
  res.end('<!DOCTYPE HTML><html><body><h1>404 Not Found</h1><a href="/">Home</a></body></html>');
});

function openBrowser(addr) {
  const cmd = process.platform === 'win32' ? `start "" "${addr}"`
    : process.platform === 'darwin' ? `open "${addr}"`
    : `xdg-open "${addr}"`;
  exec(cmd, (err) => {
    if (err) console.warn('Не удалось открыть браузер:', err.message);
  });
}

server.listen(PORT, () => {
  const addr = `http://localhost:${PORT}`;
  console.log(`ESP Simulator: ${addr}`);
  console.log('POST /load with { widgets, canvasConfig } to load project, then use /config, /state, /set, /ping');
  openBrowser(addr);
});
