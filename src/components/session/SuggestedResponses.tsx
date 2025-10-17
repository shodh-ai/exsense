"use client";

import React, { useEffect } from "react";

export interface SuggestedResponseItem {
  id: string;
  text: string;
  reason?: string;
}

interface SuggestedResponsesProps {
  onSelect?: (suggestion: SuggestedResponseItem) => void | Promise<void>;
}

// The component is renamed to better reflect its new design, but you can keep the original name.
const PLACEHOLDER_SUGGESTIONS: SuggestedResponseItem[] = [
  { id: "ph_1", text: "I have a doubt" },
  { id: "ph_2", text: "Can you explain this?" },
  { id: "ph_3", text: "Show an example" },
  { id: "ph_4", text: "Summarize the topic" },
];

export default function InteractivePrompt({ onSelect }: SuggestedResponsesProps) {
  const promptText = "How would you like to proceed?";

  // Debugging logic remains the same.
  useEffect(() => {
    console.log("[UI] SuggestedResponses placeholder visible:", {
      count: PLACEHOLDER_SUGGESTIONS.length,
      title: promptText,
      items: PLACEHOLDER_SUGGESTIONS,
    });
  }, []);

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
          {PLACEHOLDER_SUGGESTIONS.map((s, idx) => {
            const safeId = (s.id && s.id.trim().length > 0) ? s.id : `ui_${Date.now()}_${idx}`;
            return (
              <button
                key={safeId}
                onClick={() => {
                  const payload = { ...s, id: safeId };
                  console.log("[UI] SuggestedResponse clicked:", payload);
                  try { onSelect?.(payload); } catch {}
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