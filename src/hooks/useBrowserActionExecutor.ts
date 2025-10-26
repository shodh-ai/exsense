'use client';

import { useState, useCallback } from 'react';
import { Room } from 'livekit-client';

// Browser action command interface
export interface BrowserActionCommand {
  // File: exsense/src/hooks/useBrowserActionExecutor.ts
  tool_name: string;
  parameters: {
    selector?: string;
    text?: string;
    url?: string;
    x?: number;
    y?: number;
    key?: string;
    waitTime?: number;
    [key: string]: any;
  };
}

// VNC message format for communication with Docker container
// Legacy VNC message type removed - LiveKit-only now

// Hook return interface
interface UseBrowserActionExecutorReturn {
  isExecuting: boolean;
  lastError: string | null;
  executeBrowserAction: (command: BrowserActionCommand) => Promise<any>;
}

// No conversion needed - browser manager normalizes incoming tool_names.

export const useBrowserActionExecutor = (room: Room | null, browserIdentity?: string): UseBrowserActionExecutorReturn => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const executeBrowserAction = useCallback(async (command: BrowserActionCommand): Promise<any> => {
    setIsExecuting(true);
    setLastError(null);
    try {
      if (!room || !room.localParticipant) {
        throw new Error('LiveKit room is not connected');
      }
      const payload = JSON.stringify(command);
      const bytes = new TextEncoder().encode(payload);
      try {
        if (browserIdentity && browserIdentity.trim().length > 0) {
          room.localParticipant.publishData(bytes, { destinationIdentities: [browserIdentity], reliable: true } as any);
        } else {
          room.localParticipant.publishData(bytes, { reliable: true } as any);
        }
      } catch (e) {
        // Fallback to broadcast if targeted send fails due to SDK option differences
        room.localParticipant.publishData(bytes);
      }
      return { success: true, message: `Sent ${command.tool_name}`, timestamp: Date.now() };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      return { success: false, error: errorMessage, timestamp: Date.now() };
    } finally {
      setIsExecuting(false);
    }
  }, [room]);

  return { isExecuting, lastError, executeBrowserAction };
};