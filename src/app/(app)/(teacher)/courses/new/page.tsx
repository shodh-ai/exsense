'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
// --- THIS IS THE FIX ---
import { useQueryClient } from "@tanstack/react-query";
// --- END OF FIX ---

// --- Core Components & State Management ---
import CirriculumEditor from "@/components/CirriculumEditor";
import Footer from "@/components/Footer";
import { SectionData } from "@/components/CurriculumSection";
import { useNewCourseStore } from "@/lib/newCourseStore"; 

// --- API & Hooks ---
import { useApiService } from "@/lib/api";
import { queryKeys } from "@/hooks/useApi"; 

export default function NewCoursePage() {
  const router = useRouter();
  const api = useApiService();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const {
    title,
    description,
    sections,
    tags,
    skills,
    learningOutcomes,
    difficulty,
    language,
    reset: resetNewCourseStore,
  } = useNewCourseStore();

  const handleCreateCourse = async (
    editorData: { title: string; description: string; sections: SectionData[] }
  ) => {
    if (isCreating) return;
    setIsCreating(true);

    if (!editorData.title.trim()) {
      alert("Please provide a course title in the first section.");
      setIsCreating(false);
      return;
    }

    try {
      const finalCoursePayload = {
        title: editorData.title.trim(),
        description: editorData.description.trim(),
        tags: tags,
        skills: skills,
        learningOutcomes: learningOutcomes,
        difficulty: difficulty,
        language: language,
      };

      const newCourse = await api.createCourse(finalCoursePayload);
      if (!newCourse || !newCourse.id) {
        throw new Error("Course creation failed: No ID was returned from the server.");
      }

      for (let i = 0; i < editorData.sections.length; i++) {
        const section = editorData.sections[i];
        const lesson = await api.createLesson(newCourse.id, {
          title: section.title.trim() || `Section ${i + 1}`,
          description: section.description?.trim(),
          order: i + 1,
          content: JSON.stringify({ scope: section.scope ?? "" }),
          scope: section.scope ?? "",
        });
        
        for (const module of section.modules) {
            await api.addLessonContent(lesson.id, {
                title: module.title,
                type: module.teachingMode?.toUpperCase() || 'TEXT', 
                content: JSON.stringify(module.content),
            });
        }
      }
      
      await queryClient.invalidateQueries({ queryKey: queryKeys.courses });
      await queryClient.invalidateQueries({ queryKey: queryKeys.teacherCourses });

      resetNewCourseStore();
      router.push(`/courses/${newCourse.id}`);

    } catch (error) {
      console.error("Failed to create course:", error);
      alert(`Error: Could not create the course. ${(error as Error).message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto h-[90%] overflow-y-auto custom-scrollbar">
      {/* This component is now deprecated by the new flow, but we keep the page structure */}
      {/* You would replace this with the new CirriculumEditor flow if this page were to be used */}
      <p className="p-8 text-center">This page is for handling the legacy new course flow.</p>
      {/* In the new flow, users are redirected from the dashboard to /courses/[courseId]/edit directly */}
    </div>
  );
}