"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchTheses, ThesisSummary } from "@/services/brum";
import MicButton from "@/components/voice/MicButton";

export default function ThesesLibraryPage() {
  const [items, setItems] = useState<ThesisSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");
  const sessionId = useMemo(() => `s_${Date.now()}`, []);
  const studentId = useMemo(() => "student_1", []);

  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchTheses();
        setItems(rows);
        // Default select first thesis if any
        if (rows.length && !selected) setSelected(rows[0].thesis_id);
      } catch (e: any) {
        setError(e?.message || "Failed to load theses");
      }
    })();
  }, [selected]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold mb-4">Thesis Library</h1>
      {/* Top toolbar: selector + Hold to Speak */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Speak in room for</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="" disabled>Select thesis…</option>
            {items.map((t) => (
              <option key={t.thesis_id} value={t.thesis_id}>{t.thesis_title || t.thesis_id}</option>
            ))}
          </select>
        </div>
        <div>
          {!!selected && (
            <MicButton
              roomId={`explorer-${selected}-${studentId}`}
              identity={studentId}
              sessionId={sessionId}
              thesisId={selected}
              mode="kamikaze"
              studentId={studentId}
            />
          )}
        </div>
      </div>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((t) => (
          <Link key={t.thesis_id} href={`/explorer/theses/${encodeURIComponent(t.thesis_id)}`} className="block border rounded-md p-4 hover:shadow-sm bg-white">
            <div className="text-sm text-gray-500">Author: {t.author_id}</div>
            <div className="font-medium mt-1">{t.thesis_title || t.thesis_id}</div>
            {t.description && <div className="text-sm text-gray-600 mt-2 line-clamp-2">{t.description}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
