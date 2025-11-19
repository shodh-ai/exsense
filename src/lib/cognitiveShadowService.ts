const IMPRINTER_URL =
  process.env.NEXT_PUBLIC_IMPRINTER_URL ||
  process.env.NEXT_PUBLIC_LANGGRAPH_API_URL ||
  process.env.NEXT_PUBLIC_IMPRINTER_BASE ||
  'http://localhost:8002';

export type PendingQuestion = {
  text: string;
  context_replay?: {
    rrweb_asset_id: string;
    start_timestamp: number;
    play_duration_ms: number;
  };
};

export type CognitiveShadowState = {
  session_id: string;
  live_graph_representation: unknown | null;
  pending_questions: PendingQuestion[];
};

export async function fetchShadowState(sessionId: string): Promise<CognitiveShadowState> {
  const res = await fetch(`${IMPRINTER_URL}/session/shadow/${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch Cognitive Shadow state (${res.status})`);
  return res.json();
}

export async function approvePlan(payload: {
  curriculum_id: string;
  session_id: string;
  draft_tree_proposal: unknown;
}): Promise<{ status: string }> {
  const res = await fetch(`${IMPRINTER_URL}/session/approve_plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to approve plan (${res.status})`);
  return res.json();
}
