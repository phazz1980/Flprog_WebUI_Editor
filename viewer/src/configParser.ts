import type { RuntimeWidget, WidgetType, ViewerConfig } from './types';

const TYPE_BY_CODE: WidgetType[] = ['button', 'slider', 'input', 'led', 'label', 'rect', 'switch'];

/**
 * Парсит ответ GET /config: [ названияВкладок[], compactWidgets, [width, height, color] ].
 * Первый элемент — массив названий вкладок; третий — массив [ширина, высота, цвет].
 * compactWidgets: [id, typeCode, x, y, width, height, color, text, tabIndex, varName?]
 */
export function parseConfig(raw: unknown): ViewerConfig | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const rawTabs = raw[0];
  const compactWidgets = raw[1];
  const rawCanvas = raw.length >= 3 && Array.isArray(raw[2]) && raw[2].length >= 3 ? (raw[2] as unknown[]) : null;
  const canvasMeta = rawCanvas
    ? {
        width: Number(rawCanvas[0]) || 0,
        height: Number(rawCanvas[1]) || 0,
        color: typeof rawCanvas[2] === 'string' ? rawCanvas[2] : '#ffffff',
      }
    : null;

  if (!Array.isArray(rawTabs) || !Array.isArray(compactWidgets)) return null;

  const tabIds: string[] = [];
  const tabNames: string[] = [];
  (rawTabs as any[]).forEach((item, index) => {
    tabIds.push(`tab_${index + 1}`);
    const name = typeof item === 'string' && item.trim() ? item.trim() : `Вкладка ${index + 1}`;
    tabNames.push(name);
  });

  if (tabIds.length === 0) {
    tabIds.push('tab_1');
    tabNames.push('Вкладка 1');
  }

  const widgets: RuntimeWidget[] = [];
  let stateIndex = 0;

  for (const row of compactWidgets) {
    if (!Array.isArray(row) || row.length < 9) continue;
    const id = String(row[0] ?? '');
    const typeCode = Number(row[1]);
    const type = TYPE_BY_CODE[typeCode] ?? 'rect';
    const x = Number(row[2]) || 0;
    const y = Number(row[3]) || 0;
    const width = Number(row[4]) || 40;
    const height = Number(row[5]) || 24;
    const color = typeof row[6] === 'string' ? row[6] : '#3b82f6';
    const text = typeof row[7] === 'string' ? row[7] : '';
    const tabIndex = Math.max(0, Math.min(Number(row[8]) || 0, tabIds.length - 1));
    const tabId = tabIds[tabIndex] ?? tabIds[0];
    const varName = row[9] != null ? String(row[9]) : id;

    // В /config labels могут присутствовать как "просто надпись" (varType=none в редакторе).
    // Генератор в этом случае не добавляет varName в compactWidgets, а сервер не включает такие виджеты
    // в widgetsWithVars при формировании /state.
    // Поэтому labels без varName нельзя считать имеющими переменную.
    const hasVariable =
      type !== 'rect' && !(type === 'label' && (row[9] == null || String(row[9] ?? '').trim() === ''));
    const stateIdx = hasVariable ? stateIndex : -1;
    const isBidi = type === 'slider' || type === 'switch' || type === 'input';
    if (hasVariable) stateIndex += isBidi ? 2 : 1;

    widgets.push({
      id,
      type,
      x,
      y,
      width,
      height,
      color,
      text,
      tabId,
      tabIndex,
      varName,
      stateIndex: stateIdx,
      ...(isBidi ? { responseStateIndex: stateIdx + 1 } : {}),
    });
  }

  const inferred = inferCanvasFromWidgets(widgets);
  const canvasWidth = canvasMeta && canvasMeta.width > 0 ? canvasMeta.width : inferred.width;
  const canvasHeight = canvasMeta && canvasMeta.height > 0 ? canvasMeta.height : inferred.height;
  const canvasColor = canvasMeta && canvasMeta.color && /^#[0-9a-fA-F]{3,8}$/.test(canvasMeta.color) ? canvasMeta.color : inferred.color;
  return { tabIds, tabNames, widgets, canvasWidth, canvasHeight, canvasColor };
}

function inferCanvasFromWidgets(widgets: RuntimeWidget[]): { width: number; height: number; color: string } {
  let w = 400;
  let h = 300;
  for (const widget of widgets) {
    w = Math.max(w, widget.x + widget.width + 20);
    h = Math.max(h, widget.y + widget.height + 20);
  }
  return { width: Math.max(100, w), height: Math.max(100, h), color: '#ffffff' };
}
