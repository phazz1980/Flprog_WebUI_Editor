import type { RuntimeWidget } from './types';

/** State от /state — массив по индексам или объект коротких ключей {"0": v, "1": v, "s": byte, "m": str}. */
export type StatePayload = number | string | boolean;

/** sound_enabled: 0 = выкл, 1 = уведомление, 2 = тревога */
export function getSoundType(state: StatePayload[] | Record<string, StatePayload>): 0 | 1 | 2 {
  if (Array.isArray(state)) {
    const v = state[state.length - 2];
    const n = typeof v === 'number' ? v : parseInt(String(v), 10);
    return (Number.isFinite(n) && n >= 1 && n <= 2) ? (n as 1 | 2) : 0;
  }
  const v = state['s'];
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return (Number.isFinite(n) && n >= 1 && n <= 2) ? (n as 1 | 2) : 0;
}

/**
 * Из state (short: ключ "m"; массив: последний элемент) извлекает ui_message.
 */
export function getUiMessage(state: StatePayload[] | Record<string, StatePayload>): string {
  if (Array.isArray(state)) {
    const v = state[state.length - 1];
    return v != null ? String(v) : '';
  }
  const v = state['m'];
  return v != null ? String(v) : '';
}

/**
 * По state (массив или short) и списку виджетов с переменными возвращает значение по stateIndex.
 * Элементы state[n-2], state[n-1] — sound_enabled (byte 0/1/2), ui_message (если нет виджета sound_enabled).
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
