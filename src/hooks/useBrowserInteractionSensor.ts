'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Room } from 'livekit-client';

// Browser interaction event interface
export interface BrowserInteractionEvent {

// File: exsense/src/hooks/useBrowserInteractionSensor.ts


  action: string;
  selector?: string;
  element?: {
    tagName: string;
    id?: string;
    className?: string;
    textContent?: string;
    value?: string;
  };
  coordinates?: {
    x: number;
    y: number;
  };
  keyPressed?: string;
  url?: string;
  timestamp: number;
}

// Student action data for RPC calls
interface StudentActionData {
  actionType: 'browser_interaction';
  browserEvent: BrowserInteractionEvent;
  transcript?: string;
  timestamp: number;
}

// Hook return interface
interface UseBrowserInteractionSensorReturn {
  isListening: boolean;
  lastInteraction: BrowserInteractionEvent | null;
  interactionCount: number;
  startListening: () => void;
  stopListening: () => void;
  connectToVNCSensor: (vncUrl: string) => void;
  disconnectFromVNCSensor: () => void;
  reportStudentAction: (event: BrowserInteractionEvent, transcript?: string) => Promise<void>;
}

export const useBrowserInteractionSensor = (room: Room | null): UseBrowserInteractionSensorReturn => {
  const [isListening, setIsListening] = useState(false);
  const [lastInteraction, setLastInteraction] = useState<BrowserInteractionEvent | null>(null);
  const [interactionCount, setInteractionCount] = useState(0);
  
  // VNC sensor WebSocket connection
  const vncSensorWebSocketRef = useRef<WebSocket | null>(null);
  const vncSensorDataChannelRef = useRef<RTCDataChannel | null>(null);
  
  // Make RPC call to report student action
  const reportStudentAction = useCallback(async (event: BrowserInteractionEvent, transcript?: string) => {
    if (!room?.localParticipant) {
      console.warn('[BrowserInteractionSensor] No LiveKit room available for RPC call');
      return;
    }
    
    try {
      const actionData: StudentActionData = {
        actionType: 'browser_interaction',
        browserEvent: event,
        transcript,
        timestamp: Date.now()
      };
      
      console.log('[BrowserInteractionSensor] Making student_spoke_or_acted RPC call:', actionData);
      
      // Find the agent participant (assuming it has 'agent' in the identity)
      const participants = Array.from(room.remoteParticipants.values());
      const agentParticipant = participants.find(p => 
        p.identity.toLowerCase().includes('agent') || 
        p.identity.toLowerCase().includes('conductor')
      );
      
      if (!agentParticipant) {
        console.warn('[BrowserInteractionSensor] No agent participant found for RPC call');
        return;
      }
      
      const response = await room.localParticipant.performRpc({
        destinationIdentity: agentParticipant.identity,
        method: 'student_spoke_or_acted',
        payload: JSON.stringify(actionData)
      });
      
      console.log('[BrowserInteractionSensor] RPC response:', response);
      
    } catch (error) {
      console.error('[BrowserInteractionSensor] Error making RPC call:', error);
    }
  }, [room]);
  
  // Handle incoming sensor events from VNC
  const handleSensorEvent = useCallback((event: BrowserInteractionEvent) => {
    console.log('[BrowserInteractionSensor] Received sensor event:', event);
    
    setLastInteraction(event);
    setInteractionCount(prev => prev + 1);
    
    // Only report certain types of interactions to avoid spam
    const reportableActions = [
      'click', 'type', 'keypress', 'hover', 'scroll', 'navigate', 
      'focus', 'blur', 'submit', 'change'
    ];
    
    if (isListening && reportableActions.includes(event.action)) {
      // Report to LiveKit Conductor
      reportStudentAction(event);
    }
  }, [isListening, reportStudentAction]);
  
  // Connect to VNC sensor data channel
  const connectToVNCSensor = useCallback((vncUrl: string) => {
    try {
      console.log('[BrowserInteractionSensor] Connecting to VNC sensor:', vncUrl);
      
      // Create WebSocket connection to VNC sensor
      const ws = new WebSocket(vncUrl);
      
      ws.onopen = () => {
        console.log('[BrowserInteractionSensor] VNC sensor WebSocket connected');
      };
      
      ws.onclose = () => {
        console.log('[BrowserInteractionSensor] VNC sensor WebSocket disconnected');
      };
      
      ws.onerror = (error) => {
        const errorMessage = error instanceof Error ? error.message : 
          error && typeof error === 'object' ? JSON.stringify(error) : 
          'Unknown WebSocket error';
        const wsTarget = error?.target as WebSocket;
        console.error('[BrowserInteractionSensor] VNC sensor WebSocket error:', {
          type: error?.type || 'unknown',
          message: errorMessage,
          target: wsTarget?.url || 'ws://localhost:8766',
          readyState: wsTarget?.readyState
        });
      };
      
      ws.onmessage = (event) => {
        try {
          const sensorEvent: BrowserInteractionEvent = JSON.parse(event.data);
          handleSensorEvent(sensorEvent);
        } catch (error) {
          console.error('[BrowserInteractionSensor] Failed to parse sensor event:', error);
        }
      };
      
      vncSensorWebSocketRef.current = ws;
      
      // For WebRTC data channel approach (alternative)
      /*
      const pc = new RTCPeerConnection();
      
      pc.ondatachannel = (event) => {
        const dataChannel = event.channel;
        
        dataChannel.onopen = () => {
          console.log('[BrowserInteractionSensor] VNC sensor data channel opened');
          vncSensorDataChannelRef.current = dataChannel;
        };
        
        dataChannel.onclose = () => {
          console.log('[BrowserInteractionSensor] VNC sensor data channel closed');
        };
        
        dataChannel.onmessage = (event) => {
          try {
            const sensorEvent: BrowserInteractionEvent = JSON.parse(event.data);
            handleSensorEvent(sensorEvent);
          } catch (error) {
            console.error('[BrowserInteractionSensor] Failed to parse sensor event:', error);
          }
        };
      };
      */
      
    } catch (error) {
      console.error('[BrowserInteractionSensor] Failed to connect to VNC sensor:', error);
    }
  }, [handleSensorEvent]);
  
  // Disconnect from VNC sensor
  const disconnectFromVNCSensor = useCallback(() => {
    if (vncSensorWebSocketRef.current) {
      vncSensorWebSocketRef.current.close();
      vncSensorWebSocketRef.current = null;
    }
    
    if (vncSensorDataChannelRef.current) {
      vncSensorDataChannelRef.current.close();
      vncSensorDataChannelRef.current = null;
    }
    
    console.log('[BrowserInteractionSensor] Disconnected from VNC sensor');
  }, []);
  
  // Start listening for interactions
  const startListening = useCallback(() => {
    setIsListening(true);
    console.log('[BrowserInteractionSensor] Started listening for browser interactions');
  }, []);
  
  // Stop listening for interactions
  const stopListening = useCallback(() => {
    setIsListening(false);
    console.log('[BrowserInteractionSensor] Stopped listening for browser interactions');
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromVNCSensor();
    };
  }, [disconnectFromVNCSensor]);
  
  return {
    isListening,
    lastInteraction,
    interactionCount,
    startListening,
    stopListening,
    connectToVNCSensor,
    disconnectFromVNCSensor,
    reportStudentAction
  };
};
