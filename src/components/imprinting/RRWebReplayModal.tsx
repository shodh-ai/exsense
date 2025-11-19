"use client";

import React from "react";
import type { PendingQuestion } from "@/lib/cognitiveShadowService";

export interface RRWebReplayModalProps {
  isOpen: boolean;
  question: PendingQuestion | null;
  onClose: () => void;
}

export function RRWebReplayModal({ isOpen, question, onClose }: RRWebReplayModalProps) {
  if (!isOpen || !question || !question.context_replay) return null;

  const { rrweb_asset_id, start_timestamp, play_duration_ms } = question.context_replay;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[70vh] flex flex-col overflow-hidden">
        <header className="px-4 py-2 border-b flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Context Replay</h2>
            <p className="text-xs text-gray-500 truncate max-w-xl">{question.text}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Close
          </button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center text-xs text-gray-600 p-4">
          <p className="mb-2">rrweb playback is not fully wired yet.</p>
          <p className="mb-1">asset_id: {rrweb_asset_id}</p>
          <p className="mb-1">start: {start_timestamp}</p>
          <p className="mb-1">duration: {play_duration_ms} ms</p>
          <p className="mt-4 text-[11px] text-gray-400 text-center max-w-md">
            To complete this feature, mount an rrweb-player instance here using the asset data
            fetched from the backend.
          </p>
        </div>
      </div>
    </div>
  );
}
