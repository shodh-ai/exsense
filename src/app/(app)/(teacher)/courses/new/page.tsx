"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import CirriculumEditor from "@/components/CirriculumEditor";
import { SectionData } from "@/components/CurriculumSection";
import { useApiService } from "@/lib/api";

export default function NewCoursePage() {
  const router = useRouter();
  const api = useApiService();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCourse = async (data: { title: string; description: string; sections: SectionData[] }) => {
    setIsCreating(true);
    try {
      // Step 1: Create the main course entry to get an ID
      const newCourse = await api.createCourse({
        title: data.title.trim(),
        description: data.description.trim(),
        // Make sure you're including any other required fields like teacherId
      });

      if (!newCourse || !newCourse.id) {
        throw new Error("Course creation failed, no ID returned.");
      }

      // Step 2: Create each section as a lesson, starting the order from 1
      for (let i = 0; i < data.sections.length; i++) {
        const section = data.sections[i];
        await api.createLesson(newCourse.id, {
          title: section.title.trim() || `Section ${i + 1}`,
          description: section.description?.trim(),
          order: i + 1,
        });
      }

      // Step 3: Redirect to the AI Imprinting Session page on success
      router.push('/teacher/imprint-session');

    } catch (error) {
      console.error("Failed to create course:", error);
      // Display the specific error message from the backend
      alert(`Error: Could not create the course. ${ (error as any)?.response?.data?.message || (error as Error).message }`);
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Course</h1>
      <CirriculumEditor 
        onSubmit={handleCreateCourse} 
        isSubmitting={isCreating}
      />
    </div>
  );
}