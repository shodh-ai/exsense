"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(async () => (await import("@excalidraw/excalidraw")).Excalidraw, {
  ssr: false,
  loading: () => <div style={{ height: 320, width: "100%" }}>Loading whiteboard…</div>,
});

export interface ExcalidrawBlockViewProps {
  initialElements: any[];
}

const ExcalidrawBlockView: React.FC<ExcalidrawBlockViewProps> = ({ initialElements }) => {
  const apiRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const handleAPI = useCallback((api: any) => {
    apiRef.current = api;
  }, []);

  // Normalize incoming elements so Excalidraw doesn't crash on missing fields
  const normalizeElements = useCallback((els: any[]): any[] => {
    const makeId = () => `el_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return (Array.isArray(els) ? els : []).map((element, index) => {
      const base = {
        id: element.id || makeId(),
        type: element.type || 'rectangle',
        x: element.x ?? 0,
        y: element.y ?? 0,
        angle: 0,
        strokeColor: element.strokeColor || '#1e1e1e',
        backgroundColor: element.backgroundColor ?? (element.type === 'text' ? 'transparent' : 'transparent'),
        fillStyle: element.fillStyle || 'solid',
        strokeWidth: element.strokeWidth ?? 2,
        strokeStyle: element.strokeStyle || 'solid',
        roughness: element.roughness ?? 1,
        opacity: element.opacity ?? 100,
        groupIds: [],
        frameId: null,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        isDeleted: false,
        versionNonce: element.versionNonce ?? Math.floor(Math.random() * 1000000),
        seed: element.seed ?? Math.floor(Math.random() * 2147483647),
      } as any;

      switch (element.type) {
        case 'line':
        case 'arrow': {
          const points = element.points || [[0, 0], [element.width || 100, element.height || 0]];
          return {
            ...base,
            width: 0,
            height: 0,
            points,
            lastCommittedPoint: null,
            startBinding: element.startBinding ?? null,
            endBinding: element.endBinding ?? null,
            startArrowhead: element.type === 'arrow' ? 'arrow' : null,
            endArrowhead: element.type === 'arrow' ? 'arrow' : null,
          };
        }
        case 'text': {
          const fontSize = element.fontSize ?? 18;
          const fontFamily = element.fontFamily ?? 1;
          const width = element.width ?? 260;
          const height = element.height ?? Math.round(fontSize * 1.25);
          return {
            ...base,
            width,
            height,
            text: element.text ?? '',
            fontSize,
            fontFamily,
            textAlign: element.textAlign || 'left',
            verticalAlign: element.verticalAlign || 'top',
            containerId: null,
            originalText: element.text ?? '',
            autoResize: true,
            lineHeight: element.lineHeight ?? 1.25,
            baseline: Math.round(fontSize * 0.8),
          };
        }
        case 'ellipse':
          return { ...base, width: element.width ?? 120, height: element.height ?? 120 };
        case 'rectangle':
        default:
          return {
            ...base,
            width: element.width ?? 120,
            height: element.height ?? 60,
            roundness: element.roundness ?? null,
          };
      }
    });
  }, []);

  const normalized = useMemo(
    () => normalizeElements(Array.isArray(initialElements) ? initialElements : []),
    [initialElements, normalizeElements]
  );

  // Compute a content-aware height for the container
  const computedHeight = useMemo(() => {
    if (!normalized.length) return 360;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of normalized) {
      if (el.type === 'line' || el.type === 'arrow') {
        const pts = Array.isArray(el.points) ? el.points : [];
        const xs = pts.map((p: any) => (Array.isArray(p) ? p[0] : 0));
        const ys = pts.map((p: any) => (Array.isArray(p) ? p[1] : 0));
        const pMinX = Math.min(0, ...xs);
        const pMaxX = Math.max(0, ...xs);
        const pMinY = Math.min(0, ...ys);
        const pMaxY = Math.max(0, ...ys);
        minX = Math.min(minX, el.x + pMinX);
        maxX = Math.max(maxX, el.x + pMaxX);
        minY = Math.min(minY, el.y + pMinY);
        maxY = Math.max(maxY, el.y + pMaxY);
      } else {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + (el.width ?? 0));
        maxY = Math.max(maxY, el.y + (el.height ?? 0));
      }
    }
    const h = Math.max(0, maxY - minY);
    // Add padding so content has breathing room
    const padded = h + 160;
    // Clamp for aesthetics in normal mode; fullscreen uses viewport height
    const maxNormal = 720;
    return Math.max(300, Math.min(maxNormal, Math.round(padded)));
  }, [normalized]);

  // Ensure selection tool is active when entering fullscreen (edit mode without toolbar)
  useEffect(() => {
    const api = apiRef.current;
    try { api?.setActiveTool?.({ type: 'selection' }); } catch {}
  }, [isFullscreen]);

  const initialData = useMemo(() => ({
    elements: normalized,
    appState: {
      viewBackgroundColor: 'transparent',
      scrollX: 0,
      scrollY: 0,
      zoom: { value: 1 },
      activeTool: { type: 'selection' },
    },
  }), [normalized]);

  // Fit content when elements change or when toggling fullscreen
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const els = normalized;
    api.updateScene?.({ elements: els });
    try {
      if (els?.length && api.scrollToContent) {
        // In fullscreen, fit to content; in normal mode, center without overscaling
        const fit = isFullscreen ? true : true;
        api.updateScene?.({ appState: { zoom: { value: 1 } } });
        api.scrollToContent(els, { fitToContent: fit, animate: false, padding: 40 });
      }
    } catch {}
  }, [initialElements, normalized, isFullscreen]);

  // Re-fit on window resize for better responsiveness
  useEffect(() => {
    const onResize = () => {
      const api = apiRef.current;
      if (!api) return;
      try {
        const els = normalized;
        if (els?.length && api.scrollToContent) {
          api.scrollToContent(els, { fitToContent: true, animate: false, padding: 40 });
        }
      } catch {}
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [normalized]);

  // Re-fit when container dimensions change
  useEffect(() => {
    const api = apiRef.current;
    const el = containerRef.current;
    if (!api || !el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      try {
        const els = normalized;
        if (els?.length && api.scrollToContent) {
          api.scrollToContent(els, { fitToContent: true, animate: false, padding: 40 });
        }
      } catch {}
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [normalized]);

  return (
    <div ref={containerRef} style={{ position: 'relative', height: isFullscreen ? 'calc(100vh - 32px)' : computedHeight, width: '100%', background: 'transparent' }}>
      {/* Maximize / Restore button */}
      <button
        type="button"
        onClick={() => setIsFullscreen((v) => !v)}
        title={isFullscreen ? 'Exit full screen' : 'Maximize'}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(17,25,40,0.75)',
          color: '#fff',
          fontSize: 12,
          cursor: 'pointer'
        }}
      >
        {isFullscreen ? 'Exit Fullscreen' : 'Maximize'}
      </button>

      <Excalidraw
        excalidrawAPI={handleAPI}
        theme="light"
        renderTopRightUI={() => null}
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
        viewModeEnabled={!isFullscreen}
        zenModeEnabled={false}
        gridModeEnabled={false}
        initialData={initialData as any}
      />
      <style jsx global>{`
        /* Hide Excalidraw UI overlays and keep canvas only */
        .excalidraw .layer-ui__wrapper__top-right { display: none !important; }
        .excalidraw .layer-ui__wrapper__top-left { display: none !important; }
        .excalidraw .sidebar-trigger { display: none !important; }
        .excalidraw .App-toolbar-container { display: none !important; }
        .excalidraw .App-bottom-bar { display: none !important; }
        .excalidraw .help-icon { display: none !important; }
        .excalidraw .fixed-zen-mode-transition,
        .excalidraw .zen-mode-transition { display: none !important; }
        .excalidraw .layer-ui__wrapper { display: none !important; }
        /* Hide any stray scroll-to-content buttons */
        .excalidraw .scroll-back-to-content { display: none !important; }
        .excalidraw .button--scroll-back-to-content { display: none !important; }
      `}</style>
    </div>
  );
};

export default ExcalidrawBlockView;
