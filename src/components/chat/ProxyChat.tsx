"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { handleResponse, startSession, DeliveryPlan } from "@/services/kamikaze";
import { createSpark } from "@/services/social";

type Msg = { role: "ai" | "user"; text: string };

export interface ProxyChatProps {
  thesisId: string;
  sessionId: string;
  studentId: string;
  onAIResponse?: (text: string, delivery?: DeliveryPlan) => void;
  initialMessage?: string; // optional first user message to auto-start the chat
}

export default function ProxyChat({ thesisId, sessionId, studentId, onAIResponse, initialMessage }: ProxyChatProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [suggested, setSuggested] = useState<Array<string | { id?: string; text: string; reason?: string; title?: string }>>([]);
  const [lastUserQ, setLastUserQ] = useState<string>("");
  const [lastAIAnswer, setLastAIAnswer] = useState<string>("");
  const [publishing, setPublishing] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoSentRef = useRef(false);

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
    setLastUserQ(text);
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
      setLastAIAnswer(combined);
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

  // auto-start conversation if initialMessage is provided
  useEffect(() => {
    if (initialMessage && !started && !busy && !autoSentRef.current) {
      autoSentRef.current = true;
      void sendInternal(initialMessage);
    }
  }, [initialMessage, started, busy, sendInternal]);

  const canPublish = useMemo(() => {
    if (!lastUserQ || !lastAIAnswer) return false;
    const last = messages[messages.length - 1];
    return !!last && last.role === "ai";
  }, [messages, lastUserQ, lastAIAnswer]);

  const publishSpark = useCallback(async () => {
    if (!canPublish || publishing) return;
    setPublishing(true);
    try {
      const s = await createSpark({
        thesis_id: thesisId,
        author_id: studentId,
        question: lastUserQ,
        answer_preview: lastAIAnswer,
      });
      setPublishedId(s.id);
    } catch (e) {
      // no-op: in MVP, we just don't set publishedId
    } finally {
      setPublishing(false);
    }
  }, [canPublish, publishing, thesisId, studentId, lastUserQ, lastAIAnswer]);

  return (
    <div className="flex flex-col h-full glass rounded-md">
      <div ref={listRef} className="flex-1 overflow-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "ai" ? "text-slate-100" : "text-emerald-300"}>
            <div className="text-xs uppercase tracking-wide mb-1 opacity-60">{m.role === "ai" ? "Expert Proxy" : "You"}</div>
            <div className="text-sm leading-6 whitespace-pre-wrap">{m.text}</div>
          </div>
        ))}
      </div>

      {!!suggested?.length && (
        <div className="p-2 border-t border-white/10 flex flex-wrap gap-2">
          {suggested.map((s: any, idx: number) => (
            <button key={idx} onClick={() => selectSuggestion(s)} className="px-2.5 py-1.5 text-xs rounded-full btn-accent">
              {typeof s === "string" ? s : (s.title || s.text)}
            </button>
          ))}
        </div>
      )}

      {(canPublish || publishedId) && (
        <div className="px-2 py-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
          <div>
            {publishedId ? (
              <a href={`/explorer/sparks/${encodeURIComponent(publishedId)}`} className="underline underline-offset-4 hover:text-white">View your Spark</a>
            ) : (
              <span>Make this response public as a Spark</span>
            )}
          </div>
          {!publishedId && (
            <button onClick={publishSpark} disabled={!canPublish || publishing} className="px-2.5 py-1.5 rounded-md btn-accent disabled:opacity-50">Make this Spark Public</button>
          )}
        </div>
      )}

      <div className="p-2 border-t border-white/10 flex gap-2 items-center">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={started ? "Type your message..." : "Ask your first question..."}
          className="flex-1 text-sm px-3 py-2 rounded-md bg-black/30 border border-white/10 text-slate-100 placeholder:text-slate-500"
        />
        <button onClick={send} disabled={busy} className="px-3 py-2 text-sm rounded-md btn-accent disabled:opacity-50">Send</button>
      </div>
    </div>
  );
}

