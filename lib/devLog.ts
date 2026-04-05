/**
 * Smart developer logger for Pulse Cognitive.
 *
 * - Ring buffer (200 entries max, oldest dropped)
 * - Structured entries with category, level, data
 * - No-op in production (__DEV__ guard)
 * - Subscribable for live UI updates
 */

export type LogLevel = 'info' | 'warn' | 'engine' | 'phase' | 'tap';

export interface LogEntry {
  id: number;
  ts: number;          // Date.now()
  level: LogLevel;
  category: string;    // e.g. 'engine', 'game', 'store', 'nav'
  message: string;
  data?: Record<string, unknown>;
}

type Listener = () => void;

const MAX_ENTRIES = 200;
let _entries: LogEntry[] = [];
let _nextId = 1;
let _listeners: Set<Listener> = new Set();

function notify() {
  _listeners.forEach((fn) => fn());
}

/**
 * Write a log entry. No-op in production builds.
 */
export function devLog(
  level: LogLevel,
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!__DEV__) return;

  const entry: LogEntry = {
    id: _nextId++,
    ts: Date.now(),
    level,
    category,
    message,
    data,
  };

  _entries.push(entry);
  if (_entries.length > MAX_ENTRIES) {
    _entries = _entries.slice(-MAX_ENTRIES);
  }

  // Also emit to console with color coding
  const tag = `[${level.toUpperCase()}] [${category}]`;
  if (level === 'warn') {
    console.warn(tag, message, data ?? '');
  } else {
    console.log(tag, message, data ?? '');
  }

  notify();
}

/** Get all current log entries (newest last). */
export function getLogEntries(): LogEntry[] {
  return _entries;
}

/** Clear all log entries. */
export function clearLog(): void {
  _entries = [];
  _nextId = 1;
  notify();
}

/** Subscribe to log changes. Returns unsubscribe function. */
export function subscribeLog(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

/** Export log as JSON string (for sharing/debugging). */
export function exportLogJson(): string {
  return JSON.stringify(_entries, null, 2);
}

// ── Convenience shortcuts ──

export const log = {
  /** Engine adaptation decisions */
  engine: (message: string, data?: Record<string, unknown>) =>
    devLog('engine', 'engine', message, data),

  /** Game phase transitions */
  phase: (message: string, data?: Record<string, unknown>) =>
    devLog('phase', 'game', message, data),

  /** Tap events and outcomes */
  tap: (message: string, data?: Record<string, unknown>) =>
    devLog('tap', 'game', message, data),

  /** General info */
  info: (message: string, data?: Record<string, unknown>) =>
    devLog('info', 'system', message, data),

  /** Warnings */
  warn: (message: string, data?: Record<string, unknown>) =>
    devLog('warn', 'system', message, data),

  /** Store actions */
  store: (message: string, data?: Record<string, unknown>) =>
    devLog('info', 'store', message, data),

  /** Navigation events */
  nav: (message: string, data?: Record<string, unknown>) =>
    devLog('info', 'nav', message, data),

  /** Profile / companion / persistence */
  data: (message: string, data?: Record<string, unknown>) =>
    devLog('info', 'data', message, data),
};
