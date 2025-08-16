export interface SkeletonElement {
  type: 'rectangle' | 'ellipse' | 'diamond' | 'text' | 'arrow' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  strokeColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  strokeWidth?: number;
  connections?: { from: string; to: string }[];
  points?: number[][];
  id?: string;
  startBinding?: { elementId: string; focus?: number; gap?: number } | null;
  endBinding?: { elementId: string; focus?: number; gap?: number } | null;
}

// Pure utility with no external imports to keep tests lightweight
export const convertSkeletonToExcalidrawElements = (
  skeletonElements: SkeletonElement[]
): any[] => {
  const elements: any[] = [];

  // Pass 1: shapes + bound text
  skeletonElements.forEach((skel) => {
    if (skel.type === 'arrow' || !skel.id) return;

    const shapeElement = {
      id: skel.id,
      type: skel.type,
      x: skel.x,
      y: skel.y,
      width: skel.width,
      height: skel.height,
      strokeColor: skel.strokeColor || '#1e1e1e',
      backgroundColor: skel.backgroundColor || 'transparent',
      fillStyle: 'hachure',
      strokeWidth: skel.strokeWidth || 1,
      strokeStyle: 'solid',
      roughness: 1,
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
    };
    elements.push(shapeElement);

    if (skel.text && skel.text.trim() !== '') {
      const textElement = {
        id: `${skel.id}_text`,
        type: 'text',
        x: skel.x + 10,
        y: skel.y + 10,
        width: skel.width - 20,
        height: skel.height - 20,
        text: skel.text.trim(),
        fontSize: skel.fontSize || 16,
        fontFamily: 1,
        textAlign: 'center',
        verticalAlign: 'middle',
        containerId: skel.id,
        strokeColor: '#1e1e1e',
        angle: 0,
        seed: Math.floor(Math.random() * 1_000_000),
        version: Date.now(),
        versionNonce: Math.floor(Math.random() * 1_000_000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
      };
      elements.push(textElement);
    }
  });

  // Pass 2: arrows + bound text
  skeletonElements.forEach((skel) => {
    if (skel.type !== 'arrow' || !skel.id) return;

    const arrowElement = {
      id: skel.id,
      type: 'arrow',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      strokeColor: skel.strokeColor || '#1e1e1e',
      backgroundColor: 'transparent',
      strokeWidth: skel.strokeWidth || 2,
      startBinding: skel.startBinding ? { elementId: skel.startBinding.elementId, focus: 0.5, gap: 4 } : null,
      endBinding: skel.endBinding ? { elementId: skel.endBinding.elementId, focus: 0.5, gap: 4 } : null,
      points: [[0, 0], [100, 100]],
      startArrowhead: null,
      endArrowhead: 'arrow',
      angle: 0,
      seed: Math.floor(Math.random() * 1_000_000),
      version: Date.now(),
      versionNonce: Math.floor(Math.random() * 1_000_000),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
    };
    elements.push(arrowElement);
  });

  return elements;
};
