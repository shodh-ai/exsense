// In-memory Sparks API (dev/demo only). For production, back with a DB.
import { NextRequest, NextResponse } from "next/server";
import { socialStore, type Spark } from "../_store/socialStore";

export async function GET() {
  return NextResponse.json(socialStore.sparks, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const id = data?.id || `spark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const spark: Spark = {
      id,
      thesis_id: String(data?.thesis_id || ""),
      author_id: String(data?.author_id || "anonymous"),
      question: String(data?.question || ""),
      answer_preview: String(data?.answer_preview || ""),
      created_at: new Date().toISOString(),
      continued_count: Number(data?.continued_count || 0),
      echo_count: Number(data?.echo_count || 0),
    };
    socialStore.sparks.unshift(spark);
    return NextResponse.json(spark, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invalid body" }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
