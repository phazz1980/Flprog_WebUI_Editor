/** typeCode из /config: 0=button, 1=slider, 2=input, 3=led, 4=label, 5=rect, 6=switch */
export type WidgetType = 'button' | 'slider' | 'input' | 'led' | 'label' | 'rect' | 'switch';

export interface RuntimeWidget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text: string;
  /** Подпись над виджетом (из compact: [10], после varName [9]) */
  caption?: string;
  tabId: string;
  tabIndex: number;
  varName: string; // id или [9] из compactWidgets
  /** Индекс среди виджетов с переменной (для state[]); для slider/switch — индекс первой переменной (_out) */
  stateIndex: number;
  /** Для slider/switch — индекс второй переменной (_in), ответ с МК; для отображения и подтверждения */
  responseStateIndex?: number;
}

export interface CanvasConfig {
  width: number;
  height: number;
  color: string;
}

export interface ViewerConfig {
  tabIds: string[];
  /** Читабельные имена вкладок, если есть в /config; иначе автогенерированные "Вкладка N" */
  tabNames: string[];
  widgets: RuntimeWidget[];
  canvasWidth: number;
  canvasHeight: number;
  canvasColor: string;
}
