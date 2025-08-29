"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { useLessons, useCreateLesson, useDeleteLesson, useReorderLessons } from "@/hooks/useApi";

export default function CurriculumPage() {
  const { courseId } = useParams<{ courseId: string }>();

  const { data: lessons = [], isLoading, error } = useLessons(courseId);
  const createMutation = useCreateLesson(courseId);
  const deleteMutation = useDeleteLesson(courseId);
  const reorderMutation = useReorderLessons(courseId);

  const [title, setTitle] = useState("");

  const createLesson = async () => {
    await createMutation.mutateAsync({ title });
    setTitle("");
  };

  const removeLesson = async (lessonId: string) => {
    await deleteMutation.mutateAsync(lessonId);
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const arr = [...lessons];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    await reorderMutation.mutateAsync(arr.map((l) => l.id));
  };

  return (
    <div className="w-full h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h1 className="text-xl font-bold text-[#394169]">Curriculum</h1>
          <div className="mt-4 flex gap-2">
            <Input placeholder="New lesson title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Button onClick={createLesson} disabled={!title || createMutation.isPending}>{createMutation.isPending ? "Adding..." : "Add Lesson"}</Button>
            <Link href={`/teacher/course/${courseId}`} className="ml-auto">
              <Button variant="outline">Back to Course</Button>
            </Link>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{(error as any)?.message || "Failed to load lessons"}</p>}
          <ul className="mt-6 space-y-3">
            {isLoading ? (
              <p className="text-[#8187a0]">Loading lessons...</p>
            ) : lessons.map((l: any, idx: number) => (
              <li key={l.id} className="p-3 border rounded-lg flex items-center gap-2">
                <span className="text-sm text-[#394169] flex-1">{idx + 1}. {l.title}</span>
                <Button variant="outline" onClick={() => move(idx, -1)}>Up</Button>
                <Button variant="outline" onClick={() => move(idx, 1)}>Down</Button>
                <Link href={`/teacher/course/${courseId}/lessons/${l.id}`}>
                  <Button>Edit</Button>
                </Link>
                <Button variant="ghost" onClick={() => removeLesson(l.id)} disabled={deleteMutation.isPending}>Delete</Button>
              </li>
            ))}
            {!isLoading && lessons.length === 0 && (
              <p className="text-[#8187a0]">No lessons yet. Create your first one above.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
