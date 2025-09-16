"use client";
import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ArgumentGraphVisualizer from "@/components/graph/ArgumentGraphVisualizer";
import InterviewChat from "@/components/chat/InterviewChat";
import MicButton from "@/components/voice/MicButton";

export default function ThesisStudioPage({ params }: { params: { thesisId: string } }) {
  const thesisId = decodeURIComponent(params.thesisId);
  const sp = useSearchParams();
  const sessionId = useMemo(() => sp.get("session") || `sess_${Date.now()}`, [sp]);
  const authorId = useMemo(() => sp.get("author") || "expert_1", [sp]);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="w-full h-[calc(100vh-80px)] p-4 grid grid-cols-2 gap-4">
      <div className="col-span-1 flex flex-col gap-3">
        <div className="flex justify-end">
          <MicButton
            roomId={`imprinter-${thesisId}-${authorId}`}
            identity={authorId}
            sessionId={sessionId}
            thesisId={thesisId}
            mode="imprinter"
            authorId={authorId}
          />
        </div>
        <InterviewChat
          thesisId={thesisId}
          sessionId={sessionId}
          onTurnCompleted={() => setRefreshKey((k) => k + 1)}
        />
      </div>
      <div className="col-span-1 border rounded-md overflow-hidden">
        <ArgumentGraphVisualizer thesisId={thesisId} refreshKey={refreshKey} />
      </div>
    </div>
  );
}
