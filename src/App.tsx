import React, { useEffect, useRef, useState } from 'react';
import { Circle, Group, Layer as KonvaLayer, Line, Rect, Stage as KonvaStage, Text, Transformer } from 'react-konva';
import Konva from 'konva';
import { generateArduinoCode } from './generator';
import { useEditStore } from './store/editStore';
import { Widget } from './types';
import './App.css';

const Stage = (props: any) => <KonvaStage {...props}>{props.children}</KonvaStage>;
const Layer = (props: any) => <KonvaLayer {...props}>{props.children}</KonvaLayer>;

const GRID_SIZE = 10;
const snapToGrid = (value: number) => Math.round(Math.round(value / GRID_SIZE) * GRID_SIZE);

const WidgetComponent = ({ shapeProps, isSelected, onSelect, onChange }: any) => {
  const shapeRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Group
        draggable
        x={shapeProps.x}
        y={shapeProps.y}
        ref={shapeRef}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
          onChange({
            ...shapeProps,
            x: snapToGrid(e.target.x()),
            y: snapToGrid(e.target.y()),
          });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            x: snapToGrid(node.x()),
            y: snapToGrid(node.y()),
            width: snapToGrid(Math.max(20, shapeProps.width * scaleX)),
            height: snapToGrid(Math.max(10, shapeProps.height * scaleY)),
          });
        }}
      >
        {shapeProps.type !== 'rect' && (shapeProps.caption ?? '') !== '' && (
          <Text
            text={shapeProps.caption}
            x={0}
            y={-18}
            width={shapeProps.width}
            height={18}
            align="center"
            verticalAlign="middle"
            fill="#374151"
            fontSize={12}
            listening={false}
          />
        )}
        {shapeProps.type === 'led' ? (
          <Circle
            radius={shapeProps.width / 2}
            x={shapeProps.width / 2}
            y={shapeProps.width / 2}
            fill={shapeProps.text === '1' ? shapeProps.color : '#333'}
            stroke="#111"
            strokeWidth={2}
            shadowBlur={shapeProps.text === '1' ? 15 : 0}
            shadowColor={shapeProps.color}
          />
        ) : shapeProps.type === 'label' ? (
          <Text
            text={shapeProps.text}
            width={shapeProps.width}
            height={shapeProps.height}
            align="left"
            verticalAlign="middle"
            fill="#333"
            fontSize={16}
          />
        ) : (
          <Rect
            width={shapeProps.width}
            height={shapeProps.height}
            fill={shapeProps.type === 'switch' ? (shapeProps.text === '1' ? '#22c55e' : '#e5e7eb') : shapeProps.color}
            stroke={shapeProps.type === 'input' ? '#ddd' : undefined}
            strokeWidth={shapeProps.type === 'input' ? 1 : 0}
            cornerRadius={shapeProps.type === 'button' ? 5 : shapeProps.type === 'input' ? 2 : shapeProps.type === 'switch' ? shapeProps.height / 2 : 10}
            shadowBlur={isSelected ? 5 : 0}
          />
        )}
        {shapeProps.type === 'switch' && (
          <Circle
            radius={shapeProps.height / 2 - 3}
            x={shapeProps.text === '1' ? shapeProps.width - shapeProps.height / 2 : shapeProps.height / 2}
            y={shapeProps.height / 2}
            fill="#ffffff"
            shadowBlur={4}
            shadowColor="rgba(0,0,0,0.15)"
          />
        )}
        {shapeProps.type === 'slider' && (
          <Text
            text={shapeProps.text ?? ''}
            x={shapeProps.width + 8}
            y={0}
            width={50}
            height={shapeProps.height}
            align="left"
            verticalAlign="middle"
            fill="#111827"
            fontSize={14}
          />
        )}
        {(shapeProps.type === 'button' || shapeProps.type === 'input') && (
          <Text
            text={shapeProps.text}
            width={shapeProps.width}
            height={shapeProps.height}
            align="center"
            verticalAlign="middle"
            fill={shapeProps.type === 'button' ? 'white' : '#333'}
            fontSize={14}
          />
        )}
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox: any, newBox: any) => {
            if (newBox.width < 20 || newBox.height < 10) return oldBox;
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

  const [showCode, setShowCode] = useState(false);
  const [copyToastVisible, setCopyToastVisible] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);

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
        <input type="number" value={canvasConfig.width} onChange={(e) => updateCanvas({ width: Number(e.target.value) })} style={{ width: '100%', marginBottom: '5px' }} />
        <input type="number" value={canvasConfig.height} onChange={(e) => updateCanvas({ height: Number(e.target.value) })} style={{ width: '100%', marginBottom: '5px' }} />
        <input type="color" value={canvasConfig.color} onChange={(e) => updateCanvas({ color: e.target.value })} style={{ width: '100%' }} />
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

        <div style={{ width: canvasConfig.width, flexShrink: 0 }}>
          <div
            className="canvas-inner"
            style={{
              width: canvasConfig.width,
              height: canvasConfig.height,
              minWidth: canvasConfig.width,
              minHeight: canvasConfig.height,
              backgroundColor: canvasConfig.color,
              border: '1px solid #94a3b8',
              boxSizing: 'border-box',
            }}
          >
            <Stage width={canvasConfig.width} height={canvasConfig.height} onMouseDown={(e: any) => { if (e.target === e.target.getStage()) selectWidget(null); }}>
              <Layer>
                {Array.from({ length: Math.floor(canvasConfig.width / GRID_SIZE) + 1 }).map((_, i) => (
                  <Line key={`v-${i}`} points={[i * GRID_SIZE, 0, i * GRID_SIZE, canvasConfig.height]} stroke={i % 5 === 0 ? '#ddd' : '#f0f0f0'} strokeWidth={1} />
                ))}
                {Array.from({ length: Math.floor(canvasConfig.height / GRID_SIZE) + 1 }).map((_, i) => (
                  <Line key={`h-${i}`} points={[0, i * GRID_SIZE, canvasConfig.width, i * GRID_SIZE]} stroke={i % 5 === 0 ? '#ddd' : '#f0f0f0'} strokeWidth={1} />
                ))}
                {widgets.filter((w: Widget) => (w.tabId || 'tab_1') === activeTabId).map((w: Widget) => (
                  <WidgetComponent
                    key={w.id}
                    shapeProps={w}
                    isSelected={w.id === selectedId}
                    onSelect={() => selectWidget(w.id)}
                    onChange={(attrs: any) => updateWidget(w.id, attrs)}
                  />
                ))}
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
            <input type="color" value={widgets.find((w) => w.id === selectedId)?.color || '#000000'} onChange={(e) => updateWidget(selectedId, { color: e.target.value })} style={{ width: '100%', marginBottom: '10px' }} />
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
