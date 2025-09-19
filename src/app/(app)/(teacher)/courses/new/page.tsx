
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

// --- Core Components & State Management ---
import CirriculumEditor from "@/components/CirriculumEditor";
import Footer from "@/components/Footer";
import { SectionData } from "@/components/CurriculumSection";
import { useNewCourseStore } from "@/lib/newCourseStore"; // Adjust this import path if needed

// --- API & Hooks ---
import { useApiService } from "@/lib/api";
import { queryKeys } from "@/hooks/useApi"; // Assuming you have queryKeys defined for React Query

export default function NewCoursePage() {
  const router = useRouter();
  const api = useApiService();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  // Get ALL data from the shared store, including what was set on the details-form page.
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
      // 1. Combine data from the editor AND the store into one complete payload.
      const finalCoursePayload = {
        title: editorData.title.trim(),
        description: editorData.description.trim(),
        tags: tags,
        skills: skills,
        learningOutcomes: learningOutcomes,
        difficulty: difficulty,
        language: language,
      };

      // 2. Send the complete payload to the backend.
      const newCourse = await api.createCourse(finalCoursePayload);
      if (!newCourse || !newCourse.id) {
        throw new Error("Course creation failed: No ID was returned from the server.");
      }

      // 3. Create the lessons associated with the new course.
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
      
      // 4. Invalidate the cache to ensure the course page fetches fresh data.
      await queryClient.invalidateQueries({ queryKey: queryKeys.courses });
      await queryClient.invalidateQueries({ queryKey: queryKeys.teacherCourses });

      // 5. Reset the form's global state for the next use.
      resetNewCourseStore();

      // 6. Redirect to the newly created course page.
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