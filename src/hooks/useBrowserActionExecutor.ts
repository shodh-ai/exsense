'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Room, RoomEvent, LocalParticipant, RpcInvocationData, RpcError } from 'livekit-client';

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
interface VNCMessage {
  action: string;
  selector?: string;
  text?: string;
  url?: string;
  x?: number;
  y?: number;
  key?: string;
  waitTime?: number;
  timestamp: number;
  tool_name?: string;
  parameters?: any;
  [key: string]: any;
}

// Hook return interface
interface UseBrowserActionExecutorReturn {
  isVNCConnected: boolean;
  isExecuting: boolean;
  lastError: string | null;
  executeBrowserAction: (command: BrowserActionCommand) => Promise<any>;
  disconnectVNC: () => void;
  sendVNCMessage: (message: VNCMessage) => void;
  setOnVNCResponse: (handler: (response: any) => void) => void;
}

// Utility function to convert command to VNC message
const commandToVNCMessage = (command: BrowserActionCommand): VNCMessage => {
  const { tool_name, parameters } = command;
  
  // Map tool names to VNC actions
  const actionMap: Record<string, string> = {
    'browser_click': 'click',
    'browser_type': 'type',
    'browser_navigate': 'navigate',
    'browser_scroll': 'scroll',
    'browser_hover': 'hover',
    'browser_key_press': 'keypress',
    'browser_wait': 'wait',
    'browser_screenshot': 'screenshot',
    'browser_get_element': 'get_element',
    'browser_execute_script': 'execute_script',
    'jupyter_click_pyodide': 'jupyter_click_pyodide',
    'jupyter_type_in_cell': 'execute_jupyter_command',
    'jupyter_run_cell': 'execute_jupyter_command',
    'jupyter_create_new_cell': 'execute_jupyter_command',
    'setup_jupyter': 'execute_jupyter_command'
  };

  const vncMessage: VNCMessage = {
    action: actionMap[tool_name] || tool_name,
    selector: parameters.selector,
    text: parameters.text,
    url: parameters.url,
    x: parameters.x,
    y: parameters.y,
    key: parameters.key,
    waitTime: parameters.waitTime,
    timestamp: Date.now()
  };

  // For Jupyter commands (and setup_jupyter), include all parameters
  if ((tool_name.startsWith('jupyter_') && tool_name !== 'jupyter_click_pyodide') || tool_name === 'setup_jupyter') {
    vncMessage.tool_name = tool_name;
    vncMessage.parameters = parameters;
  }

  // For all commands, pass through any extra parameters not explicitly mapped above
  // (e.g., session_id, screenshot_interval_sec, tab_index, etc.)
  if (parameters && typeof parameters === 'object') {
    for (const [k, v] of Object.entries(parameters)) {
      if (v === undefined) continue;
      if (!(k in vncMessage)) {
        (vncMessage as any)[k] = v;
      }
    }
  }

  console.log(`[BrowserActionExecutor] Converting command to VNC message:`, {
    original_tool_name: tool_name,
    original_parameters: parameters,
    vnc_message: vncMessage
  });

  return vncMessage;
};

export const useBrowserActionExecutor = (room: Room | null, vncUrl?: string): UseBrowserActionExecutorReturn => {
  const [isVNCConnected, setIsVNCConnected] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // VNC WebSocket connection reference
  const vncWebSocketRef = useRef<WebSocket | null>(null);
  const vncDataChannelRef = useRef<RTCDataChannel | null>(null);
  const messageQueueRef = useRef<VNCMessage[]>([]);
  const onVNCResponseRef = useRef<((response: any) => void) | null>(null);
  
  // Send message over VNC connection
  const sendVNCMessage = useCallback((message: VNCMessage) => {
    if (vncWebSocketRef.current && vncWebSocketRef.current.readyState === WebSocket.OPEN) {
      vncWebSocketRef.current.send(JSON.stringify(message));
      console.log('[BrowserActionExecutor] Sent VNC WebSocket message:', message);
    } else {
      console.warn('[BrowserActionExecutor] VNC connection not open, queueing message');
      messageQueueRef.current.push(message);
    }
  }, []);
  
  // Allow consumer to register a response handler
  const setOnVNCResponse = useCallback((handler: (response: any) => void) => {
    onVNCResponseRef.current = handler;
  }, []);
  
  // RPC handler for Browser/ExecuteAction calls from LiveKit Conductor
  const handleBrowserExecuteAction = useCallback(async (rpcData: RpcInvocationData): Promise<string> => {
    console.log('[BrowserActionExecutor] 🎯 Received Browser/ExecuteAction RPC call');
    console.log('[BrowserActionExecutor] 📦 Raw RPC data:', rpcData);
    
    try {
      setIsExecuting(true);
      setLastError(null);
      
      // Parse the command from RPC payload
      const payload = JSON.parse(rpcData.payload as string);
      const command: BrowserActionCommand = {
        tool_name: payload.tool_name || payload.browser_type,
        parameters: payload.parameters || payload
      };
      
      console.log('[BrowserActionExecutor] 🔧 Parsed command:', command);
      console.log('[BrowserActionExecutor] 🔗 VNC connection status:', isVNCConnected);
      
      // Convert command to VNC message format
      const vncMessage = commandToVNCMessage(command);
      
      // Send message using the queue-aware sender
      sendVNCMessage(vncMessage);
      
      // Return success response immediately, as the message is now queued
      return JSON.stringify({
        success: true,
        message: `Browser action ${command.tool_name} queued for execution`,
        timestamp: Date.now()
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      console.error('[BrowserActionExecutor] Error executing browser action:', error);
      
      return JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      });
    } finally {
      setIsExecuting(false);
    }
  }, [sendVNCMessage]);
  
  // Register RPC handler when room is available
  useEffect(() => {
    if (!room || !room.localParticipant) return;
    
    try {
      room.localParticipant.registerRpcMethod(
        "Browser/ExecuteAction", 
        handleBrowserExecuteAction
      );
      console.log('[BrowserActionExecutor] Registered Browser/ExecuteAction RPC handler');
    } catch (error) {
      if (error instanceof RpcError && error.message.includes("already registered")) {
        console.warn('[BrowserActionExecutor] RPC method already registered (React Strict Mode)');
      } else {
        console.error('[BrowserActionExecutor] Failed to register RPC handler:', error);
        setLastError('Failed to register RPC handler');
      }
    }
    
    return () => {
      // Cleanup is handled by LiveKit automatically
    };
  }, [room, handleBrowserExecuteAction]);
  
  // Effect to automatically connect and disconnect VNC
  useEffect(() => {
    if (!vncUrl) return;

    console.log('[BrowserActionExecutor] Attempting to connect to VNC:', vncUrl);
    const ws = new WebSocket(vncUrl);

    ws.onopen = () => {
      console.log('[BrowserActionExecutor] VNC WebSocket connected');
      setIsVNCConnected(true);
      setLastError(null);
      
      // Flush the message queue
      messageQueueRef.current.forEach(message => {
        ws.send(JSON.stringify(message));
        console.log('[BrowserActionExecutor] Sent queued VNC message:', message);
      });
      messageQueueRef.current = [];
    };

    ws.onclose = () => {
      console.log('[BrowserActionExecutor] VNC WebSocket disconnected');
      setIsVNCConnected(false);
    };

    ws.onerror = (error) => {
      const errorMessage = error instanceof Error ? error.message : 
        error && typeof error === 'object' ? JSON.stringify(error) : 
        'Unknown WebSocket error';
      const wsTarget = error?.target as WebSocket;
      console.error('[BrowserActionExecutor] VNC WebSocket error:', {
        type: error?.type || 'unknown',
        message: errorMessage,
        target: wsTarget?.url || vncUrl,
        readyState: wsTarget?.readyState
      });
      setLastError(`VNC connection error: ${errorMessage}`);
      setIsVNCConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        console.log('[BrowserActionExecutor] VNC response:', response);
        // Forward response to consumer if handler is registered
        try {
          if (onVNCResponseRef.current) {
            onVNCResponseRef.current(response);
          }
        } catch (cbErr) {
          console.error('[BrowserActionExecutor] Error in onVNCResponse handler:', cbErr);
        }
      } catch (error) {
        console.error('[BrowserActionExecutor] Failed to parse VNC response:', error);
      }
    };

    vncWebSocketRef.current = ws;

    return () => {
      ws.close();
    };
  }, [vncUrl]);
  
  // Disconnect from VNC
  const disconnectVNC = useCallback(() => {
    if (vncWebSocketRef.current) {
      vncWebSocketRef.current.close();
      vncWebSocketRef.current = null;
    }
    
    if (vncDataChannelRef.current) {
      vncDataChannelRef.current.close();
      vncDataChannelRef.current = null;
    }
    
    setIsVNCConnected(false);
    console.log('[BrowserActionExecutor] Disconnected from VNC');
  }, []);
  
  
  // Execute browser action directly (for manual testing)
  const executeBrowserAction = useCallback(async (command: BrowserActionCommand): Promise<any> => {
    try {
      setIsExecuting(true);
      setLastError(null);
      
      const vncMessage = commandToVNCMessage(command);
      sendVNCMessage(vncMessage);
      
      return {
        success: true,
        message: `Browser action ${command.tool_name} executed`,
        timestamp: Date.now()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [sendVNCMessage]);
  
  return {
    isVNCConnected,
    isExecuting,
    lastError,
    executeBrowserAction,
    disconnectVNC,
    sendVNCMessage,
    setOnVNCResponse
  };
};