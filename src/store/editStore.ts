import { create } from 'zustand';
import { Tab, Widget } from '../types';
import { snapToGrid } from '../constants';
import type { EditorUiSnapshot } from '../editorProjectFile';

interface EditState {
  widgets: Widget[];
  selectedId: string | null;
  clipboard: Widget | null;
  canvasConfig: { width: number; height: number; color: string };
  tabs: Tab[];
  activeTabId: string;
  applySnapshot: (snapshot: EditorUiSnapshot) => void;
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
  removeTab: (id: string) => void;
}

const KEY = {
  widgets: 'edit_widgets',
  canvas: 'edit_canvasConfig',
  tabs: 'edit_tabs',
  activeTabId: 'edit_activeTabId',
};

/** Миграция/нормализация вкладок из localStorage для старых версий данных */
function loadInitialTabs(): Tab[] {
  try {
    const raw = localStorage.getItem(KEY.tabs);
    if (!raw) {
      return [{ id: 'tab_1', name: 'Вкладка 1' }];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [{ id: 'tab_1', name: 'Вкладка 1' }];
    }
    return parsed.map((t: any, index: number): Tab => ({
      id: t?.id || `tab_${index + 1}`,
      name: t?.name || `Вкладка ${index + 1}`,
    }));
  } catch {
    return [{ id: 'tab_1', name: 'Вкладка 1' }];
  }
}

function loadInitialActiveTabId(fallbackTabs: Tab[]): string {
  try {
    const stored = localStorage.getItem(KEY.activeTabId);
    if (stored && fallbackTabs.some((t) => t.id === stored)) {
      return stored;
    }
  } catch {
    // ignore
  }
  return fallbackTabs[0]?.id || 'tab_1';
}

const initialTabs = loadInitialTabs();
const initialActiveTabId = loadInitialActiveTabId(initialTabs);

export const useEditStore = create<EditState>((set) => ({
  widgets: JSON.parse(localStorage.getItem(KEY.widgets) || '[]'),
  selectedId: null,
  clipboard: null,
  canvasConfig: JSON.parse(localStorage.getItem(KEY.canvas) || '{"width":320,"height":480,"color":"#ffffff"}'),
  tabs: initialTabs,
  activeTabId: initialActiveTabId,
  applySnapshot: (snapshot) => set(() => {
    const { widgets, canvasConfig, tabs, activeTabId } = snapshot;
    localStorage.setItem(KEY.widgets, JSON.stringify(widgets));
    localStorage.setItem(KEY.canvas, JSON.stringify(canvasConfig));
    localStorage.setItem(KEY.tabs, JSON.stringify(tabs));
    localStorage.setItem(KEY.activeTabId, activeTabId);
    return {
      widgets,
      canvasConfig,
      tabs,
      activeTabId,
      selectedId: null,
    };
  }),
  setWidgets: (widgets) => {
    set({ widgets });
    localStorage.setItem(KEY.widgets, JSON.stringify(widgets));
  },
  addWidget: (type) => set((state) => {
    const short: Record<string, string> = { button: 'btn', slider: 'sl', input: 'in', led: 'led', label: 'lbl', rect: 'r', switch: 'sw' };
    const prefix = short[type] ?? type;
    const id = `${prefix}_${Math.floor(Math.random() * 1000)}`;
    const currentTabId = state.activeTabId || 'tab_1';
    const newWidgets: Widget[] = [
      ...state.widgets,
      {
        id,
        type,
        x: snapToGrid(50),
        y: snapToGrid(50),
        width: snapToGrid(type === 'slider' ? 200 : type === 'led' ? 30 : type === 'switch' ? 60 : 120),
        height: snapToGrid(type === 'slider' ? 20 : type === 'led' ? 30 : type === 'switch' ? 30 : 40),
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
        color: type === 'input' ? '#ffffff' : type === 'led' ? '#ff0000' : type === 'rect' ? '#cccccc' : type === 'switch' ? '#10b981' : '#3b82f6',
        varName: id,
        varType: type === 'button' || type === 'led' || type === 'switch' ? 'bool' : type === 'slider' ? 'int' : type === 'rect' ? 'none' : 'String',
        name: '',
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
        x: attrs.x !== undefined ? snapToGrid(updated.x) : updated.x,
        y: attrs.y !== undefined ? snapToGrid(updated.y) : updated.y,
        width: attrs.width !== undefined ? snapToGrid(updated.width) : updated.width,
        height: attrs.height !== undefined ? snapToGrid(updated.height) : updated.height,
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
    const short: Record<string, string> = { button: 'btn', slider: 'sl', input: 'in', led: 'led', label: 'lbl', rect: 'r', switch: 'sw' };
    const prefix = short[state.clipboard.type] ?? state.clipboard.type;
    const newId = `${prefix}_${Math.floor(Math.random() * 1000)}`;
    const newWidget: Widget = {
      ...state.clipboard,
      id: newId,
      varName: newId,
      x: snapToGrid(state.clipboard.x + 20),
      y: snapToGrid(state.clipboard.y + 20),
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
    const newTabs = [...state.tabs, { id: newTabId, name: `Вкладка ${nextIndex}` }];
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
  removeTab: (id) => set((state) => {
    if (state.tabs.length <= 1) return state;
    if (!state.tabs.some((t) => t.id === id)) return state;

    const newTabs = state.tabs.filter((t) => t.id !== id);
    const nextActiveTabId = state.activeTabId === id
      ? (newTabs[Math.max(0, state.tabs.findIndex((t) => t.id === id) - 1)]?.id ?? newTabs[0]?.id ?? 'tab_1')
      : state.activeTabId;

    const newWidgets = state.widgets.filter((w) => (w.tabId ?? 'tab_1') !== id);

    localStorage.setItem(KEY.tabs, JSON.stringify(newTabs));
    localStorage.setItem(KEY.activeTabId, nextActiveTabId);
    localStorage.setItem(KEY.widgets, JSON.stringify(newWidgets));

    return {
      tabs: newTabs,
      activeTabId: nextActiveTabId,
      widgets: newWidgets,
      selectedId: null,
    };
  }),
}));
