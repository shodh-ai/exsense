const INGESTION_URL = process.env.NEXT_PUBLIC_INGESTION_URL || 'http://localhost:8003';

export async function sendTeacherEmphasisEvent(payload: {
  session_id: string;
  curriculum_id?: string;
  current_lo?: string;
}) {
  const body = {
    type: 'teacher_emphasis',
    timestamp: new Date().toISOString(),
    payload: {},
    ...payload,
  };

  const res = await fetch(`${INGESTION_URL}/v1/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Failed to send teacher_emphasis event (${res.status})`);
  }
}
