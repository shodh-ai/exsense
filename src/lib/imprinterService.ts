// src/lib/imprinterService.ts

const IMPRINTER_URL = process.env.NEXT_PUBLIC_IMPRINTER_URL || 'http://localhost:8002';


export async function submitImprintingEpisode(payload: {
  expert_id: string;
  session_id: string;
  narration: string;
  audio_b64: string;
  expert_actions: any[];
  current_lo?: string;
  modified_files?: any[];
  staged_assets?: any[];
}) {
  const response = await fetch(`${IMPRINTER_URL}/session/imprint_episode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      // Force debrief start on episode submission
      imprinting_mode: 'DEBRIEF_PRACTICAL',
    }),
  });
  if (!response.ok) throw new Error(`Failed to submit episode (${response.status})`);
  return response.json();
}

export async function conversationalTurn(payload: {
  curriculum_id: string;
  session_id: string;
  imprinting_mode: 'DEBRIEF_CONCEPTUAL' | string;
  latest_expert_response: string;
  current_lo?: string;
}) {
  const response = await fetch(`${IMPRINTER_URL}/session/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Conversational turn failed (${response.status})`);
  return response.json();
}

export async function stageAsset(payload: {
  expert_id: string;
  session_id: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append('expert_id', payload.expert_id);
  formData.append('session_id', payload.session_id);
  formData.append('file', payload.file);

  // Try namespaced endpoint first
  let response = await fetch(`${IMPRINTER_URL}/session/stage_asset`, {
    method: 'POST',
    body: formData,
  });
  // Fallback to legacy root endpoint if 404
  if (response.status === 404) {
    response = await fetch(`${IMPRINTER_URL}/stage_asset`, {
      method: 'POST',
      body: formData,
    });
  }
  if (!response.ok) throw new Error(`Failed to stage asset (${response.status})`);
  return response.json();
}

export async function submitSeed(payload: {
  expert_id: string;
  session_id: string;
  content: string;
}) {
  const response = await fetch(`${IMPRINTER_URL}/session/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Failed to submit seed (${response.status})`);
  return response.json();
}
