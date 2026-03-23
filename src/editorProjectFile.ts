import { Tab, Widget } from './types';
import { snapToGrid } from './constants';

/** Формат файла «только интерфейс» (экспорт из редактора). Полный JSON импорта FLProg (`buildImportJson`) может содержать блок `ui` с тем же содержимым. */
export const EDITOR_PROJECT_FORMAT = 'flprog-webui-editor' as const;

export interface EditorUiSnapshot {
  widgets: Widget[];
  canvasConfig: { width: number; height: number; color: string };
  tabs: Tab[];
  activeTabId: string;
}

const WIDGET_TYPES = new Set<Widget['type']>(['button', 'slider', 'input', 'led', 'label', 'rect', 'switch']);
const VAR_TYPES = new Set<Widget['varType']>(['int', 'float', 'bool', 'byte', 'String', 'none']);

function clampCanvasSize(n: number): number {
  if (!Number.isFinite(n)) return 320;
  return Math.max(16, Math.min(16000, Math.round(n)));
}

function clampCanvasPos(n: number): number {
  // Позиции виджета допускают 0 (верхний/левый край).
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(16000, Math.round(n)));
}

function parseTab(raw: unknown): Tab | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? '').trim();
  const name = String(o.name ?? '').trim();
  if (!id || !name) return null;
  return { id, name: name.slice(0, 200) };
}

function parseWidget(raw: unknown): Widget | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? '').trim();
  const type = o.type as Widget['type'];
  if (!id || !WIDGET_TYPES.has(type)) return null;
  const varType = (o.varType as Widget['varType']) ?? 'String';
  const vt = VAR_TYPES.has(varType) ? varType : 'String';
  const color = typeof o.color === 'string' && o.color ? o.color : '#3b82f6';
  const xRaw = Number(o.x);
  const yRaw = Number(o.y);
  const x = snapToGrid(clampCanvasPos(xRaw));
  const y = snapToGrid(clampCanvasPos(yRaw));
  const w: Widget = {
    id,
    type,
    x,
    y,
    width: snapToGrid(Math.max(10, clampCanvasSize(Number(o.width) || 40))),
    height: snapToGrid(Math.max(10, clampCanvasSize(Number(o.height) || 40))),
    text: o.text !== undefined ? String(o.text) : undefined,
    caption: o.caption !== undefined ? String(o.caption) : undefined,
    color,
    varName: String(o.varName ?? id).trim() || id,
    varType: vt,
    name: o.name !== undefined ? String(o.name) : undefined,
    tabId: o.tabId !== undefined ? String(o.tabId) : undefined,
  };
  return w;
}

function parseUiObject(raw: Record<string, unknown>): EditorUiSnapshot | null {
  const widgetsRaw = raw.widgets;
  if (!Array.isArray(widgetsRaw)) return null;

  const canvas = raw.canvasConfig;
  if (!canvas || typeof canvas !== 'object') return null;
  const c = canvas as Record<string, unknown>;
  const width = clampCanvasSize(Number(c.width) || 320);
  const height = clampCanvasSize(Number(c.height) || 480);
  const color = typeof c.color === 'string' && c.color ? c.color : '#ffffff';

  const tabsRaw = raw.tabs;
  let tabs: Tab[] = [];
  if (Array.isArray(tabsRaw) && tabsRaw.length > 0) {
    tabs = tabsRaw.map((t) => parseTab(t)).filter((t): t is Tab => t !== null);
  }
  if (tabs.length === 0) {
    tabs = [{ id: 'tab_1', name: 'Вкладка 1' }];
  }

  const tabIds = new Set(tabs.map((t) => t.id));
  let activeTabId = String(raw.activeTabId ?? tabs[0].id);
  if (!tabIds.has(activeTabId)) {
    activeTabId = tabs[0].id;
  }

  const widgets: Widget[] = [];
  for (const item of widgetsRaw) {
    const w = parseWidget(item);
    if (!w) continue;
    const tid = w.tabId && tabIds.has(w.tabId) ? w.tabId : activeTabId;
    widgets.push({ ...w, tabId: tid });
  }

  return {
    widgets,
    canvasConfig: { width, height, color },
    tabs,
    activeTabId,
  };
}

/**
 * Разбор JSON: отдельный файл редактора (`format` + поля) или полный импорт с блоком `ui`.
 */
export function parseEditorProjectFromJson(parsed: unknown):
  | { ok: true; snapshot: EditorUiSnapshot }
  | { ok: false; error: string } {
  if (parsed === null || typeof parsed !== 'object') {
    return { ok: false, error: 'Неверный JSON: ожидается объект.' };
  }
  const root = parsed as Record<string, unknown>;

  if (root.format === EDITOR_PROJECT_FORMAT) {
    const snap = parseUiObject(root);
    if (!snap) return { ok: false, error: 'В файле нет корректных полей интерфейса (widgets, canvasConfig, tabs).' };
    return { ok: true, snapshot: snap };
  }

  if (root.ui && typeof root.ui === 'object') {
    const snap = parseUiObject(root.ui as Record<string, unknown>);
    if (!snap) return { ok: false, error: 'В поле ui нет корректных данных интерфейса.' };
    return { ok: true, snapshot: snap };
  }

  return { ok: false, error: 'Неизвестный формат: ожидается файл редактора или JSON импорта с блоком ui.' };
}

export function buildEditorProjectFileJson(snapshot: EditorUiSnapshot): string {
  const payload = {
    format: EDITOR_PROJECT_FORMAT,
    version: 1,
    ...snapshot,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}
