export interface SkeletonElement {
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // Backend sends w/h instead of width/height
  w?: number;
  h?: number;
  text?: string;
  fontSize?: number;
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  points?: number[][];
  id?: string;
  startBinding?: { elementId: string; focus?: number; gap?: number } | null;
  endBinding?: { elementId: string; focus?: number; gap?: number } | null;
  // For image elements
  imageUrl?: string;
  fileId?: string;
}

// Pure utility with no external imports to keep tests lightweight
export function convertSkeletonToExcalidrawElements(skeletonElements: SkeletonElement[]): any[] {
  const elements: any[] = [];
  const genId = () => `el_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const q = (n: any, step = 8) => Math.round(Number(n ?? 0) / step) * step;
  const stableId = (skel: SkeletonElement): string => {
    const t = skel.type;
    if (t === 'image') {
      // Prefer fileId if present, else geometry
      const fid = (skel as any).fileId || '';
      return `img|${fid}|${q(skel.x)}|${q(skel.y)}|${q(skel.width)}|${q(skel.height)}`;
    }
    if (t === 'text') {
      return `txt|${q(skel.x)}|${q(skel.y)}|${q(skel.width)}|${q(skel.height)}`;
    }
    // shapes
    return `${t}|${q(skel.x)}|${q(skel.y)}|${q(skel.width)}|${q(skel.height)}`;
  };

  // Auto-layout: if multiple non-line/arrow elements have missing/zero coords, lay them out on a grid.
  const CELL_W = 260;
  const CELL_H = 180;
  const MARGIN_X = 40;
  const MARGIN_Y = 40;
  const layoutPos = new Map<number, { x: number; y: number }>();
  const candidates: number[] = [];
  const nearZero = (n: any) => {
    const v = Number(n);
    return !Number.isFinite(v) || Math.abs(v) < 2; // treat undefined/NaN as zero-ish
  };
  const textSkels = skeletonElements
    .map((s, idx) => ({ idx, s }))
    .filter(({ s }) => s.type === 'text')
    .map(({ idx, s }) => ({
      idx,
      x: Number(s.x ?? 0),
      y: Number(s.y ?? 0),
      w: Number(s.width ?? 0),
      h: Number(s.height ?? 0),
      text: (s.text || '').toString().trim().toLowerCase(),
    }));
  skeletonElements.forEach((skel, idx) => {
    if (skel.type === 'arrow' || skel.type === 'line') return;
    if (nearZero(skel.x) && nearZero(skel.y)) candidates.push(idx);
  });
  if (candidates.length > 1) {
    let placeIdx = 0;
    candidates.forEach((idx) => {
      const col = placeIdx % 3;
      const row = Math.floor(placeIdx / 3);
      layoutPos.set(idx, { x: MARGIN_X + col * CELL_W, y: MARGIN_Y + row * CELL_H });
      placeIdx += 1;
    });
  }

  // Pass 1: shapes + bound text
  skeletonElements.forEach((skel, idx) => {
    if (skel.type === 'arrow' || skel.type === 'line') return;

    const baseId = skel.id || stableId(skel);
    const lay = layoutPos.get(idx);
    const baseX = (lay ? lay.x : (skel.x ?? 0));
    const baseY = (lay ? lay.y : (skel.y ?? 0));

    // Handle standalone text elements explicitly
    if (skel.type === 'text') {
      const fontSize = skel.fontSize || 16;
      const textElement = {
        id: baseId,
        type: 'text',
        x: baseX,
        y: baseY,
        width: skel.width || skel.w || 200,
        height: skel.height || skel.h || Math.max(24, Math.round(fontSize * 1.2)),
        text: (skel.text || '').toString(),
        fontSize,
        fontFamily: 1,
        textAlign: 'left',
        verticalAlign: 'top',
        baseline: Math.round(fontSize),
        lineHeight: 1.25,
        containerId: null,
        originalText: (skel.text || '').toString(),
        autoResize: true,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        angle: 0,
        seed: Math.floor(Math.random() * 1_000_000),
        version: Date.now(),
        versionNonce: Math.floor(Math.random() * 1_000_000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        groupIds: [] as string[],
        frameId: null,
        roundness: null,
      };
      elements.push(textElement);
      return;
    }

    // Handle image elements explicitly
    if (skel.type === 'image') {
      const fileId = skel.fileId || baseId;
      const imageElement = {
        id: baseId,
        type: 'image',
        x: baseX,
        y: baseY,
        width: skel.width || skel.w || 200,
        height: skel.height || skel.h || 150,
        fileId,
        // Common element props to satisfy Excalidraw schema
        strokeColor: 'transparent',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [] as string[],
        roundness: null as any,
        frameId: null as any,
        // Image-specific
        scale: [1, 1] as [number, number],
        status: 'saved',
        angle: 0,
        seed: Math.floor(Math.random() * 1_000_000),
        version: Date.now(),
        versionNonce: Math.floor(Math.random() * 1_000_000),
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
      };
      elements.push(imageElement);
      return;
    }

    const shapeElement = {
      id: baseId,
      type: skel.type,
      x: baseX,
      y: baseY,
      width: skel.width || skel.w || 120,
      height: skel.height || skel.h || 60,
      strokeColor: skel.strokeColor || '#1e1e1e',
      backgroundColor: skel.backgroundColor || 'transparent',
      fillStyle: 'solid',
      strokeWidth: skel.strokeWidth || 2,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: skel.type === 'rectangle' ? { type: 3, value: 32 } : null,
      angle: 0,
      seed: Math.floor(Math.random() * 1_000_000),
      version: Date.now(),
      versionNonce: Math.floor(Math.random() * 1_000_000),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      customData: null,
    };
    elements.push(shapeElement);

    if (skel.text && skel.text.trim() !== '') {
      // Heuristic: if there is a separate text skeleton near where we would place bound text,
      // skip creating the bound text to avoid duplicates.
      const wantText = (skel.text || '').toString().trim().toLowerCase();
      const tx = baseX + 10;
      const ty = baseY + 10;
      const tw = (skel.width || skel.w || 120) - 20;
      const th = (skel.height || skel.h || 60) - 20;
      const near = textSkels.some((t) => {
        const within = Math.abs(t.x - tx) < 20 && Math.abs(t.y - ty) < 20;
        const similar = !wantText || !t.text || t.text === wantText;
        return within && similar;
      });
      if (!near) {
      const shapeWidth = skel.width || skel.w || 120;
      const shapeHeight = skel.height || skel.h || 60;
      const fontSize = skel.fontSize || 16;
      
      const textElement = {
        id: `${baseId}_text`,
        type: 'text',
        x: baseX + shapeWidth * 0.1,
        y: baseY + shapeHeight * 0.5 - fontSize * 0.6,
        width: shapeWidth * 0.8,
        height: fontSize * 1.2,
        text: skel.text.trim(),
        fontSize,
        fontFamily: 1,
        textAlign: 'center',
        verticalAlign: 'middle',
        baseline: fontSize,
        lineHeight: 1.25,
        containerId: baseId,
        originalText: skel.text.trim(),
        autoResize: false,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        angle: 0,
        seed: Math.floor(Math.random() * 1_000_000),
        version: Date.now(),
        versionNonce: Math.floor(Math.random() * 1_000_000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        groupIds: [] as string[],
        frameId: null,
        roundness: null,
      };
      elements.push(textElement);
      }
    }
  });

  // Pass 2: arrows and lines + bound text
  skeletonElements.forEach((skel) => {
    if ((skel.type !== 'arrow' && skel.type !== 'line') || !skel.id) return;

    const w = skel.width || skel.w || 100;
    const h = skel.height || skel.h || 0;
    // For arrows with bindings, calculate points based on element positions
    let pts = [[0, 0], [w, h]];
    if (skel.points && skel.points.length >= 2) {
      pts = skel.points;
    } else if (w > 0 || h != 0) {
      pts = [[0, 0], [w, h]];
    }

    const lineLike = {
      id: skel.id,
      type: skel.type,
      x: skel.x ?? 0,
      y: skel.y ?? 0,
      width: 0,
      height: 0,
      strokeColor: skel.strokeColor || '#1e1e1e',
      backgroundColor: 'transparent',
      strokeWidth: skel.strokeWidth || 2,
      fillStyle: 'solid',
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      startBinding: skel.startBinding ? { elementId: skel.startBinding.elementId, focus: 0.5, gap: 4 } : 
                   (skel as any).startBindingId ? { elementId: (skel as any).startBindingId, focus: 0.5, gap: 4 } : null,
      endBinding: skel.endBinding ? { elementId: skel.endBinding.elementId, focus: 0.5, gap: 4 } : 
                 (skel as any).endBindingId ? { elementId: (skel as any).endBindingId, focus: 0.5, gap: 4 } : null,
      points: pts,
      lastCommittedPoint: null,
      startArrowhead: null,
      endArrowhead: (skel.type === 'arrow') ? 'arrow' : null,
      elbowed: false,
      angle: 0,
      seed: Math.floor(Math.random() * 1_000_000),
      version: Date.now(),
      versionNonce: Math.floor(Math.random() * 1_000_000),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      customData: null,
    };
    elements.push(lineLike);
  });

  return elements;
};
