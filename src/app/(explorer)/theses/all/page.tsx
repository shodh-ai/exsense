"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTheses, type ThesisSummary } from "@/services/brum";

export default function AllThesesPage() {
  const [items, setItems] = useState<ThesisSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchTheses();
        setItems(rows);
      } catch (e: any) {
        setError(e?.message || "Failed to load theses");
      }
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">All Theses</h1>
      </div>
      {error && <div className="text-sm text-red-400 mb-3">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((t) => (
          <Link key={t.thesis_id} href={`/explorer/theses/${encodeURIComponent(t.thesis_id)}`} className="block rounded-xl glass p-4 hover:shadow-md">
            <div className="text-xs text-slate-400">by {t.author_id}</div>
            <div className="font-medium mt-1 text-slate-100">{t.thesis_title || t.thesis_id}</div>
            {t.description && <div className="text-sm text-slate-300 mt-2 line-clamp-3">{t.description}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
