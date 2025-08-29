"use client";

import React from "react";
import { useSessionStore } from "@/lib/store";

export interface SuggestedResponseItem {
  id: string;
  text: string;
  reason?: string;
}

interface SuggestedResponsesProps {
  onSelect: (suggestion: SuggestedResponseItem) => void | Promise<void>;
}

export default function SuggestedResponses({ onSelect }: SuggestedResponsesProps) {
  const { suggestedResponses, suggestedTitle, clearSuggestedResponses } = useSessionStore((s) => ({
    suggestedResponses: s.suggestedResponses,
    suggestedTitle: s.suggestedTitle,
    clearSuggestedResponses: s.clearSuggestedResponses,
  }));

  if (!suggestedResponses || suggestedResponses.length === 0) return null;

  return (
    <div className="pointer-events-auto fixed bottom-28 left-1/2 -translate-x-1/2 z-20 w-[92%] md:w-[720px]">
      <div className="rounded-2xl border border-white/10 bg-[#0B1021]/80 backdrop-blur-md shadow-xl p-3 md:p-4">
        {suggestedTitle && (
          <div className="flex items-start justify-between mb-2 md:mb-3">
            <h3 className="text-sm md:text-base font-semibold text-white/90">{suggestedTitle}</h3>
            <button
              className="text-xs text-white/60 hover:text-white/90 transition"
              onClick={clearSuggestedResponses}
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-2 md:gap-3">
          {suggestedResponses.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="px-3 md:px-4 py-2 rounded-full bg-[#566FE9]/20 hover:bg-[#566FE9]/30 text-[#E7EAFF] text-xs md:text-sm font-medium border border-[#566FE9]/30 transition"
              title={s.reason || s.text}
            >
              {s.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
