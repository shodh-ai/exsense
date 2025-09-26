"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createEcho, fetchEchoes, fetchSpark, type Echo, type Spark } from "@/services/social";

export default function SparkDetailClient({ sparkId }: { sparkId: string }) {
  const [spark, setSpark] = useState<Spark | null>(null);
  const [echoes, setEchoes] = useState<Echo[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const userId = useMemo(() => "user_anon", []); // TODO: wire to auth

  useEffect(() => {
    (async () => {
      try {
        const s = await fetchSpark(sparkId);
        setSpark(s);
      } catch (e: any) {
        setError(e?.message || "Failed to load spark");
      }
      try {
        const list = await fetchEchoes(sparkId);
        setEchoes(list);
      } catch {}
      setLoading(false);
    })();
  }, [sparkId]);

  const submit = async () => {
    const body = text.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      const e = await createEcho(sparkId, { author_id: userId, text: body });
      setEchoes((arr) => [...arr, e]);
      setText("");
    } catch (e: any) {
      setError(e?.message || "Failed to post echo");
    } finally {
      setPosting(false);
    }
  };

  if (loading) return <div className="max-w-2xl mx-auto p-6">Loading…</div>;
  if (error) return <div className="max-w-2xl mx-auto p-6 text-red-400">{error}</div>;
  if (!spark) return <div className="max-w-2xl mx-auto p-6">Not found</div>;

  const initials = (spark.author_id || "?").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-900 flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
          <div className="text-sm text-slate-300">
            <span className="font-medium text-slate-100">{spark.author_id}</span>
          </div>
        </div>
        <div className="space-y-2">
          <blockquote className="text-slate-100 italic">“{spark.question}”</blockquote>
          {!!spark.answer_preview && <p className="text-sm text-slate-300">{spark.answer_preview}</p>}
        </div>
        <div className="mt-4 text-xs text-slate-400">
          <Link className="underline underline-offset-4 hover:text-white" href={`/explorer/theses/${encodeURIComponent(spark.thesis_id)}`}>View Thinker</Link>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="text-sm font-semibold text-slate-200 mb-3">Echoes</div>
        {echoes.length === 0 && (
          <div className="text-sm text-slate-400">No echoes yet. Be the first to reply.</div>
        )}
        <div className="space-y-3">
          {echoes.map((e) => (
            <div key={e.id} className="border-b border-white/10 pb-3">
              <div className="text-xs text-slate-400 mb-1">{e.author_id}</div>
              <div className="text-sm text-slate-200 whitespace-pre-wrap">{e.text}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            value={text}
            onChange={(ev) => setText(ev.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Write your echo…"
            className="flex-1 text-sm px-3 py-2 rounded-md bg-black/30 border border-white/10 text-slate-100 placeholder:text-slate-500"
          />
          <button onClick={submit} disabled={posting} className="px-3 py-2 text-sm rounded-md btn-accent disabled:opacity-50">Reply</button>
        </div>
      </div>
    </div>
  );
}
