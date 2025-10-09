"use client";

import React, { useEffect } from "react";
import { useSessionStore } from "@/lib/store";

export interface SuggestedResponseItem {
  id: string;
  text: string;
  reason?: string;
}

interface SuggestedResponsesProps {
  onSelect: (suggestion: SuggestedResponseItem) => void | Promise<void>;
}

// The component is renamed to better reflect its new design, but you can keep the original name.
export default function InteractivePrompt({ onSelect }: SuggestedResponsesProps) {
  const suggestedResponses = useSessionStore((s) => s.suggestedResponses);
  // This is now used for the main question text.
  const promptText = useSessionStore((s) => s.suggestedTitle); 

  // Debugging logic remains the same.
  useEffect(() => {
    if (suggestedResponses && suggestedResponses.length > 0) {
      console.log("[UI] SuggestedResponses visible:", {
        count: suggestedResponses.length,
        title: promptText,
        items: suggestedResponses,
      });
    } else {
      console.log("[UI] SuggestedResponses hidden (no items)");
    }
  }, [suggestedResponses, promptText]);

  if (!suggestedResponses || suggestedResponses.length === 0) return null;

  return (
    // --- STYLING CHANGES FOR THE MAIN CONTAINER ---
    // Removed fixed positioning classes.
    // Changed background to white, added a larger shadow and padding.
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-2xl bg-white shadow-lg p-5 md:p-6">
        
        {/* --- STYLING CHANGES FOR THE PROMPT TEXT --- */}
        {/* The title is now styled as the main question. */}
        {/* The "Dismiss" button has been removed. */}
        {promptText && (
          <div className="mb-4">
            <h3 className="text-base md:text-lg font-semibold text-slate-800 text-center">
              {promptText}
            </h3>
          </div>
        )}

        {/* --- STYLING CHANGES FOR THE BUTTONS --- */}
        {/* Buttons now have a light background and dark blue text to match the image. */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3">
          {suggestedResponses.map((s, idx) => {
            const safeId = (s.id && s.id.trim().length > 0) ? s.id : `ui_${Date.now()}_${idx}`;
            return (
              <button
                key={safeId}
                onClick={() => {
                  const payload = { ...s, id: safeId };
                  console.log("[UI] SuggestedResponse clicked:", payload);
                  onSelect(payload);
                }}
                // Updated classes for the new button style
                className="px-4 py-2 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-medium transition-colors"
                title={s.reason || s.text}
              >
                {s.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}