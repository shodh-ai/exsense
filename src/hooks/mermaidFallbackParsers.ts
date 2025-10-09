// Lightweight fallback parsers to handle Mermaid mindmap and erDiagram
// by generating skeleton elements that our convertSkeletonToExcalidrawElements()
// can turn into Excalidraw elements.

export interface SkeletonElement {
  type: string;
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  points?: number[][];
  startBinding?: { elementId: string; focus?: number; gap?: number } | null;
  endBinding?: { elementId: string; focus?: number; gap?: number } | null;
}

function makeId(prefix = 'el'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
}

// ---- ER DIAGRAM ----
// Parses a subset of mermaid erDiagram syntax
// Example lines:
// erDiagram
//   CUSTOMER ||--o{ ORDER : places
//   ORDER ||--|{ LINE_ITEM : contains
//   CUSTOMER {\n string name\n}
export function tryParseErDiagramToSkeleton(input: string): SkeletonElement[] | null {
  const src = input.trim();
  if (!/^erDiagram\b/i.test(src)) return null;

  const lines = src.split(/\r?\n/);
  const entities = new Map<string, { name: string; fields: string[] }>();
  const rels: Array<{ a: string; b: string; label?: string } > = [];

  // Collect blocks and relationships
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    // Relationship like: A ||--o{ B : label
    const relMatch = line.match(/^(\w+)\s+[^\w]+\s+(\w+)(?:\s*:\s*(.+))?$/);
    if (relMatch) {
      rels.push({ a: relMatch[1], b: relMatch[2], label: relMatch[3]?.trim() });
      i++; continue;
    }
    // Entity block start: NAME { ... }
    const entStart = line.match(/^(\w+)\s*\{/);
    if (entStart) {
      const name = entStart[1];
      const fields: string[] = [];
      i++;
      while (i < lines.length) {
        const l2 = lines[i];
        if (l2.includes('}')) { i++; break; }
        const f = l2.trim();
        if (f) fields.push(f);
        i++;
      }
      entities.set(name, { name, fields });
      continue;
    }
    i++;
  }

  // Create nodes with simple grid layout
  const result: SkeletonElement[] = [];
  const names = Array.from(new Set([...Array.from(entities.keys()), ...rels.flatMap(r => [r.a, r.b])]))
    .sort();
  const COLS = 3; const CELL_W = 320; const CELL_H = 220; const PAD = 40;
  names.forEach((n, idx) => {
    const col = idx % COLS; const row = Math.floor(idx / COLS);
    const x = PAD + col * CELL_W; const y = PAD + row * CELL_H;
    const ent = entities.get(n);
    const title = n;
    const textLines = ent?.fields?.length ? ent.fields.map(s => s.replace(/\s+/g, ' ').trim()) : [];
    // Body rectangle
    result.push({ type: 'rectangle', id: `ent_${n}`, x, y, width: 260, height: Math.max(100, 40 + textLines.length * 22) });
    // Title text
    result.push({ type: 'text', id: `ent_${n}_title`, x: x + 16, y: y + 12, width: 228, height: 28, text: title, fontSize: 18 });
    // Divider (thin rectangle as a line)
    result.push({ type: 'rectangle', x: x + 8, y: y + 44, width: 244, height: 2, backgroundColor: '#1f2937' });
    // Fields
    textLines.forEach((t, i2) => {
      result.push({ type: 'text', x: x + 16, y: y + 54 + i2 * 22, width: 228, height: 20, text: t, fontSize: 14 });
    });
  });

  // Create connectors as arrows roughly between entity centers
  rels.forEach((r) => {
    const aId = `ent_${r.a}`; const bId = `ent_${r.b}`;
    // We do not know exact positions here; consumer may post-process to bind if needed
    result.push({ type: 'arrow', id: makeId('rel'), x: 0, y: 0, width: 180, height: 0, startBinding: { elementId: aId }, endBinding: { elementId: bId } });
    if (r.label) {
      result.push({ type: 'text', x: 0, y: 0, width: 140, height: 20, text: r.label, fontSize: 12 });
    }
  });

  return result;
}

// ---- MINDMAP ----
// Parses Mermaid mindmap indentation into a simple tree layout
export function tryParseMindmapToSkeleton(input: string): SkeletonElement[] | null {
  const src = input.trim();
  if (!/^mindmap\b/i.test(src)) return null;
  const lines = src.split(/\r?\n/).slice(1); // skip 'mindmap'

  // Build a stack of nodes by indentation
  type Node = { id: string; text: string; depth: number; children: Node[] };
  const nodes: Node[] = [];
  const stack: Node[] = [];
  for (const raw of lines) {
    const m = raw.match(/^(\s*)(.+)$/);
    if (!m) continue;
    const indent = m[1].replace(/\t/g, '  ').length; // spaces-only
    const depth = Math.round(indent / 2);
    const text = m[2].trim();
    if (!text) continue;
    const node: Node = { id: makeId('mm'), text, depth, children: [] };
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    if (stack.length === 0) {
      nodes.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  // Layout: depth on X, sibling index on Y
  const result: SkeletonElement[] = [];
  const X_STEP = 280; const Y_STEP = 120; const PAD_X = 40; const PAD_Y = 40;
  const levels: Map<number, number> = new Map(); // depth -> next row

  function place(n: Node) {
    const row = levels.get(n.depth) ?? 0;
    const x = PAD_X + n.depth * X_STEP;
    const y = PAD_Y + row * Y_STEP;
    levels.set(n.depth, row + 1);
    // Node box and label
    result.push({ type: 'rectangle', id: n.id, x, y, width: 220, height: 60 });
    result.push({ type: 'text', x: x + 12, y: y + 20, width: 196, height: 24, text: n.text, fontSize: 16 });
    // Edges to children
    for (const c of n.children) {
      place(c);
      result.push({ type: 'arrow', id: makeId('mm_rel'), x, y, width: 120, height: 0, startBinding: { elementId: n.id }, endBinding: { elementId: c.id } });
    }
  }

  nodes.forEach(place);
  return result;
}
