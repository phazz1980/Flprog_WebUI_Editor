import type { RuntimeWidget, WidgetType } from './types';

const TYPE_BY_CODE: WidgetType[] = ['button', 'slider', 'input', 'led', 'label', 'rect', 'switch'];

/**
 * Парсит ответ GET /config: [tabIds, compactWidgets] или [tabIds, compactWidgets, canvas].
 * canvas (опционально): { width, height, color } — размеры и цвет канвы из редактора.
 * compactWidgets: [id, typeCode, x, y, width, height, color, text, tabIndex, varName?]
 */
export function parseConfig(raw: unknown): { tabIds: string[]; widgets: RuntimeWidget[]; canvasWidth: number; canvasHeight: number; canvasColor: string } | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const tabIds = raw[0];
  const compactWidgets = raw[1];
  // Третий элемент /config — размеры канвы из редактора (width, height, color)
  const rawCanvas = raw.length >= 3 && raw[2] != null && typeof raw[2] === 'object' && !Array.isArray(raw[2]) ? (raw[2] as Record<string, unknown>) : null;
  const canvasMeta = rawCanvas
    ? {
        width: typeof rawCanvas.width === 'number' ? rawCanvas.width : Number(rawCanvas.width) || 0,
        height: typeof rawCanvas.height === 'number' ? rawCanvas.height : Number(rawCanvas.height) || 0,
        color: typeof rawCanvas.color === 'string' ? rawCanvas.color : String(rawCanvas.color || '#ffffff'),
      }
    : null;
  if (!Array.isArray(tabIds) || !Array.isArray(compactWidgets)) return null;

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

    const hasVariable = type !== 'rect';
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
  return { tabIds, widgets, canvasWidth, canvasHeight, canvasColor };
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
