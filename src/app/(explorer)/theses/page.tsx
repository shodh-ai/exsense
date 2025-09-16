"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTheses, ThesisSummary } from "@/services/brum";

export default function ThesesLibraryPage() {
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
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Thesis Library</h1>
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
