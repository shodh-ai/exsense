import { NextRequest, NextResponse } from "next/server";
import { socialStore, type Echo } from "../../../_store/socialStore";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ sparkId: string }> }) {
  const { sparkId } = await params;
  const id = decodeURIComponent(sparkId);
  const list = socialStore.echoes[id] || [];
  return NextResponse.json(list, { status: 200 });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ sparkId: string }> }) {
  try {
    const { sparkId } = await params;
    const id = decodeURIComponent(sparkId);
    const data = await req.json();
    const echo: Echo = {
      id: data?.id || `echo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      spark_id: id,
      author_id: String(data?.author_id || "anonymous"),
      text: String(data?.text || ""),
      created_at: new Date().toISOString(),
      parent_id: data?.parent_id || null,
    };
    if (!socialStore.echoes[id]) socialStore.echoes[id] = [];
    socialStore.echoes[id].push(echo);
    const spark = socialStore.sparks.find((s) => s.id === id);
    if (spark) spark.echo_count = (spark.echo_count || 0) + 1;
    return NextResponse.json(echo, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invalid body" }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
