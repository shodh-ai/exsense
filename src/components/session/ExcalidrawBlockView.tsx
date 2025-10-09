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
    // Clamp for aesthetics (tighter bounds)
    return Math.max(240, Math.min(600, Math.round(padded)));
  }, [normalized]);

  const initialData = useMemo(() => ({
    elements: normalized,
    appState: {
      viewBackgroundColor: 'transparent',
      scrollX: 0,
      scrollY: 0,
      zoom: { value: 1 },
    },
  }), [normalized]);

  // Update scene when elements change after mount
  useEffect(() => {
    try {
      const api = apiRef.current;
      if (api && Array.isArray(initialElements)) {
        const els = normalized;
        api.updateScene?.({ elements: els });
        // center content without changing zoom
        try {
          if (els?.length && api.scrollToContent) {
            api.updateScene?.({ appState: { zoom: { value: 1 } } });
            api.scrollToContent(els, { fitToContent: false, animate: false });
          }
        } catch {}
      }
    } catch {}
  }, [initialElements, normalized]);

  return (
    <div style={{ height: computedHeight, width: "100%", background: "transparent", pointerEvents: 'none' }}>
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
        viewModeEnabled={true}
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
