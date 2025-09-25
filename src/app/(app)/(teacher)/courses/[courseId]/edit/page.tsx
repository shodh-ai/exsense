'use client';

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CirriculumEditor from "@/components/CirriculumEditor";
import { SectionData } from "@/components/CurriculumSection";
import { useApiService } from "@/lib/api";
import { useCourse, useLessons } from "@/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';

export default function EditCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const api = useApiService();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const { data: course, isLoading: courseLoading, error: courseError } = useCourse(courseId);
  const { data: lessons = [], isLoading: lessonsLoading, error: lessonsError } = useLessons(courseId);
  const [initialSections, setInitialSections] = useState<SectionData[] | null>(null);

  useEffect(() => {
    if (!lessonsLoading && course) {
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
          // --- MODIFICATION: Match the new flat structure ---
          environment: lesson.environment || null, 
          scope,
        } as SectionData;
      });
      if (course.title === 'Untitled Course' && formatted.length === 0) {
        setInitialSections([{ id: uuidv4(), title: "", description: "", scope: "", environment: null }]);
      } else {
        setInitialSections(formatted);
      }
    }
  }, [lessons, lessonsLoading, course]);

  // --- MODIFICATION START ---
  // This function is now the core of the save/publish logic.
  const handleUpdateCourse = async (data: { title: string; description: string; sections: SectionData[] }, status: 'DRAFT' | 'PUBLISHED') => {
    const isPublishAction = status === 'PUBLISHED';
    if (isPublishAction) setIsPublishing(true);
    else setIsSaving(true);

    const actionVerb = isPublishAction ? "Publishing" : "Saving";
    toast.loading(`${actionVerb} course...`);

    try {
      // 1. Update the main course details, including the new status
      await api.updateCourse(courseId, {
        title: data.title.trim(),
        description: data.description.trim(),
        status: status, // Send the status to the backend
      });

      // 2. Get a list of lessons that currently exist on the backend for this course
      const existingLessonIds = lessons.map(l => l.id);
      
      // 3. Delete all existing lessons to ensure a clean sync
      for (const lessonId of existingLessonIds) {
        await api.deleteLesson(lessonId);
      }
      
      // 4. Re-create all lessons based on the current UI state
      for (let i = 0; i < data.sections.length; i++) {
        const section = data.sections[i];
        await api.createLesson(courseId, {
          title: section.title.trim() || `Lesson ${i + 1}`,
          description: section.description?.trim(),
          order: i,
          // Storing scope and environment in a structured way
          content: JSON.stringify({ scope: section.scope ?? "", environment: section.environment ?? null }),
          scope: section.scope ?? "", 
        });
      }

      // 5. Invalidate queries to ensure all parts of the app refetch the latest data
      await queryClient.invalidateQueries({ queryKey: ['courses', courseId] });
      await queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      await queryClient.invalidateQueries({ queryKey: ['teacherCourses'] });
      
      toast.dismiss();
      toast.success(isPublishAction ? "Course published successfully!" : "Draft saved successfully!");
      
      // 6. Navigate to the course overview page
      router.push(`/courses/${courseId}`);

    } catch (error) {
      toast.dismiss();
      toast.error(`Error: Could not ${isPublishAction ? 'publish' : 'save'} the course.`);
      console.error(`Failed to ${actionVerb}:`, error);
    } finally {
      if (isPublishAction) setIsPublishing(false);
      else setIsSaving(false);
    }
  };
  // --- MODIFICATION END ---

  const isLoading = courseLoading || lessonsLoading || initialSections === null;
  const error = courseError || lessonsError;

  if (isLoading) return <div className="p-6 text-center">Loading curriculum…</div>;
  if (error) return <div className="p-6 text-red-500 text-center">Error: {(error as Error).message}</div>;

  return (
    <>
      <CirriculumEditor
        initialSections={initialSections || []}
        initialTitle={course?.title === 'Untitled Course' ? '' : course?.title}
        initialDescription={course?.description || ""}
        onSaveDraft={(data) => handleUpdateCourse(data, 'DRAFT')}
        onPublish={(data) => handleUpdateCourse(data, 'PUBLISHED')}
        isSaving={isSaving}
        isPublishing={isPublishing}
        courseId={courseId} 
      />
      <div className="fixed bottom-[2%] left-0 right-0">
        <Footer />
      </div>
    </>
  );
}