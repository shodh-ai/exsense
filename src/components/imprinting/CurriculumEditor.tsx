"use client";
//adsf
import React, { useMemo, useState } from 'react';
import { updateNode, createNode, deleteNode } from '@/lib/imprinterService';
import type { LearningObjective } from '@/lib/store';
import { useSessionStore } from '@/lib/store';

interface CurriculumEditorProps {
  initialDraft: LearningObjective[];
  onFinalize: () => void;
  curriculumId: string;
}

export default function CurriculumEditor({ initialDraft, onFinalize, curriculumId }: CurriculumEditorProps) {
  const [draft, setDraft] = useState<LearningObjective[]>(initialDraft || []);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setCurriculumDraft = useSessionStore(s => s.setCurriculumDraft);

  const hasItems = useMemo(() => Array.isArray(draft) && draft.length > 0, [draft]);

  const handleRenameLO = async (idx: number, newName: string) => {
    const old = draft[idx];
    if (!old || !newName || newName === old.name) return;
    setBusyKey(`lo-${idx}`);
    setError(null);
    try {
      await updateNode({
        curriculum_id: curriculumId,
        node_type: 'LO',
        old_name: old.name,
        new_data: { name: newName, description: old.description, scope: old.scope },
      });
      const updated = draft.map((lo, i) => (i === idx ? { ...lo, name: newName } : lo));
      setDraft(updated);
      setCurriculumDraft(updated);
    } catch (e: any) {
      setError(e?.message || 'Failed to rename LO');
    } finally {
      setBusyKey(null);
    }
  };

  const handleUpdateScope = async (idx: number, newScope: string) => {
    const lo = draft[idx];
    if (!lo) return;
    setBusyKey(`lo-scope-${idx}`);
    setError(null);
    try {
      await updateNode({
        curriculum_id: curriculumId,
        node_type: 'LO',
        old_name: lo.name,
        new_data: { scope: newScope },
      });
      const updated = draft.map((l, i) => (i === idx ? { ...l, scope: newScope } : l));
      setDraft(updated);
      setCurriculumDraft(updated);
    } catch (e: any) {
      setError(e?.message || 'Failed to update scope');
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteConcept = async (loIdx: number, conceptIdx: number) => {
    const lo = draft[loIdx];
    const concept = lo?.concepts?.[conceptIdx];
    if (!lo || !concept) return;
    setBusyKey(`concept-${loIdx}-${conceptIdx}`);
    setError(null);
    try {
      await deleteNode({
        curriculum_id: curriculumId,
        node_type: 'Concept',
        name: concept.name,
      });
      const updated = draft.map((l, i) =>
        i === loIdx ? { ...l, concepts: l.concepts.filter((_, j) => j !== conceptIdx) } : l
      );
      setDraft(updated);
      setCurriculumDraft(updated);
    } catch (e: any) {
      setError(e?.message || 'Failed to delete concept');
    } finally {
      setBusyKey(null);
    }
  };

  const handleAddConcept = async (loIdx: number, conceptName: string) => {
    const lo = draft[loIdx];
    if (!lo || !conceptName.trim()) return;
    setBusyKey(`add-concept-${loIdx}`);
    setError(null);
    try {
      await createNode({
        curriculum_id: curriculumId,
        node_type: 'Concept',
        new_data: { name: conceptName.trim(), parent_lo: lo.name },
      });
      const updated = draft.map((l, i) =>
        i === loIdx ? { ...l, concepts: [...(l.concepts || []), { name: conceptName.trim() }] } : l
      );
      setDraft(updated);
      setCurriculumDraft(updated);
    } catch (e: any) {
      setError(e?.message || 'Failed to add concept');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="w-full h-full p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Curriculum Editor</h2>
        <button onClick={onFinalize} className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-500">
          Finalize
        </button>
      </div>
      {error && <div className="mb-3 text-red-400 text-sm">{error}</div>}
      {!hasItems && (
        <div className="text-slate-300">No draft yet. Return to Seed Input and process your curriculum.</div>
      )}
      <div className="space-y-6">
        {draft.map((lo, i) => (
          <div key={`${lo.name}-${i}`} className="border border-[#2A2F4A] rounded-md p-4 bg-[#0F1226]/60">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 bg-transparent border border-[#2A2F4A] rounded px-2 py-1"
                defaultValue={lo.name}
                onBlur={(e) => handleRenameLO(i, e.target.value)}
                disabled={busyKey === `lo-${i}` || lo.status === 'finalized'}
              />
              {lo.status && (
                <span className={`text-xs px-2 py-1 rounded ${lo.status === 'finalized' ? 'bg-emerald-700' : 'bg-[#23284e]'}`}>
                  {lo.status}
                </span>
              )}
            </div>
            {lo.description && (
              <p className="mt-1 text-sm text-slate-300">{lo.description}</p>
            )}
            <div className="mt-3">
              <h4 className="font-semibold mb-1">Scope</h4>
              <textarea
                className="w-full bg-transparent border border-[#2A2F4A] rounded px-2 py-1 text-sm min-h-[70px]"
                placeholder="Define the in-scope and out-of-scope boundaries for this LO."
                defaultValue={lo.scope || ''}
                onBlur={(e) => handleUpdateScope(i, e.target.value)}
                disabled={busyKey === `lo-scope-${i}` || lo.status === 'finalized'}
              />
              {lo.status === 'finalized' && (
                <div className="mt-1 text-xs text-slate-400">This LO is finalized; editing is disabled.</div>
              )}
            </div>
            <div className="mt-3">
              <h4 className="font-semibold mb-2">Concepts</h4>
              <ul className="space-y-2">
                {(lo.concepts || []).map((c, j) => (
                  <li key={`${c.name}-${j}`} className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-[#23284e] text-sm">{c.name}</span>
                    <button
                      onClick={() => handleDeleteConcept(i, j)}
                      disabled={busyKey === `concept-${i}-${j}`}
                      className="text-xs text-red-300 hover:text-red-200"
                    >
                      delete
                    </button>
                  </li>
                ))}
              </ul>
              <AddConceptRow disabled={busyKey?.startsWith('add-concept-') || false} onAdd={(name) => handleAddConcept(i, name)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddConceptRow({ disabled, onAdd }: { disabled?: boolean; onAdd: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <div className="mt-3 flex items-center gap-2">
      <input
        className="flex-1 bg-transparent border border-[#2A2F4A] rounded px-2 py-1"
        placeholder="New concept name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={disabled}
      />
      <button
        onClick={() => { if (name.trim()) { onAdd(name.trim()); setName(''); } }}
        className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-sm"
        disabled={disabled}
      >
        Add
      </button>
    </div>
  );
}
