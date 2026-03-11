import React, { useEffect, useRef, useState } from 'react';
import { Circle, Group, Layer as KonvaLayer, Line, Rect, Stage as KonvaStage, Text, Transformer } from 'react-konva';
import Konva from 'konva';
import { generateArduinoCode } from './generator';
import { contrastColor, getLuminance } from './contrastColor';
import { useEditStore } from './store/editStore';
import { useViewportSize } from './useViewportSize';
import { Widget } from './types';
import './App.css';

const Stage = (props: any) => <KonvaStage {...props}>{props.children}</KonvaStage>;
const Layer = (props: any) => <KonvaLayer {...props}>{props.children}</KonvaLayer>;

const GRID_SIZE = 10;
/** Сетка в логических координатах канвы (шаг 10). */
const snapToGrid = (value: number) => Math.round(Math.round(value / GRID_SIZE) * GRID_SIZE);
/** Привязка в дизайн-пикселях так, чтобы логическая позиция (value/scale) была кратна GRID_SIZE. */
const snapDesignToGrid = (value: number, scale: number) => {
  const logical = value / scale;
  const snappedLogical = Math.round(logical / GRID_SIZE) * GRID_SIZE;
  return Math.round(snappedLogical * scale);
};

const WidgetComponent = ({ shapeProps, isSelected, onSelect, onChange, displayScale = 1, canvasBgColor = '#ffffff' }: any) => {
  const shapeRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const invScale = 1 / displayScale;
  const captionBg = canvasBgColor;
  const widgetBg = shapeProps.type === 'switch'
    ? (shapeProps.text === '1' ? '#22c55e' : '#e5e7eb')
    : shapeProps.color;
  const textOnWidget = contrastColor(widgetBg);
  const textOnCaption = contrastColor(captionBg);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const lx = shapeProps.x * invScale;
  const ly = shapeProps.y * invScale;
  const lw = shapeProps.width * invScale;
  const lh = shapeProps.height * invScale;
  const textHeight = 0.85 * lh;
  const textY = (lh - textHeight) / 2;
  const textFontSize = Math.max(8, textHeight * 0.65);

  return (
    <>
      <Group
        draggable
        x={lx}
        y={ly}
        ref={shapeRef}
        onClick={onSelect}
        onTap={onSelect}
        dragBoundFunc={(pos: { x: number; y: number }) => ({
          x: snapToGrid(pos.x),
          y: snapToGrid(pos.y),
        })}
        onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
          onChange({
            ...shapeProps,
            x: snapDesignToGrid(e.target.x() * displayScale, displayScale),
            y: snapDesignToGrid(e.target.y() * displayScale, displayScale),
          });
        }}
        onTransformEnd={() => {
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
            x: snapDesignToGrid(node.x() * displayScale, displayScale),
            y: snapDesignToGrid(node.y() * displayScale, displayScale),
            width: snapDesignToGrid(newWidth, displayScale),
            height: snapDesignToGrid(newHeight, displayScale),
          });
        }}
      >
        {shapeProps.type !== 'rect' && (shapeProps.caption ?? '') !== '' && (
          <Text
            text={shapeProps.caption}
            x={0}
            y={-18 * invScale}
            width={lw}
            height={18 * invScale}
            align="center"
            verticalAlign="middle"
            fill={textOnCaption}
            fontSize={12 * invScale}
            listening={false}
          />
        )}
        {shapeProps.type === 'led' ? (
          <Circle
            radius={lw / 2}
            x={lw / 2}
            y={lw / 2}
            fill={shapeProps.text === '1' ? shapeProps.color : '#333'}
            stroke="#111"
            strokeWidth={2 * invScale}
            shadowBlur={shapeProps.text === '1' ? 15 * invScale : 0}
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
            fill={contrastColor(shapeProps.color === 'transparent' ? captionBg : shapeProps.color)}
            fontSize={textFontSize}
          />
        ) : (
          <Rect
            width={lw}
            height={lh}
            fill={shapeProps.type === 'switch' ? (shapeProps.text === '1' ? '#22c55e' : '#e5e7eb') : shapeProps.color}
            stroke={shapeProps.type === 'input' ? '#ddd' : undefined}
            strokeWidth={shapeProps.type === 'input' ? 1 * invScale : 0}
            cornerRadius={(shapeProps.type === 'button' ? 5 : shapeProps.type === 'input' ? 2 : shapeProps.type === 'switch' ? lh / 2 : 10) * invScale}
            shadowBlur={isSelected ? 5 * invScale : 0}
          />
        )}
        {shapeProps.type === 'switch' && (
          <Circle
            radius={lh / 2 - 3 * invScale}
            x={shapeProps.text === '1' ? lw - lh / 2 : lh / 2}
            y={lh / 2}
            fill="#ffffff"
            shadowBlur={4 * invScale}
            shadowColor="rgba(0,0,0,0.15)"
          />
        )}
        {shapeProps.type === 'slider' && (
          <Text
            text={shapeProps.text ?? ''}
            x={lw + 8 * invScale}
            y={textY}
            width={50 * invScale}
            height={textHeight}
            align="left"
            verticalAlign="middle"
            fill={textOnWidget}
            fontSize={textFontSize}
          />
        )}
        {(shapeProps.type === 'button' || shapeProps.type === 'input') && (
          <Text
            text={shapeProps.text}
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
            const minW = 20 * invScale;
            const minH = 10 * invScale;
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
  } = useEditStore();

  const { width: viewportW, height: viewportH } = useViewportSize();
  const margin = 20;
  const maxW = Math.max(1, viewportW - margin);
  const maxH = Math.max(1, viewportH - margin);
  const scale =
    canvasConfig.width > 0 && canvasConfig.height > 0
      ? Math.min(maxW / canvasConfig.width, maxH / canvasConfig.height)
      : 1;
  const displayWidth = Math.round(canvasConfig.width * scale);
  const displayHeight = Math.round(canvasConfig.height * scale);

  const [showCode, setShowCode] = useState(false);
  const [copyToastVisible, setCopyToastVisible] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [previewCanvasColor, setPreviewCanvasColor] = useState<string | null>(null);
  const [previewWidgetColor, setPreviewWidgetColor] = useState<string | null>(null);
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
    const code = generateArduinoCode(widgets, canvasConfig);
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.ino`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) removeWidget(selectedId);
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedId) { e.preventDefault(); copyWidget(selectedId); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); pasteWidget(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, removeWidget, copyWidget, pasteWidget]);

  return (
    <div className="App app-root">
      <div className={`sidebar sidebar-left ${showLeftPanel ? 'mobile-open' : 'mobile-closed'}`}>
        <h3 style={{ marginTop: 0 }}>Widgets</h3>
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
          value={(() => {
            const r = canvasConfig.width / canvasConfig.height;
            const ratios: [string, number, number][] = [
              ['16:9', 16, 9], ['3:4', 3, 4], ['4:3', 4, 3], ['1:1', 1, 1],
              ['2:3', 2, 3], ['3:2', 3, 2], ['9:16', 9, 16], ['21:9', 21, 9],
            ];
            const match = ratios.find(([, rw, rh]) => Math.abs(r - rw / rh) < 0.01);
            return match ? match[0] : 'custom';
          })()}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'custom') return;
            const ratios: Record<string, [number, number]> = {
              '16:9': [16, 9], '3:4': [3, 4], '4:3': [4, 3], '1:1': [1, 1],
              '2:3': [2, 3], '3:2': [3, 2], '9:16': [9, 16], '21:9': [21, 9],
            };
            const [rW, rH] = ratios[v] ?? [16, 9];
            const maxCurrent = Math.max(canvasConfig.width, canvasConfig.height);
            const newWidth = rW >= rH ? maxCurrent : Math.round(maxCurrent * rW / rH);
            const newHeight = rW >= rH ? Math.round(maxCurrent * rH / rW) : maxCurrent;
            updateCanvas({ width: newWidth, height: newHeight });
          }}
          style={{ width: '100%', marginBottom: '8px', padding: '4px 8px' }}
        >
          <option value="16:9">16:9</option>
          <option value="3:4">3:4</option>
          <option value="4:3">4:3</option>
          <option value="1:1">1:1</option>
          <option value="2:3">2:3</option>
          <option value="3:2">3:2</option>
          <option value="9:16">9:16</option>
          <option value="21:9">21:9</option>
          <option value="custom">Свои значения</option>
        </select>
        <label style={{ fontSize: '12px' }}>Ширина:</label>
        <input type="number" min={1} value={canvasConfig.width} onChange={(e) => updateCanvas({ width: Number(e.target.value) || 1 })} style={{ width: '100%', marginBottom: '5px' }} />
        <label style={{ fontSize: '12px' }}>Высота:</label>
        <input type="number" min={1} value={canvasConfig.height} onChange={(e) => updateCanvas({ height: Number(e.target.value) || 1 })} style={{ width: '100%', marginBottom: '5px' }} />
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

      <div className="canvas-container">
        <div className="tabs-bar">
          <select className="tabs-select" value={activeTabId} onChange={(e) => setActiveTab(e.target.value)}>
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.name}</option>
            ))}
          </select>
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
        </div>
        <button className="mobile-toggle mobile-toggle-left" onClick={() => setShowLeftPanel((prev) => !prev)}>☰</button>
        <button className="mobile-toggle mobile-toggle-right" onClick={() => setShowRightPanel((prev) => !prev)}>⚙</button>

        <div style={{ width: displayWidth, flexShrink: 0 }}>
          <div
            className="canvas-inner"
            style={{
              width: displayWidth,
              height: displayHeight,
              minWidth: displayWidth,
              minHeight: displayHeight,
              backgroundColor: previewCanvasColor ?? canvasConfig.color,
              border: '1px solid #94a3b8',
              boxSizing: 'border-box',
            }}
          >
            <Stage width={displayWidth} height={displayHeight} onMouseDown={(e: any) => { if (e.target === e.target.getStage()) selectWidget(null); }}>
              <Layer>
                <Group scaleX={scale} scaleY={scale}>
                  {Array.from({ length: Math.floor(canvasConfig.width / GRID_SIZE) + 1 }).map((_, i) => (
                    <Line key={`v-${i}`} points={[i * GRID_SIZE, 0, i * GRID_SIZE, canvasConfig.height]} stroke={i % 5 === 0 ? gridStrokeMajor : gridStrokeMinor} strokeWidth={1} />
                  ))}
                  {Array.from({ length: Math.floor(canvasConfig.height / GRID_SIZE) + 1 }).map((_, i) => (
                    <Line key={`h-${i}`} points={[0, i * GRID_SIZE, canvasConfig.width, i * GRID_SIZE]} stroke={i % 5 === 0 ? gridStrokeMajor : gridStrokeMinor} strokeWidth={1} />
                  ))}
                  {widgets.filter((w: Widget) => (w.tabId || 'tab_1') === activeTabId).map((w: Widget) => (
                    <WidgetComponent
                      key={w.id}
                      shapeProps={w.id === selectedId && previewWidgetColor != null ? { ...w, color: previewWidgetColor } : w}
                      isSelected={w.id === selectedId}
                      onSelect={() => selectWidget(w.id)}
                      onChange={(attrs: any) => updateWidget(w.id, attrs)}
                      displayScale={scale}
                      canvasBgColor={previewCanvasColor ?? canvasConfig.color}
                    />
                  ))}
                </Group>
              </Layer>
            </Stage>
          </div>
        </div>
      </div>

      <div className={`sidebar sidebar-right ${showRightPanel ? 'mobile-open' : 'mobile-closed'}`}>
        <button className="mobile-sidebar-close" onClick={() => setShowRightPanel(false)}>×</button>
        <h3>Properties</h3>
        {selectedId ? (
          <div>
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
                  <label style={{ fontSize: '12px' }}>Variable Name:</label>
                  <input
                    type="text"
                    value={selectedWidget.varName || ''}
                    onChange={(e) => updateWidget(selectedId, { varName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                    style={{ width: '100%', marginBottom: '10px' }}
                  />
                  {!isBoolLocked && (
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

      {showCode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', width: '80%', height: '80%', borderRadius: '8px', display: 'flex', flexDirection: 'column', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3>Code Preview</h3>
              <button onClick={() => setShowCode(false)}>Close</button>
            </div>
            <textarea readOnly value={generateArduinoCode(widgets, canvasConfig)} style={{ flex: 1, fontFamily: 'monospace' }} />
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
              <button onClick={handleGenerateCode} style={{ padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}>Download .ino</button>
              <button onClick={handleGenerateUbiBlock} style={{ padding: '10px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px' }}>Получить блок (.ubi)</button>
              <button
                onClick={() => {
                  const code = generateArduinoCode(widgets, canvasConfig);
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
