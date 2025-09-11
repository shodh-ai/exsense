"use client";

import React, { useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";
import { useSessionStore } from "@/lib/store";
import { useExcalidrawIntegration } from "@/hooks/useExcalidrawIntegration";
import type { NormalizedZoomValue } from "@excalidraw/excalidraw/types";

// Dynamically import Excalidraw to prevent SSR issues, as it relies on browser APIs.
const Excalidraw = dynamic(async () => (await import("@excalidraw/excalidraw")).Excalidraw, {
  ssr: false,
  loading: () => <div style={{ height: "100%", width: "100%" }}>Loading whiteboard…</div>,
});

const ExcalidrawWrapper = () => {
  const excalidrawAPIFromStore = useSessionStore(state => state.excalidrawAPI);
  const setExcalidrawAPIToStore = useSessionStore(state => state.setExcalidrawAPI);

  // The hook now contains all the complex logic, keeping this component clean.
  const {
    excalidrawAPI,
    setExcalidrawAPI,
  } = useExcalidrawIntegration();

  // Sync the Excalidraw API instance with our global Zustand store.
  useEffect(() => {
    if (excalidrawAPI && excalidrawAPI !== excalidrawAPIFromStore) {
      setExcalidrawAPIToStore(excalidrawAPI);
    }
  }, [excalidrawAPI, excalidrawAPIFromStore, setExcalidrawAPIToStore]);

  const handleExcalidrawAPI = useCallback((api: any) => {
    if (api) {
      setExcalidrawAPI(api);
    }
  }, [setExcalidrawAPI]);

  return (
    <div 
      className="excalidraw-scrollable" 
      style={{ 
        position: 'relative', 
        height: '100%', 
        width: '100%', 
        zIndex: 20, 
        backgroundColor: 'transparent', 
        transition: 'opacity 80ms ease',
        overflow: 'auto'
      }}
    >
      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}
        renderTopRightUI={() => null} // Hide default UI elements for a clean look.
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            clearCanvas: false,
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
            saveAsImage: false,
          },
          tools: {
            image: false,
          },
        }}
        viewModeEnabled={false}
        zenModeEnabled={false}
        gridModeEnabled={false}
        initialData={{
          appState: {
            viewBackgroundColor: 'transparent',
            scrollX: 0,
            scrollY: 0,
            zoom: { value: 1 as NormalizedZoomValue }
          }
        }}
      />
      {/* Custom styles to hide unwanted UI elements. */}
      <style jsx global>{`
        .excalidraw-scrollable .layer-ui__wrapper__top-right { display: none !important; }
        .excalidraw-scrollable .layer-ui__wrapper__top-left { display: none !important; }
        .excalidraw-scrollable .sidebar-trigger { display: none !important; }
        .excalidraw-scrollable .App-toolbar-container { display: none !important; }
        .excalidraw-scrollable .App-bottom-bar { display: none !important; }
        .excalidraw-scrollable .help-icon { display: none !important; }
        .excalidraw-scrollable .fixed-zen-mode-transition,
        .excalidraw-scrollable .zen-mode-transition { display: none !important; }
        .excalidraw-scrollable .layer-ui__wrapper { display: none !important; }
      `}</style>
    </div>
  );
};

export default ExcalidrawWrapper;