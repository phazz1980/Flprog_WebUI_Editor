import { Widget, Tab } from './types';

/** Порядок id секций при сборке (см. docs/IMPORT_JSON_FORMAT.md). */
/** URL вьювера (при деплое на GitHub Pages). В сгенерированной странице корня — ссылка для подключения к ESP на порту 80. */
const VIEWER_URL = 'https://phazz1980.github.io/Flprog_WebUI_Editor/viewer';

const escapeCppString = (value: string): string =>
  (value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');

export const generateArduinoCode = (widgets: Widget[], canvasConfig: any, tabs?: Tab[]) => {
  const widgetsWithVars = widgets.filter((w) => w.varType !== 'none');
  // В конфиг попадают все виджеты с переменными + Label без переменной (просто надпись)
  const configWidgets = widgets.filter(
    (w) => w.varType !== 'none' || w.type === 'label',
  );

  const uniqueTabIds = Array.from(
    new Set(configWidgets.map((w) => w.tabId ?? 'tab_1')),
  );

  const tabMeta = uniqueTabIds.map((id, index) => {
    const fromTabs = tabs?.find((t) => t.id === id);
    const fallbackName = fromTabs?.name && fromTabs.name.trim()
      ? fromTabs.name.trim()
      : `Вкладка ${index + 1}`;
    return {
      id,
      name: fallbackName,
    };
  });

  const compactWidgets = configWidgets.map((w) => {
    const tabId = w.tabId ?? 'tab_1';
    const tabIndex = Math.max(0, uniqueTabIds.indexOf(tabId));
    const typeCode =
      w.type === 'button'
        ? 0
        : w.type === 'slider'
          ? 1
          : w.type === 'input'
            ? 2
            : w.type === 'led'
              ? 3
              : w.type === 'label'
                ? 4
                : w.type === 'rect'
                  ? 5
                  : w.type === 'switch'
                    ? 6
                    : 0;
    const base: any[] = [
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
    if (w.varType !== 'none' && w.varName && w.varName !== w.id) {
      base.push(w.varName);
    }
    return base;
  });

  const canvasArray = [
    canvasConfig?.width ?? 400,
    canvasConfig?.height ?? 300,
    canvasConfig?.color ?? '#ffffff',
  ];
  const tabNamesOnly = tabMeta.map((m) => m.name);
  const configJson = JSON.stringify([tabNamesOnly, compactWidgets, canvasArray]);

  const isBidirectional = (w: Widget) =>
    w.type === 'switch' || w.type === 'slider' || w.type === 'input';

  const globalVars = widgetsWithVars
    .map((w) => {
      if (isBidirectional(w)) {
        return `${w.varType} ${w.varName}_out; // out\n${w.varType} ${w.varName}_in; // in`;
      }
      const isInOnly = w.type === 'led' || w.type === 'label';
      const isOutOnly = w.type === 'button';
      if (isInOnly) return `${w.varType} ${w.varName}; // in`;
      if (isOutOnly) return `${w.varType} ${w.varName}; // out`;
      return `${w.varType} ${w.varName};`;
    })
    .join('\n');

  const setHandlers = widgetsWithVars
    .map((w) => {
      const isBidi = isBidirectional(w);
      const targetVar = isBidi ? `${w.varName}_out` : w.varName;
      let assign: string;
      if (w.varType === 'int' || w.varType === 'byte') {
        assign = `${targetVar} = varVal.toInt()`;
      } else if (w.varType === 'float') {
        assign = `${targetVar} = varVal.toFloat()`;
      } else if (w.varType === 'bool') {
        assign = `${targetVar} = (varVal == "1" || varVal == "true")`;
      } else {
        assign = `${targetVar} = varVal`;
      }
      const setVarName = isBidi ? `${w.varName}_out` : w.varName;
      const extraLine = isBidi ? `\n    ${w.varName}_in = ${w.varName}_out;` : '';
      return `  else if (varName == "${escapeCppString(setVarName)}") {
    ${assign};${extraLine}
  }`;
    })
    .join('\n');

  const hasSoundEnabledWidget = widgetsWithVars.some(
    (w) => w.varName === 'sound_enabled',
  );

  // Порядок state: виджеты с переменными (как в config); для slider/switch — два слота: _out, _in (ответ через вторую переменную).
  // Вариант 1: массив по индексам [v0,v1,...,s,"m"]
  const stateArrayParts: string[] = [];
  widgetsWithVars.forEach((w) => {
    const isBidi = isBidirectional(w);
    const valueVar =
      w.varName === 'sound_enabled' ? 'sound_enabled_in' : isBidi ? `${w.varName}_in` : w.varName;
    const outVar = isBidi ? `${w.varName}_out` : null;
    const printOne = (varName: string) => {
      if (w.varType === 'bool') {
        stateArrayParts.push(`  server->print(${varName} ? 1 : 0);`);
      } else if (w.varType === 'int' || w.varType === 'float' || w.varType === 'byte') {
        stateArrayParts.push(`  server->print(${varName});`);
      } else {
        stateArrayParts.push(`  server->print("\\""); server->print(${varName}); server->print("\\"");`);
      }
    };
    if (isBidi) {
      printOne(outVar!);
      printOne(valueVar);
    } else {
      printOne(valueVar);
    }
  });
  if (!hasSoundEnabledWidget) {
    stateArrayParts.push('  server->print(sound_enabled);');
  }
  stateArrayParts.push('  server->print("\\""); server->print(ui_message); server->print("\\"");');

  // Вариант 2: короткие ключи "0":v,"1":v,...,"s":bool,"m":str (для slider/switch — два ключа: _out, _in)
  const stateShortKeyParts: string[] = [];
  let keyIndex = 0;
  widgetsWithVars.forEach((w) => {
    const isBidi = isBidirectional(w);
    const valueVar =
      w.varName === 'sound_enabled' ? 'sound_enabled_in' : isBidi ? `${w.varName}_in` : w.varName;
    const outVar = isBidi ? `${w.varName}_out` : null;
    const pushKey = (varName: string) => {
      const key = String(keyIndex);
      keyIndex += 1;
      const keyPart = keyIndex === 1 ? `{\\"${key}\\":` : `,\\"${key}\\":`;
      if (w.varType === 'bool') {
        stateShortKeyParts.push(`  server->print("${keyPart}"); server->print(${varName} ? 1 : 0);`);
      } else if (w.varType === 'int' || w.varType === 'float' || w.varType === 'byte') {
        stateShortKeyParts.push(`  server->print("${keyPart}"); server->print(${varName});`);
      } else {
        stateShortKeyParts.push(`  server->print("${keyPart}"); server->print("\\""); server->print(${varName}); server->print("\\"");`);
      }
    };
    if (isBidi) {
      pushKey(outVar!);
      pushKey(valueVar);
    } else {
      pushKey(valueVar);
    }
  });
  if (!hasSoundEnabledWidget) {
    stateShortKeyParts.push('  server->print(",\\"s\\":"); server->print(sound_enabled);');
  }
  stateShortKeyParts.push('  server->print(",\\"m\\":"); server->print("\\""); server->print(ui_message); server->print("\\"");');

  // Сборка вывода массива: [ elem0 , elem1 , ... ]
  const stateArrayLines: string[] = [];
  stateArrayParts.forEach((line, i) => {
    const comma = i === 0 ? '' : '  server->print(",");\n';
    stateArrayLines.push(comma + line);
  });
  const stateArrayCode = stateArrayLines.join('\n');

  const stateShortKeyCode = stateShortKeyParts.join('\n');

  return `/* @once */
#include "flprogWebServer.h"

int port=80; //par
FLProgWebServer WebServer(&FLPROG_WIFI_INTERFACE1, port);

const char config_json[] =
R"rawliteral(
${configJson}
)rawliteral";

${globalVars}
${hasSoundEnabledWidget ? '' : 'byte sound_enabled; // in, 0=выкл 1=уведомление 2=тревога\n'}
String ui_message; // in
bool alarm_reset = false; //out // выход сброса аварии: установите в true в своей логике для сброса сообщения и звука

void setup() {
  Serial.begin(115200);

  WebServer.addHandler("", handleRoot);
  WebServer.addHandler("/", handleRoot);
  WebServer.addHandler("/config", handleConfig);
  WebServer.addHandler("/set", handleSetVar);
  WebServer.addHandler("/state", handleState);
  WebServer.addHandler("/ping", handlePing);
  WebServer.add404Page(handle404);
}

void loop() {
  WebServer.pool();

${hasSoundEnabledWidget ? '  sound_enabled_in = sound_enabled_out;\n' : ''}
}

void handleRoot(FLProgWebServer *server) {
  server->print(
    "HTTP/1.1 200 OK\\r\\n"
    "Content-Type: text/html\\r\\n"
    "Connection: close\\r\\n"
    "\\r\\n"
    "<!DOCTYPE HTML><html><head><meta charset=\\"utf-8\\">"
    "<title>ESP32 Web UI</title></head><body>"
    "<h1>ESP32 Web UI (Flprog_Ethernet)</h1>"
    "<p>Use external Web app to work with this device.</p>"
    "<p>Порт 80: <a href=\\"${VIEWER_URL}\\" target=\\"_blank\\" rel=\\"noopener\\">Открыть вьювер</a> и ввести IP этого устройства (порт 80).</p>"
    "</body></html>"
  );
}

void handleConfig(FLProgWebServer *server) {
  server->print("HTTP/1.1 200 OK\\r\\n");
  server->print("Access-Control-Allow-Origin: *\\r\\n");
  server->print("Content-Type: application/json\\r\\n");
  server->print("Connection: close\\r\\n\\r\\n");
  server->print(config_json);
}

void handleSetVar(FLProgWebServer *server) {
  String varName = server->argumentValueAtKey("var");
  String varVal  = server->argumentValueAtKey("value");

  if (varName.length() == 0) {
    server->send403Page("Missing 'var' parameter");
    return;
  }

  if (false) {
  }
${setHandlers}

  server->print("HTTP/1.1 200 OK\\r\\n");
  server->print("Access-Control-Allow-Origin: *\\r\\n");
  server->print("Content-Type: application/json\\r\\n");
  server->print("Connection: close\\r\\n\\r\\n");
  server->print("{\\"ok\\":true}");
}

void handleState(FLProgWebServer *server) {
  server->print("HTTP/1.1 200 OK\\r\\n");
  server->print("Access-Control-Allow-Origin: *\\r\\n");
  server->print("Content-Type: application/json\\r\\n");
  server->print("Connection: close\\r\\n\\r\\n");
  String fmt = server->argumentValueAtKey("fmt");
  if (fmt == "short") {
    // Вариант 2: короткие ключи "0", "1", ..., "s", "m"
${stateShortKeyCode}
    server->print("}");
  } else {
    // Вариант 1 (по умолчанию): массив по индексам [v0,v1,...,s,"m"]
    server->print("[");
${stateArrayCode}
    server->print("]");
  }
}

void handlePing(FLProgWebServer *server) {
  server->print(
    "HTTP/1.1 200 OK\\r\\n"
    "Access-Control-Allow-Origin: *\\r\\n"
    "Content-Type: text/plain\\r\\n"
    "Connection: close\\r\\n"
    "\\r\\n"
    "ESP32-WEBUI"
  );
}

void handle404(FLProgWebServer *server) {
  server->print(
    "HTTP/1.1 404 Not Found\\r\\n"
    "Content-Type: text/html\\r\\n"
    "Connection: close\\r\\n"
    "\\r\\n"
    "<!DOCTYPE HTML><html><body>"
    "<h1>404 Not Found</h1>"
    "<a href='/'>Home</a>"
    "</body></html>"
  );
}
`;
};

/** Разбивает полный скетч на секции по границам функций (см. docs/IMPORT_JSON_FORMAT.md). */
function splitCodeIntoSections(fullCode: string): { id: string; name: string; code: string }[] {
  const sections: { id: string; name: string; code: string }[] = [];
  const markers: { id: string; name: string; start: RegExp }[] = [
    { id: 'includes', name: 'Подключения', start: /^\/\* @once \*\/\s*\n/s },
    { id: 'globals', name: 'Глобальные переменные', start: /^int port=/m },
    { id: 'setup', name: 'Инициализация', start: /^void setup\(\)/m },
    { id: 'loop', name: 'Цикл', start: /^void loop\(\)/m },
    { id: 'handleRoot', name: 'Главная страница', start: /^void handleRoot\(/m },
    { id: 'handleConfig', name: 'Обработчик /config', start: /^void handleConfig\(/m },
    { id: 'handleSetVar', name: 'Обработчик /set', start: /^void handleSetVar\(/m },
    { id: 'handleState', name: 'Обработчик /state', start: /^void handleState\(/m },
    { id: 'handlePing', name: 'Обработчик /ping', start: /^void handlePing\(/m },
    { id: 'handle404', name: 'Обработчик 404', start: /^void handle404\(/m },
  ];

  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    const match = fullCode.match(m.start);
    if (!match || match.index == null) continue;
    const start = match.index;
    const end = i < markers.length - 1
      ? (fullCode.match(markers[i + 1].start)?.index ?? fullCode.length)
      : fullCode.length;
    let code = fullCode.slice(start, end).trimEnd();
    if (code.endsWith('};')) code = code.trimEnd();
    sections.push({ id: m.id, name: m.name, code });
  }

  return sections;
}

/** Собирает JSON для импорта в формате docs/IMPORT_JSON_FORMAT.md. */
export function buildImportJson(
  widgets: Widget[],
  canvasConfig: { width?: number; height?: number; color?: string },
  tabs?: Tab[],
  options?: { activeTabId?: string; projectName?: string }
): Record<string, unknown> {
  const widgetsWithVars = widgets.filter((w) => w.varType !== 'none');
  const isBidirectional = (w: Widget) =>
    w.type === 'switch' || w.type === 'slider' || w.type === 'input';

  const parameters = [
    { name: 'port', type: 'int', default: '80', parName: 'par' },
  ];

  const inputs: { varName: string; type: string; inName?: string }[] = [];
  const outputs: { varName: string; type: string; outName?: string }[] = [];

  const labelFor = (w: Widget) => (w.name && String(w.name).trim()) ? String(w.name).trim() : (w.varName || w.id);

  widgetsWithVars.forEach((w) => {
    const t = w.varType === 'none' ? 'int' : w.varType;
    const varName = w.varName || w.id;
    const label = labelFor(w);
    if (isBidirectional(w)) {
      inputs.push({ varName: `${varName}_in`, type: t, inName: label });
      outputs.push({ varName: `${varName}_out`, type: t, outName: label });
    } else if (w.type === 'led' || w.type === 'label') {
      inputs.push({ varName, type: t, inName: label });
    } else if (w.type === 'button') {
      outputs.push({ varName, type: t, outName: label });
    }
  });
  inputs.push({ varName: 'ui_message', type: 'String', inName: 'ui_message' });
  if (!widgetsWithVars.some((w) => w.varName === 'sound_enabled')) {
    inputs.push({ varName: 'sound_enabled', type: 'byte', inName: 'sound_enabled' });
  }
  outputs.push({ varName: 'alarm_reset', type: 'bool', outName: 'alarm_reset' });

  const fullCode = generateArduinoCode(widgets, canvasConfig, tabs);
  const sections = splitCodeIntoSections(fullCode);

  const meta = {
    name: options?.projectName ?? 'Web UI проект',
    description: 'Экспорт из редактора Flprog Web UI',
    author: '',
    createdAt: new Date().toISOString(),
  };

  const ui = {
    widgets,
    tabs: tabs ?? [{ id: 'tab_1', name: 'Вкладка 1' }],
    canvasConfig: {
      width: canvasConfig?.width ?? 400,
      height: canvasConfig?.height ?? 300,
      color: canvasConfig?.color ?? '#ffffff',
    },
    activeTabId: options?.activeTabId ?? 'tab_1',
  };

  return {
    version: 1,
    meta,
    parameters,
    inputs,
    outputs,
    sections,
    ui,
  };
}
