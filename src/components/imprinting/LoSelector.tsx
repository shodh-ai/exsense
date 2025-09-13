"use client";

import React from 'react';
import type { LearningObjective } from '@/lib/store';

interface LoSelectorProps {
  learningObjectives: LearningObjective[];
  onSelect: (loName: string) => void;
}

export default function LoSelector({ learningObjectives, onSelect }: LoSelectorProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-start gap-4 p-6 text-white">
      <h2 className="text-2xl font-semibold mb-2">Select a Learning Objective</h2>
      <div className="w-full max-w-3xl space-y-2">
        {learningObjectives?.length ? (
          learningObjectives.map((lo, idx) => (
            <button
              key={`${lo.name}-${idx}`}
              onClick={() => onSelect(lo.name)}
              className="w-full text-left px-4 py-3 rounded-md bg-[#0F1226]/60 border border-[#2A2F4A] hover:bg-[#15183a]"
            >
              <div className="font-semibold">{lo.name}</div>
              {lo.description && <div className="text-sm text-slate-300 mt-1">{lo.description}</div>}
              {lo.scope && (
                <div className="text-xs text-slate-400 mt-2">
                  <span className="opacity-80">Scope:</span> {lo.scope}
                </div>
              )}
            </button>
          ))
        ) : (
          <div className="text-slate-300">No learning objectives found. Go back and finalize your draft.</div>
        )}
      </div>
    </div>
  );
}
