"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchThesisGraph, ReactFlowGraph } from "@/services/brum";

export function useThesisGraph(thesisId: string) {
  const [graph, setGraph] = useState<ReactFlowGraph>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!thesisId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchThesisGraph(thesisId);
      setGraph(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load graph");
    } finally {
      setLoading(false);
    }
  }, [thesisId]);

  useEffect(() => {
    load();
  }, [load]);

  return { graph, loading, error, refresh: load };
}
