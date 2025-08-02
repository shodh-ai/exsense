"use client";

import React, { useCallback, useEffect, useRef } from "react"; // Import useRef
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useSessionStore } from "@/lib/store";
import { useExcalidrawIntegration } from "@/hooks/useExcalidrawIntegration";

declare global {
  interface Window {
    __excalidrawDebug?: {
      toggleLaserPointer: () => void;
      captureCanvasScreenshot: () => Promise<string>;
      highlightElements: (elementIds: string[]) => void;
      removeHighlighting: () => void;
      giveStudentControl: () => void;
      takeAIControl: () => void;
      getSceneElements: () => any[];
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

  // Ref to prevent infinite loops when resetting scroll position
  const isRestoringPosition = useRef(false);

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
          const elements = excalidrawAPI.getSceneElements();
          console.log('Canvas elements:', elements);
          // Return a promise that resolves with the elements
          return Promise.resolve(JSON.stringify(elements, null, 2));
        },
        highlightElements: (elementIds: string[]) => {
          excalidrawAPI.updateScene({
            elements: excalidrawAPI.getSceneElements().map(el => ({
              ...el,
              opacity: elementIds.includes(el.id) ? 0.5 : 1
            }))
          });
        },
        removeHighlighting: () => {
          excalidrawAPI.updateScene({
            elements: excalidrawAPI.getSceneElements().map(el => ({
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
        getSceneElements: () => excalidrawAPI.getSceneElements()
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
  const handleExcalidrawAPI = useCallback((api: any) => {
    if (api && api !== excalidrawAPI) {
      setExcalidrawAPI(api);
    }
  }, [excalidrawAPI, setExcalidrawAPI]);
  
  // This function will be called whenever the canvas changes.
  // We use it to detect and prevent scrolling.
  const handleCanvasChange = useCallback((elements: any, appState: any) => {
    if (isRestoringPosition.current) {
      return;
    }

    if (excalidrawAPI && (appState.scrollX !== 0 || appState.scrollY !== 0)) {
      isRestoringPosition.current = true;
      excalidrawAPI.updateScene({
        elements,
        appState: {
          ...appState,
          scrollX: 0,
          scrollY: 0,
        },
      });
      // Use setTimeout to reset the flag after the update has processed
      setTimeout(() => {
        isRestoringPosition.current = false;
      }, 0);
    }
  }, [excalidrawAPI]);


  return (
    <div style={{ height: '100vh', width: '100%', zIndex: 10, backgroundColor: 'transparent' }}>
      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}
        onPointerUpdate={handlePointerUpdate}
        onChange={handleCanvasChange} // Add the change handler to prevent scrolling
        renderTopRightUI={() => null} // This will remove the "Library" button
        UIOptions={{
          // This hides the hand tool from the toolbar
          tools: {
            hand: false,
          },
        }}
        viewModeEnabled={false}
        zenModeEnabled={false}
        gridModeEnabled={false}
        initialData={{
          appState: {
            viewBackgroundColor: 'transparent',
            // Set initial scroll position to 0,0
            scrollX: 0,
            scrollY: 0,
          }
        }}
      />
    </div>
  );
};

export default ExcalidrawWrapper;