// exsense/src/services/social.ts
import { fetchTheses, ThesisSummary } from "./brum";

export type Spark = {
  id: string;
  thesis_id: string;
  author_id: string;
  question: string;
  answer_preview: string;
  created_at: string; // ISO string
  continued_count?: number;
  echo_count?: number;
};

const BRUM_BASE = process.env.NEXT_PUBLIC_BRUM_BASE || "http://localhost:8000";

export async function fetchSparks(): Promise<Spark[]> {
  // Primary: use local API
  try {
    const res = await fetch(`/api/sparks`, { cache: "no-store" });
    if (res.ok) {
      const rows = (await res.json()) as Spark[];
      if (Array.isArray(rows) && rows.length > 0) return rows;
      // fall through to remote/synthetic if empty
    }
  } catch {}

  // Fallback: try remote backend if available
  try {
    const res = await fetch(`${BRUM_BASE}/sparks`, { cache: "no-store" });
    if (res.ok) {
      const rows = (await res.json()) as Spark[];
      if (Array.isArray(rows) && rows.length > 0) return rows;
    }
  } catch {}

  // Fallback: synthesize sparks from theses
  try {
    const theses: ThesisSummary[] = await fetchTheses();
    const now = Date.now();
    if (Array.isArray(theses) && theses.length) {
      return theses.map((t, i) => ({
        id: `spark_${t.thesis_id}_${i}`,
        thesis_id: t.thesis_id,
        author_id: t.author_id,
        question: t.thesis_title ? `On ${t.thesis_title}, what matters most?` : "What is the core of your thesis?",
        answer_preview: t.description || "",
        created_at: new Date(now - i * 60_000).toISOString(),
        continued_count: Math.floor(Math.random() * 10),
        echo_count: Math.floor(Math.random() * 20),
      }));
    }
  } catch {}

  // Last resort: placeholder sparks so feed isn't empty in demos
  const now = Date.now();
  return [
    {
      id: `spark_demo_1`,
      thesis_id: "demo_thesis_1",
      author_id: "demo_author",
      question: "What’s the core idea driving this thinker’s perspective?",
      answer_preview: "A brief glimpse into the Living Thesis…",
      created_at: new Date(now - 2 * 60_000).toISOString(),
      continued_count: 3,
      echo_count: 5,
    },
    {
      id: "spark_demo_2",
      thesis_id: "demo_thesis_2",
      author_id: "demo_author",
      question: "How does this argument hold up against common counterpoints?",
      answer_preview: "There are at least two compelling counter-positions…",
      created_at: new Date(now - 5 * 60_000).toISOString(),
      continued_count: 1,
      echo_count: 2,
    },
  ];
}

export async function fetchSparksByThesis(thesisId: string): Promise<Spark[]> {
  const all = await fetchSparks();
  return all.filter((s) => s.thesis_id === thesisId);
}

export async function createSpark(input: {
  thesis_id: string;
  author_id: string;
  question: string;
  answer_preview: string;
}): Promise<Spark> {
  // Prefer local API
  try {
    const res = await fetch(`/api/sparks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) return (await res.json()) as Spark;
  } catch {}
  // Fallback remote
  const res = await fetch(`${BRUM_BASE}/sparks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to create spark: ${res.status}`);
  return res.json();
}

export async function fetchSpark(sparkId: string): Promise<Spark> {
  const res = await fetch(`/api/sparks/${encodeURIComponent(sparkId)}`, { cache: "no-store" });
  if (res.ok) return res.json();
  throw new Error("Spark not found");
}

export type Echo = {
  id: string;
  spark_id: string;
  author_id: string;
  text: string;
  created_at: string;
  parent_id?: string | null;
};

export async function fetchEchoes(sparkId: string): Promise<Echo[]> {
  const res = await fetch(`/api/sparks/${encodeURIComponent(sparkId)}/echoes`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch echoes: ${res.status}`);
  return res.json();
}

export async function createEcho(sparkId: string, input: { author_id: string; text: string; parent_id?: string | null }): Promise<Echo> {
  const res = await fetch(`/api/sparks/${encodeURIComponent(sparkId)}/echoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to create echo: ${res.status}`);
  return res.json();
}
