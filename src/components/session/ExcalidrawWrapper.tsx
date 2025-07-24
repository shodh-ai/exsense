"use client";

import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useSessionStore } from "@/lib/store";

const ExcalidrawWrapper = () => {
  const setExcalidrawAPI = useSessionStore(state => state.setExcalidrawAPI);

  return (
    // This parent div centers the component
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* This inner div sets the size AND is now shifted up */}
      <div
        style={{
          height: "90%",
          width: "90%",
          transform: "translateY(-5%)", // <-- ADD THIS LINE
        }}
      >
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={{
            appState: {
              viewBackgroundColor: "transparent",
            },
          }}
        />
      </div>
    </div>
  );
};

export default ExcalidrawWrapper;