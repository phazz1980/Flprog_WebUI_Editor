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
  tabId: string;
  tabIndex: number;
  varName: string; // id или [9] из compactWidgets
  /** Индекс среди виджетов с переменной (для state[]) */
  stateIndex: number;
}

export interface CanvasConfig {
  width: number;
  height: number;
  color: string;
}

export interface ViewerConfig {
  tabIds: string[];
  widgets: RuntimeWidget[];
  canvasWidth: number;
  canvasHeight: number;
  canvasColor: string;
}
