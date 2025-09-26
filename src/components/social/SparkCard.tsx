"use client";
import React from "react";
import Link from "next/link";
import type { Spark } from "@/services/social";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export interface SparkCardProps {
  spark: Spark;
}

export default function SparkCard({ spark }: SparkCardProps) {
  const { thesis_id, author_id, question, answer_preview, created_at, continued_count = 0, echo_count = 0, id } = spark;
  const initials = (author_id || "?").slice(0, 2).toUpperCase();
  return (
    <div className="w-full rounded-xl glass p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-900 flex items-center justify-center text-xs font-semibold">
          {initials}
        </div>
        <div className="text-sm text-slate-400">
          <span className="font-medium text-slate-200">{author_id}</span>
          <span className="mx-2">•</span>
          <span>{timeAgo(created_at)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <blockquote className="text-slate-100 italic">“{question}”</blockquote>
        {!!answer_preview && (
          <p className="text-sm text-slate-200 line-clamp-3">{answer_preview}</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Link
          href={`/explorer/theses/${encodeURIComponent(thesis_id)}`}
          className="inline-flex items-center gap-2 rounded-md btn-accent px-3 py-1.5 text-sm"
        >
          Continue this Conversation
        </Link>
        <div className="flex items-center gap-3">
          <Link href={`/sparks/${encodeURIComponent(id)}`} className="text-xs text-slate-200 hover:text-white underline underline-offset-4">
            Join the Echo
          </Link>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div>👥 {continued_count} continued</div>
            <div>💬 {echo_count} echoes</div>
          </div>
        </div>
      </div>
    </div>
  );
}
