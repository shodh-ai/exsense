// exsense/src/app/(app)/courses/new/page.tsx

'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

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
    // ... (Your existing logic here remains the same)
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
        await api.createLesson(newCourse.id, {
          title: section.title.trim() || `Section ${i + 1}`,
          description: section.description?.trim(),
          order: i + 1,
          content: JSON.stringify({ scope: section.scope ?? "" }),
          scope: section.scope ?? "",
        });
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
      <CirriculumEditor
        // --- THIS IS THE ONLY CHANGE IN THIS FILE ---
        mode="create" 
        // --- END CHANGE ---
        initialTitle={title}
        initialDescription={description}
        initialSections={sections}
        onFinalize={handleCreateCourse}
        finalizeLabel={isCreating ? "Creating..." : "Finalize Course"}
      />
      <div className="fixed bottom-[2%] left-0 right-0">
        <Footer />
      </div>
    </div>
  );
}