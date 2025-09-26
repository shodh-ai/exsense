"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { fetchTheses, type ThesisSummary } from "@/services/brum";

export default function ThesisSwitcher() {
  const [theses, setTheses] = useState<ThesisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // infer currently selected thesis from path if possible
  const currentId = useMemo(() => {
    const m = pathname?.match(/\/theses\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : "";
  }, [pathname]);

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchTheses();
        setTheses(list);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const goTo = (id: string) => {
    if (!id) return;
    router.push(`/explorer/theses/${encodeURIComponent(id)}`);
  };

  const goStudio = () => {
    if (!currentId) return;
    const author = "expert_1"; // TODO: wire to auth
    router.push(`/imprinter/thesis/${encodeURIComponent(currentId)}/studio?author=${encodeURIComponent(author)}`);
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentId}
        onChange={(e) => goTo(e.target.value)}
        className="text-sm bg-black/30 border border-white/10 text-slate-100 rounded-md px-2 py-1"
        disabled={loading}
      >
        <option value="">Switch thesis…</option>
        {theses.map((t) => (
          <option key={t.thesis_id} value={t.thesis_id}>
            {t.thesis_title || t.thesis_id}
          </option>
        ))}
      </select>
      <button
        onClick={goStudio}
        disabled={!currentId}
        className="text-xs px-2 py-1 rounded-md btn-accent disabled:opacity-50"
        title="Open Imprinting Studio for the selected thesis"
      >
        Studio
      </button>
    </div>
  );
}
