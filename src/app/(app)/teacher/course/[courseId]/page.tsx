"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { createApiClient } from "@/lib/apiclient";
import { Button } from "@/components/button";
import { Input } from "@/components/input";

export default function TeacherCourseManagePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient({ getToken }), [getToken]);

  const [course, setCourse] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setError(null);
        // Fetch teacher courses and pick one (no GET by id endpoint yet)
        const mine = await api.get("/api/courses/teacher/me");
        const found = (mine || []).find((c: any) => String(c.id) === String(courseId));
        if (!found) throw new Error("Course not found or not owned by you");
        if (!mounted) return;
        setCourse(found);
        setTitle(found.title || "");
        setDescription(found.description || "");
      } catch (e: any) {
        if (mounted) setError(e.message || "Failed to load course");
      }
    };
    run();
    return () => { mounted = false; };
  }, [api, courseId]);

  const onSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await api.put(`/api/courses/${courseId}`, { title, description });
      router.refresh?.();
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!course) return <div className="p-6">{error || "Loading..."}</div>;

  return (
    <div className="w-full h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h1 className="text-xl font-bold text-[#394169]">Edit Course</h1>
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-[#394169]">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            <label className="block text-sm text-[#394169] mt-3">Description</label>
            <textarea className="w-full border rounded-lg p-2" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex gap-2 mt-3">
              <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              <Link href={`/teacher/course/${courseId}/curriculum`} className="ml-auto">
                <Button variant="outline">Manage Curriculum</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
