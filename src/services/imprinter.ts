// exsense/src/services/imprinter.ts
export async function createThesis(authorId: string, thesisId: string, seed: string, sessionId: string) {
  const base = process.env.NEXT_PUBLIC_IMPRINTER_BASE || 'http://localhost:8080';
  const res = await fetch(`${base}/thesis/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author_id: authorId, session_id: sessionId, thesis_id: thesisId, content: seed })
  });
  if (!res.ok) throw new Error(`Failed to create thesis: ${res.status}`);
  return res.json();
}

export async function thesisTurn(thesisId: string, sessionId: string, text: string): Promise<{ action: string; text: string }>{
  const base = process.env.NEXT_PUBLIC_IMPRINTER_BASE || 'http://localhost:8080';
  const res = await fetch(`${base}/thesis/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thesis_id: thesisId, session_id: sessionId, latest_author_response: text })
  });
  if (!res.ok) throw new Error(`Failed to run thesis turn: ${res.status}`);
  return res.json();
}
