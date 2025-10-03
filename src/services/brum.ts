// exsense/src/services/brum.ts
export type ThesisSummary = {
  thesis_id: string;
  thesis_title: string;
  author_id: string;
  description?: string;
};

export interface ReactFlowNode {
  id: string;
  [key: string]: unknown;
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  [key: string]: unknown;
}

export type ReactFlowGraph = {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
};

const BRUM_BASE = process.env.NEXT_PUBLIC_BRUM_BASE || 'http://localhost:8000';

export async function fetchTheses(): Promise<ThesisSummary[]> {
  const res = await fetch(`${BRUM_BASE}/theses`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch theses: ${res.status}`);
  return res.json();
}

export async function fetchThesisGraph(thesisId: string): Promise<ReactFlowGraph> {
  const res = await fetch(`${BRUM_BASE}/graph/${encodeURIComponent(thesisId)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch graph: ${res.status}`);
  const data = await res.json();
  // Be robust to backend returning array only (nodes) or full object {nodes,edges}
  if (Array.isArray(data)) {
    return { nodes: data, edges: [] };
  }
  return { nodes: data.nodes || [], edges: data.edges || [] };
}
