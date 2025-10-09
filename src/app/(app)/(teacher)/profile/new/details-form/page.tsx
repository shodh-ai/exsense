"use client";

import CourseForm from "@/components/CourseForm"; // Adjust import path

export default function NewCourseDetailsPage() {
  // Render the form without a courseId.
  // It will automatically use the Zustand store for its state.
  return <CourseForm />;
}