// File: exsense/src/utils/logger.ts
/**
 * Frontend logging utility
 * Provides structured logging for the browser with optional backend integration
 */

import { getCurrentTraceId, getCurrentSpanId } from '@/lib/otel';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  logger: string;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private name: string;
  private minLevel: LogLevel;
  private sendToBackend: boolean;

  constructor(name: string) {
    this.name = name;
    this.minLevel = this.getMinLevel();
    this.sendToBackend = process.env.NEXT_PUBLIC_SEND_LOGS_TO_BACKEND === 'true';
  }

  private getMinLevel(): LogLevel {
    const envLevel = process.env.NEXT_PUBLIC_LOG_LEVEL?.toLowerCase();
    switch (envLevel) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      default:
        return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.name}] ${message}${contextStr}`;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    // Add trace IDs from OpenTelemetry
    const traceId = getCurrentTraceId();
    const spanId = getCurrentSpanId();
    
    return {
      timestamp: new Date().toISOString(),
      level,
      logger: this.name,
      message,
      context: {
        ...context,
        ...(traceId && { otel_trace_id: traceId }),
        ...(spanId && { otel_span_id: spanId }),
      },
      error,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
    };
  }

  private getUserId(): string | undefined {
    // Try to get user ID from various sources
    if (typeof window !== 'undefined') {
      try {
        // From localStorage
        const userId = localStorage.getItem('userId');
        if (userId) return userId;

        // From Clerk (if available)
        const clerkUser = (window as any).__clerk_user_id;
        if (clerkUser) return clerkUser;
      } catch (e) {
        // Ignore errors accessing localStorage
      }
    }
    return undefined;
  }

  private getSessionId(): string | undefined {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem('sessionId') || undefined;
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  }

  private async sendLog(entry: LogEntry): Promise<void> {
    if (!this.sendToBackend || typeof window === 'undefined') return;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      await fetch(`${backendUrl}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
        // Don't wait for response
        keepalive: true,
      }).catch(() => {
        // Silently fail - don't break the app if logging fails
      });
    } catch (e) {
      // Silently fail
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context);
    const entry = this.createLogEntry(level, message, context, error);

    // Console output
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, context || '');
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, context || '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, context || '');
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, error || context || '');
        if (error?.stack) {
          console.error(error.stack);
        }
        break;
    }

    // Send to backend (async, non-blocking)
    if (this.sendToBackend) {
      this.sendLog(entry);
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, errorOrContext?: Error | Record<string, any>, context?: Record<string, any>): void {
    if (errorOrContext instanceof Error) {
      this.log(LogLevel.ERROR, message, context, errorOrContext);
    } else {
      this.log(LogLevel.ERROR, message, errorOrContext);
    }
  }
}

/**
 * Create a logger instance
 */
export function createLogger(name: string): Logger {
  return new Logger(name);
}

/**
 * Default logger for general use
 */
export const logger = createLogger('app');
