"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import ArgumentGraphVisualizer from "@/components/graph/ArgumentGraphVisualizer";
import ProxyChat from "@/components/chat/ProxyChat";
import MicButton from "@/components/voice/MicButton";
import SparkCard from "@/components/social/SparkCard";
import { fetchTheses, type ThesisSummary } from "@/services/brum";
import { fetchSparksByThesis, type Spark } from "@/services/social";

export default function ExplorerThesisPageClient({ thesisId }: { thesisId: string }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [highlight, setHighlight] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [autoQuestion, setAutoQuestion] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [thesis, setThesis] = useState<ThesisSummary | null>(null);
  const [sparks, setSparks] = useState<Spark[]>([]);

  const sessionId = useMemo(() => `s_${Date.now()}`, []);
  const studentId = useMemo(() => "student_1", []); // TODO: wire to auth/profile

  useEffect(() => {
    (async () => {
      try {
        const all = await fetchTheses();
        const found = all.find((t) => t.thesis_id === thesisId) || null;
        setThesis(found);
      } catch {}
      try {
        const s = await fetchSparksByThesis(thesisId);
        setSparks(s);
      } catch {}
    })();
  }, [thesisId]);

  const startConversation = () => {
    const q = query.trim();
    if (!q) return;
    setAutoQuestion(q);
    setShowChat(true);
  };

  const initials = (thesis?.author_id || "?").slice(0, 2).toUpperCase();

  return (
    <div className="w-full min-h-[calc(100vh-80px)] p-4">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-2 text-xs text-slate-400">
          <Link href="/explorer/theses" className="hover:text-white">Sparks</Link>
          <span className="mx-2">/</span>
          <Link href="/explorer/theses/all" className="hover:text-white">All Theses</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-500">{thesis?.thesis_title || thesisId}</span>
        </div>
        <div className="rounded-xl glass p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-semibold">
            {initials}
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold text-slate-100">{thesis?.thesis_title || thesisId}</div>
            <div className="text-sm text-slate-300">by {thesis?.author_id || "Unknown"}</div>
          </div>
          <div className="hidden md:block text-sm text-slate-300 max-w-md line-clamp-2">{thesis?.description}</div>
        </div>

        {/* Start a New Conversation */}
        <div className="mt-4 rounded-xl glass p-3">
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startConversation()}
              placeholder="Start a New Conversation… Ask a compelling question."
              className="flex-1 text-sm px-3 py-2 rounded-md bg-black/30 border border-white/10 text-slate-100 placeholder:text-slate-500"
            />
            <button onClick={startConversation} className="px-3 py-2 text-sm rounded-md btn-accent">Start</button>
            <MicButton
              roomId={`explorer-${thesisId}-${studentId}`}
              identity={studentId}
              sessionId={sessionId}
              thesisId={thesisId}
              mode="kamikaze"
              studentId={studentId}
            />
          </div>
          {showChat && (
            <div className="mt-3">
              <ProxyChat
                thesisId={thesisId}
                sessionId={sessionId}
                studentId={studentId}
                initialMessage={autoQuestion || undefined}
                onAIResponse={(text, plan) => {
                  setRefreshKey((k) => k + 1);
                  const focus = plan?.metadata?.focus_nodes || [];
                  if (focus.length) {
                    setHighlight(focus.map(String));
                  } else {
                    setHighlight((text || "").split(/\W+/).filter((w) => w.length > 3).slice(0, 3));
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-4 rounded-xl glass">
          <Tabs.Root defaultValue="map">
            <Tabs.List className="flex gap-2 border-b border-white/10 p-2">
              <Tabs.Trigger value="map" className="px-3 py-1.5 text-sm rounded-md text-slate-300 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:text-white">Mind Map</Tabs.Trigger>
              <Tabs.Trigger value="sparks" className="px-3 py-1.5 text-sm rounded-md text-slate-300 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:text-white">Popular Sparks</Tabs.Trigger>
              <Tabs.Trigger value="echoes" className="px-3 py-1.5 text-sm rounded-md text-slate-300 hover:text-white data-[state=active]:bg-white/10 data-[state=active]:text-white">Community Echoes</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="map" className="p-3">
              <div className="rounded-md glass overflow-hidden" style={{ height: 520 }}>
                <ArgumentGraphVisualizer thesisId={thesisId} refreshKey={refreshKey} highlightTerms={highlight} />
              </div>
            </Tabs.Content>
            <Tabs.Content value="sparks" className="p-3">
              <div className="flex flex-col gap-3">
                {sparks.length === 0 && (
                  <div className="text-sm text-slate-300">No sparks yet. Be the first to ask something thought-provoking.</div>
                )}
                {sparks.map((s) => (
                  <SparkCard key={s.id} spark={s} />
                ))}
              </div>
            </Tabs.Content>
            <Tabs.Content value="echoes" className="p-3">
              <div className="text-sm text-slate-300">Community Echoes are coming in Phase 2.</div>
            </Tabs.Content>
          </Tabs.Root>
        </div>
      </div>
    </div>
  );
}

