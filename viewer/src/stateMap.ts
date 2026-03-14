import type { RuntimeWidget } from './types';

/** State от /state — массив по индексам или объект коротких ключей {"0": v, "1": v, "s": bool, "m": str}. */
export type StatePayload = number | string | boolean;

/**
 * Возвращает sound_enabled из state: 0 = выкл, 1 = уведомление, 2 = аларм.
 * Для формата short — ключ "s", для массива — state[state.length - 2].
 */
export function getSoundEnabled(
  state: StatePayload[] | Record<string, StatePayload>
): 0 | 1 | 2 {
  let raw: StatePayload | undefined;
  if (Array.isArray(state)) {
    raw = state.length >= 2 ? state[state.length - 2] : undefined;
  } else {
    raw = state['s'];
  }
  if (raw === undefined) return 0;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 0;
}

/**
 * Возвращает ui_message из state (short: ключ "m", массив: последний элемент).
 */
export function getUiMessage(
  state: StatePayload[] | Record<string, StatePayload>
): string {
  if (Array.isArray(state)) {
    const raw = state.length >= 1 ? state[state.length - 1] : undefined;
    return raw != null ? String(raw) : '';
  }
  const raw = state['m'];
  return raw != null ? String(raw) : '';
}

/**
 * По state (массив или short) и списку виджетов с переменными возвращает значение по stateIndex.
 * Элементы state[n-2], state[n-1] — sound_enabled, ui_message (если нет виджета sound_enabled).
 */
export function getStateValueByIndex(
  state: StatePayload[] | Record<string, StatePayload>,
  stateIndex: number
): StatePayload | undefined {
  if (Array.isArray(state)) {
    return state[stateIndex];
  }
  return state[String(stateIndex)];
}

/**
 * Вычисляет display value для виджета по правилам 9.5.
 */
export function displayValue(
  widget: RuntimeWidget,
  rawValue: StatePayload | undefined,
  fallbackText: string
): string {
  const type = widget.type;
  if (type === 'rect') return fallbackText;

  if (rawValue === undefined) return fallbackText;

  if (type === 'led' || type === 'switch') {
    if (typeof rawValue === 'boolean') return rawValue ? '1' : '0';
    if (typeof rawValue === 'number') return rawValue !== 0 ? '1' : '0';
    return String(rawValue).toLowerCase() === 'true' || String(rawValue) === '1' ? '1' : '0';
  }

  if (type === 'slider') {
    const n = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
    const v = Math.min(100, Math.max(0, Number.isFinite(n) ? n : 0));
    return String(Math.round(v));
  }

  if (type === 'input' || type === 'label') return String(rawValue);
  if (type === 'button') return rawValue === 1 || rawValue === '1' || rawValue === true ? '1' : fallbackText;

  return fallbackText;
}
