import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Circle, Group, Layer as KonvaLayer, Rect, Stage as KonvaStage, Text } from 'react-konva';
import Konva from 'konva';
import { contrastColor } from './contrastColor';
import { parseConfig } from './configParser';

import { getStateValueByIndex, getSoundEnabled, getUiMessage, displayValue, type StatePayload } from './stateMap';
import { useViewportSize } from './useViewportSize';
import { playNotificationOnce, startAlarmLoop, stopAlarm, isAlarmPlaying } from './soundPlayer';
import { deviceFetch } from './deviceHttp';
import type { RuntimeWidget } from './types';
import './App.css';

const MOBILE_BREAKPOINT = 768;
const SIDEBAR_WIDTH = 220;

/** Дата сборки (REACT_APP_BUILD_DATE при сборке, иначе текущая дата в dev). */
const BUILD_DATE = (() => {
  const s = typeof process !== 'undefined' ? process.env?.REACT_APP_BUILD_DATE : undefined;
  if (s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : s;
  }
  return new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
})();
const CANVAS_PANEL_GAP = 28;
/** Отступ слева, когда левая панель скрыта, чтобы канва не заезжала на кнопку «☰». */
const LEFT_TOGGLE_OFFSET = 48;
const POLL_INTERVAL_MS_DEFAULT = 500;
const POLL_INTERVAL_MS_MIN = 100;
const POLL_INTERVAL_MS_MAX = 30000;
/** Таймаут /state: иначе запрос висит, пока МК занят другой вкладкой, и блокирует очередь. */
const STATE_POLL_TIMEOUT_MS = 8000;
/** Таймаут /config при подключении: иначе "Подключение" может висеть бесконечно. */
const CONNECT_CONFIG_TIMEOUT_MS = 8000;
/** Столько подряд неудачных опросов — только тогда «потеря связи» (одна занятая вкладка не рвёт сессию). */
const STATE_POLL_FAILS_BEFORE_DISCONNECT = 12;
const STORAGE_KEY_ADDRESS = 'flprog_viewer_address';
const STORAGE_KEY_POLL_INTERVAL = 'flprog_viewer_poll_interval';
const STORAGE_KEY_SCAN_SETTINGS = 'flprog_viewer_scan_settings';

/** Адрес эмулятора по умолчанию (npm run simulator) */
const DEFAULT_EMULATOR_HOST = 'localhost';
const DEFAULT_EMULATOR_PORT = '31337';
/** Порт info-страницы на МК (ссылки/справка). По нему делаем "поиск МК". */
const DEVICE_INFO_PORT = 80;

type ScanResult = { host: string; infoPort: number; apiPort?: number; title?: string };

const SCAN_CONCURRENCY_DEFAULT = 16;
const SCAN_CONCURRENCY_MIN = 1;
const SCAN_CONCURRENCY_MAX = 64;
const SCAN_TIMEOUT_MS_DEFAULT = 1000;
const SCAN_TIMEOUT_MS_MIN = 50;
const SCAN_TIMEOUT_MS_MAX = 10000;

type ScanSettings = {
  prefix: string;
  from: number;
  to: number;
  concurrency: number;
  timeoutMs: number;
};

type MkErrorKind = 'alarm' | 'notify' | 'message';
type MkErrorLogItem = {
  at: number; // client timestamp (ms)
  kind: MkErrorKind;
  soundEnabled: 0 | 1 | 2;
  message: string;
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function loadSavedAddress(): { ip: string; port: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ADDRESS);
    if (!raw) return { ip: DEFAULT_EMULATOR_HOST, port: DEFAULT_EMULATOR_PORT };
    const parsed = JSON.parse(raw);
    return {
      ip: typeof parsed?.ip === 'string' ? parsed.ip : DEFAULT_EMULATOR_HOST,
      port: typeof parsed?.port === 'string' ? parsed.port : DEFAULT_EMULATOR_PORT,
    };
  } catch {
    return { ip: DEFAULT_EMULATOR_HOST, port: DEFAULT_EMULATOR_PORT };
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

function loadSavedScanSettings(): ScanSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SCAN_SETTINGS);
    // По умолчанию начинаем с .2: .1 обычно шлюз/роутер и даёт CORS/404-шум в консоли.
    if (!raw) return { prefix: '', from: 2, to: 254, concurrency: SCAN_CONCURRENCY_DEFAULT, timeoutMs: SCAN_TIMEOUT_MS_DEFAULT };
    const parsed = JSON.parse(raw);
    const prefix = typeof parsed?.prefix === 'string' ? parsed.prefix : '';
    const from = Number.isFinite(parsed?.from) ? Number(parsed.from) : 1;
    const to = Number.isFinite(parsed?.to) ? Number(parsed.to) : 254;
    const concurrencyRaw = Number.isFinite(parsed?.concurrency) ? Number(parsed.concurrency) : SCAN_CONCURRENCY_DEFAULT;
    const timeoutRaw = Number.isFinite(parsed?.timeoutMs) ? Number(parsed.timeoutMs) : SCAN_TIMEOUT_MS_DEFAULT;
    return {
      prefix,
      from: Math.max(0, Math.min(255, Math.trunc(from))),
      to: Math.max(0, Math.min(255, Math.trunc(to))),
      concurrency: Math.max(SCAN_CONCURRENCY_MIN, Math.min(SCAN_CONCURRENCY_MAX, Math.trunc(concurrencyRaw))),
      timeoutMs: Math.max(SCAN_TIMEOUT_MS_MIN, Math.min(SCAN_TIMEOUT_MS_MAX, Math.trunc(timeoutRaw))),
    };
  } catch {
    return { prefix: '', from: 2, to: 254, concurrency: SCAN_CONCURRENCY_DEFAULT, timeoutMs: SCAN_TIMEOUT_MS_DEFAULT };
  }
}

function saveScanSettings(prefix: string, from: number, to: number, concurrency: number, timeoutMs: number) {
  try {
    localStorage.setItem(STORAGE_KEY_SCAN_SETTINGS, JSON.stringify({ prefix, from, to, concurrency, timeoutMs }));
  } catch {
    // ignore
  }
}

function guessIpv4Prefix(hostOrIp: string): string {
  const m = /^\s*(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}\s*$/.exec(hostOrIp);
  if (!m) return '';
  const a = Number(m[1]), b = Number(m[2]), c = Number(m[3]);
  if ([a, b, c].some((x) => !Number.isFinite(x) || x < 0 || x > 255)) return '';
  return `${a}.${b}.${c}`;
}

async function fetchTextWithTimeout(url: string, timeoutMs: number): Promise<string> {
  const ac = new AbortController();
  const timer = window.setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ac.signal, headers: { Connection: 'close' } as any });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    window.clearTimeout(timer);
  }
}

function parseDeviceInfoHtml(html: string): { apiPort?: number; title?: string } | null {
  // Страница генерируется в src/generator.ts (buildDeviceRootHtml). Используем несколько сигнатур.
  const looksLikeFlprog =
    /ESP32 Web UI\s*\(Flprog_Ethernet\)/i.test(html) ||
    /Flprog Web UI/i.test(html) ||
    /вьювер подключайте к/i.test(html) ||
    /apiP\s*=\s*['"]\d+['"]/i.test(html);
  if (!looksLikeFlprog) return null;

  const title = (/<title>([^<]{1,200})<\/title>/i.exec(html)?.[1] ?? '').trim() || undefined;

  // Внутри скрипта: var apiP = '8080';
  const apiPortFromScript = /apiP\s*=\s*['"](\d{2,5})['"]/i.exec(html)?.[1];
  // В тексте: "вьювер подключайте к :8080"
  const apiPortFromText = /вьювер подключайте к\s*<code>:(\d{2,5})<\/code>/i.exec(html)?.[1];
  const apiPortStr = apiPortFromScript ?? apiPortFromText;
  const apiPort = apiPortStr ? Number(apiPortStr) : undefined;
  const apiPortValid = apiPort != null && Number.isFinite(apiPort) && apiPort > 0 && apiPort <= 65535 ? apiPort : undefined;
  return { apiPort: apiPortValid, title };
}

function isPingResponse(text: string): boolean {
  // Генератор прошивки (src/generator.ts) отдаёт "ESP32-WEBUI" в /ping.
  return /ESP32-WEBUI/i.test(text) || /FLPROG/i.test(text);
}

/** Читает из URL параметры ?host=...&port=...&connect=1 для встраивания в редактор. */
function getUrlParams(): { host?: string; port?: string; connect: boolean } {
  if (typeof window === 'undefined' || !window.location.search) return { connect: false };
  const p = new URLSearchParams(window.location.search);
  const host = p.get('host')?.trim();
  const port = p.get('port')?.trim();
  const connect = p.get('connect') === '1' || p.get('connect')?.toLowerCase() === 'true';
  return { host: host || undefined, port: port || undefined, connect };
}

/** Разбирает поле IP: допускается "host", "host:port" или полный URL (http://host:port, https://host). */
function parseHostPort(ipVal: string, portVal: string): { host: string; port: string; scheme: 'http' | 'https' } {
  const trimmed = ipVal.trim();
  const fallbackPort = portVal.trim() || DEFAULT_EMULATOR_PORT;
  if (!trimmed) return { host: DEFAULT_EMULATOR_HOST, port: fallbackPort, scheme: 'http' };
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const port = url.port || (url.protocol === 'https:' ? '443' : '80');
      const scheme = url.protocol === 'https:' ? 'https' : 'http';
      return { host: url.hostname, port, scheme };
    } catch {
      // невалидный URL — продолжаем как обычный host[:port]
    }
  }
  const lastColon = trimmed.lastIndexOf(':');
  if (lastColon > 0) {
    const host = trimmed.slice(0, lastColon);
    const portPart = trimmed.slice(lastColon + 1).trim();
    return { host, port: portPart || fallbackPort, scheme: 'http' };
  }
  return { host: trimmed, port: fallbackPort, scheme: 'http' };
}

const Stage = KonvaStage as React.ComponentType<any>;
const Layer = (props: any) => <KonvaLayer {...props}>{props.children}</KonvaLayer>;

function ViewerWidget({
  widget,
  displayText,
  canvasBgColor,
  onSetVar,
  onInputClick,
  isSwitchPendingAck,
}: {
  widget: RuntimeWidget;
  displayText: string;
  canvasBgColor: string;
  onSetVar?: (varName: string, value: string, opts?: { widgetId: string; previousValue: string }) => void;
  onInputClick?: (widget: RuntimeWidget, currentValue: string) => void;
  isSwitchPendingAck?: boolean;
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

  const lastSetVarRef = useRef<{ key: string; at: number } | null>(null);
  const CLICK_DEBOUNCE_MS = 400;
  const handleClick = useCallback(() => {
    if ((widget.type !== 'button' && widget.type !== 'switch') || !onSetVar) return;
    const next = displayText === '1' ? '0' : '1';
    const key = `${varNameForSet}=${next}`;
    const now = Date.now();
    if (lastSetVarRef.current?.key === key && now - lastSetVarRef.current.at < CLICK_DEBOUNCE_MS) return;
    lastSetVarRef.current = { key, at: now };
    if (widget.type === 'switch') {
      onSetVar(varNameForSet, next, { widgetId: widget.id, previousValue: displayText });
    } else {
      onSetVar(varNameForSet, next);
    }
  }, [widget.type, widget.id, displayText, onSetVar, varNameForSet]);

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

  const isClickable = widget.type === 'button' || widget.type === 'switch' || (widget.type === 'input' && !!onInputClick);
  const isButton = widget.type === 'button';
  const handleInputClick = useCallback(() => {
    if (widget.type === 'input' && onInputClick) onInputClick(widget, displayText);
  }, [widget, displayText, onInputClick]);

  return (
    <Group
      x={widget.x}
      y={widget.y}
      ref={shapeRef}
      onClick={!isButton && isClickable ? (widget.type === 'input' ? handleInputClick : handleClick) : undefined}
      onTap={!isButton && isClickable ? (widget.type === 'input' ? handleInputClick : handleClick) : undefined}
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
          opacity={widget.type === 'switch' && isSwitchPendingAck ? 0.55 : 1}
          stroke={
            widget.type === 'input' ? '#ddd' : widget.type === 'switch' && isSwitchPendingAck ? '#f59e0b' : undefined
          }
          strokeWidth={widget.type === 'input' ? 1 : widget.type === 'switch' && isSwitchPendingAck ? 2 : 0}
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
          opacity={isSwitchPendingAck ? 0.65 : 1}
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

  const urlParamsRef = useRef(getUrlParams());
  const saved = loadSavedAddress();
  const [ip, setIp] = useState(() => urlParamsRef.current.host ?? saved.ip);
  const [port, setPort] = useState(() => urlParamsRef.current.port ?? saved.port);
  const [pollIntervalMs, setPollIntervalMs] = useState(() => loadSavedPollInterval());
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [autoReconnect, setAutoReconnect] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null);
  const baseUrlRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectAbortRef = useRef<AbortController | null>(null);

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
  const [showHelp, setShowHelp] = useState(false);
  const [debugClicks, setDebugClicks] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [draggingSliderId, setDraggingSliderId] = useState<string | null>(null);
  const [localSliderValues, setLocalSliderValues] = useState<Record<string, number>>({});
  const [sliderRevertOverrides, setSliderRevertOverrides] = useState<Record<string, string>>({});
  const pendingSliderRef = useRef<{ id: string; value: string; previousValue: string; varNameOut: string; timeoutId: ReturnType<typeof setTimeout> } | null>(null);
  const sliderDragStartRef = useRef<{ previousValue: string } | null>(null);
  const SLIDER_RESPONSE_WAIT_MS = 2000;

  const [switchDisplayOverrides, setSwitchDisplayOverrides] = useState<Record<string, string>>({});
  const [switchRevertOverrides, setSwitchRevertOverrides] = useState<Record<string, string>>({});
  const pendingSwitchRef = useRef<{ id: string; value: string; previousValue: string; timeoutId: ReturnType<typeof setTimeout> } | null>(null);
  const SWITCH_RESPONSE_WAIT_MS = 2000;

  const [focusedInputWidget, setFocusedInputWidget] = useState<RuntimeWidget | null>(null);
  const [inputOverlayValue, setInputOverlayValue] = useState('');

  const prevUiMessageRef = useRef<string>('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowDebugPanel((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const [soundOffForCurrentMessage, setSoundOffForCurrentMessage] = useState(false);
  const [messageClearedByUser, setMessageClearedByUser] = useState(false);
  const [tabPickerOpen, setTabPickerOpen] = useState(false);
  const tabPickerRef = useRef<HTMLDivElement>(null);
  const tabPickerTriggerRef = useRef<HTMLButtonElement>(null);
  const tabPickerDropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  // Журнал сообщений/ошибок, приходящих от МК (по ui_message + sound_enabled).
  const [mkErrorHistory, setMkErrorHistory] = useState<MkErrorLogItem[]>([]);
  const [mkErrorLastAt, setMkErrorLastAt] = useState<number | null>(null);
  const [mkErrorLogOpen, setMkErrorLogOpen] = useState(false);

  // Поиск МК (сканирование по HTTP на info-порту).
  const savedScan = useRef(loadSavedScanSettings());
  const [scanOpen, setScanOpen] = useState(false);
  const [scanPrefix, setScanPrefix] = useState(() =>
    savedScan.current.prefix ||
    guessIpv4Prefix(saved.ip) ||
    guessIpv4Prefix(urlParamsRef.current.host ?? '') ||
    ''
  );
  const [scanFrom, setScanFrom] = useState(() => savedScan.current.from);
  const [scanTo, setScanTo] = useState(() => savedScan.current.to);
  const [scanConcurrency, setScanConcurrency] = useState(() => savedScan.current.concurrency);
  const [scanTimeoutMs, setScanTimeoutMs] = useState(() => savedScan.current.timeoutMs);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scanAbortRef = useRef<AbortController | null>(null);

  useLayoutEffect(() => {
    if (!tabPickerOpen || !tabPickerTriggerRef.current) {
      setDropdownPosition(null);
      return;
    }
    const rect = tabPickerTriggerRef.current.getBoundingClientRect();
    setDropdownPosition({ top: rect.bottom, left: rect.left, width: rect.width });
  }, [tabPickerOpen]);

  useEffect(() => {
    if (!tabPickerOpen) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !tabPickerRef.current?.contains(target) &&
        !tabPickerDropdownRef.current?.contains(target)
      ) setTabPickerOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [tabPickerOpen]);

  const RECONNECT_DELAY_MS = 3000;

  const disconnect = useCallback(() => {
    stopAlarm();
    connectAbortRef.current?.abort();
    connectAbortRef.current = null;
    setAutoReconnect(false);
    setConnected(false);
    setConnecting(false);
    setError(null);
    setReconnectCountdown(null);
    setFocusedInputWidget(null);
    setInputOverlayValue('');
    prevUiMessageRef.current = '';
    setMkErrorHistory([]);
    setMkErrorLastAt(null);
    setMkErrorLogOpen(false);
    baseUrlRef.current = null;
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setReconnectCountdown(null);
    setConnecting(true);
    setConfigJsonString(null);
    const { host, port: p, scheme } = parseHostPort(ip, port);
    const base = `${scheme}://${host}:${p}`;
    baseUrlRef.current = base;
    try {
      connectAbortRef.current?.abort();
      const ac = new AbortController();
      connectAbortRef.current = ac;
      const timer = window.setTimeout(() => ac.abort(), CONNECT_CONFIG_TIMEOUT_MS);
      const res = await deviceFetch(`${base}/config`, { signal: ac.signal });
      window.clearTimeout(timer);
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
      connectAbortRef.current = null;
      saveAddress(host, p);
      if (ip !== host || port !== p) {
        setIp(host);
        setPort(p);
      }
    } catch (e: any) {
      const isAbort = e?.name === 'AbortError';
      setError(isAbort ? `Таймаут подключения (${CONNECT_CONFIG_TIMEOUT_MS} мс)` : (e?.message || 'Не удалось подключиться'));
      setConnecting(false);
      setConnected(false);
      connectAbortRef.current = null;
    }
  }, [ip, port]);

  const connectToFoundDevice = useCallback(async (host: string, apiPort?: number) => {
    setScanOpen(false);
    scanAbortRef.current?.abort();
    scanAbortRef.current = null;
    setScanning(false);

    setAutoReconnect(true);
    setError(null);
    setReconnectCountdown(null);
    setConnecting(true);
    setConfigJsonString(null);

    // Если API-порт не известен (на :80 есть только /ping), пробуем несколько типовых портов.
    const portsToTry = Array.from(
      new Set([apiPort, 8080, 80, 8000, 3000].filter((x): x is number => typeof x === 'number' && Number.isFinite(x)))
    );
    if (portsToTry.length === 0) portsToTry.push(8080);

    for (const pNum of portsToTry) {
      const p = String(pNum);
      const base = `http://${host}:${p}`;
      baseUrlRef.current = base;
      try {
        connectAbortRef.current?.abort();
        const ac = new AbortController();
        connectAbortRef.current = ac;
        const timer = window.setTimeout(() => ac.abort(), CONNECT_CONFIG_TIMEOUT_MS);
        const res = await deviceFetch(`${base}/config`, { signal: ac.signal });
        window.clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        setConfigJsonString(text);
        const raw = JSON.parse(text);
        const parsed = parseConfig(raw);
        if (!parsed) throw new Error('Неверный формат /config');
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
        connectAbortRef.current = null;

        setIp(host);
        setPort(p);
        saveAddress(host, p);
        return;
      } catch {
        // пробуем следующий порт
      }
    }

    setError('Не найден API: /config недоступен (пробовал 8080/80/8000/3000).');
    setConnecting(false);
    setConnected(false);
    connectAbortRef.current = null;
  }, []);

  const startScan = useCallback(async () => {
    setScanError(null);
    setScanResults([]);
    const prefix = scanPrefix.trim();
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(prefix)) {
      setScanError('Укажите префикс подсети в формате 192.168.1');
      return;
    }
    const parts = prefix.split('.').map((x) => Number(x));
    if (parts.some((x) => !Number.isFinite(x) || x < 0 || x > 255)) {
      setScanError('Неверный префикс подсети');
      return;
    }

    const from = Math.max(0, Math.min(255, Math.trunc(scanFrom)));
    const to = Math.max(0, Math.min(255, Math.trunc(scanTo)));
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const concurrency = Math.max(SCAN_CONCURRENCY_MIN, Math.min(SCAN_CONCURRENCY_MAX, Math.trunc(scanConcurrency)));
    const timeoutMs = Math.max(SCAN_TIMEOUT_MS_MIN, Math.min(SCAN_TIMEOUT_MS_MAX, Math.trunc(scanTimeoutMs)));
    saveScanSettings(prefix, lo, hi, concurrency, timeoutMs);
    if (scanConcurrency !== concurrency) setScanConcurrency(concurrency);
    if (scanTimeoutMs !== timeoutMs) setScanTimeoutMs(timeoutMs);

    scanAbortRef.current?.abort();
    const ac = new AbortController();
    scanAbortRef.current = ac;
    setScanning(true);
    try {
      const candidates: number[] = [];
      for (let i = lo; i <= hi; i++) candidates.push(i);

      const CONCURRENCY = concurrency;
      const TIMEOUT_MS = timeoutMs;
      let idx = 0;
      const found: ScanResult[] = [];

      const worker = async () => {
        while (idx < candidates.length && !ac.signal.aborted) {
          const last = candidates[idx++];
          const host = `${prefix}.${last}`;
          try {
            const pingText = await fetchTextWithTimeout(`http://${host}:${DEVICE_INFO_PORT}/ping`, TIMEOUT_MS);
            if (!isPingResponse(pingText)) continue;

            // Пинг есть — устройство "похоже на Flprog". Дополнительное чтение "/" часто упирается в CORS
            // (роутеры/камеры/чужие веб-морды), поэтому не трогаем "/" и не засоряем консоль ошибками.
            found.push({ host, infoPort: DEVICE_INFO_PORT });
            setScanResults([...found].sort((a, b) => a.host.localeCompare(b.host, 'en')));
          } catch {
            // ignore
          }
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
      setScanResults([...found].sort((a, b) => a.host.localeCompare(b.host, 'en')));
    } finally {
      setScanning(false);
      if (scanAbortRef.current === ac) scanAbortRef.current = null;
    }
  }, [scanPrefix, scanFrom, scanTo]);

  const stopScan = useCallback(() => {
    scanAbortRef.current?.abort();
    scanAbortRef.current = null;
    setScanning(false);
  }, []);

  const toggleConnection = useCallback(() => {
    if (autoReconnect) {
      disconnect();
    } else if (!connecting) {
      setAutoReconnect(true);
      connect();
    }
  }, [autoReconnect, connecting, connect, disconnect]);

  const didAutoConnectRef = useRef(false);
  useEffect(() => {
    if (didAutoConnectRef.current || !urlParamsRef.current.connect) return;
    didAutoConnectRef.current = true;
    // Автоподключение по connect=1 должно быть одноразовым: после первого срабатывания
    // убираем connect из URL, чтобы Ctrl+F5/перезагрузка не вызывали повторный автоконнект.
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete('connect');
      window.history.replaceState(null, document.title, u.toString());
    } catch {
      // ignore
    }
    connect();
  }, [connect]);

  const pollInFlightRef = useRef(false);
  const pollFailStreakRef = useRef(0);
  useEffect(() => {
    if (!connected || !baseUrlRef.current) return;
    pollFailStreakRef.current = 0;
    const base = baseUrlRef.current;
    const interval = Math.max(POLL_INTERVAL_MS_MIN, Math.min(POLL_INTERVAL_MS_MAX, pollIntervalMs));
    const dropConnection = () => {
      stopAlarm();
      setError('Соединение потеряно');
      setConnected(false);
    };
    const poll = async () => {
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;
      const ac = new AbortController();
      const timer = window.setTimeout(() => ac.abort(), STATE_POLL_TIMEOUT_MS);
      try {
        const res = await deviceFetch(`${base}/state?fmt=short`, { signal: ac.signal });
        window.clearTimeout(timer);
        if (!res.ok) {
          pollFailStreakRef.current += 1;
          if (pollFailStreakRef.current >= STATE_POLL_FAILS_BEFORE_DISCONNECT) dropConnection();
          return;
        }
        const data = await res.json();
        pollFailStreakRef.current = 0;
        setState(data);
      } catch {
        window.clearTimeout(timer);
        pollFailStreakRef.current += 1;
        if (pollFailStreakRef.current >= STATE_POLL_FAILS_BEFORE_DISCONNECT) dropConnection();
      } finally {
        pollInFlightRef.current = false;
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
    if (!autoReconnect || connected || connecting) return;
    const seconds = Math.ceil(RECONNECT_DELAY_MS / 1000);
    setReconnectCountdown(seconds);
    let remaining = seconds;
    const id = setInterval(() => {
      remaining -= 1;
      setReconnectCountdown(remaining <= 0 ? null : remaining);
      if (remaining <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        connect();
      }
    }, 1000);
    countdownIntervalRef.current = id;
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setReconnectCountdown(null);
    };
  }, [autoReconnect, connected, connecting, connect]);

  const setVar = useCallback(async (varName: string, value: string) => {
    const base = baseUrlRef.current;
    if (!base) return;
    try {
      await deviceFetch(`${base}/set?var=${encodeURIComponent(varName)}&value=${encodeURIComponent(value)}`);
    } catch {
      // ignore
    }
  }, []);

  type SetVarOpts = { widgetId: string; previousValue: string };
  const handleSetVar = useCallback((varName: string, value: string, opts?: SetVarOpts) => {
    if (opts?.widgetId != null) {
      const widgetId = opts.widgetId;
      const previousValue = opts.previousValue;
      setSwitchDisplayOverrides((prev) => ({ ...prev, [widgetId]: value }));
      setVar(varName, value);
      // Для switch показываем оптимистичное значение, но если за 1 секунду не увидим подтверждение из /state
      // — возвращаемся к значению из последнего опроса.
      if (pendingSwitchRef.current) clearTimeout(pendingSwitchRef.current.timeoutId);
      const timeoutId = setTimeout(() => {
        if (pendingSwitchRef.current?.id === widgetId) {
          pendingSwitchRef.current = null;
          setSwitchDisplayOverrides((prev) => {
            const next = { ...prev };
            delete next[widgetId];
            return next;
          });
          setSwitchRevertOverrides((prev) => {
            const next = { ...prev };
            delete next[widgetId];
            return next;
          });
        }
      }, SWITCH_RESPONSE_WAIT_MS);
      pendingSwitchRef.current = { id: widgetId, value, previousValue, timeoutId };
    } else {
      setVar(varName, value);
    }
  }, [setVar]);

  const activeTabId = tabIds[activeTabIndex] ?? tabIds[0];
  const visibleWidgets = widgets.filter((w) => w.tabId === activeTabId);
  const soundEnabled = connected ? getSoundEnabled(state) : 0;

  const MESSAGE_BAR_HEIGHT = 44;
  const mkUiMessage = connected ? getUiMessage(state) : '';
  const mkCurrentMessage = connected && !messageClearedByUser ? (mkUiMessage || '—') : '—';
  const mkCurrentTimeLabel =
    mkCurrentMessage !== '—' && mkErrorLastAt != null && connected && !messageClearedByUser
      ? formatTime(mkErrorLastAt)
      : null;
  const sidebarOffset = !isMobile && showLeftPanel ? SIDEBAR_WIDTH + CANVAS_PANEL_GAP : LEFT_TOGGLE_OFFSET;
  const availableW = isMobile ? Math.max(100, viewportW - 2) : Math.max(100, viewportW - sidebarOffset - 40);
  const availableH = Math.max(100, viewportH - 67);
  const baseScale = canvasWidth > 0 && canvasHeight > 0
    ? (isMobile ? availableW / canvasWidth : Math.min(availableW / canvasWidth, availableH / canvasHeight))
    : 1;
  const scale = baseScale;
  const displayWidth = Math.round(canvasWidth * scale);
  const displayHeight = Math.round(canvasHeight * scale);
  const CANVAS_BORDER = 3;
  const stageDisplayHeight = displayHeight - MESSAGE_BAR_HEIGHT - CANVAS_BORDER * 2;

  /** Вкладки в ряд над канвой для ПК/планшета (16:9, 4:3); для мобильного (9:16) — выпадающий список */
  const canvasRatio = canvasWidth > 0 && canvasHeight > 0 ? canvasWidth / canvasHeight : 0;
  const isPcOrTablet = Math.abs(canvasRatio - 16 / 9) < 0.02 || Math.abs(canvasRatio - 4 / 3) < 0.02;

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
        // Для slider отображаемое/подтверждаемое значение берём из *_out (out-слот).
        const sliderStateIdx = hitSlider.stateIndex;
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
        // UI fallback: не отправляем обратно на МК, иначе можно получить обратный "дерг".
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
    // Для slider подтверждение берём из *_out (out-слот), иначе UI может откатиться
    // когда устройство реально меняет другой слот.
    const raw = getStateValueByIndex(state, w.stateIndex);
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
    const toSwitchStr = (raw: StatePayload | undefined): string => {
      if (raw === undefined) return '';
      if (typeof raw === 'boolean') return raw ? '1' : '0';
      if (typeof raw === 'number') return raw !== 0 ? '1' : '0';
      return String(raw).toLowerCase() === 'true' || String(raw) === '1' ? '1' : '0';
    };

    // Для switch отображаемое значение берём из *_out (stateIndex), поэтому подтверждение
    // считаем полученным, когда совпал именно out-слот.
    const outIdx = w.stateIndex;
    const outRaw = getStateValueByIndex(state, outIdx);
    const currentOutStr = toSwitchStr(outRaw);

    if (currentOutStr !== value) return;

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
  }, [state, widgets]);

  // Звук: сравниваем сообщение (ui_message); если изменилось — включаем звук в соответствии с sound_enabled (2 = авария, 1 = уведомление). Аларм имеет приоритет.
  useEffect(() => {
    if (!connected) return;
    const uiMessage = getUiMessage(state);
    const soundEnabled = getSoundEnabled(state);
    if (uiMessage !== prevUiMessageRef.current) {
      const at = Date.now();
      const trimmed = uiMessage.trim();
      setSoundOffForCurrentMessage(false);
      setMessageClearedByUser(false);
      prevUiMessageRef.current = uiMessage;
      // Логируем только непустые сообщения от МК, чтобы журнал не был мусором.
      if (trimmed) {
        const kind: MkErrorKind = soundEnabled === 2 ? 'alarm' : soundEnabled === 1 ? 'notify' : 'message';
        setMkErrorLastAt(at);
        setMkErrorHistory((prev) => [{ at, kind, soundEnabled, message: uiMessage }, ...prev].slice(0, 10));
      }
    } else {
      return;
    }

    if (soundEnabled === 2) {
      startAlarmLoop();
      return;
    }
    if (soundEnabled === 1 && !isAlarmPlaying()) {
      playNotificationOnce();
    }
  }, [connected, state]);

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

  const handleInputWidgetClick = useCallback((widget: RuntimeWidget, currentValue: string) => {
    setFocusedInputWidget(widget);
    setInputOverlayValue(currentValue);
  }, []);

  const submitInputOverlay = useCallback(() => {
    if (!focusedInputWidget || !setVar) return;
    const varNameOut = `${focusedInputWidget.varName}_out`;
    setVar(varNameOut, inputOverlayValue);
    setFocusedInputWidget(null);
    setInputOverlayValue('');
  }, [focusedInputWidget, inputOverlayValue, setVar]);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Подключение</h3>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            title="Справка"
            style={{ padding: '4px 10px', fontSize: 14, fontWeight: 600, cursor: 'pointer', border: '1px solid #d1d5db', borderRadius: 4, background: '#f9fafb' }}
          >
            ?
          </button>
        </div>
        <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Адрес (IP или host:port)</label>
        <input
          type="text"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          onBlur={() => saveAddress(ip.trim() || DEFAULT_EMULATOR_HOST, port.trim() || DEFAULT_EMULATOR_PORT)}
          placeholder="localhost:31337, 192.168.1.1 или http://host:port"
          style={{ width: '100%', marginBottom: 10, padding: '6px 8px', boxSizing: 'border-box' }}
        />
        <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Порт (если не указан в адресе)</label>
        <input
          type="text"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          onBlur={() => saveAddress(ip.trim() || DEFAULT_EMULATOR_HOST, port.trim() || DEFAULT_EMULATOR_PORT)}
          placeholder="31337"
          style={{ width: '100%', marginBottom: 12, padding: '6px 8px', boxSizing: 'border-box' }}
        />
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          disabled={connecting || scanning}
          style={{
            width: '100%',
            padding: '8px 10px',
            marginBottom: 12,
            backgroundColor: '#0f766e',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: connecting || scanning ? 'wait' : 'pointer',
            fontWeight: 600,
          }}
          title={`Поиск устройств в сети (HTTP :${DEVICE_INFO_PORT})`}
        >
          Найти МК (порт {DEVICE_INFO_PORT})
        </button>
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
          disabled={false}
          style={{
            width: '100%',
            padding: 10,
            backgroundColor: autoReconnect ? '#059669' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: connecting ? 'wait' : 'pointer',
            fontWeight: 600,
          }}
        >
          {autoReconnect ? (connecting ? 'Отменить' : 'Отключиться') : 'Подключиться'}
        </button>
        {error != null && (
          <p style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>
            Ошибка подключения: {error}
          </p>
        )}
        {reconnectCountdown != null && reconnectCountdown > 0 && (
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Повтор через {reconnectCountdown} сек
          </p>
        )}
        {connected && (
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 10, lineHeight: 1.35 }}>
            Не открывайте в другой вкладке страницу <code style={{ fontSize: 10 }}>http://IP_МК/</code> — МК принимает одно соединение; опрос может подвисать.
          </p>
        )}
        {showDebugPanel ? (
          <>
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
          </>
        ) : (
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 12 }}>
            Ctrl+Alt+D — отладка
          </p>
        )}
        <p className="sidebar-left-build-date" style={{ marginTop: 'auto', paddingTop: 16, marginBottom: 0, fontSize: 11, color: '#9ca3af' }}>
          Flprog Web UI Client · Сборка: {BUILD_DATE}
        </p>
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
          marginLeft: isMobile ? 0 : (showLeftPanel ? SIDEBAR_WIDTH + CANVAS_PANEL_GAP : LEFT_TOGGLE_OFFSET),
          transition: 'margin 0.2s ease',
        }}
        onPointerDownCapture={handleCanvasContainerPointerDown}
      >
        <div
          className="tabs-bar"
          style={tabIds.length > 0 ? {
            ['--canvas-color' as string]: canvasColor,
            ['--tab-text' as string]: contrastColor(canvasColor),
          } : undefined}
        >
          {tabIds.length > 0 && (isPcOrTablet ? (
            <div className="tabs-row" role="tablist">
              {tabIds.map((tid, i) => (
                <button
                  key={tid}
                  type="button"
                  role="tab"
                  aria-selected={tid === activeTabId}
                  className={`tab-tab ${tid === activeTabId ? 'active' : ''}`}
                  onClick={() => setActiveTabIndex(i)}
                >
                  {tabNames[i] ?? `Вкладка ${i + 1}`}
                </button>
              ))}
            </div>
          ) : (
            <div className="tab-picker-wrap" ref={tabPickerRef}>
              <button
                ref={tabPickerTriggerRef}
                type="button"
                className="tabs-select tab-picker-trigger"
                onClick={() => setTabPickerOpen((v) => !v)}
                aria-expanded={tabPickerOpen}
                aria-haspopup="listbox"
              >
                {tabNames[tabIds.indexOf(activeTabId)] ?? tabNames[0] ?? 'Вкладка'}
              </button>
              {tabPickerOpen && dropdownPosition && createPortal(
                <div
                  ref={tabPickerDropdownRef}
                  className="tab-picker-dropdown tab-picker-dropdown-portal"
                  role="listbox"
                  style={{
                    position: 'fixed',
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    minWidth: dropdownPosition.width,
                    backgroundColor: canvasColor,
                    color: contrastColor(canvasColor),
                  }}
                >
                  {tabIds.map((tid, i) => (
                    <button
                      key={tid}
                      type="button"
                      role="option"
                      aria-selected={tid === activeTabId}
                      className={`tab-picker-option ${tid === activeTabId ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTabIndex(i);
                        setTabPickerOpen(false);
                      }}
                    >
                      {tabNames[i] ?? `Вкладка ${i + 1}`}
                    </button>
                  ))}
                </div>,
                document.body
              )}
            </div>
          ))}
        </div>
        <div className="canvas-wrapper" style={{ width: displayWidth, flexShrink: 0 }}>
          <div
            className="canvas-inner"
            style={{
              width: displayWidth,
              height: displayHeight,
              minWidth: displayWidth,
              minHeight: displayHeight,
              backgroundColor: canvasColor,
              border: '3px solid #475569',
              boxSizing: 'border-box',
              boxShadow: '0 0 0 1px #334155, 0 8px 24px rgba(0,0,0,0.18)',
              borderRadius: 6,
              pointerEvents: connected ? 'auto' : 'none',
              opacity: connected ? 1 : 0.5,
              transition: 'opacity 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ position: 'relative', width: displayWidth, height: stageDisplayHeight, flexShrink: 0 }}>
              <Stage
                ref={stageRef}
                width={displayWidth}
                height={stageDisplayHeight}
                style={{ display: 'block' }}
                onPointerDown={handleStagePointerDown}
                onTouchStart={handleStagePointerDown as any}
                onPointerMove={handleStagePointerMove}
                onPointerUp={handleStagePointerUp}
              >
                <Layer listening={true}>
                  <Group scaleX={scale} scaleY={scale} listening={true}>
                    {visibleWidgets.map((w) => {
                      // Для bidi-виджетов отображение/подтверждение берём из *_out (out-слот),
                      // чтобы UI не "отбрасывало назад", когда устройство обновляет другой слот.
                      const stateIdx =
                        w.stateIndex >= 0
                          ? (w.type === 'switch' || w.type === 'slider' || w.type === 'input')
                            ? w.stateIndex
                            : (w.responseStateIndex ?? w.stateIndex)
                          : -1;
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
                          onInputClick={connected ? handleInputWidgetClick : undefined}
                      isSwitchPendingAck={w.type === 'switch' ? pendingSwitchRef.current?.id === w.id : undefined}
                        />
                      );
                    })}
                  </Group>
                </Layer>
              </Stage>
              {focusedInputWidget && connected && (
                <input
                  type="text"
                  value={inputOverlayValue}
                  onChange={(e) => setInputOverlayValue(e.target.value)}
                  onBlur={submitInputOverlay}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  autoFocus
                  style={{
                    position: 'absolute',
                    left: focusedInputWidget.x * scale,
                    top: focusedInputWidget.y * scale,
                    width: focusedInputWidget.width * scale,
                    height: focusedInputWidget.height * scale,
                    margin: 0,
                    padding: '2px 6px',
                    boxSizing: 'border-box',
                    border: '1px solid #94a3b8',
                    borderRadius: 2,
                    fontSize: Math.max(10, Math.round(0.65 * 0.85 * focusedInputWidget.height * scale)),
                    outline: 'none',
                    pointerEvents: 'auto',
                  }}
                  aria-label="Поле ввода"
                />
              )}
            </div>
            <div
              style={{
                height: MESSAGE_BAR_HEIGHT,
                minHeight: MESSAGE_BAR_HEIGHT,
                position: 'relative',
                padding: '8px 10px',
                boxSizing: 'border-box',
                borderTop: '1px solid #64748b',
                backgroundColor: '#f8fafc',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                flexShrink: 0,
                borderBottomLeftRadius: 6,
                borderBottomRightRadius: 6,
              }}
            >
              <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                {mkCurrentMessage}
              </span>
              {mkCurrentTimeLabel && (
                <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{mkCurrentTimeLabel}</span>
              )}
              {(soundEnabled === 2 || isAlarmPlaying() || (connected && getUiMessage(state))) && (
                <button
                  type="button"
                  onClick={() => {
                    if (connected) {
                      setVar('alarm_reset', '1');
                    }
                    if (isAlarmPlaying() && !soundOffForCurrentMessage) {
                      stopAlarm();
                      setSoundOffForCurrentMessage(true);
                    } else {
                      setMessageClearedByUser(true);
                      setSoundOffForCurrentMessage(false);
                    }
                  }}
                  style={{
                    padding: 6,
                    color: '#fff',
                    backgroundColor: soundOffForCurrentMessage ? '#475569' : '#dc2626',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={soundOffForCurrentMessage ? 'Очистить сообщение' : 'Отключить звук'}
                >
                  {soundOffForCurrentMessage ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 6 22 18 22 18 15 22 15 22 9 18 9 13 5" />
                      <line x1="23" y1="9" x2="16" y2="16" />
                      <line x1="16" y1="9" x2="23" y2="16" />
                    </svg>
                  )}
                </button>
              )}

              {mkErrorHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMkErrorLogOpen((v) => !v)}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: '#e5e7eb',
                    color: '#111827',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                  title="Журнал ошибок/сообщений от МК"
                >
                  Журнал ({mkErrorHistory.length})
                </button>
              )}

              {mkErrorLogOpen && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: MESSAGE_BAR_HEIGHT + 8,
                    backgroundColor: '#0f172a',
                    color: '#e2e8f0',
                    border: '1px solid rgba(148, 163, 184, 0.35)',
                    borderRadius: 8,
                    padding: 12,
                    zIndex: 1000,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                    maxHeight: 240,
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>Журнал ошибок (последние 10)</div>
                    <button
                      type="button"
                      onClick={() => setMkErrorLogOpen(false)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#334155',
                        color: '#e2e8f0',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                      title="Закрыть"
                    >
                      Закрыть
                    </button>
                  </div>

                  {mkErrorHistory.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>—</div>
                  ) : (
                    mkErrorHistory.map((item, idx) => {
                      const kindColor = item.kind === 'alarm' ? '#dc2626' : item.kind === 'notify' ? '#0ea5e9' : '#94a3b8';
                      return (
                        <div
                          key={`${item.at}-${idx}`}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            marginBottom: 8,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                            <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{formatTime(item.at)}</span>
                            <span style={{ fontSize: 11, color: kindColor, fontWeight: 900 }}>{item.kind.toUpperCase()}</span>
                          </div>
                          <div style={{ fontSize: 12, marginTop: 3, wordBreak: 'break-word' }}>{item.message}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showHelp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', width: '90%', maxWidth: 560, maxHeight: '85%', borderRadius: '8px', display: 'flex', flexDirection: 'column', padding: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
              <h3 style={{ margin: 0 }}>Справка — Просмотрщик</h3>
              <button onClick={() => setShowHelp(false)} style={{ padding: '6px 12px', cursor: 'pointer' }}>Закрыть</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', fontSize: '14px', lineHeight: 1.5 }}>
              <p><strong>Подключение.</strong> Введите IP и порт устройства с прошивкой Flprog WebServer (или <code>localhost:31337</code> для симулятора). Формат: <code>192.168.1.1</code>, <code>host:port</code> или <code>http://host:port</code>. Кнопка «Подключиться» загружает конфиг и начинает опрос состояния.</p>
              <p><strong>Вторая вкладка.</strong> Страница МК в браузере (<code>http://IP/</code>) — отдельное соединение; пока она грузится, вьювер может ждать. Не открывайте её параллельно с работой панели или закройте вкладку.</p>
              <p><strong>Вкладки.</strong> Переключайте экраны по вкладкам, как в редакторе.</p>
              <p><strong>Управление.</strong> Кнопки и переключатели отправляют команды на устройство. Слайдер и поле ввода — при изменении значения. LED и метки отображают данные с устройства.</p>
              <p><strong>Звук.</strong> Поддерживаются уведомление и тревога. При тревоге доступна кнопка «Выключить тревогу».</p>
              <p><strong>Интервал обновления.</strong> Частота опроса состояния (мс). Можно уменьшить для быстрого отклика или увеличить для экономии трафика.</p>
            </div>
          </div>
        </div>
      )}

      {scanOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', width: '92%', maxWidth: 720, maxHeight: '85%', borderRadius: 8, display: 'flex', flexDirection: 'column', padding: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexShrink: 0 }}>
              <h3 style={{ margin: 0 }}>Поиск МК (HTTP :{DEVICE_INFO_PORT})</h3>
              <button
                type="button"
                onClick={() => {
                  stopScan();
                  setScanOpen(false);
                }}
                style={{ padding: '6px 12px', cursor: 'pointer' }}
              >
                Закрыть
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: 10, alignItems: 'end', flexShrink: 0 }}>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Подсеть (префикс)</label>
                <input
                  type="text"
                  value={scanPrefix}
                  onChange={(e) => setScanPrefix(e.target.value)}
                  placeholder="192.168.1"
                  style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>От</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={scanFrom}
                  onChange={(e) => setScanFrom(parseInt(e.target.value || '0', 10))}
                  style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>До</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={scanTo}
                  onChange={(e) => setScanTo(parseInt(e.target.value || '0', 10))}
                  style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10, alignItems: 'end', flexShrink: 0 }}>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Параллельность</label>
                <input
                  type="number"
                  min={SCAN_CONCURRENCY_MIN}
                  max={SCAN_CONCURRENCY_MAX}
                  step={1}
                  value={scanConcurrency}
                  onChange={(e) => {
                    const v = e.target.value === '' ? SCAN_CONCURRENCY_DEFAULT : parseInt(e.target.value, 10);
                    if (Number.isFinite(v)) setScanConcurrency(Math.max(SCAN_CONCURRENCY_MIN, Math.min(SCAN_CONCURRENCY_MAX, v)));
                  }}
                  style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Таймаут /ping (мс)</label>
                <input
                  type="number"
                  min={SCAN_TIMEOUT_MS_MIN}
                  max={SCAN_TIMEOUT_MS_MAX}
                  step={50}
                  value={scanTimeoutMs}
                  onChange={(e) => {
                    const v = e.target.value === '' ? SCAN_TIMEOUT_MS_DEFAULT : parseInt(e.target.value, 10);
                    if (Number.isFinite(v)) setScanTimeoutMs(Math.max(SCAN_TIMEOUT_MS_MIN, Math.min(SCAN_TIMEOUT_MS_MAX, v)));
                  }}
                  style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexShrink: 0, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  if (!scanPrefix.trim()) {
                    const guessed = guessIpv4Prefix(ip);
                    if (guessed) setScanPrefix(guessed);
                  }
                  startScan();
                }}
                disabled={scanning}
                style={{
                  padding: '8px 12px',
                  backgroundColor: scanning ? '#94a3b8' : '#0f766e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: scanning ? 'wait' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {scanning ? 'Идёт поиск…' : 'Начать поиск'}
              </button>
              <button
                type="button"
                onClick={stopScan}
                disabled={!scanning}
                style={{
                  padding: '8px 12px',
                  backgroundColor: !scanning ? '#e2e8f0' : '#475569',
                  color: !scanning ? '#334155' : '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: !scanning ? 'default' : 'pointer',
                  fontWeight: 600,
                }}
              >
                Остановить
              </button>
              <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', alignSelf: 'center' }}>
                Найдено: {scanResults.length}
              </div>
            </div>

            {scanError && (
              <div style={{ marginTop: 10, color: '#dc2626', fontSize: 12, flexShrink: 0 }}>
                {scanError}
              </div>
            )}

            <div style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 12, overflow: 'auto' }}>
              {scanResults.length === 0 ? (
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {scanning ? 'Ищем устройства…' : 'Пока ничего не найдено. Проверьте подсеть и что страница МК доступна по HTTP на 80 порту.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {scanResults.map((r) => (
                    <button
                      key={r.host}
                      type="button"
                      onClick={() => connectToFoundDevice(r.host, r.apiPort)}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        background: '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                      title="Подключиться"
                    >
                      <span style={{ fontWeight: 700 }}>
                        {r.host}
                        <span style={{ fontWeight: 500, color: '#64748b', marginLeft: 10 }}>
                          info :{r.infoPort}
                          {r.apiPort ? ` · api :${r.apiPort}` : ''}
                        </span>
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{r.title ?? ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
