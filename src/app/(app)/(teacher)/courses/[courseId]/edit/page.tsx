// exsense/src/app/(app)/courses/[courseId]/edit/page.tsx

'use client';

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CirriculumEditor from "@/components/CirriculumEditor";
import { SectionData } from "@/components/CurriculumSection";
import { useApiService } from "@/lib/api";
import { useCourse, useLessons } from "@/hooks/useApi";
import Footer from "@/components/Footer";

export default function EditCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const api = useApiService();
  const [isSaving, setIsSaving] = useState(false);

  const { data: course, isLoading: courseLoading, error: courseError } = useCourse(courseId);
  const { data: lessons = [], isLoading: lessonsLoading, error: lessonsError } = useLessons(courseId);
  const [initialSections, setInitialSections] = useState<SectionData[] | null>(null);

  useEffect(() => {
    if (!lessonsLoading) {
      const formatted: SectionData[] = (lessons || []).map((lesson: any) => {
        let scope = lesson.scope ?? "";
        if (!scope) {
          try {
            const parsed = lesson.content ? JSON.parse(lesson.content) : {};
            scope = parsed?.scope ?? "";
          } catch (_) { scope = ""; }
        }
        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description || "",
          modules: [], // Note: You would need to fetch module content here if the original editor used it
          scope,
        } as SectionData;
      });
      setInitialSections(formatted);
    }
  }, [lessons, lessonsLoading]);

  const handleUpdateCourse = async (data: { title: string; description: string; sections: SectionData[] }) => {
    // ... (Your existing logic here remains the same)
    setIsSaving(true);
    try {
      await api.updateCourse(courseId, {
        title: data.title.trim(),
        description: data.description.trim(),
      });
      for (const lesson of lessons) {
        await api.deleteLesson(lesson.id);
      }
      for (let i = 0; i < data.sections.length; i++) {
        const s = data.sections[i];
        await api.createLesson(courseId, {
          title: s.title.trim() || `Section ${i + 1}`,
          description: s.description?.trim(),
          order: i + 1,
          content: JSON.stringify({ scope: s.scope ?? "" }),
          scope: s.scope ?? "",
        } as any);
      }
      alert("Course updated successfully!");
      router.push(`/courses/${courseId}`);
    } catch (error) {
      console.error("Failed to update course:", error);
      alert(`Error: Could not update the course. ${(error as Error).message}`);
      setIsSaving(false);
    }
  };

  const isLoading = courseLoading || lessonsLoading || initialSections === null;
  const error = courseError || lessonsError;

  if (isLoading) return <div className="p-6 text-center">Loading curriculum for editing…</div>;
  if (error) return <div className="p-6 text-red-500 text-center">Error loading data: {(error as Error).message}</div>;

  return (
    <>
      <CirriculumEditor
        // --- THIS IS THE ONLY CHANGE IN THIS FILE ---
        mode="edit" 
        // --- END CHANGE ---
        initialSections={initialSections || []}
        initialTitle={course?.title || ""}
        initialDescription={course?.description || ""}
        onFinalize={handleUpdateCourse}
        finalizeLabel={isSaving ? "Saving..." : "Save Changes"}
        courseId={courseId} 
      />
      <div className="fixed bottom-0 left-0 right-0">
        <Footer />
      </div>
    </>
  );
}