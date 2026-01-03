/**
 * Remote Logger Service
 * Intercepts console.log/warn/error and sends to Nakama backend
 */

import { getNakamaSocket } from './nakama.service';

interface LogEntry {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  args?: any[];
  timestamp: number;
  matchId?: string;
}

// Store original console methods
const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

// Buffer for batching logs
let logBuffer: LogEntry[] = [];
let flushTimeout: number | null = null;
let isEnabled = false;
let currentMatchId: string | null = null;

const FLUSH_INTERVAL = 2000; // Flush every 2 seconds
const MAX_BUFFER_SIZE = 20; // Max logs before force flush

/**
 * Format arguments to string
 */
function formatArgs(args: any[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}

/**
 * Send logs to backend
 */
async function flushLogs(): Promise<void> {
  if (logBuffer.length === 0) return;

  const socket = getNakamaSocket();
  if (!socket) return;

  const logsToSend = [...logBuffer];
  logBuffer = [];

  for (const log of logsToSend) {
    try {
      await socket.rpc('store_log', JSON.stringify(log));
    } catch (e) {
      // Don't use console here to avoid infinite loop
      originalConsole.error('[RemoteLogger] Failed to send log:', e);
    }
  }
}

/**
 * Schedule flush
 */
function scheduleFlush(): void {
  if (flushTimeout) return;

  flushTimeout = window.setTimeout(() => {
    flushTimeout = null;
    flushLogs();
  }, FLUSH_INTERVAL);
}

/**
 * Add log to buffer
 */
function bufferLog(level: LogEntry['level'], args: any[]): void {
  if (!isEnabled) return;

  const message = formatArgs(args);
  const entry: LogEntry = {
    level,
    message,
    timestamp: Date.now(),
    matchId: currentMatchId ?? undefined,
  };

  // Store simplified args for debugging
  if (args.length > 1) {
    entry.args = args.slice(1).map((arg) => {
      if (typeof arg === 'object') {
        try {
          return JSON.parse(JSON.stringify(arg));
        } catch {
          return String(arg);
        }
      }
      return arg;
    });
  }

  logBuffer.push(entry);

  // Force flush if buffer is full
  if (logBuffer.length >= MAX_BUFFER_SIZE) {
    flushLogs();
  } else {
    scheduleFlush();
  }
}

/**
 * Create wrapped console method
 */
function createWrappedMethod(level: LogEntry['level']) {
  return function (...args: any[]) {
    // Call original
    originalConsole[level](...args);
    // Buffer for remote
    bufferLog(level, args);
  };
}

/**
 * Enable remote logging
 */
export function enableRemoteLogging(matchId?: string): void {
  if (isEnabled) return;

  isEnabled = true;
  currentMatchId = matchId ?? null;

  // Replace console methods
  console.log = createWrappedMethod('log');
  console.warn = createWrappedMethod('warn');
  console.error = createWrappedMethod('error');
  console.info = createWrappedMethod('info');
  console.debug = createWrappedMethod('debug');

  originalConsole.log('[RemoteLogger] Enabled');
}

/**
 * Disable remote logging
 */
export function disableRemoteLogging(): void {
  if (!isEnabled) return;

  // Flush remaining logs
  flushLogs();

  // Restore original console
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;

  isEnabled = false;
  originalConsole.log('[RemoteLogger] Disabled');
}

/**
 * Update match ID for logs
 */
export function setLogMatchId(matchId: string | null): void {
  currentMatchId = matchId;
}

/**
 * Manually send a log
 */
export function remoteLog(level: LogEntry['level'], message: string, data?: any): void {
  const socket = getNakamaSocket();
  if (!socket) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: Date.now(),
    matchId: currentMatchId ?? undefined,
  };

  if (data !== undefined) {
    entry.args = [data];
  }

  socket.rpc('store_log', JSON.stringify(entry)).catch((e) => {
    originalConsole.error('[RemoteLogger] Failed to send manual log:', e);
  });
}

/**
 * Force flush logs now
 */
export function flushRemoteLogs(): Promise<void> {
  return flushLogs();
}
