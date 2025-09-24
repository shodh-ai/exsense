'use client';

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CirriculumEditor from "@/components/CirriculumEditor";
import { SectionData } from "@/components/CurriculumSection";
import { useApiService } from "@/lib/api";
// --- THIS IS THE FIX ---
import { useCourse, useLessons } from "@/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
// --- END OF FIX ---
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid'; // Import uuid for new drafts

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
          modules: [],
          scope,
        } as SectionData;
      });
      // If the course is a new draft with no lessons, start with a blank section
      if (course.title === 'Untitled Course' && formatted.length === 0) {
        setInitialSections([{ id: uuidv4(), title: "", description: "", modules: [], scope: "" }]);
      } else {
        setInitialSections(formatted);
      }
    }
  }, [lessons, lessonsLoading, course]);

  const handleUpdateCourse = async (data: { title: string; description: string; sections: SectionData[] }, status: 'DRAFT' | 'PUBLISHED') => {
    const isPublishAction = status === 'PUBLISHED';
    if (isPublishAction) setIsPublishing(true);
    else setIsSaving(true);

    toast.loading(isPublishAction ? "Publishing course..." : "Saving draft...");

    try {
      await api.updateCourse(courseId, {
        title: data.title.trim(),
        description: data.description.trim(),
        status,
      });

      const existingLessonIds = lessons.map(l => l.id);
      
      for (const lessonId of existingLessonIds) {
        await api.deleteLesson(lessonId);
      }
      for (let i = 0; i < data.sections.length; i++) {
        const section = data.sections[i];
        await api.createLesson(courseId, {
          title: section.title.trim() || `Section ${i + 1}`,
          description: section.description?.trim(),
          order: i,
          content: JSON.stringify({ scope: section.scope ?? "" }),
          scope: section.scope ?? "",
        } as any);
      }

      await queryClient.invalidateQueries({ queryKey: ['teacherCourses'] });
      
      toast.dismiss();
      toast.success(isPublishAction ? "Course published successfully!" : "Draft saved successfully!");
      router.push(`/courses/${courseId}`);

    } catch (error) {
      toast.dismiss();
      toast.error(`Error: Could not ${isPublishAction ? 'publish' : 'save'} the course.`);
      console.error(`Failed to ${isPublishAction ? 'publish' : 'save'}:`, error);
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