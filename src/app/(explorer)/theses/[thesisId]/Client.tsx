"use client";
import React, { useMemo, useState } from "react";
import ArgumentGraphVisualizer from "@/components/graph/ArgumentGraphVisualizer";
import ProxyChat from "@/components/chat/ProxyChat";
import MicButton from "@/components/voice/MicButton";

export default function ExplorerThesisPageClient({ thesisId }: { thesisId: string }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [highlight, setHighlight] = useState<string[]>([]);

  const sessionId = useMemo(() => `s_${Date.now()}`, []);
  const studentId = useMemo(() => "student_1", []); // TODO: wire to auth/profile

  return (
    <div className="w-full h-[calc(100vh-80px)] p-4 grid grid-cols-2 gap-4">
      <div className="col-span-1 border rounded-md overflow-hidden">
        <ArgumentGraphVisualizer thesisId={thesisId} refreshKey={refreshKey} highlightTerms={highlight} />
      </div>
      <div className="col-span-1 flex flex-col gap-3">
        <div className="flex justify-end">
          <MicButton
            roomId={`explorer-${thesisId}-${studentId}`}
            identity={studentId}
            sessionId={sessionId}
            thesisId={thesisId}
            mode="kamikaze"
            studentId={studentId}
          />
        </div>
        <ProxyChat
          thesisId={thesisId}
          sessionId={sessionId}
          studentId={studentId}
          onAIResponse={(text, plan) => {
            setRefreshKey((k) => k + 1);
            const focus = plan?.metadata?.focus_nodes || [];
            if (focus.length) {
              setHighlight(focus.map(String));
            } else {
              // heuristic: use words from AI speech
              setHighlight((text || "").split(/\W+/).filter((w) => w.length > 3).slice(0, 3));
            }
          }}
        />
      </div>
    </div>
  );
}
