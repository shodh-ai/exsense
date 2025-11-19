"use client";

import React from 'react';
import type { CognitiveShadowState, PendingQuestion } from "@/lib/cognitiveShadowService";
import { Play } from "lucide-react";

export interface CognitiveShadowPanelProps {
  state: CognitiveShadowState | null;
  onPlayContextReplay?: (q: PendingQuestion) => void;
}

export function CognitiveShadowPanel({ state, onPlayContextReplay }: CognitiveShadowPanelProps) {
  if (!state) return null;

  const { live_graph_representation, pending_questions } = state;

  return (
    <aside className="fixed right-4 top-20 bottom-20 w-80 bg-white/95 border border-gray-200 shadow-xl rounded-xl p-4 overflow-hidden z-30">
      <h2 className="text-sm font-semibold mb-2 text-gray-700">Cognitive Shadow</h2>
      <div className="h-1/2 border-b border-gray-200 pb-2 mb-2 overflow-auto">
        <h3 className="text-xs font-medium text-gray-500 mb-1">Live Graph</h3>
        <pre className="text-[11px] leading-snug text-gray-800 bg-gray-50 rounded p-2 overflow-auto max-h-full">
          {JSON.stringify(live_graph_representation ?? {}, null, 2)}
        </pre>
      </div>
      <div className="h-1/2 overflow-auto">
        <h3 className="text-xs font-medium text-gray-500 mb-1">Pending Questions</h3>
        <ul className="space-y-2 text-sm">
          {(pending_questions || []).map((q, idx) => (
            <li key={idx} className="flex items-start gap-2">
              {q.context_replay && onPlayContextReplay && (
                <button
                  type="button"
                  onClick={() => onPlayContextReplay(q)}
                  className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 flex-shrink-0"
                >
                  <Play className="w-3 h-3" />
                </button>
              )}
              <p className="text-gray-800 text-xs leading-snug">{q.text}</p>
            </li>
          ))}
          {(!pending_questions || pending_questions.length === 0) && (
            <li className="text-xs text-gray-400">No questions at the moment.</li>
          )}
        </ul>
      </div>
    </aside>
  );
}
