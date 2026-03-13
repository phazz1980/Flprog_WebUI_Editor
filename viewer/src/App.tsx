import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Group, Layer as KonvaLayer, Rect, Stage as KonvaStage, Text } from 'react-konva';
import Konva from 'konva';
import { contrastColor } from './contrastColor';
import { parseConfig } from './configParser';

import { getStateValueByIndex, displayValue, getSoundType, getUiMessage, type StatePayload } from './stateMap';
import { useViewportSize } from './useViewportSize';
import type { RuntimeWidget } from './types';
import './App.css';

const MOBILE_BREAKPOINT = 768;
const SIDEBAR_WIDTH = 220;
const CANVAS_PANEL_GAP = 28;
const POLL_INTERVAL_MS_DEFAULT = 500;
const POLL_INTERVAL_MS_MIN = 100;
const POLL_INTERVAL_MS_MAX = 30000;
const AUTO_RECONNECT_INTERVAL_MS = 5000;
const LOST_CONNECTION_ERROR = 'Соединение потеряно';
const STORAGE_KEY_ADDRESS = 'flprog_viewer_address';
const STORAGE_KEY_POLL_INTERVAL = 'flprog_viewer_poll_interval';

function loadSavedAddress(): { ip: string; port: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ADDRESS);
    if (!raw) return { ip: '192.168.1.1', port: '80' };
    const parsed = JSON.parse(raw);
    return {
      ip: typeof parsed?.ip === 'string' ? parsed.ip : '192.168.1.1',
      port: typeof parsed?.port === 'string' ? parsed.port : '80',
    };
  } catch {
    return { ip: '192.168.1.1', port: '80' };
  }
}

function saveAddress(ip: string, port: string) {
  try {
    localStorage.setItem(STORAGE_KEY_ADDRESS, JSON.stringify({ ip, port }));
  } catch {
    // ignore
  }
}

function loadSavedPollInterval(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POLL_INTERVAL);
    if (raw == null) return POLL_INTERVAL_MS_DEFAULT;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return POLL_INTERVAL_MS_DEFAULT;
    return Math.max(POLL_INTERVAL_MS_MIN, Math.min(POLL_INTERVAL_MS_MAX, n));
  } catch {
    return POLL_INTERVAL_MS_DEFAULT;
  }
}

function savePollInterval(ms: number) {
  try {
    const value = Math.max(POLL_INTERVAL_MS_MIN, Math.min(POLL_INTERVAL_MS_MAX, ms));
    localStorage.setItem(STORAGE_KEY_POLL_INTERVAL, String(value));
  } catch {
    // ignore
  }
}

/** Разбирает поле IP: допускается "host" или "host:port" (например localhost:31337). */
function parseHostPort(ipVal: string, portVal: string): { host: string; port: string } {
  const trimmed = ipVal.trim();
  if (!trimmed) return { host: '192.168.1.1', port: portVal.trim() || '80' };
  const lastColon = trimmed.lastIndexOf(':');
  if (lastColon > 0) {
    const host = trimmed.slice(0, lastColon);
    const portPart = trimmed.slice(lastColon + 1).trim();
    return { host, port: portPart || portVal.trim() || '80' };
  }
  return { host: trimmed, port: portVal.trim() || '80' };
}

const Stage = KonvaStage as React.ComponentType<any>;
const Layer = (props: any) => <KonvaLayer {...props}>{props.children}</KonvaLayer>;

const SOUND_DURATION = 1;

/** Уведомление (sound_enabled=1): 1 сек, мягкий тон. */
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 660;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + SOUND_DURATION);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + SOUND_DURATION);
  } catch {
    // ignore
  }
}

/** Тревога (sound_enabled=2): 1 сек, четыре коротких гудка. */
function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'square';
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + SOUND_DURATION);
    const beepLen = 0.18;
    const pauseLen = 0.07;
    for (let i = 0; i < 4; i++) {
      const t = ctx.currentTime + i * (beepLen + pauseLen);
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.15, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + beepLen);
    }
    gain.gain.setValueAtTime(0, ctx.currentTime);
  } catch {
    // ignore
  }
}

function ViewerWidget({
  widget,
  displayText,
  canvasBgColor,
  onSetVar,
  onInputEditRequest,
}: {
  widget: RuntimeWidget;
  displayText: string;
  canvasBgColor: string;
  onSetVar?: (varName: string, value: string, opts?: { widgetId: string; previousValue: string }) => void;
  onInputEditRequest?: (payload: { widget: RuntimeWidget; displayText: string; varNameForSet: string }) => void;
}) {
  const shapeRef = useRef<Konva.Group>(null);
  const lw = widget.width;
  const lh = widget.height;
  const textHeight = 0.85 * lh;
  const textY = (lh - textHeight) / 2;
  const textFontSize = Math.max(8, textHeight * 0.65);
  const widgetBg = widget.type === 'switch'
    ? (displayText === '1' ? '#22c55e' : '#e5e7eb')
    : widget.color;
  const textOnWidget = contrastColor(widgetBg);
  const textOnCaption = contrastColor(canvasBgColor);

  const varNameForSet =
    widget.type === 'switch' || widget.type === 'slider' || widget.type === 'input'
      ? `${widget.varName}_out`
      : widget.varName;

  const lastSwitchClickRef = useRef<{ key: string; at: number } | null>(null);
  const CLICK_DEBOUNCE_MS = 400;

  const handleClick = useCallback(() => {
    if (widget.type === 'switch') {
      if (!onSetVar) return;
      const next = displayText === '1' ? '0' : '1';
      const key = `${varNameForSet}=${next}`;
      const now = Date.now();
      if (lastSwitchClickRef.current?.key === key && now - lastSwitchClickRef.current.at < CLICK_DEBOUNCE_MS) return;
      lastSwitchClickRef.current = { key, at: now };
      onSetVar(varNameForSet, next, { widgetId: widget.id, previousValue: displayText });
    } else if (widget.type === 'input') {
      if (!onInputEditRequest) return;
      onInputEditRequest({ widget, displayText, varNameForSet });
    }
  }, [widget, displayText, onSetVar, onInputEditRequest, varNameForSet]);

  const buttonPressedRef = useRef(false);
  const handleButtonDown = useCallback(() => {
    if (widget.type !== 'button' || !onSetVar) return;
    buttonPressedRef.current = true;
    onSetVar(varNameForSet, '1');
  }, [widget.type, onSetVar, varNameForSet]);

  const handleButtonUp = useCallback(() => {
    if (widget.type !== 'button' || !onSetVar) return;
    buttonPressedRef.current = false;
    onSetVar(varNameForSet, '0');
  }, [widget.type, onSetVar, varNameForSet]);

  useEffect(() => {
    if (widget.type !== 'button' || !onSetVar) return;
    const onGlobalUp = () => {
      if (!buttonPressedRef.current) return;
      buttonPressedRef.current = false;
      onSetVar(varNameForSet, '0');
    };
    window.addEventListener('pointerup', onGlobalUp);
    window.addEventListener('touchend', onGlobalUp);
    return () => {
      window.removeEventListener('pointerup', onGlobalUp);
      window.removeEventListener('touchend', onGlobalUp);
    };
  }, [widget.type, onSetVar, varNameForSet]);

  const isClickable = widget.type === 'button' || widget.type === 'switch' || widget.type === 'input';
  const isButton = widget.type === 'button';

  return (
    <Group
      x={widget.x}
      y={widget.y}
      ref={shapeRef}
      onClick={!isButton && isClickable ? handleClick : undefined}
      onTap={!isButton && isClickable ? handleClick : undefined}
      onPointerDown={isButton ? handleButtonDown : undefined}
      onPointerUp={isButton ? handleButtonUp : undefined}
      onPointerUpOutside={isButton ? handleButtonUp : undefined}
      listening={true}
    >
      {/* caption в компактном формате /config не передаётся — не рисуем */}
      {widget.type === 'led' ? (
        <Circle
          radius={lw / 2}
          x={lw / 2}
          y={lw / 2}
          fill={displayText === '1' ? widget.color : '#333'}
          stroke="#111"
          strokeWidth={2}
          shadowBlur={displayText === '1' ? 15 : 0}
          shadowColor={widget.color}
          listening={false}
        />
      ) : widget.type === 'label' ? (
        <Text
          text={displayText}
          x={0}
          y={textY}
          width={lw}
          height={textHeight}
          align="left"
          verticalAlign="middle"
          fill={widget.color}
          fontSize={textFontSize}
          listening={false}
        />
      ) : (
        <Rect
          width={lw}
          height={lh}
          fill={
            widget.type === 'switch'
              ? (displayText === '1' ? '#22c55e' : '#e5e7eb')
              : widget.color
          }
          stroke={widget.type === 'input' ? '#ddd' : undefined}
          strokeWidth={widget.type === 'input' ? 1 : 0}
          cornerRadius={
            widget.type === 'button' ? 5
            : widget.type === 'input' ? 2
            : widget.type === 'switch' ? lh / 2
            : 10
          }
          listening={true}
        />
      )}
      {widget.type === 'switch' && (
        <Circle
          radius={lh / 2 - 3}
          x={displayText === '1' ? lw - lh / 2 : lh / 2}
          y={lh / 2}
          fill="#ffffff"
          shadowBlur={4}
          shadowColor="rgba(0,0,0,0.15)"
          listening={false}
        />
      )}
      {widget.type === 'slider' && (() => {
        const value = Math.min(100, Math.max(0, parseFloat(displayText) || 0));
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
              text={displayText}
              x={lw + 8}
              y={textY}
              width={50}
              height={textHeight}
              align="left"
              verticalAlign="middle"
              fill={textOnCaption}
              fontSize={textFontSize}
              listening={false}
            />
          </>
        );
      })()}
      {(widget.type === 'button' || widget.type === 'input') && (
        <Text
          text={displayText}
          x={0}
          y={textY}
          width={lw}
          height={textHeight}
          align="center"
          verticalAlign="middle"
          fill={textOnWidget}
          fontSize={textFontSize}
          listening={false}
        />
      )}
    </Group>
  );
}

function App() {
  const { width: viewportW, height: viewportH } = useViewportSize();
  const isMobile = viewportW <= MOBILE_BREAKPOINT;
  const [showLeftPanel, setShowLeftPanel] = useState(() => typeof window !== 'undefined' && window.innerWidth > MOBILE_BREAKPOINT);
  const prevIsMobileRef = useRef(isMobile);
  useEffect(() => {
    if (prevIsMobileRef.current !== isMobile) {
      prevIsMobileRef.current = isMobile;
      setShowLeftPanel(!isMobile);
    }
  }, [isMobile]);

  const [ip, setIp] = useState(() => loadSavedAddress().ip);
  const [port, setPort] = useState(() => loadSavedAddress().port);
  const [pollIntervalMs, setPollIntervalMs] = useState(() => loadSavedPollInterval());
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseUrlRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectingRef = useRef(false);

  const [tabIds, setTabIds] = useState<string[]>([]);
  const [tabNames, setTabNames] = useState<string[]>([]);
  const [widgets, setWidgets] = useState<RuntimeWidget[]>([]);
  const [canvasWidth, setCanvasWidth] = useState(400);
  const [canvasHeight, setCanvasHeight] = useState(300);
  const [canvasColor, setCanvasColor] = useState('#ffffff');
  const [state, setState] = useState<StatePayload[] | Record<string, StatePayload>>({});
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [configJsonString, setConfigJsonString] = useState<string | null>(null);
  const [showConfigJson, setShowConfigJson] = useState(false);
  const [debugClicks, setDebugClicks] = useState(false);
  const [draggingSliderId, setDraggingSliderId] = useState<string | null>(null);
  const [localSliderValues, setLocalSliderValues] = useState<Record<string, number>>({});
  const [sliderRevertOverrides, setSliderRevertOverrides] = useState<Record<string, string>>({});
  const pendingSliderRef = useRef<{ id: string; value: string; previousValue: string; varNameOut: string; timeoutId: ReturnType<typeof setTimeout> } | null>(null);
  const sliderDragStartRef = useRef<{ previousValue: string } | null>(null);
  const SLIDER_RESPONSE_WAIT_MS = 1000;

  const [switchDisplayOverrides, setSwitchDisplayOverrides] = useState<Record<string, string>>({});
  const [switchRevertOverrides, setSwitchRevertOverrides] = useState<Record<string, string>>({});
  const pendingSwitchRef = useRef<{ id: string; value: string; previousValue: string; timeoutId: ReturnType<typeof setTimeout> } | null>(null);
  const SWITCH_RESPONSE_WAIT_MS = 1000;

  const [editingInput, setEditingInput] = useState<{
    id: string;
    varNameOut: string;
    x: number;
    y: number;
    width: number;
    height: number;
    value: string;
  } | null>(null);

  const soundType = connected && typeof state === 'object' && !Array.isArray(state) ? getSoundType(state) : 0;
  const uiMessage = connected && typeof state === 'object' && !Array.isArray(state) ? getUiMessage(state) : '';
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevSoundTypeRef = useRef<0 | 1 | 2>(0);

  useEffect(() => {
    const prev = prevSoundTypeRef.current;
    prevSoundTypeRef.current = soundType;

    if (soundType === 2) {
      if (prev !== 2) {
        if (alarmIntervalRef.current) {
          clearInterval(alarmIntervalRef.current);
          alarmIntervalRef.current = null;
        }
        playAlarmSound();
        alarmIntervalRef.current = setInterval(playAlarmSound, 2000);
      }
    }

    if (soundType !== 2 && alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (soundType === 1) {
      playNotificationSound();
    }
  }, [soundType, state]);

  useEffect(() => {
    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    };
  }, []);

  const connect = useCallback(async () => {
    connectingRef.current = true;
    setError(null);
    setConnecting(true);
    setConfigJsonString(null);
    const { host, port: p } = parseHostPort(ip, port);
    const base = `http://${host}:${p}`;
    baseUrlRef.current = base;
    try {
      const res = await fetch(`${base}/config`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      setConfigJsonString(text);
      const raw = JSON.parse(text);
      const parsed = parseConfig(raw);
      if (!parsed) {
        throw new Error('Неверный формат /config');
      }
      setTabIds(parsed.tabIds);
      setTabNames(parsed.tabNames);
      setWidgets(parsed.widgets);
      setCanvasWidth(parsed.canvasWidth);
      setCanvasHeight(parsed.canvasHeight);
      setCanvasColor(parsed.canvasColor);
      setActiveTabIndex(0);
      setState({});
      setConnected(true);
      setConnecting(false);
      connectingRef.current = false;
      saveAddress(host, p);
      if (ip !== host || port !== p) {
        setIp(host);
        setPort(p);
      }
    } catch (e: any) {
      setError(e?.message || 'Не удалось подключиться');
      setConnecting(false);
      setConnected(false);
      connectingRef.current = false;
    }
  }, [ip, port]);

  const disconnect = useCallback(() => {
    setConnected(false);
    setError(null);
    setConfigJsonString(null);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const toggleConnection = useCallback(() => {
    if (connected) disconnect();
    else if (error) disconnect();
    else connect();
  }, [connected, error, connect, disconnect]);

  useEffect(() => {
    if (!connected || !baseUrlRef.current) return;
    const base = baseUrlRef.current;
    const interval = Math.max(POLL_INTERVAL_MS_MIN, Math.min(POLL_INTERVAL_MS_MAX, pollIntervalMs));
    const poll = async () => {
      try {
        const res = await fetch(`${base}/state?fmt=short`);
        if (!res.ok) {
          setConnected(false);
          setError(LOST_CONNECTION_ERROR);
          return;
        }
        const data = await res.json();
        setState(data);
      } catch {
        setConnected(false);
        setError(LOST_CONNECTION_ERROR);
      }
    };
    poll();
    pollRef.current = setInterval(poll, interval);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [connected, pollIntervalMs]);

  useEffect(() => {
    if (connected || !error) return;
    const t = setInterval(() => {
      if (!connectingRef.current) connect();
    }, AUTO_RECONNECT_INTERVAL_MS);
    return () => clearInterval(t);
  }, [connected, error, connect]);

  const setVar = useCallback(async (varName: string, value: string) => {
    const base = baseUrlRef.current;
    if (!base) return;
    try {
      await fetch(`${base}/set?var=${encodeURIComponent(varName)}&value=${encodeURIComponent(value)}`);
    } catch {
      // ignore
    }
  }, []);

  const commitEditingInput = useCallback(
    (apply: boolean) => {
      setEditingInput((current) => {
        if (!current) return null;
        if (apply && connected) {
          setVar(current.varNameOut, current.value);
        }
        return null;
      });
    },
    [connected, setVar]
  );

  type SetVarOpts = { widgetId: string; previousValue: string };
  const handleSetVar = useCallback((varName: string, value: string, opts?: SetVarOpts) => {
    if (opts?.widgetId != null) {
      setSwitchDisplayOverrides((prev) => ({ ...prev, [opts!.widgetId]: value }));
      setVar(varName, value);
      if (pendingSwitchRef.current) {
        clearTimeout(pendingSwitchRef.current.timeoutId);
        pendingSwitchRef.current = null;
      }
      const timeoutId = setTimeout(() => {
        if (pendingSwitchRef.current?.id === opts!.widgetId) {
          const prevVal = pendingSwitchRef.current.previousValue;
          pendingSwitchRef.current = null;
          setVar(varName, prevVal);
          setSwitchRevertOverrides((prev) => ({ ...prev, [opts!.widgetId]: prevVal }));
          setSwitchDisplayOverrides((prev) => {
            const next = { ...prev };
            delete next[opts!.widgetId];
            return next;
          });
        }
      }, SWITCH_RESPONSE_WAIT_MS);
      pendingSwitchRef.current = { id: opts.widgetId, value, previousValue: opts.previousValue, timeoutId };
    } else {
      setVar(varName, value);
    }
  }, [setVar]);

  const activeTabId = tabIds[activeTabIndex] ?? tabIds[0];
  const visibleWidgets = widgets.filter((w) => w.tabId === activeTabId);

  const sidebarOffset = !isMobile && showLeftPanel ? SIDEBAR_WIDTH + CANVAS_PANEL_GAP : 0;
  const availableW = Math.max(100, viewportW - sidebarOffset - 40);
  const availableH = Math.max(100, viewportH - 67);
  const scale = canvasWidth > 0 && canvasHeight > 0
    ? Math.min(availableW / canvasWidth, availableH / canvasHeight)
    : 1;
  const displayWidth = Math.round(canvasWidth * scale);
  const displayHeight = Math.round(canvasHeight * scale);

  const stageRef = useRef<Konva.Stage>(null);
  const handleStagePointerDown = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (debugClicks) {
        console.log('[Viewer click] Stage onPointerDown вызван', {
          connected,
          target: e.target?.getClassName?.(),
          evt: e.evt?.type,
        });
      }
      if (!stageRef.current) return;
      const stage = stageRef.current;
      const pos = stage.getPointerPosition();
      if (debugClicks) {
        console.log('[Viewer click] getPointerPosition()', pos);
      }
      if (!pos) return;
      const scaleX = scale;
      const scaleY = scale;
      const logicalX = pos.x / scaleX;
      const logicalY = pos.y / scaleY;

      const hitSlider = visibleWidgets.find(
        (w) =>
          w.type === 'slider' &&
          logicalX >= w.x &&
          logicalX < w.x + w.width &&
          logicalY >= w.y &&
          logicalY < w.y + w.height
      );
      if (hitSlider && connected) {
        const sliderStateIdx = hitSlider.responseStateIndex ?? hitSlider.stateIndex;
        const previousValue = displayValue(hitSlider, getStateValueByIndex(state, sliderStateIdx), hitSlider.text ?? '');
        sliderDragStartRef.current = { previousValue };
        setDraggingSliderId(hitSlider.id);
        const lw = hitSlider.width;
        const lh = hitSlider.height;
        const thumbRadius = Math.min(lh / 2 - 2, 8);
        const trackWidth = lw - 2 * thumbRadius;
        const localX = logicalX - hitSlider.x;
        const value = Math.min(100, Math.max(0, ((localX - thumbRadius) / trackWidth) * 100));
        setLocalSliderValues((prev) => ({ ...prev, [hitSlider.id]: value }));
      }
      // Кнопки и переключатели обрабатываются только в ViewerWidget (onClick/onTap), чтобы не дублировать запросы
    },
    [connected, scale, visibleWidgets, state, debugClicks]
  );

  const handleStagePointerMove = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (!draggingSliderId || !stageRef.current) return;
      const stage = stageRef.current;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const logicalX = pos.x / scale;
      const w = visibleWidgets.find((x) => x.type === 'slider' && x.id === draggingSliderId);
      if (!w) return;
      const lw = w.width;
      const lh = w.height;
      const thumbRadius = Math.min(lh / 2 - 2, 8);
      const trackWidth = lw - 2 * thumbRadius;
      const localX = logicalX - w.x;
      const localXClamped = Math.max(thumbRadius, Math.min(thumbRadius + trackWidth, localX));
      const value = Math.min(100, Math.max(0, ((localXClamped - thumbRadius) / trackWidth) * 100));
      setLocalSliderValues((prev) => ({ ...prev, [w.id]: value }));
    },
    [draggingSliderId, scale, visibleWidgets]
  );

  const handleStagePointerUp = useCallback(() => {
    if (!draggingSliderId || !connected || !setVar) {
      setDraggingSliderId(null);
      return;
    }
    const w = widgets.find((x) => x.type === 'slider' && x.id === draggingSliderId);
    const previousValue = sliderDragStartRef.current?.previousValue ?? '0';
    sliderDragStartRef.current = null;
    const value = localSliderValues[draggingSliderId];
    const valueStr = value !== undefined ? String(Math.round(value)) : previousValue;
    setVar(`${w?.varName ?? draggingSliderId}_out`, valueStr);
    setLocalSliderValues((prev) => ({ ...prev, [draggingSliderId]: Math.round(value ?? parseFloat(previousValue)) }));
    const id = draggingSliderId;
    setDraggingSliderId(null);
    if (pendingSliderRef.current) {
      clearTimeout(pendingSliderRef.current.timeoutId);
      pendingSliderRef.current = null;
    }
    const varNameOut = `${w?.varName ?? id}_out`;
    const timeoutId = setTimeout(() => {
      if (pendingSliderRef.current?.id === id) {
        const prevVal = pendingSliderRef.current.previousValue;
        const nameOut = pendingSliderRef.current.varNameOut;
        pendingSliderRef.current = null;
        setVar(nameOut, prevVal);
        setSliderRevertOverrides((prev) => ({ ...prev, [id]: prevVal }));
        setLocalSliderValues((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    }, SLIDER_RESPONSE_WAIT_MS);
    pendingSliderRef.current = { id, value: valueStr, previousValue, varNameOut, timeoutId };
  }, [draggingSliderId, connected, setVar, widgets, localSliderValues]);

  useEffect(() => {
    if (!pendingSliderRef.current) return;
    const { id, value } = pendingSliderRef.current;
    const w = widgets.find((x) => x.id === id);
    if (!w || w.stateIndex < 0) return;
    const responseIdx = w.responseStateIndex ?? w.stateIndex;
    const raw = getStateValueByIndex(state, responseIdx);
    const currentStr = raw === undefined ? '' : String(typeof raw === 'number' ? Math.round(raw) : raw);
    if (currentStr === value) {
      clearTimeout(pendingSliderRef.current.timeoutId);
      pendingSliderRef.current = null;
      setSliderRevertOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setLocalSliderValues((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [state, widgets]);

  useEffect(() => {
    if (!pendingSwitchRef.current) return;
    const { id, value } = pendingSwitchRef.current;
    const w = widgets.find((x) => x.id === id);
    if (!w || w.stateIndex < 0) return;
    const responseIdx = w.responseStateIndex ?? w.stateIndex;
    const raw = getStateValueByIndex(state, responseIdx);
    const currentStr =
      raw === undefined
        ? ''
        : typeof raw === 'boolean'
          ? raw ? '1' : '0'
          : typeof raw === 'number'
            ? raw !== 0 ? '1' : '0'
            : String(raw).toLowerCase() === 'true' || String(raw) === '1'
              ? '1'
              : '0';
    if (currentStr === value) {
      clearTimeout(pendingSwitchRef.current.timeoutId);
      pendingSwitchRef.current = null;
      setSwitchRevertOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSwitchDisplayOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [state, widgets]);

  useEffect(() => {
    if (!draggingSliderId) return;
    const onUp = () => handleStagePointerUp();
    window.addEventListener('pointerup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [draggingSliderId, handleStagePointerUp]);

  const handleCanvasContainerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (debugClicks) {
        const el = e.target as HTMLElement;
        console.log('[Viewer click] Контейнер канвы onPointerDownCapture — событие дошло до области канвы', {
          targetTag: el?.tagName,
          targetClass: el?.className?.slice(0, 80),
          targetId: el?.id || null,
        });
      }
    },
    [debugClicks]
  );

  return (
    <div className="App app-root">
      <div className={`sidebar sidebar-left ${showLeftPanel ? 'mobile-open' : 'mobile-closed'}`}>
        <button className="mobile-sidebar-close" onClick={() => setShowLeftPanel(false)}>×</button>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Подключение</h3>
        <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Адрес (IP или host:port)</label>
        <input
          type="text"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          onBlur={() => saveAddress(ip.trim() || '192.168.1.1', port.trim() || '80')}
          placeholder="192.168.1.1 или localhost:31337"
          style={{ width: '100%', marginBottom: 10, padding: '6px 8px', boxSizing: 'border-box' }}
        />
        <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Порт (если не указан в адресе)</label>
        <input
          type="text"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          onBlur={() => saveAddress(ip.trim() || '192.168.1.1', port.trim() || '80')}
          placeholder="80"
          style={{ width: '100%', marginBottom: 12, padding: '6px 8px', boxSizing: 'border-box' }}
        />
        <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Интервал обновления (мс)</label>
        <input
          type="number"
          min={POLL_INTERVAL_MS_MIN}
          max={POLL_INTERVAL_MS_MAX}
          step={100}
          value={pollIntervalMs}
          onChange={(e) => {
            const v = e.target.value === '' ? POLL_INTERVAL_MS_DEFAULT : parseInt(e.target.value, 10);
            if (Number.isFinite(v)) setPollIntervalMs(Math.max(POLL_INTERVAL_MS_MIN, Math.min(POLL_INTERVAL_MS_MAX, v)));
          }}
          onBlur={() => savePollInterval(pollIntervalMs)}
          style={{ width: '100%', marginBottom: 12, padding: '6px 8px', boxSizing: 'border-box' }}
        />
        <button
          type="button"
          onClick={toggleConnection}
          disabled={connecting && !error}
          style={{
            width: '100%',
            padding: 10,
            backgroundColor: connected ? '#059669' : error ? '#b91c1c' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: connecting && !error ? 'wait' : 'pointer',
            fontWeight: 600,
          }}
        >
          {connecting && !error
            ? 'Подключение…'
            : connected
              ? 'Отключиться'
              : error
                ? 'Остановить переподключение'
                : 'Подключиться'}
        </button>
        {error && (
          <p style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>
            {error}
            <span style={{ display: 'block', color: '#64748b', marginTop: 4 }}>
              Автопереподключение каждые {AUTO_RECONNECT_INTERVAL_MS / 1000} с. Нажмите «Остановить переподключение», чтобы отключить.
            </span>
          </p>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={debugClicks}
            onChange={(e) => setDebugClicks(e.target.checked)}
          />
          Отладка кликов (в консоль F12)
        </label>
        {connected && configJsonString != null && (
          <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
            <button
              type="button"
              onClick={() => setShowConfigJson((v) => !v)}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 12,
                textAlign: 'left',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                background: '#f9fafb',
                cursor: 'pointer',
              }}
            >
              {showConfigJson ? '▼ Скрыть' : '▶ Показать'} принятый JSON
            </button>
            {showConfigJson && (
              <pre
                style={{
                  marginTop: 8,
                  padding: 8,
                  fontSize: 11,
                  fontFamily: 'ui-monospace, monospace',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: 4,
                  maxHeight: 280,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {configJsonString}
              </pre>
            )}
          </div>
        )}
      </div>

      <button
        className="mobile-toggle mobile-toggle-left"
        onClick={() => setShowLeftPanel((prev) => !prev)}
        aria-label="Панель"
      >
        ☰
      </button>

      <div
        className="canvas-container"
        style={{
          marginLeft: !isMobile && showLeftPanel ? SIDEBAR_WIDTH + CANVAS_PANEL_GAP : 0,
          transition: 'margin 0.2s ease',
        }}
        onPointerDownCapture={handleCanvasContainerPointerDown}
      >
        <div className="tabs-bar">
          {tabIds.length > 0 && (
            <select
              className="tabs-select"
              value={activeTabId}
              onChange={(e) => setActiveTabIndex(tabIds.indexOf(e.target.value))}
            >
              {tabIds.map((tid, i) => (
                <option key={tid} value={tid}>
                  {tabNames[i] ?? `Вкладка ${i + 1}`}
                </option>
              ))}
            </select>
          )}
          {connected && (
            <span className="sound-indicator" style={{ marginLeft: 12, fontSize: 12, color: '#64748b' }} title="sound_enabled (Byte): 0=выкл, 1=уведомление, 2=тревога">
              Звук: {soundType === 0 ? 'выкл' : soundType === 1 ? 'уведомление' : 'тревога'}
            </span>
          )}
        </div>
        {connected && uiMessage !== '' && (
          <div
            className="ui-message-bar"
            style={{
              marginTop: 8,
              marginBottom: 8,
              padding: '8px 12px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              fontSize: 14,
              color: '#334155',
            }}
          >
            {uiMessage}
          </div>
        )}
        <div style={{ width: displayWidth, flexShrink: 0 }}>
          <div
            className="canvas-inner"
            style={{
              position: 'relative',
              width: displayWidth,
              height: displayHeight,
              minWidth: displayWidth,
              minHeight: displayHeight,
              backgroundColor: canvasColor,
              border: '3px solid #475569',
              boxSizing: 'border-box',
              boxShadow: '0 0 0 1px #334155, 0 8px 24px rgba(0,0,0,0.18)',
              borderRadius: 6,
              pointerEvents: 'auto',
            }}
          >
            <Stage
              ref={stageRef}
              width={displayWidth}
              height={displayHeight}
              style={{ display: 'block' }}
              onPointerDown={handleStagePointerDown}
              onTouchStart={handleStagePointerDown as any}
              onPointerMove={handleStagePointerMove}
              onPointerUp={handleStagePointerUp}
            >
              <Layer listening={true}>
                <Group
                  scaleX={scale}
                  scaleY={scale}
                  listening={connected}
                  opacity={connected ? 1 : 0.45}
                >
                  {visibleWidgets.map((w) => {
                    const stateIdx = w.stateIndex >= 0 ? (w.responseStateIndex ?? w.stateIndex) : -1;
                    const rawVal = stateIdx >= 0 ? getStateValueByIndex(state, stateIdx) : undefined;
                    let displayText = displayValue(w, rawVal, w.text ?? '');
                    if (w.type === 'slider') {
                      if (localSliderValues[w.id] !== undefined) displayText = String(Math.round(localSliderValues[w.id]));
                      else if (sliderRevertOverrides[w.id] !== undefined) displayText = sliderRevertOverrides[w.id];
                    } else if (w.type === 'switch') {
                      if (switchDisplayOverrides[w.id] !== undefined) displayText = switchDisplayOverrides[w.id];
                      else if (switchRevertOverrides[w.id] !== undefined) displayText = switchRevertOverrides[w.id];
                    }
                    return (
                      <ViewerWidget
                        key={w.id}
                        widget={w}
                        displayText={displayText}
                        canvasBgColor={canvasColor}
                        onSetVar={connected ? handleSetVar : undefined}
                        onInputEditRequest={
                          connected
                            ? ({ widget, displayText, varNameForSet }) => {
                                setEditingInput({
                                  id: widget.id,
                                  varNameOut: varNameForSet,
                                  x: widget.x,
                                  y: widget.y,
                                  width: widget.width,
                                  height: widget.height,
                                  value: displayText ?? '',
                                });
                              }
                            : undefined
                        }
                      />
                    );
                  })}
                </Group>
              </Layer>
            </Stage>
            {editingInput && (
              <div
                style={{
                  position: 'absolute',
                  left: editingInput.x * scale,
                  top: editingInput.y * scale,
                  width: editingInput.width * scale,
                  height: editingInput.height * scale,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'auto',
                }}
              >
                <input
                  autoFocus
                  value={editingInput.value}
                  onChange={(e) =>
                    setEditingInput((current) =>
                      current ? { ...current, value: e.target.value } : current
                    )
                  }
                  onBlur={() => commitEditingInput(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitEditingInput(true);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      commitEditingInput(false);
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    borderRadius: 2,
                    border: '1px solid #3b82f6',
                    padding: '2px 4px',
                    fontSize: Math.max(10, 0.65 * editingInput.height * scale),
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
