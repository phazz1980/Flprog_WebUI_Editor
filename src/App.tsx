import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Group, Layer as KonvaLayer, Line, Rect, Stage as KonvaStage, Text, Transformer } from 'react-konva';
import Konva from 'konva';
import { generateArduinoCode } from './generator';
import { contrastColor, getLuminance } from './contrastColor';
import { useEditStore } from './store/editStore';
import { useViewportSize } from './useViewportSize';
import { Widget } from './types';
import { GRID_SIZE, PIXELS_PER_UNIT, snapToGrid } from './constants';

const MOBILE_BREAKPOINT = 768;
const SIDEBAR_WIDTH = 220;
const CANVAS_PANEL_GAP = 28;
/** Отступ, когда панель скрыта, чтобы канва не заезжала на кнопки «☰» / «⚙». */
const LEFT_TOGGLE_OFFSET = 48;
import './App.css';

/** Stage: use KonvaStage with relaxed types (react-konva typings are incomplete for Stage) */
const Stage = KonvaStage as React.ComponentType<any>;
const Layer = (props: any) => <KonvaLayer {...props}>{props.children}</KonvaLayer>;

/** Виджеты хранятся и рисуются в дизайн-единицах канваса (0..width, 0..height), чтобы масштаб канвы одинаково масштабировал сетку и виджеты. */
const WidgetComponent = ({
  shapeProps,
  isSelected,
  onSelect,
  onChange,
  canvasBgColor = '#ffffff',
  isDemoMode = false,
  demoDisplayValue,
  onDemoClick,
  onDemoSliderChange,
  onDemoInputFocus,
}: any) => {
  const shapeRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const sliderTrackRef = useRef<Konva.Rect>(null);
  const captionBg = canvasBgColor;
  const displayText = demoDisplayValue !== undefined ? demoDisplayValue : shapeProps.text;
  const widgetBg = shapeProps.type === 'switch'
    ? (displayText === '1' ? '#22c55e' : '#e5e7eb')
    : shapeProps.color;
  const textOnWidget = contrastColor(widgetBg);
  const textOnCaption = contrastColor(captionBg);

  useEffect(() => {
    if (!isDemoMode && isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, isDemoMode]);

  const lw = shapeProps.width;
  const lh = shapeProps.height;
  const textHeight = 0.85 * lh;
  const textY = (lh - textHeight) / 2;
  const textFontSize = Math.max(8, textHeight * 0.65);

  const handleDemoClick = () => {
    if (!isDemoMode) return;
    if (shapeProps.type === 'input') {
      onDemoInputFocus?.(shapeProps.id);
      return;
    }
    if (onDemoClick && (shapeProps.type === 'button' || shapeProps.type === 'switch' || shapeProps.type === 'led')) {
      onDemoClick(shapeProps.id);
    }
  };

  const handleSliderDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!isDemoMode || !onDemoSliderChange || shapeProps.type !== 'slider') return;
    const group = shapeRef.current;
    if (!group) return;
    const pos = group.getRelativePointerPosition();
    if (!pos) return;
    const thumbRadius = Math.min(lh / 2 - 2, 8);
    const trackWidth = lw - 2 * thumbRadius;
    const mouseX = pos.x;
    const value = Math.min(100, Math.max(0, ((mouseX - thumbRadius) / trackWidth) * 100));
    onDemoSliderChange(shapeProps.id, Math.round(value));
    sliderTrackRef.current?.position({ x: 0, y: 0 });
  };

  return (
    <>
      <Group
        draggable={!isDemoMode}
        x={shapeProps.x}
        y={shapeProps.y}
        ref={shapeRef}
        onMouseDown={isDemoMode ? undefined : onSelect}
        onTouchStart={isDemoMode ? undefined : onSelect}
        onClick={isDemoMode ? handleDemoClick : undefined}
        onTap={isDemoMode ? handleDemoClick : undefined}
        onDragMove={isDemoMode ? undefined : (e: Konva.KonvaEventObject<DragEvent>) => {
          const pos = e.target.position();
          const snapped = { x: snapToGrid(pos.x), y: snapToGrid(pos.y) };
          e.target.position(snapped);
          onChange({ ...shapeProps, ...snapped });
        }}
        onDragEnd={isDemoMode ? undefined : (e: Konva.KonvaEventObject<DragEvent>) => {
          const pos = e.target.position();
          onChange({
            ...shapeProps,
            x: snapToGrid(pos.x),
            y: snapToGrid(pos.y),
          });
        }}
        onTransformEnd={isDemoMode ? undefined : () => {
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          const newWidth = Math.max(20, shapeProps.width * scaleX);
          const newHeight = Math.max(10, shapeProps.height * scaleY);
          onChange({
            ...shapeProps,
            x: snapToGrid(node.x()),
            y: snapToGrid(node.y()),
            width: snapToGrid(newWidth),
            height: snapToGrid(newHeight),
          });
        }}
      >
        {shapeProps.type !== 'rect' && (shapeProps.caption ?? '') !== '' && (
          <Text
            text={shapeProps.caption}
            x={0}
            y={-18}
            width={lw}
            height={18}
            align="center"
            verticalAlign="middle"
            fill={textOnCaption}
            fontSize={12}
            listening={false}
          />
        )}
        {shapeProps.type === 'led' ? (
          <Circle
            radius={lw / 2}
            x={lw / 2}
            y={lw / 2}
            fill={displayText === '1' ? shapeProps.color : '#333'}
            stroke="#111"
            strokeWidth={2}
            shadowBlur={displayText === '1' ? 15 : 0}
            shadowColor={shapeProps.color}
          />
        ) : shapeProps.type === 'label' ? (
          <Text
            text={shapeProps.text}
            x={0}
            y={textY}
            width={lw}
            height={textHeight}
            align="left"
            verticalAlign="middle"
            fill={shapeProps.color}
            fontSize={textFontSize}
          />
        ) : (
          <Rect
            width={lw}
            height={lh}
            fill={
              shapeProps.type === 'switch'
                ? (displayText === '1' ? '#22c55e' : '#e5e7eb')
                : shapeProps.type === 'button' && isDemoMode && displayText === '1'
                  ? (() => { const c = shapeProps.color; if (c.startsWith('#')) { const n = parseInt(c.slice(1), 16); const r = Math.max(0, ((n >> 16) & 0xff) - 40); const g = Math.max(0, ((n >> 8) & 0xff) - 40); const b = Math.max(0, (n & 0xff) - 40); return `rgb(${r},${g},${b})`; } return c; })()
                  : shapeProps.color
            }
            stroke={shapeProps.type === 'input' ? '#ddd' : undefined}
            strokeWidth={shapeProps.type === 'input' ? 1 : 0}
            cornerRadius={shapeProps.type === 'button' ? 5 : shapeProps.type === 'input' ? 2 : shapeProps.type === 'switch' ? lh / 2 : 10}
            shadowBlur={isSelected ? 5 : 0}
          />
        )}
        {shapeProps.type === 'switch' && (
          <Circle
            radius={lh / 2 - 3}
            x={displayText === '1' ? lw - lh / 2 : lh / 2}
            y={lh / 2}
            fill="#ffffff"
            shadowBlur={4}
            shadowColor="rgba(0,0,0,0.15)"
          />
        )}
        {shapeProps.type === 'slider' && (() => {
          const raw = displayText ?? '0';
          const value = Math.min(100, Math.max(0, parseFloat(raw) || 0));
          const thumbRadius = Math.min(lh / 2 - 2, 8);
          const trackWidth = lw - 2 * thumbRadius;
          const thumbX = thumbRadius + (value / 100) * trackWidth;
          return (
            <>
              <Circle
                x={thumbX}
                y={lh / 2}
                radius={thumbRadius}
                fill="#ffffff"
                stroke="#94a3b8"
                strokeWidth={1}
                shadowBlur={2}
                shadowColor="rgba(0,0,0,0.2)"
                listening={false}
              />
              <Text
                text={displayText ?? ''}
                x={lw + 8}
                y={textY}
                width={50}
                height={textHeight}
                align="left"
                verticalAlign="middle"
                fill={textOnCaption}
                fontSize={textFontSize}
              />
            </>
          );
        })()}
        {isDemoMode && shapeProps.type === 'slider' && onDemoSliderChange && (
          <Rect
            ref={sliderTrackRef}
            x={0}
            y={0}
            width={lw}
            height={lh}
            fill="transparent"
            listening={true}
            draggable={true}
            onDragMove={handleSliderDrag}
            onDragEnd={handleSliderDrag}
            onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
              e.cancelBubble = true;
              const group = shapeRef.current;
              if (!group) return;
              const pos = group.getRelativePointerPosition();
              if (!pos) return;
              const thumbRadius = Math.min(lh / 2 - 2, 8);
              const trackWidth = lw - 2 * thumbRadius;
              const mouseX = pos.x;
              const value = Math.min(100, Math.max(0, ((mouseX - thumbRadius) / trackWidth) * 100));
              onDemoSliderChange(shapeProps.id, Math.round(value));
            }}
          />
        )}
        {(shapeProps.type === 'button' || shapeProps.type === 'input') && (
          <Text
            text={(shapeProps.type === 'input' && displayText !== undefined ? displayText : shapeProps.text) ?? ''}
            x={0}
            y={textY}
            width={lw}
            height={textHeight}
            align="center"
            verticalAlign="middle"
            fill={textOnWidget}
            fontSize={textFontSize}
          />
        )}
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox: any, newBox: any) => {
            const minW = 20;
            const minH = 10;
            if (newBox.width < minW || newBox.height < minH) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
};

function App() {
  const {
    widgets,
    selectedId,
    canvasConfig,
    addWidget,
    updateWidget,
    updateCanvas,
    removeWidget,
    copyWidget,
    pasteWidget,
    selectWidget,
    bringToFront,
    sendToBack,
    tabs,
    activeTabId,
    addTab,
    setActiveTab,
    renameTab,
    setWidgets,
  } = useEditStore();

  const [canvasZoom, setCanvasZoom] = useState(1);
  const { width: viewportW, height: viewportH } = useViewportSize();
  const MOBILE_BREAKPOINT = 768;
  const VIEWPORT_HEIGHT_MARGIN =70; // под шапку, панели и отступ снизу (9:16)
  const isMobile = viewportW <= MOBILE_BREAKPOINT;
  const isPortraitCanvas = canvasConfig.height > canvasConfig.width; // 9:16 и т.п.
  const isTablet43 = Math.abs(canvasConfig.width / canvasConfig.height - 4 / 3) < 0.01;
  const isPc169 = Math.abs(canvasConfig.width / canvasConfig.height - 16 / 9) < 0.01;
  const useFitScale = (isMobile || isPortraitCanvas || isTablet43 || isPc169) && canvasConfig.width > 0 && canvasConfig.height > 0;
  const baseScale = useFitScale
    ? Math.max(1, Math.min(
        (viewportW - 24) / canvasConfig.width,
        (viewportH - VIEWPORT_HEIGHT_MARGIN) / canvasConfig.height
      ))
    : PIXELS_PER_UNIT;
  const scale = baseScale * canvasZoom;
  const displayWidth = Math.round(canvasConfig.width * scale);
  const displayHeight = Math.round(canvasConfig.height * scale);

  const MESSAGE_BAR_HEIGHT = 44;
  const CANVAS_BORDER = 3;
  const stageDisplayHeight = displayHeight - MESSAGE_BAR_HEIGHT - CANVAS_BORDER * 2;

  const zoomStep = 0.1;
  const zoomMin = 0.25;
  const zoomMax = 3;
  const setZoom = (v: number) => setCanvasZoom((prev) => Math.max(zoomMin, Math.min(zoomMax, v)));

  const [showCode, setShowCode] = useState(false);
  const [copyToastVisible, setCopyToastVisible] = useState(false);
  const SIMULATOR_URL = 'http://localhost:31337';
  const [simulatorLoading, setSimulatorLoading] = useState(false);
  const [simulatorError, setSimulatorError] = useState<string | null>(null);
  const [simulatorSuccess, setSimulatorSuccess] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoValues, setDemoValues] = useState<Record<string, string>>({});
  const [demoEditingInputId, setDemoEditingInputId] = useState<string | null>(null);
  const [demoInputOverlayRect, setDemoInputOverlayRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const demoInputRef = useRef<HTMLInputElement>(null);
  const [showLeftPanel, setShowLeftPanel] = useState(() => typeof window !== 'undefined' && window.innerWidth > MOBILE_BREAKPOINT);
  const [showRightPanel, setShowRightPanel] = useState(() => typeof window !== 'undefined' && window.innerWidth > MOBILE_BREAKPOINT);
  const prevIsMobileRef = useRef(isMobile);
  useEffect(() => {
    if (prevIsMobileRef.current !== isMobile) {
      prevIsMobileRef.current = isMobile;
      setShowLeftPanel(!isMobile);
      setShowRightPanel(!isMobile);
    }
  }, [isMobile]);
  const [gridVisible, setGridVisible] = useState(true);
  const [customProportionSelected, setCustomProportionSelected] = useState(false);
  const [lastCustomRatioString, setLastCustomRatioString] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const RATIOS = { pc: [16, 9] as const, tablet: [4, 3] as const, mobile: [9, 16] as const };
  const proportionValue = (() => {
    const r = canvasConfig.width / canvasConfig.height;
    const entries: [string, number, number][] = [['pc', 16, 9], ['tablet', 4, 3], ['mobile', 9, 16]];
    const match = entries.find(([, rw, rh]) => Math.abs(r - rw / rh) < 0.01);
    return match ? match[0] : 'custom';
  })();

  const proportionSelectValue = customProportionSelected ? 'custom' : proportionValue;

  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const ratioDisplay = (() => {
    const g = gcd(canvasConfig.width, canvasConfig.height);
    return g ? `${canvasConfig.width / g}:${canvasConfig.height / g}` : `${canvasConfig.width}:${canvasConfig.height}`;
  })();

  const applyRatioFromString = (s: string) => {
    const parts = String(s).trim().split(/[:\s×x]/);
    const a = Math.max(1, Math.round(Number(parts[0]) || 1));
    const b = Math.max(1, Math.round(Number(parts[1]) || 1));
    setLastCustomRatioString(`${a}:${b}`);
    const maxCurrent = Math.max(canvasConfig.width, canvasConfig.height);
    const newWidth = a >= b ? maxCurrent : Math.round(maxCurrent * a / b);
    const newHeight = a >= b ? Math.round(maxCurrent * b / a) : maxCurrent;
    updateCanvas({ width: newWidth, height: newHeight });
  };
  const [previewCanvasColor, setPreviewCanvasColor] = useState<string | null>(null);
  const [previewWidgetColor, setPreviewWidgetColor] = useState<string | null>(null);
  /** Локальные строки при вводе X/Y/Ш/В (позволяют набрать "50%" и применить по blur) */
  const [editXYWH, setEditXYWH] = useState<{ x?: string; y?: string; w?: string; h?: string }>({});
  const canvasColorRef = useRef<HTMLInputElement>(null);
  const widgetColorRef = useRef<HTMLInputElement>(null);
  const throttleCanvasRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleWidgetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestCanvasColorRef = useRef<string>(canvasConfig.color);
  const latestWidgetColorRef = useRef<string>('#000000');
  const COLOR_PREVIEW_THROTTLE_MS = 80;

  const commitCanvasColor = () => {
    if (throttleCanvasRef.current) clearTimeout(throttleCanvasRef.current);
    throttleCanvasRef.current = null;
    const v = canvasColorRef.current?.value ?? previewCanvasColor ?? latestCanvasColorRef.current;
    if (v) updateCanvas({ color: v });
    setPreviewCanvasColor(null);
  };
  const commitWidgetColor = () => {
    if (throttleWidgetRef.current) clearTimeout(throttleWidgetRef.current);
    throttleWidgetRef.current = null;
    const v = widgetColorRef.current?.value ?? previewWidgetColor ?? latestWidgetColorRef.current;
    if (selectedId && v) updateWidget(selectedId, { color: v });
    setPreviewWidgetColor(null);
  };

  const onCanvasColorChange = (value: string) => {
    latestCanvasColorRef.current = value;
    if (throttleCanvasRef.current === null) {
      setPreviewCanvasColor(value);
      throttleCanvasRef.current = setTimeout(() => {
        setPreviewCanvasColor(latestCanvasColorRef.current);
        throttleCanvasRef.current = null;
      }, COLOR_PREVIEW_THROTTLE_MS);
    }
  };
  const onWidgetColorChange = (value: string) => {
    latestWidgetColorRef.current = value;
    if (throttleWidgetRef.current === null) {
      setPreviewWidgetColor(value);
      throttleWidgetRef.current = setTimeout(() => {
        setPreviewWidgetColor(latestWidgetColorRef.current);
        throttleWidgetRef.current = null;
      }, COLOR_PREVIEW_THROTTLE_MS);
    }
  };

  useEffect(() => {
    setPreviewWidgetColor(null);
    setEditXYWH({});
  }, [selectedId]);

  const canvasBg = previewCanvasColor ?? canvasConfig.color;
  const isDarkBg = getLuminance(canvasBg) < 0.4;
  const gridStrokeMajor = isDarkBg ? 'rgba(255,255,255,0.14)' : '#ddd';
  const gridStrokeMinor = isDarkBg ? 'rgba(255,255,255,0.07)' : '#f0f0f0';

  const fallbackCopy = (text: string) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      if (document.execCommand('copy')) {
        setCopyToastVisible(true);
        window.setTimeout(() => setCopyToastVisible(false), 2000);
      } else {
        alert('Скопируйте код вручную (Ctrl+C после выделения).');
      }
    } finally {
      document.body.removeChild(ta);
    }
  };

  const getCreationStamp = () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    return `${yy}${mm}${dd}_${hh}${mi}`;
  };

  const handleGenerateCode = () => {
    const stamp = getCreationStamp();
    const baseName = `Flprog_WebUI_${stamp}`;
    const code = generateArduinoCode(widgets, canvasConfig, tabs);
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.ino`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendToSimulator = useCallback(async () => {
    setSimulatorError(null);
    setSimulatorSuccess(false);
    setSimulatorLoading(true);
    try {
      const res = await fetch(`${SIMULATOR_URL}/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgets, canvasConfig, tabs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setSimulatorSuccess(true);
    } catch (e: any) {
      setSimulatorError(e?.message || 'Не удалось подключиться к симулятору. Запустите: npm run simulator');
    } finally {
      setSimulatorLoading(false);
    }
  }, [widgets, canvasConfig]);

  const enterDemoMode = () => {
    const initial: Record<string, string> = {};
    widgets.forEach((w) => {
      if (w.type === 'button' || w.type === 'switch' || w.type === 'led') {
        initial[w.id] = w.text === '1' ? '1' : '0';
      } else if (w.type === 'slider') {
        const raw = w.text ?? '0';
        initial[w.id] = String(Math.min(100, Math.max(0, parseFloat(raw) || 0)));
      } else if (w.type === 'input') {
        initial[w.id] = w.text ?? '';
      }
    });
    setDemoValues(initial);
    setDemoMode(true);
    selectWidget(null);
  };

  const exitDemoMode = () => {
    setDemoMode(false);
    setDemoValues({});
    setDemoEditingInputId(null);
  };

  const handleDemoInputFocus = useCallback((id: string) => {
    setDemoEditingInputId(id);
  }, []);

  const handleDemoInputChange = useCallback((id: string, value: string) => {
    setDemoValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleDemoInputBlur = useCallback(() => {
    setDemoEditingInputId(null);
    setDemoInputOverlayRect(null);
  }, []);

  useEffect(() => {
    if (!demoMode || !demoEditingInputId || !stageRef.current) {
      setDemoInputOverlayRect(null);
      return;
    }
    const w = widgets.find((x) => x.id === demoEditingInputId);
    if (!w) {
      setDemoInputOverlayRect(null);
      return;
    }
    const container = stageRef.current.container();
    const r = container.getBoundingClientRect();
    setDemoInputOverlayRect({
      left: r.left + w.x * scale,
      top: r.top + w.y * scale,
      width: Math.max(40, w.width * scale),
      height: Math.max(24, w.height * scale),
    });
  }, [demoMode, demoEditingInputId, widgets, scale]);

  useEffect(() => {
    if (demoInputOverlayRect) {
      const t = requestAnimationFrame(() => {
        demoInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(t);
    }
  }, [demoInputOverlayRect]);

  const handleDemoClick = useCallback((id: string) => {
    setDemoValues((prev) => {
      const cur = prev[id] ?? '0';
      return { ...prev, [id]: cur === '1' ? '0' : '1' };
    });
  }, []);

  const handleDemoSliderChange = useCallback((id: string, value: number) => {
    setDemoValues((prev) => ({ ...prev, [id]: String(value) }));
  }, []);

  const handleGenerateUbiBlock = () => {
    const parserApi = window as any;
    if (
      typeof parserApi.parseArduinoCode !== 'function' ||
      typeof parserApi.extractFunctionBody !== 'function' ||
      typeof parserApi.createUbiXmlSixx !== 'function'
    ) {
      alert('Parser scripts are not loaded yet. Please reload the page and try again.');
      return;
    }

    try {
      const stamp = getCreationStamp();
      const blockName = `Flprog_WebUI_${stamp}`;
      const inoCode = generateArduinoCode(widgets, canvasConfig);
      const parsed = parserApi.parseArduinoCode(inoCode);
      const setupCode = parserApi.extractFunctionBody(inoCode, 'setup');
      const loopCode = parserApi.extractFunctionBody(inoCode, 'loop');

      const xml = parserApi.createUbiXmlSixx(
        blockName,
        '',
        parsed.variables || {},
        parsed.functions || {},
        parsed.global_includes || [],
        parsed.defines || [],
        parsed.extra_declarations || [],
        parsed.static_declarations || [],
        setupCode || '',
        loopCode || '',
        Boolean(parsed.enable_input_by_marker),
        parsed.block_name_by_marker || blockName,
        Boolean(parsed.not_can_many_use_by_marker)
      );

      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${blockName}.ubi`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('UBI generation error', error);
      alert(`Не удалось сформировать блок .ubi: ${error?.message || 'unknown error'}`);
    }
  };

  const moveSelectedWidget = useCallback((dx: number, dy: number) => {
    const state = useEditStore.getState();
    const id = state.selectedId;
    if (!id) return;
    const w = state.widgets.find((x) => x.id === id);
    if (!w) return;
    const cw = state.canvasConfig.width;
    const ch = state.canvasConfig.height;
    const x = snapToGrid(w.x + dx);
    const y = snapToGrid(w.y + dy);
    const x2 = Math.max(0, Math.min(cw - w.width, x));
    const y2 = Math.max(0, Math.min(ch - w.height, y));
    state.updateWidget(id, { x: x2, y: y2 });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) removeWidget(selectedId);
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC' && selectedId) { e.preventDefault(); copyWidget(selectedId); }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') { e.preventDefault(); pasteWidget(); }
      if (selectedId && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); moveSelectedWidget(-GRID_SIZE, 0); }
        if (e.key === 'ArrowRight') { e.preventDefault(); moveSelectedWidget(GRID_SIZE, 0); }
        if (e.key === 'ArrowUp') { e.preventDefault(); moveSelectedWidget(0, -GRID_SIZE); }
        if (e.key === 'ArrowDown') { e.preventDefault(); moveSelectedWidget(0, GRID_SIZE); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, removeWidget, copyWidget, pasteWidget, moveSelectedWidget]);

  useEffect(() => {
    const stopDragOutside = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const visit = (node: Konva.Node) => {
        if (node.isDragging && node.isDragging()) node.stopDrag();
        const container = node as Konva.Container;
        if (container.getChildren) container.getChildren().forEach((child: Konva.Node) => visit(child));
      };
      (stage as Konva.Container).getChildren().forEach((child: Konva.Node) => visit(child));
    };
    window.addEventListener('mouseup', stopDragOutside);
    return () => window.removeEventListener('mouseup', stopDragOutside);
  }, []);

  return (
    <div className={`App app-root ${demoMode ? 'demo-mode' : ''}`}>
      {!demoMode && (
      <div className={`sidebar sidebar-left ${showLeftPanel ? 'mobile-open' : 'mobile-closed'}`}>
        <button className="mobile-sidebar-close" onClick={() => setShowLeftPanel(false)}>×</button>
        <div style={{ marginBottom: '8px', paddingRight: '44px', paddingLeft: '44px' }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Widgets</h3>
        </div>
        <button className="widget-button" onClick={() => addWidget('button')} style={{ width: '100%', marginBottom: '10px', padding: '10px', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}>
          <span className="widget-icon">🔘</span><span>Add Button</span>
        </button>
        <button className="widget-button" onClick={() => addWidget('switch')} style={{ width: '100%', marginBottom: '10px', padding: '10px', cursor: 'pointer', backgroundColor: '#0ea5e9', color: 'white', border: 'none', borderRadius: '4px' }}>
          <span className="widget-icon">⏽</span><span>Add Switch</span>
        </button>
        <button className="widget-button" onClick={() => addWidget('slider')} style={{ width: '100%', marginBottom: '10px', padding: '10px', cursor: 'pointer', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px' }}>
          <span className="widget-icon">🎚</span><span>Add Slider</span>
        </button>
        <button className="widget-button" onClick={() => addWidget('input')} style={{ width: '100%', marginBottom: '10px', padding: '10px', cursor: 'pointer', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '4px' }}>
          <span className="widget-icon">⌨</span><span>Add Input</span>
        </button>
        <button className="widget-button" onClick={() => addWidget('led')} style={{ width: '100%', marginBottom: '10px', padding: '10px', cursor: 'pointer', backgroundColor: '#f43f5e', color: 'white', border: 'none', borderRadius: '4px' }}>
          <span className="widget-icon">💡</span><span>Add LED</span>
        </button>
        <button className="widget-button" onClick={() => addWidget('label')} style={{ width: '100%', marginBottom: '10px', padding: '10px', cursor: 'pointer', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px' }}>
          <span className="widget-icon">🔤</span><span>Add Label</span>
        </button>
        <button className="widget-button" onClick={() => addWidget('rect')} style={{ width: '100%', padding: '10px', cursor: 'pointer', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px' }}>
          <span className="widget-icon">▭</span><span>Add Rectangle</span>
        </button>

        <h3 style={{ marginTop: '30px' }}>Canvas</h3>
        <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>Соотношение сторон (логич. ед., не зависят от PPI)</p>
        <label style={{ fontSize: '12px' }}>Пропорции:</label>
        <select
          value={proportionSelectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'custom') {
              setCustomProportionSelected(true);
              return;
            }
            setCustomProportionSelected(false);
            setLastCustomRatioString(null);
            const [rW, rH] = (v === 'pc' || v === 'tablet' || v === 'mobile') ? RATIOS[v] : [16, 9];
            let newWidth: number;
            let newHeight: number;
            if (v === 'mobile') {
              // Мобильный (9:16): уменьшенные логические размеры, чтобы при 100% помещалось в экран
              const MOBILE_FIT_FACTOR = 0.85; // запас по краям
              const maxW = (viewportW - 24) * MOBILE_FIT_FACTOR;
              const maxH = Math.max(20, (viewportH - VIEWPORT_HEIGHT_MARGIN) * MOBILE_FIT_FACTOR);
              const widthIfLimitByH = (maxH * rW) / rH;
              if (widthIfLimitByH <= maxW) {
                newHeight = snapToGrid(Math.round(maxH));
                newWidth = snapToGrid(Math.round((newHeight * rW) / rH));
              } else {
                newWidth = snapToGrid(Math.round(maxW));
                newHeight = snapToGrid(Math.round((newWidth * rH) / rW));
              }
            } else {
              const maxCurrent = Math.max(canvasConfig.width, canvasConfig.height);
              newWidth = rW >= rH ? maxCurrent : Math.round(maxCurrent * rW / rH);
              newHeight = rW >= rH ? Math.round(maxCurrent * rH / rW) : maxCurrent;
            }
            updateCanvas({ width: newWidth, height: newHeight });
          }}
          style={{ width: '100%', marginBottom: '8px', padding: '4px 8px' }}
        >
          <option value="pc">ПК (16:9)</option>
          <option value="tablet">Планшет (4:3)</option>
          <option value="mobile">Мобильный (9:16)</option>
          <option value="custom">Свои значения</option>
        </select>
        {proportionSelectValue === 'custom' && (
          <>
            <label style={{ fontSize: '12px' }}>Пропорции (например 3:4):</label>
            <input
              key={`ratio-${canvasConfig.width}-${canvasConfig.height}-${lastCustomRatioString ?? ''}`}
              type="text"
              placeholder="3:4"
              defaultValue={lastCustomRatioString ?? ratioDisplay}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (/^\d+[:\s×x]\d+$/.test(v)) applyRatioFromString(v);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = (e.target as HTMLInputElement).value.trim();
                  if (/^\d+[:\s×x]\d+$/.test(v)) applyRatioFromString(v);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              style={{ width: '100%', marginBottom: '8px', padding: '4px 8px' }}
            />
          </>
        )}
        <label style={{ fontSize: '12px' }}>Цвет фона:</label>
        <input
          ref={canvasColorRef}
          type="color"
          value={previewCanvasColor ?? canvasConfig.color}
          onChange={(e) => onCanvasColorChange(e.target.value)}
          onPointerUp={commitCanvasColor}
          onBlur={commitCanvasColor}
          style={{ width: '100%' }}
        />
        <button onClick={() => setShowCode(true)} style={{ width: '100%', marginTop: '20px', padding: '12px', cursor: 'pointer', backgroundColor: '#000', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Generate Code</button>
      </div>
      )}

      <div
        className="canvas-container"
        style={{
          marginLeft: demoMode ? 0 : (!isMobile && showLeftPanel ? SIDEBAR_WIDTH + CANVAS_PANEL_GAP : LEFT_TOGGLE_OFFSET),
          marginRight: demoMode ? 0 : (!isMobile && showRightPanel ? SIDEBAR_WIDTH + CANVAS_PANEL_GAP : LEFT_TOGGLE_OFFSET),
          transition: 'margin 0.2s ease',
        }}
      >
        <div className="tabs-bar">
          <select className="tabs-select" value={activeTabId} onChange={(e) => setActiveTab(e.target.value)}>
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.name}</option>
            ))}
          </select>
          {demoMode ? (
            <button
              type="button"
              className="tab-demo-exit tab-rename-button"
              onClick={exitDemoMode}
            >
              Выйти из демо
            </button>
          ) : (
            <>
          <button className="tab-add-button" onClick={addTab}>+</button>
          <button
            className="tab-rename-button"
            onClick={() => {
              const current = tabs.find((t) => t.id === activeTabId);
              if (!current) return;
              const nextName = window.prompt('Tab name', current.name);
              if (nextName && nextName.trim()) renameTab(current.id, nextName.trim());
            }}
          >
            ✎
          </button>
          <button
            type="button"
            className="tab-rename-button"
            onClick={() => setGridVisible((v) => !v)}
            title={gridVisible ? 'Скрыть сетку' : 'Показать сетку'}
          >
            Сетка {gridVisible ? '▣' : '☐'}
          </button>
          <span style={{ marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
            <button
              type="button"
              className="tab-rename-button"
              onClick={() => setZoom(canvasZoom - zoomStep)}
              disabled={canvasZoom <= zoomMin}
              title="Уменьшить масштаб"
            >
              −
            </button>
            <span style={{ minWidth: '3ch', fontSize: '12px', textAlign: 'center' }} title="Масштаб канвы">
              {Math.round(canvasZoom * 100)}%
            </span>
            <button
              type="button"
              className="tab-rename-button"
              onClick={() => setZoom(canvasZoom + zoomStep)}
              disabled={canvasZoom >= zoomMax}
              title="Увеличить масштаб"
            >
              +
            </button>
          </span>
          <button
            type="button"
            className="tab-rename-button"
            onClick={enterDemoMode}
            title="Режим демонстрации"
          >
            Демо
          </button>
            </>
          )}
        </div>
        {!demoMode && (
          <>
        <button className="mobile-toggle mobile-toggle-left" onClick={() => setShowLeftPanel((prev) => !prev)}>☰</button>
        <button className="mobile-toggle mobile-toggle-right" onClick={() => setShowRightPanel((prev) => !prev)}>⚙</button>
          </>
        )}

        <div style={{ width: displayWidth, flexShrink: 0 }}>
          <div
            className="canvas-inner"
            style={{
              width: displayWidth,
              height: displayHeight,
              minWidth: displayWidth,
              minHeight: displayHeight,
              backgroundColor: previewCanvasColor ?? canvasConfig.color,
              border: '3px solid #475569',
              borderStyle: 'solid',
              boxSizing: 'border-box',
              boxShadow: '0 0 0 1px #334155, 0 8px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ width: displayWidth, height: stageDisplayHeight, flexShrink: 0 }}>
              <Stage ref={stageRef} width={displayWidth} height={stageDisplayHeight} onMouseDown={(e: any) => { if (!demoMode && e.target === e.target.getStage()) selectWidget(null); }}>
                <Layer>
                  <Group scaleX={scale} scaleY={scale}>
                    {gridVisible && !demoMode && (
                      <>
                        {Array.from({ length: Math.floor(canvasConfig.width / GRID_SIZE) + 1 }).map((_, i) => (
                          <Line key={`v-${i}`} points={[i * GRID_SIZE, 0, i * GRID_SIZE, canvasConfig.height]} stroke={gridStrokeMinor} strokeWidth={1} />
                        ))}
                        {Array.from({ length: Math.floor(canvasConfig.height / GRID_SIZE) + 1 }).map((_, i) => (
                          <Line key={`h-${i}`} points={[0, i * GRID_SIZE, canvasConfig.width, i * GRID_SIZE]} stroke={gridStrokeMinor} strokeWidth={1} />
                        ))}
                      </>
                    )}
                    {widgets.filter((w: Widget) => (w.tabId || 'tab_1') === activeTabId).map((w: Widget) => (
                      <WidgetComponent
                        key={w.id}
                        shapeProps={w.id === selectedId && previewWidgetColor != null ? { ...w, color: previewWidgetColor } : w}
                        isSelected={!demoMode && w.id === selectedId}
                        onSelect={() => selectWidget(w.id)}
                        onChange={(attrs: any) => updateWidget(w.id, attrs)}
                        canvasBgColor={previewCanvasColor ?? canvasConfig.color}
                        isDemoMode={demoMode}
                        demoDisplayValue={demoValues[w.id]}
                        onDemoClick={demoMode ? handleDemoClick : undefined}
                        onDemoSliderChange={demoMode ? handleDemoSliderChange : undefined}
                        onDemoInputFocus={demoMode ? handleDemoInputFocus : undefined}
                      />
                    ))}
                  </Group>
                </Layer>
              </Stage>
            </div>
            <div
              style={{
                height: MESSAGE_BAR_HEIGHT,
                minHeight: MESSAGE_BAR_HEIGHT,
                padding: '8px 10px',
                boxSizing: 'border-box',
                borderTop: '1px solid #64748b',
                backgroundColor: '#f8fafc',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-word', color: '#64748b' }}>—</span>
            </div>
          </div>
        </div>
      </div>

      {demoMode && demoEditingInputId && demoInputOverlayRect && (
        <input
          ref={demoInputRef}
          type="text"
          value={demoValues[demoEditingInputId] ?? widgets.find((w) => w.id === demoEditingInputId)?.text ?? ''}
          onChange={(e) => handleDemoInputChange(demoEditingInputId, e.target.value)}
          onBlur={handleDemoInputBlur}
          onKeyDown={(e) => { if (e.key === 'Escape') { (e.target as HTMLInputElement).blur(); } }}
          style={{
            position: 'fixed',
            left: demoInputOverlayRect.left,
            top: demoInputOverlayRect.top,
            width: demoInputOverlayRect.width,
            height: demoInputOverlayRect.height,
            margin: 0,
            padding: '2px 6px',
            border: '2px solid #0ea5e9',
            borderRadius: 4,
            fontSize: 14,
            boxSizing: 'border-box',
            zIndex: 100,
          }}
          data-demo-input
        />
      )}

      {!demoMode && (
      <div className={`sidebar sidebar-right ${showRightPanel ? 'mobile-open' : 'mobile-closed'}`}>
        <button className="mobile-sidebar-close" onClick={() => setShowRightPanel(false)}>×</button>
        <div className="sidebar-right-content">
        <div style={{ marginBottom: '8px', paddingRight: '44px' }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Properties</h3>
        </div>
        {selectedId ? (
          <div>
            {(() => {
              const selectedWidget = widgets.find((w) => w.id === selectedId);
              if (!selectedWidget) return null;
              return (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Размер и расположение</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', minWidth: '14px' }}>X</span>
                        <input
                          type="text"
                          value={editXYWH.x !== undefined ? editXYWH.x : String(selectedWidget.x)}
                          onFocus={() => setEditXYWH((prev) => ({ ...prev, x: String(selectedWidget.x) }))}
                          onChange={(e) => setEditXYWH((prev) => ({ ...prev, x: e.target.value }))}
                          onBlur={() => {
                            const raw = (editXYWH.x ?? String(selectedWidget.x)).trim();
                            const isPct = /%\s*$/.test(raw);
                            const numStr = raw.replace(/%\s*$/, '').trim();
                            const v = Number(numStr);
                            if (Number.isFinite(v)) {
                              const x = isPct ? (canvasConfig.width * v) / 100 : v;
                              const xClamped = snapToGrid(Math.max(0, Math.min(canvasConfig.width - (selectedWidget.width || 0), x)));
                              updateWidget(selectedId, { x: xClamped });
                            }
                            setEditXYWH((prev) => ({ ...prev, x: undefined }));
                          }}
                          style={{ flex: 1, minWidth: 0, maxWidth: '3.5rem', padding: '4px 6px', fontSize: '12px' }}
                        />
                        <span style={{ fontSize: '11px', minWidth: '14px' }}>Y</span>
                        <input
                          type="text"
                          value={editXYWH.y !== undefined ? editXYWH.y : String(selectedWidget.y)}
                          onFocus={() => setEditXYWH((prev) => ({ ...prev, y: String(selectedWidget.y) }))}
                          onChange={(e) => setEditXYWH((prev) => ({ ...prev, y: e.target.value }))}
                          onBlur={() => {
                            const raw = (editXYWH.y ?? String(selectedWidget.y)).trim();
                            const isPct = /%\s*$/.test(raw);
                            const numStr = raw.replace(/%\s*$/, '').trim();
                            const v = Number(numStr);
                            if (Number.isFinite(v)) {
                              const y = isPct ? (canvasConfig.height * v) / 100 : v;
                              const yClamped = snapToGrid(Math.max(0, Math.min(canvasConfig.height - (selectedWidget.height || 0), y)));
                              updateWidget(selectedId, { y: yClamped });
                            }
                            setEditXYWH((prev) => ({ ...prev, y: undefined }));
                          }}
                          style={{ flex: 1, minWidth: 0, maxWidth: '3.5rem', padding: '4px 6px', fontSize: '12px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', minWidth: '14px' }}>Ш</span>
                        <input
                          type="text"
                          value={editXYWH.w !== undefined ? editXYWH.w : String(selectedWidget.width)}
                          onFocus={() => setEditXYWH((prev) => ({ ...prev, w: String(selectedWidget.width) }))}
                          onChange={(e) => setEditXYWH((prev) => ({ ...prev, w: e.target.value }))}
                          onBlur={() => {
                            const raw = (editXYWH.w ?? String(selectedWidget.width)).trim();
                            const isPct = /%\s*$/.test(raw);
                            const numStr = raw.replace(/%\s*$/, '').trim();
                            const v = Number(numStr);
                            if (Number.isFinite(v)) {
                              const width = isPct ? (canvasConfig.width * v) / 100 : v;
                              const widthClamped = snapToGrid(Math.max(20, Math.min(canvasConfig.width, width)));
                              const maxX = canvasConfig.width - widthClamped;
                              const x = selectedWidget.x > maxX ? snapToGrid(maxX) : selectedWidget.x;
                              updateWidget(selectedId, { width: widthClamped, ...(selectedWidget.x > maxX ? { x } : {}) });
                            }
                            setEditXYWH((prev) => ({ ...prev, w: undefined }));
                          }}
                          style={{ flex: 1, minWidth: 0, maxWidth: '3.5rem', padding: '4px 6px', fontSize: '12px' }}
                        />
                        <span style={{ fontSize: '11px', minWidth: '14px' }}>В</span>
                        <input
                          type="text"
                          value={editXYWH.h !== undefined ? editXYWH.h : String(selectedWidget.height)}
                          onFocus={() => setEditXYWH((prev) => ({ ...prev, h: String(selectedWidget.height) }))}
                          onChange={(e) => setEditXYWH((prev) => ({ ...prev, h: e.target.value }))}
                          onBlur={() => {
                            const raw = (editXYWH.h ?? String(selectedWidget.height)).trim();
                            const isPct = /%\s*$/.test(raw);
                            const numStr = raw.replace(/%\s*$/, '').trim();
                            const v = Number(numStr);
                            if (Number.isFinite(v)) {
                              const height = isPct ? (canvasConfig.height * v) / 100 : v;
                              const heightClamped = snapToGrid(Math.max(10, Math.min(canvasConfig.height, height)));
                              const maxY = canvasConfig.height - heightClamped;
                              const y = selectedWidget.y > maxY ? snapToGrid(maxY) : selectedWidget.y;
                              updateWidget(selectedId, { height: heightClamped, ...(selectedWidget.y > maxY ? { y } : {}) });
                            }
                            setEditXYWH((prev) => ({ ...prev, h: undefined }));
                          }}
                          style={{ flex: 1, minWidth: 0, maxWidth: '3.5rem', padding: '4px 6px', fontSize: '12px' }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
            {(() => {
              const selectedWidget = widgets.find((w) => w.id === selectedId);
              if (!selectedWidget || selectedWidget.type === 'rect') return null;
              const isBoolLocked = selectedWidget.type === 'button' || selectedWidget.type === 'switch' || selectedWidget.type === 'led';
              const isBidiWidget = selectedWidget.type === 'switch' || selectedWidget.type === 'slider' || selectedWidget.type === 'input';
              return (
                <>
                  {isBidiWidget && (
                    <div style={{ marginBottom: '12px', padding: '8px', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                      <div style={{ fontSize: '11px', color: '#0369a1', marginBottom: '6px', fontWeight: 600 }}>Две переменные в коде МК</div>
                      <div style={{ fontSize: '12px', color: '#0c4a6e' }}>
                        <code style={{ background: '#e0f2fe', padding: '2px 4px' }}>{selectedWidget.varName || selectedWidget.id}_out</code>{' // out'}<br />
                        <code style={{ background: '#e0f2fe', padding: '2px 4px' }}>{selectedWidget.varName || selectedWidget.id}_in</code>{' // in'}
                      </div>
                    </div>
                  )}
                  {selectedWidget.type === 'button' && (
                    <>
                      <label style={{ fontSize: '12px' }}>Текст на кнопке:</label>
                      <input
                        type="text"
                        value={selectedWidget.text ?? ''}
                        onChange={(e) => updateWidget(selectedId, { text: e.target.value })}
                        style={{ width: '100%', marginBottom: '10px' }}
                      />
                    </>
                  )}
                  {selectedWidget.type === 'label' && (
                    <>
                      <label style={{ fontSize: '12px' }}>Текст подписи:</label>
                      <input
                        type="text"
                        value={selectedWidget.text ?? ''}
                        onChange={(e) => updateWidget(selectedId, { text: e.target.value })}
                        style={{ width: '100%', marginBottom: '10px' }}
                        placeholder="Текст Label"
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedWidget.varType === 'none'}
                          onChange={(e) => updateWidget(selectedId, { varType: e.target.checked ? 'none' : 'String' })}
                        />
                        Просто надпись
                      </label>
                    </>
                  )}
                  {!((selectedWidget.type === 'label') && (selectedWidget.varType === 'none')) && (
                    <>
                      <label style={{ fontSize: '12px' }}>Подпись над виджетом:</label>
                      <input
                        type="text"
                        value={selectedWidget.caption ?? ''}
                        onChange={(e) => updateWidget(selectedId, { caption: e.target.value })}
                        style={{ width: '100%', marginBottom: '10px' }}
                        placeholder="Текст над виджетом"
                      />
                    </>
                  )}
                  {!((selectedWidget.type === 'label') && (selectedWidget.varType === 'none')) && (
                    <>
                      <label style={{ fontSize: '12px' }}>Variable Name:</label>
                      <input
                        type="text"
                        value={selectedWidget.varName || ''}
                        onChange={(e) => updateWidget(selectedId, { varName: e.target.value.replace(/[^a-zA-Z0-9_\u0400-\u04FF]/g, '') })}
                        style={{ width: '100%', marginBottom: '10px' }}
                      />
                    </>
                  )}
                  {!isBoolLocked && !((selectedWidget.type === 'label') && (selectedWidget.varType === 'none')) && (
                    <>
                      <label style={{ fontSize: '12px' }}>Type:</label>
                      <select
                        value={selectedWidget.varType || 'int'}
                        onChange={(e) => updateWidget(selectedId, { varType: e.target.value as any })}
                        style={{ width: '100%', marginBottom: '10px' }}
                      >
                        <option value="int">int</option>
                        <option value="float">float</option>
                        <option value="bool">bool</option>
                        <option value="byte">Byte</option>
                        <option value="String">String</option>
                      </select>
                    </>
                  )}
                </>
              );
            })()}
            <label style={{ fontSize: '12px' }}>Color:</label>
            <input
              ref={widgetColorRef}
              type="color"
              value={previewWidgetColor ?? widgets.find((w) => w.id === selectedId)?.color ?? '#000000'}
              onChange={(e) => onWidgetColorChange(e.target.value)}
              onPointerUp={commitWidgetColor}
              onBlur={commitWidgetColor}
              style={{ width: '100%', marginBottom: '10px' }}
            />
            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
              <button onClick={() => bringToFront(selectedId)} style={{ flex: 1, padding: '5px', fontSize: '12px', cursor: 'pointer' }}>To Front</button>
              <button onClick={() => sendToBack(selectedId)} style={{ flex: 1, padding: '5px', fontSize: '12px', cursor: 'pointer' }}>To Back</button>
            </div>
            <button onClick={() => removeWidget(selectedId)} style={{ width: '100%', padding: '10px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px' }}>Delete</button>
          </div>
        ) : <p>Select a widget</p>}
        </div>
        <div className="sidebar-right-footer">
          <button
            onClick={() => {
              if (window.confirm('Очистить все виджеты на этой вкладке? Это действие нельзя отменить.')) {
                setWidgets(widgets.filter((w) => (w.tabId || 'tab_1') !== activeTabId));
                selectWidget(null);
              }
            }}
            style={{ width: '100%', padding: '10px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
          >
            Очистить интерфейс
          </button>
        </div>
      </div>
      )}

      {showCode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', width: '80%', height: '80%', borderRadius: '8px', display: 'flex', flexDirection: 'column', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3>Code Preview</h3>
              <button onClick={() => setShowCode(false)}>Close</button>
            </div>
            <textarea readOnly value={generateArduinoCode(widgets, canvasConfig, tabs)} style={{ flex: 1, fontFamily: 'monospace' }} />
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={handleGenerateCode} style={{ padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}>Download .ino</button>
              <button onClick={handleGenerateUbiBlock} style={{ padding: '10px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px' }}>Получить блок (.ubi)</button>
              <button
                onClick={() => {
                  const code = generateArduinoCode(widgets, canvasConfig, tabs);
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(code).then(() => {
                      setCopyToastVisible(true);
                      window.setTimeout(() => setCopyToastVisible(false), 2000);
                    }).catch(() => fallbackCopy(code));
                  } else {
                    fallbackCopy(code);
                  }
                }}
                style={{ padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px' }}
              >
                Copy
              </button>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: '#f9fafb' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px' }}>Симулятор ESP</div>
              <p style={{ fontSize: '12px', margin: '0 0 8px 0', color: '#6b7280' }}>
                Запустите в отдельном терминале: <code style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>npm run simulator</code>
              </p>
              <button
                onClick={sendToSimulator}
                disabled={simulatorLoading}
                style={{ padding: '8px 12px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: simulatorLoading ? 'wait' : 'pointer' }}
              >
                {simulatorLoading ? 'Отправка…' : 'Отправить проект в симулятор'}
              </button>
              {simulatorSuccess && (
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#059669' }}>
                  Проект загружен. Подключите просмотрщик к <a href={SIMULATOR_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>{SIMULATOR_URL}</a>
                </p>
              )}
              {simulatorError && (
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#dc2626' }}>{simulatorError}</p>
              )}
            </div>
          </div>
        </div>
      )}
      {copyToastVisible && (
        <div className="toast toast-success">
          Code copied to clipboard
        </div>
      )}
    </div>
  );
}

export default App;
