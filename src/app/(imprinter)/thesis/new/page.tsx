"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createThesis } from "@/services/imprinter";

export default function NewThesisPage() {
  const router = useRouter();
  const [authorId, setAuthorId] = useState("");
  const [thesisId, setThesisId] = useState("");
  const [seed, setSeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorId || !thesisId || !seed) {
      setError("Please fill all fields");
      return;
    }
    setBusy(true);
    setError(null);
    const sessionId = `sess_${Date.now()}`;
    try {
      await createThesis(authorId, thesisId, seed, sessionId);
      router.push(`/imprinter/thesis/${encodeURIComponent(thesisId)}/studio?session=${encodeURIComponent(sessionId)}&author=${encodeURIComponent(authorId)}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create thesis");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Create a New Thesis</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Author ID</label>
          <input className="w-full border rounded px-3 py-2 text-sm" value={authorId} onChange={(e) => setAuthorId(e.target.value)} placeholder="expert_123" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Thesis ID</label>
          <input className="w-full border rounded px-3 py-2 text-sm" value={thesisId} onChange={(e) => setThesisId(e.target.value)} placeholder="ashoka_thesis" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Seed Content</label>
          <textarea className="w-full border rounded px-3 py-2 text-sm min-h-[140px]" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="Write the core thesis statement..." />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button type="submit" disabled={busy} className="px-4 py-2 text-sm rounded bg-sky-600 text-white disabled:opacity-50">Begin Interview</button>
      </form>
    </div>
  );
}
