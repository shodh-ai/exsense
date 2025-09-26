"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { handleResponse, startSession, DeliveryPlan } from "@/services/kamikaze";

type Msg = { role: "ai" | "user"; text: string };

export interface ProxyChatProps {
  thesisId: string;
  sessionId: string;
  studentId: string;
  onAIResponse?: (text: string, delivery?: DeliveryPlan) => void;
}

export default function ProxyChat({ thesisId, sessionId, studentId, onAIResponse }: ProxyChatProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [suggested, setSuggested] = useState<Array<string | { id?: string; text: string; reason?: string; title?: string }>>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudioUrls = useCallback(async (urls?: (string | null | undefined)[]) => {
    const arr = (urls || []).filter(Boolean) as string[];
    if (!arr.length) return;
    try {
      if (!audioRef.current) audioRef.current = new Audio();
      for (const url of arr) {
        audioRef.current.src = url;
        await audioRef.current.play().catch(() => {});
        await new Promise((resolve) => {
          if (!audioRef.current) return resolve(undefined);
          const onEnd = () => {
            if (!audioRef.current) return;
            audioRef.current.removeEventListener('ended', onEnd);
            resolve(undefined);
          };
          audioRef.current.addEventListener('ended', onEnd);
        });
      }
    } catch {}
  }, []);

  const sendInternal = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text }]);
    try {
      let res;
      if (!started) {
        res = await startSession(sessionId, studentId, thesisId, text);
        setStarted(true);
      } else {
        res = await handleResponse(sessionId, studentId, thesisId, text);
      }
      const plan = res?.delivery_plan as DeliveryPlan | undefined;
      const aiSpeechs = (plan?.actions || [])
        .filter((a) => a.tool_name === "speak")
        .map((a) => String(a.parameters?.text || ""));
      const combined = aiSpeechs.join("\n\n").trim() || "(no response)";
      setMessages((m) => [...m, { role: "ai", text: combined }]);
      setSuggested(plan?.metadata?.suggested_responses || []);
      onAIResponse?.(combined, plan);
      // Attempt to auto-play any audio URLs provided by backend
      const audioUrls = plan?.metadata?.audio_urls as string[] | undefined;
      if (audioUrls?.length) {
        void playAudioUrls(audioUrls);
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: "ai", text: `Error: ${e?.message || e}` }]);
    } finally {
      setBusy(false);
      setTimeout(() => listRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 10);
    }
  }, [started, sessionId, studentId, thesisId, onAIResponse]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void sendInternal(text);
  }, [input, busy, sendInternal]);

  const selectSuggestion = useCallback((s: string | { id?: string; text: string }) => {
    const text = typeof s === "string" ? s : (s.text || "");
    if (!text) return;
    setSuggested([]);
    void sendInternal(text);
  }, [sendInternal]);

  return (
    <div className="flex flex-col h-full border rounded-md">
      <div ref={listRef} className="flex-1 overflow-auto p-3 space-y-3 bg-white">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "ai" ? "text-slate-900" : "text-emerald-700"}>
            <div className="text-xs uppercase tracking-wide mb-1 opacity-60">{m.role === "ai" ? "Expert Proxy" : "You"}</div>
            <div className="text-sm leading-6 whitespace-pre-wrap">{m.text}</div>
          </div>
        ))}
      </div>

      {!!suggested?.length && (
        <div className="p-2 border-t bg-slate-50 flex flex-wrap gap-2">
          {suggested.map((s: any, idx: number) => (
            <button key={idx} onClick={() => selectSuggestion(s)} className="px-2.5 py-1.5 text-xs rounded-full bg-sky-600 text-white hover:bg-sky-700">
              {typeof s === "string" ? s : (s.title || s.text)}
            </button>
          ))}
        </div>
      )}

      <div className="p-2 border-t bg-slate-50 flex gap-2 items-center">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={started ? "Type your message..." : "Ask your first question..."}
          className="flex-1 text-sm px-3 py-2 border rounded-md"
        />
        <button onClick={send} disabled={busy} className="px-3 py-2 text-sm rounded-md bg-sky-600 text-white disabled:opacity-50">Send</button>
      </div>
    </div>
  );
}
