"use client";
import React, { useEffect, useState } from "react";
import { fetchSparks, type Spark } from "@/services/social";
import SparkCard from "@/components/social/SparkCard";
import SparksHero from "@/components/landing/SparksHero";

export default function ThesesLibraryPage() {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchSparks();
        setSparks(rows);
      } catch (e: any) {
        setError(e?.message || "Failed to load theses");
      }
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <SparksHero />
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
      <div className="flex flex-col gap-4">
        {sparks.map((s, i) => (
          <div key={s.id} className="fade-in-up" style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}>
            <SparkCard spark={s} />
          </div>
        ))}
      </div>
    </div>
  );
}

