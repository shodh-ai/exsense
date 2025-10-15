"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(async () => (await import("@excalidraw/excalidraw")).Excalidraw, {
  ssr: false,
  loading: () => <div style={{ height: 320, width: "100%" }}>Loading whiteboard…</div>,
});
const NORMAL_HEIGHT = 480;

export interface ExcalidrawBlockViewProps {
  initialElements: any[];
}

const ExcalidrawBlockView: React.FC<ExcalidrawBlockViewProps> = ({ initialElements }) => {
  const apiRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiReadyRef = useRef(false);
  const mountedRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const handleAPI = useCallback((api: any) => {
    apiRef.current = api;
    apiReadyRef.current = true;
    // Kick an initial fit after mount on next frames
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => requestAnimationFrame(() => { if (mountedRef.current) fitNow(); }));
    }
  }, []);

  // Track mount lifecycle to prevent updates before/after mount
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Lock background scroll when fullscreen overlay is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const original = document.body.style.overflow;
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = original;
    };
  }, [isFullscreen]);

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
          const textStr = (element.text ?? '').toString();
          // Approximate a generous width to avoid clipping. Cap to reasonable range.
          const approxWidth = Math.max(360, Math.min(1200, Math.round((textStr.length || 12) * (fontSize * 0.6))));
          const width = element.width ?? approxWidth;
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
    // Clamp in normal mode; fullscreen uses viewport height via container style
    const maxNormal = 560;
    return Math.max(300, Math.min(maxNormal, Math.round(padded)));
  }, [normalized]);

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

  const computeBounds = useCallback((els: any[]) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of els) {
      if (el?.isDeleted) continue;
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
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 };
    }
    return { minX, minY, maxX, maxY, w: Math.max(0, maxX - minX), h: Math.max(0, maxY - minY) };
  }, []);

  const fitNow = useCallback(() => {
    if (!mountedRef.current || !apiReadyRef.current) return;
    const api = apiRef.current;
    const els = (api?.getSceneElements?.() || normalized) as any[];
    if (!api || !els?.length) return;
    const container = containerRef.current;
    if (!container) return;
    try {
      const bounds = computeBounds(els);
      const rect = container.getBoundingClientRect();
      const pad = isFullscreen ? 16 : 48;
      const availW = Math.max(1, rect.width - pad * 2);
      const availH = Math.max(1, rect.height - pad * 2);
      const scaleW = bounds.w > 0 ? availW / bounds.w : 1;
      const scaleH = bounds.h > 0 ? availH / bounds.h : 1;
      let z = Math.min(scaleW, scaleH);
      z = Math.max(0.4, Math.min(z, isFullscreen ? 2.0 : 1.2));
      const cx = bounds.minX + bounds.w / 2;
      const cy = bounds.minY + bounds.h / 2;
      const scrollX = rect.width / 2 - cx * z;
      const scrollY = rect.height / 2 - cy * z;
      api.updateScene?.({ appState: { zoom: { value: z }, scrollX, scrollY } });
    } catch {}
  }, [normalized, isFullscreen, computeBounds]);

  useEffect(() => {
    if (!mountedRef.current || !apiReadyRef.current) return;
    // Defer to next two frames to ensure child is mounted
    requestAnimationFrame(() => requestAnimationFrame(() => { fitNow(); }));
  }, [initialElements, normalized, isFullscreen, fitNow]);

  // Re-fit on window resize
  useEffect(() => {
    const onResize = () => { if (mountedRef.current) fitNow(); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fitNow]);

  // Re-fit when container size changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { if (mountedRef.current) fitNow(); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitNow]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel as any);
    };
  }, [isFullscreen]);

  // Ensure selection tool is active when entering fullscreen (we hide toolbar)
  useEffect(() => {
    try { apiRef.current?.setActiveTool?.({ type: 'selection' }); } catch {}
  }, [isFullscreen]);

  const board = (
    <>
      {/* Maximize / Restore button */}
      <button
        type="button"
        onClick={() => setIsFullscreen(v => !v)}
        title={isFullscreen ? 'Exit full screen' : 'Maximize'}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 60,
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(17,25,40,0.85)',
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
          tools: { image: false },
        }}
        viewModeEnabled={!isFullscreen}
        zenModeEnabled={false}
        gridModeEnabled={false}
        initialData={initialData as any}
      />
    </>
  );

  return (
    <>
      {/* Normal in-flow card */}
      {!isFullscreen && (
        <div ref={containerRef} style={{ position: 'relative', height: NORMAL_HEIGHT, width: '100%', background: 'transparent', overflow: 'hidden' }}>
          {board}
        </div>
      )}

      {/* Fullscreen overlay via portal */}
      {isFullscreen && typeof window !== 'undefined' && createPortal(
        <div
          onClick={() => setIsFullscreen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(10, 13, 23, 0.75)',
            backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            ref={containerRef}
            style={{
              position: 'absolute',
              top: '4vh', bottom: '4vh', left: '3vw', right: '3vw',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'transparent',
              boxShadow: '0 10px 40px rgba(0,0,0,0.45)'
            }}
          >
            {board}
          </div>
        </div>,
        document.body
      )}

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
    </>
  );
}
;

export default ExcalidrawBlockView;
