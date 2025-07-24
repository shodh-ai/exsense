'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Room, RoomEvent, LocalParticipant, RpcInvocationData, RpcError } from 'livekit-client';

// Browser action command interface
export interface BrowserActionCommand {
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
}

// Hook return interface
interface UseBrowserActionExecutorReturn {
  isVNCConnected: boolean;
  isExecuting: boolean;
  lastError: string | null;
  executeBrowserAction: (command: BrowserActionCommand) => Promise<any>;
  connectVNC: (vncUrl: string) => void;
  disconnectVNC: () => void;
  sendVNCMessage: (message: VNCMessage) => void;
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
    'browser_execute_script': 'execute_script'
  };

  return {
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
};

export const useBrowserActionExecutor = (room: Room | null): UseBrowserActionExecutorReturn => {
  const [isVNCConnected, setIsVNCConnected] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // VNC WebSocket connection reference
  const vncWebSocketRef = useRef<WebSocket | null>(null);
  const vncDataChannelRef = useRef<RTCDataChannel | null>(null);
  
  // RPC handler for Browser/ExecuteAction calls from LiveKit Conductor
  const handleBrowserExecuteAction = useCallback(async (rpcData: RpcInvocationData): Promise<string> => {
    console.log('[BrowserActionExecutor] Received Browser/ExecuteAction RPC call');
    
    try {
      setIsExecuting(true);
      setLastError(null);
      
      // Parse the command from RPC payload
      const payload = JSON.parse(rpcData.payload as string);
      const command: BrowserActionCommand = {
        tool_name: payload.tool_name || payload.browser_type,
        parameters: payload.parameters || payload
      };
      
      console.log('[BrowserActionExecutor] Executing command:', command);
      
      // Convert command to VNC message format
      const vncMessage = commandToVNCMessage(command);
      
      // Send message over VNC data channel
      if (vncDataChannelRef.current && vncDataChannelRef.current.readyState === 'open') {
        vncDataChannelRef.current.send(JSON.stringify(vncMessage));
        console.log('[BrowserActionExecutor] Sent VNC message:', vncMessage);
        
        // Return success response
        return JSON.stringify({
          success: true,
          message: `Browser action ${command.tool_name} executed`,
          timestamp: Date.now()
        });
      } else {
        throw new Error('VNC data channel not connected');
      }
      
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
  }, []);
  
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
  
  // Connect to VNC data channel
  const connectVNC = useCallback((vncUrl: string) => {
    try {
      console.log('[BrowserActionExecutor] Connecting to VNC:', vncUrl);
      
      // Create WebSocket connection to VNC proxy/bridge
      const ws = new WebSocket(vncUrl);
      
      ws.onopen = () => {
        console.log('[BrowserActionExecutor] VNC WebSocket connected');
        setIsVNCConnected(true);
        setLastError(null);
      };
      
      ws.onclose = () => {
        console.log('[BrowserActionExecutor] VNC WebSocket disconnected');
        setIsVNCConnected(false);
      };
      
      ws.onerror = (error) => {
        console.error('[BrowserActionExecutor] VNC WebSocket error:', error);
        setLastError('VNC connection error');
        setIsVNCConnected(false);
      };
      
      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          console.log('[BrowserActionExecutor] VNC response:', response);
        } catch (error) {
          console.error('[BrowserActionExecutor] Failed to parse VNC response:', error);
        }
      };
      
      vncWebSocketRef.current = ws;
      
      // For WebRTC data channel approach (alternative)
      // This would be used if VNC supports WebRTC data channels
      /*
      const pc = new RTCPeerConnection();
      const dataChannel = pc.createDataChannel('vnc-commands', {
        ordered: true
      });
      
      dataChannel.onopen = () => {
        console.log('[BrowserActionExecutor] VNC data channel opened');
        setIsVNCConnected(true);
        vncDataChannelRef.current = dataChannel;
      };
      
      dataChannel.onclose = () => {
        console.log('[BrowserActionExecutor] VNC data channel closed');
        setIsVNCConnected(false);
      };
      
      dataChannel.onerror = (error) => {
        console.error('[BrowserActionExecutor] VNC data channel error:', error);
        setLastError('VNC data channel error');
      };
      */
      
    } catch (error) {
      console.error('[BrowserActionExecutor] Failed to connect to VNC:', error);
      setLastError('Failed to connect to VNC');
    }
  }, []);
  
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
  
  // Send message over VNC connection
  const sendVNCMessage = useCallback((message: VNCMessage) => {
    if (vncWebSocketRef.current && vncWebSocketRef.current.readyState === WebSocket.OPEN) {
      vncWebSocketRef.current.send(JSON.stringify(message));
      console.log('[BrowserActionExecutor] Sent VNC WebSocket message:', message);
    } else if (vncDataChannelRef.current && vncDataChannelRef.current.readyState === 'open') {
      vncDataChannelRef.current.send(JSON.stringify(message));
      console.log('[BrowserActionExecutor] Sent VNC data channel message:', message);
    } else {
      console.warn('[BrowserActionExecutor] No VNC connection available to send message');
      setLastError('No VNC connection available');
    }
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
    connectVNC,
    disconnectVNC,
    sendVNCMessage
  };
};
