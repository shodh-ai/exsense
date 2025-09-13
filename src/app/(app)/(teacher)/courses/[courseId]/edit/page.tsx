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

  // Fetch existing course and lessons
  const { data: course, isLoading: courseLoading, error: courseError } = useCourse(courseId);
  const { data: lessons = [], isLoading: lessonsLoading, error: lessonsError } = useLessons(courseId);

  // Prepare initial sections for the editor
  const [initialSections, setInitialSections] = useState<SectionData[] | null>(null);

  useEffect(() => {
    if (!lessonsLoading) {
      const formatted: SectionData[] = (lessons || []).map((lesson: any) => {
        // Prefer first-class scope, fallback to legacy content JSON
        let scope = lesson.scope ?? "";
        if (!scope) {
          try {
            const parsed = lesson.content ? JSON.parse(lesson.content) : {};
            scope = parsed?.scope ?? "";
          } catch (_) {
            scope = "";
          }
        }
        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description || "",
          modules: [],
          scope,
        } as SectionData;
      });
      setInitialSections(formatted);
    }
  }, [lessons, lessonsLoading]);

  // Save handler invoked by CirriculumEditor on finalize
  const handleUpdateCourse = async (data: { title: string; description: string; sections: SectionData[] }) => {
    setIsSaving(true);
    try {
      // Update core course details
      await api.updateCourse(courseId, {
        title: data.title.trim(),
        description: data.description.trim(),
      });

      // Replace lessons with the new set from editor
      for (const lesson of lessons) {
        await api.deleteLesson(lesson.id);
      }
      for (let i = 0; i < data.sections.length; i++) {
        const s = data.sections[i];
        await api.createLesson(courseId, {
          title: s.title.trim() || `Section ${i + 1}`,
          description: s.description?.trim(),
          order: i + 1,
          // Persist scope both as first-class and in content for compatibility
          content: JSON.stringify({ scope: s.scope ?? "" }),
          scope: s.scope ?? "",
        } as any);
      }

      alert("Course updated successfully!");
      // Route to existing course overview page
      router.push(`/courses/${courseId}`);
    } catch (error) {
      console.error("Failed to update course:", error);
      alert(`Error: Could not update the course. ${(error as Error).message}`);
      setIsSaving(false);
    }
  };

  // Loading and error states
  const isLoading = courseLoading || lessonsLoading || initialSections === null;
  const error = courseError || lessonsError;

  if (isLoading) {
    return <div className="p-6 text-center">Loading curriculum for editing…</div>;
  }
  if (error) {
    return <div className="p-6 text-red-500 text-center">Error loading data: {(error as Error).message}</div>;
  }

  return (
    <><CirriculumEditor
      initialSections={initialSections || []}
      initialTitle={course?.title || ""}
      initialDescription={course?.description || ""}
      onFinalize={handleUpdateCourse}
      finalizeLabel={isSaving ? "Saving..." : "Save Changes"}
      courseId={courseId} />
      <div className="fixed bottom-0 left-0 right-0">
        <Footer />
      </div></>
  );
}