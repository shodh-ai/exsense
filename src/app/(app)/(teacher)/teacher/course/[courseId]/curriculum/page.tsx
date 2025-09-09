"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CirriculumEditor from "@/components/CirriculumEditor";
import { SectionData } from "@/components/CurriculumSection";
import { useApiService } from "@/lib/api";
import { useCourse, useLessons } from "@/hooks/useApi";

export default function CurriculumPage() {
  const { courseId } = useParams<{ courseId: string }>();

  const api = useApiService();
  const router = useRouter();

  const { data: course, isLoading: courseLoading } = useCourse(String(courseId));
  const { data: lessons = [], isLoading: lessonsLoading, error } = useLessons(String(courseId));

  const [initialSections, setInitialSections] = useState<SectionData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const lastBuildKeyRef = useRef<string | null>(null);
  const contentsCacheRef = useRef<Map<string, any[]>>(new Map());
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
  useEffect(() => {
    let mounted = true;
    const build = async () => {
      try {
        setLoadError(null);
        if (!courseId || lessonsLoading) return;
        const key = lessons.map((l: any) => l.id).join("|");
        if (key === lastBuildKeyRef.current) {
          // Nothing changed; avoid re-fetching
          if (mounted) setLoading(false);
          return;
        }
        setLoading(true);
        const sections: SectionData[] = [];
        for (let i = 0; i < lessons.length; i++) {
          const lesson = lessons[i];
          let contents: any[] = [];
          try {
            // Use cache first to avoid duplicate network calls (helps in React StrictMode dev remount).
            const cached = contentsCacheRef.current.get(lesson.id);
            if (cached) {
              contents = cached;
            } else {
              contents = await api.getLessonContents(lesson.id);
              contentsCacheRef.current.set(lesson.id, contents);
              // Small delay to avoid spamming backend
              await delay(150);
            }
          } catch (err: any) {
            // Gracefully continue on rate limit or other errors
            contents = [];
          }
          let scope = "";
          try {
            if (lesson.content) {
              const parsed = JSON.parse(String(lesson.content));
              scope = parsed?.scope ?? "";
            }
          } catch {}
          const modules = (contents || []).map((c: any, idx: number) => ({ id: c.id || `${i}-${idx}`, title: c.title || c.text || `Module ${idx + 1}` }));
          sections.push({
            id: lesson.id,
            title: lesson.title || `Section ${i + 1}`,
            description: lesson.description || "",
            modules,
            scope,
          });
        }
        if (!mounted) return;
        lastBuildKeyRef.current = lessons.map((l: any) => l.id).join("|");
        setInitialSections(sections);
      } catch (e: any) {
        if (!mounted) return;
        setLoadError(e?.message || "Failed to load curriculum");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    build();
    return () => { mounted = false; };
  }, [courseId, lessons, lessonsLoading]);

  const onSave = async (data: { title: string; description: string; sections: SectionData[] }) => {
    // Update course and rebuild lessons/contents
    const title = data.title.trim();
    await api.updateCourse(String(courseId), { title, description: data.description || undefined } as any);
    // Delete existing lessons
    for (const l of lessons) {
      await api.deleteLesson(l.id);
    }
    // Create new lessons and contents
    for (let i = 0; i < data.sections.length; i++) {
      const s = data.sections[i];
      const lesson = await api.createLesson(String(courseId), {
        title: s.title?.trim() || `Section ${i + 1}`,
        description: s.description?.trim() || undefined,
        content: JSON.stringify({ scope: s.scope ?? "" }),
        order: i,
      } as any);
      for (let j = 0; j < (s.modules?.length || 0); j++) {
        const m = s.modules[j];
        await api.addLessonContent(lesson.id, {
          type: 'TEXT',
          title: m.title,
          text: m.title,
          order: j,
        } as any);
      }
    }
    router.push(`/teacher/course/${courseId}`);
  };

  if (loading || courseLoading) {
    return <div className="p-6">Loading curriculum…</div>;
  }
  if (loadError || error) {
    return <div className="p-6 text-red-500">{(loadError || (error as any)?.message) as string}</div>;
  }

  return (
    <CirriculumEditor
      initialSections={initialSections ?? []}
      initialTitle={course?.title || ""}
      initialDescription={course?.description || ""}
      onFinalize={onSave}
      finalizeLabel="Save Changes"
    />
  );
}
