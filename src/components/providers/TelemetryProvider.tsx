// File: exsense/src/components/TelemetryProvider.tsx
'use client';

import { useEffect } from 'react';
import { initTelemetry } from '@/lib/otel';

/**
 * Client-side component to initialize OpenTelemetry
 * Must be used in a Client Component
 */
export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize OTel on client side only
    initTelemetry();
  }, []);

  return <>{children}</>;
}
