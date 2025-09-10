"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

// --- Core Components & State Management ---
import CirriculumEditor from "@/components/CirriculumEditor";
import Footer from "@/components/Footer";
import { SectionData } from "@/components/CurriculumSection";
import { useNewCourseStore } from "@/lib/newCourseStore"; // Adjust this import path to where you create the store

// --- API & Hooks ---
import { useApiService } from "@/lib/api";

export default function NewCoursePage() {
  const router = useRouter();
  const api = useApiService();
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
    reset: resetNewCourseStore, // Rename reset to be more specific
  } = useNewCourseStore();


  const handleCreateCourse = async (
    editorData: { title: string; description: string; sections: SectionData[] }
  ) => {
    // Prevent multiple submissions
    if (isCreating) return;
    setIsCreating(true);

    // Basic validation
    if (!editorData.title.trim()) {
      alert("Please provide a course title in the first section.");
      setIsCreating(false);
      return;
    }

    try {
      // 2. Combine data from the editor (most recent curriculum) with metadata from the store.
      const finalCoursePayload = {
        title: editorData.title.trim(),
        description: editorData.description.trim(),
        tags,
        skills,
        learningOutcomes,
        difficulty,
        language,
        // Add any other fields from your store here
      };

      // 3. Step 1: Create the main course entry to get its ID.
      const newCourse = await api.createCourse(finalCoursePayload);

      if (!newCourse || !newCourse.id) {
        throw new Error("Course creation failed: No ID was returned from the server.");
      }

      // 4. Step 2: Iterate through the sections from the editor to create each lesson.
      for (let i = 0; i < editorData.sections.length; i++) {
        const section = editorData.sections[i];
        const lesson = await api.createLesson(newCourse.id, {
          title: section.title.trim() || `Section ${i + 1}`,
          description: section.description?.trim(),
          order: i + 1,
          content: JSON.stringify({ scope: section.scope ?? "" }), // Persist scope
        });

        // Optional: If your editor supports modules, create them as lesson content
        if (section.modules && section.modules.length > 0) {
          for (let j = 0; j < section.modules.length; j++) {
            const module = section.modules[j];
            await api.addLessonContent(lesson.id, {
              type: 'TEXT', // Or determine type based on module data
              title: module.title,
              text: module.title, // Assuming text content is same as title for now
              order: j + 1,
            });
          }
        }
      }

      // 5. Success! Reset the store to clear data for the next new course.
      resetNewCourseStore();

      // 6. Redirect the teacher to the AI imprinting session for the new course.
      // This is a common next step after defining the curriculum.
      router.push(`/teacher/imprinting-session?courseId=${newCourse.id}`);

    } catch (error) {
      console.error("Failed to create course:", error);
      // Provide a user-friendly error message
      const errorMessage = (error instanceof Error) ? error.message : "An unknown error occurred.";
      alert(`Error: Could not create the course. ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    // This container ensures the footer is positioned correctly at the bottom
    <div className="container mx-auto h-[calc(100vh-60px)]">

      <CirriculumEditor
        initialTitle={title}
        initialDescription={description}
        initialSections={sections}
        onFinalize={handleCreateCourse}
        finalizeLabel={isCreating ? "Creating..." : "Finalize Course"}
      />
      
      <div className="fixed bottom-0 left-0 right-0">
        <Footer />
      </div>
    </div>
  );
}