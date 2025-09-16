"use client";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { thesisTurn } from "@/services/imprinter";

type Message = { role: "ai" | "expert"; text: string };

export interface InterviewChatProps {
  thesisId: string;
  sessionId: string;
  initialQuestion?: string;
  onTurnCompleted?: () => void; // parent can refresh graph
}

export default function InterviewChat({ thesisId, sessionId, initialQuestion = "Let's begin. What is your core thesis?", onTurnCompleted }: InterviewChatProps) {
  const [messages, setMessages] = useState<Message[]>([{ role: "ai", text: initialQuestion }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "expert", text }]);
    setInput("");
    try {
      const res = await thesisTurn(thesisId, sessionId, text);
      const nextQ = res?.text || "";
      setMessages((m) => [...m, { role: "ai", text: nextQ }]);
      onTurnCompleted?.();
    } catch (e: any) {
      setMessages((m) => [...m, { role: "ai", text: `Error: ${e?.message || e}` }]);
    } finally {
      setBusy(false);
      // scroll to bottom
      setTimeout(() => listRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 10);
    }
  }, [input, busy, thesisId, sessionId, onTurnCompleted]);

  return (
    <div className="flex flex-col h-full border rounded-md">
      <div ref={listRef} className="flex-1 overflow-auto p-3 space-y-3 bg-white">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "ai" ? "text-slate-900" : "text-sky-700"}>
            <div className="text-xs uppercase tracking-wide mb-1 opacity-60">{m.role === "ai" ? "AI" : "You"}</div>
            <div className="text-sm leading-6 whitespace-pre-wrap">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t bg-slate-50 flex gap-2 items-center">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type your response..."
          className="flex-1 text-sm px-3 py-2 border rounded-md"
        />
        <button onClick={send} disabled={busy} className="px-3 py-2 text-sm rounded-md bg-sky-600 text-white disabled:opacity-50">Send</button>
      </div>
    </div>
  );
}
