import { Widget } from './types';

const escapeCppString = (value: string): string =>
  (value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');

export const generateArduinoCode = (widgets: Widget[], canvasConfig: any) => {
  const usedWidgets = widgets.filter((w) => w.varType !== 'none');
  const widgetsWithVars = usedWidgets;

  const tabIds = Array.from(
    new Set(usedWidgets.map((w) => w.tabId ?? 'tab_1')),
  );

  const compactWidgets = usedWidgets.map((w) => {
    const tabId = w.tabId ?? 'tab_1';
    const tabIndex = Math.max(0, tabIds.indexOf(tabId));
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
    if (w.varName && w.varName !== w.id) {
      base.push(w.varName);
    }
    return base;
  });

  const configJson = JSON.stringify([tabIds, compactWidgets]);

  const isBidirectional = (w: Widget) => w.type === 'switch' || w.type === 'slider' || w.type === 'input';

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
      const targetVar = isBidirectional(w) ? `${w.varName}_out` : w.varName;
      let assign: string;
      if (w.varType === 'int') {
        assign = `${targetVar} = varVal.toInt();`;
      } else if (w.varType === 'float') {
        assign = `${targetVar} = varVal.toFloat();`;
      } else if (w.varType === 'bool') {
        assign = `${targetVar} = (varVal == "1" || varVal == "true");`;
      } else {
        assign = `${targetVar} = varVal;`;
      }
      const setVarName = isBidirectional(w) ? `${w.varName}_out` : w.varName;
      return `  else if (varName == "${escapeCppString(setVarName)}") {
    ${assign}
  }`;
    })
    .join('\n');

  const hasSoundEnabledWidget = widgetsWithVars.some((w) => w.varName === 'sound_enabled');
  const stateEntriesList: string[] = [];
  widgetsWithVars.forEach((w) => {
    const keyBeg = stateEntriesList.length === 0 ? '{\\"' : ',\\"';
    const stateVar = isBidirectional(w) ? `${w.varName}_in` : w.varName;
    const keyForState = w.varName === 'sound_enabled' ? 'sound_enabled' : stateVar;
    const keyPart = `${keyBeg}${escapeCppString(keyForState)}\\":`;
    const valueVar = w.varName === 'sound_enabled' ? 'sound_enabled_in' : stateVar;
    if (w.varType === 'bool') {
      stateEntriesList.push(`  server->print("${keyPart}"); server->print(${valueVar} ? "true" : "false");`);
    } else if (w.varType === 'int' || w.varType === 'float') {
      stateEntriesList.push(`  server->print("${keyPart}"); server->print(${valueVar});`);
    } else {
      stateEntriesList.push(`  server->print("${keyPart}"); server->print("\\""); server->print(${valueVar}); server->print("\\"");`);
    }
  });
  if (!hasSoundEnabledWidget) {
    stateEntriesList.push('  server->print(",\\"sound_enabled\\":"); server->print(sound_enabled ? "true" : "false");');
  }
  stateEntriesList.push('  server->print(",\\"ui_message\\":"); server->print("\\""); server->print(ui_message); server->print("\\"");');
  const stateEntries = stateEntriesList.join('\n');

  return `/* @once */
#include "flprogWebServer.h"

int port=80; //par
FLProgWebServer WebServer(&FLPROG_WIFI_INTERFACE1, port);

const char config_json[] =
R"rawliteral(
${configJson}
)rawliteral";

${globalVars}
${hasSoundEnabledWidget ? '' : 'bool sound_enabled; // in\n'}
String ui_message; // in

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
${stateEntries}
  server->print("}");
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
