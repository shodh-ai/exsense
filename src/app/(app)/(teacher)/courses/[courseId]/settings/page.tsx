"use client";

import { useParams } from "next/navigation";
import CourseForm from "@/components/CourseForm"; // Adjust import path

export default function EditCourseSettingsPage() {
    const params = useParams();
    const courseId = params.courseId as string;

    // Render the form and pass the courseId.
    // This tells the component to fetch data and use local state.
    return <CourseForm courseId={courseId} />;
}