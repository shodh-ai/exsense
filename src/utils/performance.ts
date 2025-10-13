// File: exsense/src/utils/performance.ts
/**
 * Performance monitoring utilities for the frontend
 */

import { createLogger } from './logger';
import React, { useEffect, useRef } from 'react';

const logger = createLogger('performance');

interface PerformanceMark {
  name: string;
  startTime: number;
}

class PerformanceMonitor {
  private marks: Map<string, PerformanceMark> = new Map();

  /**
   * Start a performance measurement
   */
  start(name: string): void {
    if (typeof performance === 'undefined') return;

    this.marks.set(name, {
      name,
      startTime: performance.now(),
    });

    logger.debug(`Performance mark started: ${name}`);
  }

  /**
   * End a performance measurement and log the duration
   */
  end(name: string, context?: Record<string, unknown>): number | null {
    if (typeof performance === 'undefined') return null;

    const mark = this.marks.get(name);
    if (!mark) {
      logger.warn(`Performance mark not found: ${name}`);
      return null;
    }

    const duration = performance.now() - mark.startTime;
    this.marks.delete(name);

    logger.info(`Performance: ${name}`, {
      duration: `${duration.toFixed(2)}ms`,
      ...context,
    });

    return duration;
  }

  /**
   * Measure a function execution time
   */
  async measure<T>(name: string, fn: () => Promise<T> | T, context?: Record<string, unknown>): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      this.end(name, context);
      return result;
    } catch (error) {
      this.end(name, { ...context, error: true });
      throw error;
    }
  }

  /**
   * Log Web Vitals metrics
   */
  logWebVital(metric: { name: string; value: number; rating: string }): void {
    logger.info(`Web Vital: ${metric.name}`, {
      value: metric.value,
      rating: metric.rating,
    });
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Higher-order function to measure component render time
 */
export function withPerformanceLogging<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  const Wrapped: React.FC<P> = (props: P) => {
    const renderStartRef = useRef<number>(performance.now());

    useEffect(() => {
      const renderTime = performance.now() - renderStartRef.current;
      logger.debug(`Component render: ${componentName}`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
      });
    }, []);

    return React.createElement(Component, props);
  };

  Wrapped.displayName = `withPerformanceLogging(${componentName})`;
  return Wrapped as React.ComponentType<P>;
}

