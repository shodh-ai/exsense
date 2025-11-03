'use client';

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CirriculumEditor from "@/components/compositions/CirriculumEditor";
import { SectionData } from "@/components/compositions/CurriculumSection";
import { useApiService } from "@/lib/api";
import { useCourse, useLessons } from "@/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import Footer from "@/components/compositions/Footer";
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
        let environment = null;
        if (lesson.content) {
            try {
                const parsed = JSON.parse(lesson.content);
                scope = parsed?.scope ?? scope;
                environment = parsed?.environment ?? null;
            } catch (_) { /* Keep existing scope */ }
        }
        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description || "",
          environment: environment,
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

  const handleUpdateCourse = async (data: { sections: SectionData[] }, status: 'DRAFT' | 'PUBLISHED') => {
    const isPublishAction = status === 'PUBLISHED';
    if (isPublishAction) setIsPublishing(true);
    else setIsSaving(true);

    const actionVerb = isPublishAction ? "Publishing" : "Saving";
    toast.loading(`${actionVerb} curriculum...`);

    try {
      await api.updateCourse(courseId, {
        status: status,
      });

      const existingLessonIds = lessons.map(l => l.id);
      
      for (const lessonId of existingLessonIds) {
        await api.deleteLesson(lessonId);
      }
      
      for (let i = 0; i < data.sections.length; i++) {
        const section = data.sections[i];

        // --- MODIFICATION START ---
        // The `order` is now `i + 1` to ensure it starts from 1, not 0.
        const lessonPayload = {
            title: section.title.trim() || `Lesson ${i + 1}`,
            description: section.description?.trim(),
            order: i + 1, // <-- THE FIX IS HERE
            content: JSON.stringify({ 
                scope: section.scope ?? "", 
                environment: section.environment ?? null 
            }),
            scope: section.scope ?? "",
        };

        await api.createLesson(courseId, lessonPayload);
        // --- MODIFICATION END ---
      }

      await queryClient.invalidateQueries({ queryKey: ['courses', courseId] });
      await queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      await queryClient.invalidateQueries({ queryKey: ['teacherCourses'] });
      
      toast.dismiss();
      toast.success(isPublishAction ? "Course published successfully!" : "Draft saved successfully!");
      
      router.push(`/courses/${courseId}`);

    } catch (error) {
      toast.dismiss();
      toast.error(`Error: Could not ${actionVerb.toLowerCase()} the curriculum.`);
      console.error(`Failed to ${actionVerb}:`, error);
    } finally {
      if (isPublishAction) setIsPublishing(false);
      else setIsSaving(false);
    }
  };

  const isLoading = courseLoading || lessonsLoading || initialSections === null;
  const error = courseError || lessonsError;

  if (isLoading) return <div className="p-6 text-center">Loading curriculum…</div>;
  if (error) return <div className="p-6 text-red-500 text-center">Error: {(error as Error).message}</div>;

  return (
    <>
      <CirriculumEditor
        initialSections={initialSections || []}
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