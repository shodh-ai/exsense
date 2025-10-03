"use client";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Room, RemoteTrack, RemoteVideoTrack, RemoteTrackPublication, Track, RoomEvent, ConnectionState, VideoQuality, RemoteParticipant } from 'livekit-client';
import { v4 as uuidv4 } from 'uuid';

// Import our custom hooks and components
import { useSessionStore, BrowserTab } from '@/lib/store';
import { useBrowserActionExecutor, BrowserActionCommand } from '@/hooks/useBrowserActionExecutor';
import { TabManager } from './TabManager'; // Adjust path if needed

declare global {
  interface Window {
    lkRoom?: Room;
  }
}

// The main component that orchestrates everything
export default function LiveKitViewer({ room }: { room: Room }) {
  const [videoTracks, setVideoTracks] = useState<{ pub: RemoteTrackPublication; track: RemoteVideoTrack }[]>([]);
  const [captureSize, setCaptureSize] = useState<{ w: number; h: number } | null>(null);

  // Select each piece of state individually to prevent infinite loops
  const tabs = useSessionStore((s) => s.tabs);
  const addTab = useSessionStore((s) => s.addTab);
  const removeTab = useSessionStore((s) => s.removeTab);
  const setActiveTabId = useSessionStore((s) => s.setActiveTabId);

  // Get the function to send commands to the backend
  const { executeBrowserAction } = useBrowserActionExecutor(room);

  // --- START: TAB MANAGEMENT "TRANSLATOR" LOGIC (This section is correct) ---
  const handleOpenNewTab = useCallback(async (name: string, url: string) => {
    const command: BrowserActionCommand = {
      tool_name: 'open_tab',
      parameters: { url },
    };
    await executeBrowserAction(command);
    const newTab: BrowserTab = { id: uuidv4(), name, url };
    addTab(newTab);
    setActiveTabId(newTab.id);
  }, [executeBrowserAction, addTab, setActiveTabId]);

  const handleSwitchTab = useCallback(async (tabId: string) => {
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return;

    const command: BrowserActionCommand = {
      tool_name: 'switch_tab',
      parameters: { tab_id: tabIndex },
    };
    await executeBrowserAction(command);
    setActiveTabId(tabId);
  }, [tabs, executeBrowserAction, setActiveTabId]);

  const handleCloseTab = useCallback(async (tabId: string) => {
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return;

    const command: BrowserActionCommand = {
      tool_name: 'close_tab',
      parameters: { tab_id: tabIndex },
    };
    await executeBrowserAction(command);
    removeTab(tabId);
  }, [tabs, executeBrowserAction, removeTab]);
  // --- END: TAB MANAGEMENT "TRANSLATOR" LOGIC ---

  // --- START: VIDEO STREAM & DATA HANDLING LOGIC (This section is correct) ---
  const rebuildFromRoom = useCallback(() => {
    const next: { pub: RemoteTrackPublication; track: RemoteVideoTrack }[] = [];
    room.remoteParticipants.forEach((p: RemoteParticipant) => {
      p.trackPublications.forEach((pub) => {
        if (pub?.kind === Track.Kind.Video && pub.track) {
          const track = pub.track as RemoteVideoTrack;
          if (track.sid) {
            next.push({ pub, track });
          }
        }
      });
    });
    setVideoTracks(next);
  }, [room]);

  useEffect(() => {
    const onData = (payload: Uint8Array) => {
      try {
        const txt = new TextDecoder().decode(payload);
        const obj = JSON.parse(txt);
        if (obj && typeof obj === 'object') {
          if (obj.type === 'clipboard_content' && typeof obj.content === 'string') {
            navigator.clipboard.writeText(obj.content).catch(err => console.error('Failed to write to clipboard', err));
          }
          const w = Number(obj.width || obj.w);
          const h = Number(obj.height || obj.h);
          if (obj.type === 'meta' && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
            setCaptureSize({ w, h });
          }
        }
      } catch (e) {
        console.error("Failed to parse data message:", e);
      }
    };

    const onTrackChange = () => rebuildFromRoom();

    room.on(RoomEvent.TrackSubscribed, onTrackChange);
    room.on(RoomEvent.TrackUnsubscribed, onTrackChange);
    room.on(RoomEvent.DataReceived, onData);

    rebuildFromRoom();

    return () => {
      room.off(RoomEvent.TrackSubscribed, onTrackChange);
      room.off(RoomEvent.TrackUnsubscribed, onTrackChange);
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, rebuildFromRoom]);
  // --- END: VIDEO STREAM & DATA HANDLING LOGIC ---

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-gray-100">
      <TabManager
        onOpenNewTab={handleOpenNewTab}
        onSwitchTab={handleSwitchTab}
        onCloseTab={handleCloseTab}
      />
      
      <div className="flex-grow w-full h-full min-h-0 relative p-2">
        {videoTracks.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            Waiting for remote video...
          </div>
        ) : (
          videoTracks.map(({ pub, track }) => (
            <VideoRenderer 
              key={track.sid} 
              track={track} 
              executeBrowserAction={executeBrowserAction}
              captureSize={captureSize || undefined} 
            />
          ))
        )}
      </div>
    </div>
  );
}

// --- VideoRenderer SUB-COMPONENT ---

interface VideoRendererProps {
  track: RemoteVideoTrack;
  executeBrowserAction: (command: BrowserActionCommand) => Promise<any>;
  captureSize?: { w: number; h: number };
}

function VideoRenderer({ track, executeBrowserAction, captureSize }: VideoRendererProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el) {
      track.attach(el);
    }
    return () => {
      if (el) {
        track.detach(el);
      }
    };
  }, [track]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          if (resizeDebounceTimer.current) clearTimeout(resizeDebounceTimer.current);
          resizeDebounceTimer.current = setTimeout(() => {
            const command: BrowserActionCommand = {
                tool_name: 'resize',
                parameters: { width: Math.round(width), height: Math.round(height) },
            };
            executeBrowserAction(command);
          }, 250);
        }
      }
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      if (resizeDebounceTimer.current) clearTimeout(resizeDebounceTimer.current);
    };
  }, [executeBrowserAction]);

  const calculateCoords = (event: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return null;

    const videoRect = video.getBoundingClientRect();
    const intrinsicW = video.videoWidth || videoRect.width;
    const intrinsicH = video.videoHeight || videoRect.height;

    const scaleContain = Math.min(videoRect.width / intrinsicW, videoRect.height / intrinsicH);
    const displayW = intrinsicW * scaleContain;
    const displayH = intrinsicH * scaleContain;
    const contentLeft = videoRect.left + (videoRect.width - displayW) / 2;
    const contentTop = videoRect.top + (videoRect.height - displayH) / 2;

    const localX = event.clientX - contentLeft;
    const localY = event.clientY - contentTop;

    if (localX < 0 || localY < 0 || localX > displayW || localY > displayH) return null;

    const intrinsicX = localX / scaleContain;
    const intrinsicY = localY / scaleContain;

    let x = intrinsicX;
    let y = intrinsicY;
    if (captureSize && captureSize.w > 0 && captureSize.h > 0 && intrinsicW > 0 && intrinsicH > 0) {
      const scaleX = captureSize.w / intrinsicW;
      const scaleY = captureSize.h / intrinsicH;
      x *= scaleX;
      y *= scaleY;
    }
    return {
      x: Math.floor(Math.max(0, Math.min((captureSize?.w ?? intrinsicW) - 1, x))),
      y: Math.floor(Math.max(0, Math.min((captureSize?.h ?? intrinsicH) - 1, y))),
    };
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const coords = calculateCoords(event);
    if (coords) {
      const command: BrowserActionCommand = {
        tool_name: 'click',
        parameters: { ...coords, button: 'left' },
      };
      executeBrowserAction(command);
    }
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const coords = calculateCoords(event);
    if (coords) {
      const command: BrowserActionCommand = {
        tool_name: 'click',
        parameters: { ...coords, button: 'right' },
      };
      executeBrowserAction(command);
    }
  };

  // +++ THIS IS THE FIXED KEY HANDLER +++
  const handleKeyDown = useCallback(async (event: React.KeyboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const { key, ctrlKey, altKey, metaKey, shiftKey } = event;

    let command: BrowserActionCommand;

    // Condition for sending a 'type' command:
    // 1. The key is a single, printable character.
    // 2. It's not a control, alt, or meta (Cmd) shortcut. Shift is allowed for typing uppercase letters.
    if (key.length === 1 && !ctrlKey && !altKey && !metaKey) {
      command = {
        tool_name: 'type',
        parameters: { text: key },
      };
    } 
    // All other keys (Enter, Backspace, Tab, F-keys) or shortcuts (Ctrl+C, etc.) are 'keypress'.
    else {
      // The backend expects modifiers as an array of strings.
      const modifiers: string[] = [];
      if (ctrlKey) modifiers.push('Control');
      if (altKey) modifiers.push('Alt');
      if (metaKey) modifiers.push('Meta');
      if (shiftKey) modifiers.push('Shift');
      
      command = {
        tool_name: 'keypress',
        parameters: { key, modifiers },
      };
    }

    await executeBrowserAction(command);
  }, [executeBrowserAction]);
  // +++ END OF THE FIX +++
  
  const handleScroll = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const command: BrowserActionCommand = {
      tool_name: 'scroll',
      parameters: { deltaX: event.deltaX, deltaY: event.deltaY },
    };
    executeBrowserAction(command);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black rounded shadow-lg cursor-crosshair"
      style={{ outline: 'none', userSelect: 'none' }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      onWheel={handleScroll}
      tabIndex={0}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={true}
        className="w-full h-full"
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
}