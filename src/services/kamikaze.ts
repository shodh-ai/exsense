// exsense/src/services/kamikaze.ts
export type DeliveryPlan = {
  actions: Array<{ tool_name: string; parameters: Record<string, unknown> }>;
  metadata?: {
    suggested_responses?: Array<string | { id?: string; text: string; reason?: string; title?: string }>;
    focus_nodes?: string[];
    audio_urls?: string[];
  };
};

export async function startSession(sessionId: string, studentId: string, thesisId: string, studentInput: string) {
  const base = process.env.NEXT_PUBLIC_KAMIKAZE_BASE || 'http://localhost:8001';
  const res = await fetch(`${base}/start_session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, student_id: studentId, thesis_id: thesisId, student_input: studentInput })
  });
  if (!res.ok) throw new Error(`Failed to start session: ${res.status}`);
  return res.json() as Promise<{ success: boolean; delivery_plan?: DeliveryPlan; error?: string }>; 
}

export async function handleResponse(sessionId: string, studentId: string, thesisId: string, studentInput: string) {
  const base = process.env.NEXT_PUBLIC_KAMIKAZE_BASE || 'http://localhost:8001';
  const res = await fetch(`${base}/handle_response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, student_id: studentId, thesis_id: thesisId, student_input: studentInput })
  });
  if (!res.ok) throw new Error(`Failed to handle response: ${res.status}`);
  return res.json() as Promise<{ success: boolean; delivery_plan?: DeliveryPlan; error?: string }>; 
}
