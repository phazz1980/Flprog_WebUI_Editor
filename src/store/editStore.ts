import { create } from 'zustand';
import { Tab, Widget } from '../types';

interface EditState {
  widgets: Widget[];
  selectedId: string | null;
  clipboard: Widget | null;
  canvasConfig: { width: number; height: number; color: string };
  tabs: Tab[];
  activeTabId: string;
  setWidgets: (widgets: Widget[]) => void;
  addWidget: (type: Widget['type']) => void;
  updateWidget: (id: string, attrs: Partial<Widget>) => void;
  updateCanvas: (attrs: Partial<{ width: number; height: number; color: string }>) => void;
  removeWidget: (id: string) => void;
  copyWidget: (id: string) => void;
  pasteWidget: () => void;
  selectWidget: (id: string | null) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  addTab: () => void;
  setActiveTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
}

const KEY = {
  widgets: 'edit_widgets',
  canvas: 'edit_canvasConfig',
  tabs: 'edit_tabs',
  activeTabId: 'edit_activeTabId',
};

export const useEditStore = create<EditState>((set) => ({
  widgets: JSON.parse(localStorage.getItem(KEY.widgets) || '[]'),
  selectedId: null,
  clipboard: null,
  canvasConfig: JSON.parse(localStorage.getItem(KEY.canvas) || '{"width":320,"height":480,"color":"#ffffff"}'),
  tabs: JSON.parse(localStorage.getItem(KEY.tabs) || '[{"id":"tab_1","name":"Tab 1"}]'),
  activeTabId: localStorage.getItem(KEY.activeTabId) || 'tab_1',
  setWidgets: (widgets) => {
    set({ widgets });
    localStorage.setItem(KEY.widgets, JSON.stringify(widgets));
  },
  addWidget: (type) => set((state) => {
    const GRID = 10;
    const snap = (n: number) => Math.round(n / GRID) * GRID;
    const short: Record<string, string> = { button: 'btn', slider: 'sl', input: 'in', led: 'led', label: 'lbl', rect: 'r', switch: 'sw' };
    const prefix = short[type] ?? type;
    const id = `${prefix}_${Math.floor(Math.random() * 1000)}`;
    const currentTabId = state.activeTabId || 'tab_1';
    const newWidgets: Widget[] = [
      ...state.widgets,
      {
        id,
        type,
        x: snap(50),
        y: snap(50),
        width: snap(type === 'slider' ? 200 : type === 'led' ? 30 : type === 'switch' ? 60 : 120),
        height: snap(type === 'slider' ? 20 : type === 'led' ? 30 : type === 'switch' ? 30 : 40),
        text: type === 'button'
          ? 'Button'
          : type === 'input'
            ? 'Input...'
            : type === 'label'
              ? 'Label'
              : type === 'switch' || type === 'slider'
                ? '0'
                : undefined,
        caption: type === 'rect' ? undefined : '',
        color: type === 'input' ? '#ffffff' : type === 'led' ? '#ff0000' : type === 'label' ? 'transparent' : type === 'rect' ? '#cccccc' : type === 'switch' ? '#10b981' : '#3b82f6',
        varName: id,
        varType: type === 'button' || type === 'led' || type === 'switch' ? 'bool' : type === 'slider' ? 'int' : type === 'rect' ? 'none' : 'String',
        tabId: currentTabId,
      },
    ];
    localStorage.setItem(KEY.widgets, JSON.stringify(newWidgets));
    return { widgets: newWidgets };
  }),
  updateWidget: (id, attrs) => set((state) => {
    const newWidgets = state.widgets.map((w) => {
      if (w.id !== id) return w;
      const updated = { ...w, ...attrs };
      return {
        ...updated,
        x: attrs.x !== undefined ? Math.round(updated.x) : updated.x,
        y: attrs.y !== undefined ? Math.round(updated.y) : updated.y,
        width: attrs.width !== undefined ? Math.round(updated.width) : updated.width,
        height: attrs.height !== undefined ? Math.round(updated.height) : updated.height,
      };
    });
    localStorage.setItem(KEY.widgets, JSON.stringify(newWidgets));
    return { widgets: newWidgets };
  }),
  updateCanvas: (attrs) => set((state) => {
    const newConfig = { ...state.canvasConfig, ...attrs };
    localStorage.setItem(KEY.canvas, JSON.stringify(newConfig));
    return { canvasConfig: newConfig };
  }),
  removeWidget: (id) => set((state) => {
    const newWidgets = state.widgets.filter((w) => w.id !== id);
    localStorage.setItem(KEY.widgets, JSON.stringify(newWidgets));
    return {
      widgets: newWidgets,
      selectedId: state.selectedId === id ? null : state.selectedId,
    };
  }),
  copyWidget: (id) => set((state) => ({
    clipboard: state.widgets.find((w) => w.id === id) || null
  })),
  pasteWidget: () => set((state) => {
    if (!state.clipboard) return state;
    const GRID = 10;
    const snap = (n: number) => Math.round(n / GRID) * GRID;
    const short: Record<string, string> = { button: 'btn', slider: 'sl', input: 'in', led: 'led', label: 'lbl', rect: 'r', switch: 'sw' };
    const prefix = short[state.clipboard.type] ?? state.clipboard.type;
    const newId = `${prefix}_${Math.floor(Math.random() * 1000)}`;
    const newWidget: Widget = {
      ...state.clipboard,
      id: newId,
      varName: newId,
      x: snap(state.clipboard.x + 20),
      y: snap(state.clipboard.y + 20),
    };
    const newWidgets = [...state.widgets, newWidget];
    localStorage.setItem(KEY.widgets, JSON.stringify(newWidgets));
    return {
      widgets: newWidgets,
      selectedId: newWidget.id,
    };
  }),
  selectWidget: (id) => set({ selectedId: id }),
  bringToFront: (id) => set((state) => {
    const widget = state.widgets.find((w) => w.id === id);
    if (!widget) return state;
    const newWidgets = [...state.widgets.filter((w) => w.id !== id), widget];
    localStorage.setItem(KEY.widgets, JSON.stringify(newWidgets));
    return { widgets: newWidgets };
  }),
  sendToBack: (id) => set((state) => {
    const widget = state.widgets.find((w) => w.id === id);
    if (!widget) return state;
    const newWidgets = [widget, ...state.widgets.filter((w) => w.id !== id)];
    localStorage.setItem(KEY.widgets, JSON.stringify(newWidgets));
    return { widgets: newWidgets };
  }),
  addTab: () => set((state) => {
    const nextIndex = state.tabs.length + 1;
    const newTabId = `tab_${nextIndex}`;
    const newTabs = [...state.tabs, { id: newTabId, name: `Tab ${nextIndex}` }];
    localStorage.setItem(KEY.tabs, JSON.stringify(newTabs));
    localStorage.setItem(KEY.activeTabId, newTabId);
    return {
      tabs: newTabs,
      activeTabId: newTabId,
      selectedId: null,
    };
  }),
  setActiveTab: (id) => set((state) => {
    if (!state.tabs.find((t) => t.id === id)) return state;
    localStorage.setItem(KEY.activeTabId, id);
    return {
      activeTabId: id,
      selectedId: null,
    };
  }),
  renameTab: (id, name) => set((state) => {
    const trimmed = name.trim();
    if (!trimmed) return state;
    const newTabs = state.tabs.map((tab) => tab.id === id ? { ...tab, name: trimmed } : tab);
    localStorage.setItem(KEY.tabs, JSON.stringify(newTabs));
    return { tabs: newTabs };
  }),
}));
