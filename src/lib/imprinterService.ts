// src/lib/imprinterService.ts

const IMPRINTER_URL = process.env.NEXT_PUBLIC_IMPRINTER_URL || 'http://localhost:8002';

import type { LearningObjective } from './store';


export async function submitImprintingEpisode(payload: {
  expert_id: string;
  session_id: string;
  curriculum_id?: string;
  narration: string;
  audio_b64: string;
  expert_actions: any[];
  current_lo?: string;
  modified_files?: any[];
  staged_assets?: any[];
  in_response_to_question?: string;
}) {
  const url = `${IMPRINTER_URL}/session/imprint_episode`;
  // eslint-disable-next-line no-console
  console.log('[imprinterService] submitImprintingEpisode →', {
    url,
    payloadKeys: Object.keys(payload || {}),
    hasAudio: !!payload?.audio_b64,
    expertActionsCount: Array.isArray(payload?.expert_actions) ? payload.expert_actions.length : 0,
  });
  const body = JSON.stringify({
    ...payload,
    // Force debrief start on episode submission
    imprinting_mode: 'DEBRIEF_PRACTICAL',
  });
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!response.ok) {
    let errorText = '';
    try { errorText = await response.text(); } catch {}
    // eslint-disable-next-line no-console
    console.error('[imprinterService] submitImprintingEpisode ✗', { status: response.status, errorText });
    throw new Error(`Failed to submit episode (${response.status})`);
  }
  const json = await response.json();
  // eslint-disable-next-line no-console
  console.log('[imprinterService] submitImprintingEpisode ✓', { status: response.status, keys: Object.keys(json || {}) });
  return json;
}

export async function conversationalTurn(payload: {
  curriculum_id: string;
  session_id: string;
  imprinting_mode: 'DEBRIEF_CONCEPTUAL' | string;
  latest_expert_response: string;
  current_lo?: string;
  in_response_to_question?: string;
}) {
  const response = await fetch(`${IMPRINTER_URL}/session/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Conversational turn failed (${response.status})`);
  return response.json();
}

// NEW: Conceptual conversational turn with audio
export async function conversationalTurnAudio(payload: {
  curriculum_id: string;
  session_id: string;
  imprinting_mode: 'DEBRIEF_CONCEPTUAL' | string;
  latest_expert_audio_b64: string;
  current_lo?: string;
  in_response_to_question?: string;
}) {
  // Always post to /session/turn with audio fields; backend accepts latest_expert_audio_b64 or audio_b64
  const body = JSON.stringify({
    ...payload,
    audio_b64: payload.latest_expert_audio_b64,
  });
  const response = await fetch(`${IMPRINTER_URL}/session/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!response.ok) throw new Error(`Conversational audio turn failed (${response.status})`);
  return response.json();
}

export async function stageAsset(payload: {
  expert_id: string;
  session_id: string;
  curriculum_id?: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append('expert_id', payload.expert_id);
  formData.append('session_id', payload.session_id);
  if (payload.curriculum_id) formData.append('curriculum_id', payload.curriculum_id);
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
  curriculum_id?: string;
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

// --- NEW: Curriculum management endpoints ---
export async function processSeedDocument(payload: { curriculum_id: string; content: string }) {
  const response = await fetch(`${IMPRINTER_URL}/curriculum/process_seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Failed to process seed document (${response.status})`);
  return response.json();
}

export async function fetchCurriculumDraft(curriculum_id: string): Promise<LearningObjective[]> {
  const response = await fetch(`${IMPRINTER_URL}/curriculum/${curriculum_id}`);
  if (!response.ok) throw new Error(`Failed to fetch curriculum draft (${response.status})`);
  const data = await response.json();
  return data.curriculum as LearningObjective[];
}

export async function updateNode(payload: {
  curriculum_id: string;
  node_type: 'LO' | 'Concept';
  old_name: string;
  new_data: any;
}) {
  const response = await fetch(`${IMPRINTER_URL}/curriculum/update_node`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Failed to update node (${response.status})`);
  return response.json();
}

export async function createNode(payload: {
  curriculum_id: string;
  node_type: 'LO' | 'Concept' | 'WorkflowStep';
  new_data: any;
}) {
  const response = await fetch(`${IMPRINTER_URL}/curriculum/create_node`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Failed to create node (${response.status})`);
  return response.json();
}

export async function deleteNode(payload: {
  curriculum_id: string;
  node_type: 'LO' | 'Concept' | 'WorkflowStep';
  name: string;
}) {
  const response = await fetch(`${IMPRINTER_URL}/curriculum/delete_node`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Failed to delete node (${response.status})`);
  return response.json();
}

// --- LO Finalization ---
export async function finalizeLO(payload: { curriculum_id: string; lo_name: string }) {
  const response = await fetch(`${IMPRINTER_URL}/curriculum/finalize_lo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Failed to finalize LO (${response.status})`);
  return response.json();
}

// --- NEW: Save Setup Script for an LO ---
export async function saveSetupScript(payload: {
  curriculum_id: string;
  lo_name: string;
  actions: any[];
}) {
  const response = await fetch(`${IMPRINTER_URL}/curriculum/lo/setup_script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Failed to save setup script (${response.status})`);
  return response.json();
}
