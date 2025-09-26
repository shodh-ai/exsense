// Shared in-memory store for social data (dev/demo only)
export type Spark = {
  id: string;
  thesis_id: string;
  author_id: string;
  question: string;
  answer_preview: string;
  created_at: string;
  continued_count?: number;
  echo_count?: number;
};

export type Echo = {
  id: string;
  spark_id: string;
  author_id: string;
  text: string;
  created_at: string;
  parent_id?: string | null; // for nesting (not used in MVP)
};

export const socialStore: {
  sparks: Spark[];
  echoes: Record<string, Echo[]>; // keyed by spark_id
} = {
  sparks: [],
  echoes: {},
};
