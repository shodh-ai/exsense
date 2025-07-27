"use client";

import React, { useCallback, useEffect } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useSessionStore } from "@/lib/store";
import { useExcalidrawIntegration } from "@/hooks/useExcalidrawIntegration";

// File: exsense/src/components/session/ExcalidrawWrapper.tsx



declare global {
  interface Window {
    __excalidrawDebug?: {
      toggleLaserPointer: () => void;
      captureCanvasScreenshot: () => Promise<string>;
      highlightElements: (elementIds: string[]) => void;
      removeHighlighting: () => void;
      giveStudentControl: () => void;
      takeAIControl: () => void;
      getSceneElements: () => unknown[];
    };
  }
}

const ExcalidrawWrapper = () => {
  const excalidrawAPIFromStore = useSessionStore(state => state.excalidrawAPI);
  const setExcalidrawAPIToStore = useSessionStore(state => state.setExcalidrawAPI);

  // Use the unified integration hook
  const {
    excalidrawAPI,
    setExcalidrawAPI,
    handlePointerUpdate,
    toggleLaserPointer,
    captureCanvasScreenshot,
    highlightElements,
    removeHighlighting,
    giveStudentControl,
    takeAIControl
  } = useExcalidrawIntegration();

  // Sync with session store
  useEffect(() => {
    if (excalidrawAPI && excalidrawAPI !== excalidrawAPIFromStore) {
      setExcalidrawAPIToStore(excalidrawAPI);
    }
  }, [excalidrawAPI, excalidrawAPIFromStore, setExcalidrawAPIToStore]);

  // Expose debug functions to window
  useEffect(() => {
    if (excalidrawAPI) {
      window.__excalidrawDebug = {
        toggleLaserPointer: () => toggleLaserPointer(),
        captureCanvasScreenshot: async () => {
          const elements = (excalidrawAPI as any).getSceneElements();
          console.log('Canvas elements:', elements);
          // Return a promise that resolves with the elements
          return Promise.resolve(JSON.stringify(elements, null, 2));
        },
        highlightElements: (elementIds: string[]) => {
          (excalidrawAPI as any).updateScene({
            elements: (excalidrawAPI as any).getSceneElements().map((el: any) => ({
              ...el,
              opacity: elementIds.includes(el.id) ? 0.5 : 1
            }))
          });
        },
        removeHighlighting: () => {
          (excalidrawAPI as any).updateScene({
            elements: (excalidrawAPI as any).getSceneElements().map((el: any) => ({
              ...el,
              opacity: 1
            }))
          });
        },
        giveStudentControl: () => {
          console.log('Giving control to student');
          // Add your student control logic here
        },
        takeAIControl: () => {
          console.log('AI taking control');
          // Add your AI control logic here
        },
        getSceneElements: () => (excalidrawAPI as any).getSceneElements()
      };
      
      console.log('Excalidraw debug functions are now available at window.__excalidrawDebug');
      console.log('Available methods:', Object.keys(window.__excalidrawDebug));
    }

    return () => {
      // Cleanup
      delete window.__excalidrawDebug;
    };
  }, [excalidrawAPI, toggleLaserPointer]);

  // Handle Excalidraw API initialization
  const handleExcalidrawAPI = useCallback((api: unknown) => {
    if (api && api !== excalidrawAPI) {
      setExcalidrawAPI(api);
    }
  }, [excalidrawAPI, setExcalidrawAPI]);

  return (
    <div style={{ height: '100vh', width: '100%', zIndex: 10, backgroundColor: 'transparent' }}>
      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}
        onPointerUpdate={handlePointerUpdate}
        viewModeEnabled={false}
        zenModeEnabled={false}
        gridModeEnabled={false}
        initialData={{
          appState: {
            viewBackgroundColor: 'transparent'
          }
        }}
      />
    </div>
  );
};

export default ExcalidrawWrapper;
