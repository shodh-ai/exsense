import { NextRequest, NextResponse } from "next/server";
import { socialStore } from "../../_store/socialStore";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ sparkId: string }> }) {
  const { sparkId } = await params;
  const id = decodeURIComponent(sparkId);
  const found = socialStore.sparks.find((s) => s.id === id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(found, { status: 200 });
}

export const dynamic = "force-dynamic";
