import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function normalizeRole(input?: string): "learner" | "expert" | "admin" | undefined {
  if (!input) return undefined;
  const val = input.toLowerCase();
  if (val === "expert" || val === "teacher") return "expert"; // keep canonical app-side
  if (val === "learner" || val === "student") return "learner";
  if (val === "admin") return "admin";
  return undefined;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawRole = (body?.role as string | undefined) || undefined;
    const role = normalizeRole(rawRole);

    if (!role) {
      return NextResponse.json({ error: "Invalid or missing role" }, { status: 400 });
    }

    const client = await clerkClient();
    await client.users.updateUser(userId, { publicMetadata: { role } });

    return NextResponse.json({ ok: true, role });
  } catch (err) {
    console.error("/api/promote-role error", err);
    return NextResponse.json({ error: "Failed to promote role" }, { status: 500 });
  }
}
