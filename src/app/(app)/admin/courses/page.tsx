"use client";

import React from "react";
import { useAdminCourses } from "@/hooks/useApi";

export default function AdminCoursesPage() {
  const { data: courses = [], isLoading, error } = useAdminCourses();

  return (
    <div className="w-full h-full p-6 overflow-y-auto">
      <h1 className="text-xl font-bold text-[#394169] mb-4">All Courses</h1>
      {isLoading && <p>Loading courses...</p>}
      {error && <p className="text-red-500">{String((error as any)?.message || error)}</p>}
      <ul className="space-y-2">
        {courses.map((c) => (
          <li key={c.id} className="p-3 border rounded-lg">
            <div className="font-semibold">{c.title}</div>
            <div className="text-sm text-[#8187a0]">Teacher: {c.teacher?.name || c.teacher?.email}</div>
            <div className="text-sm">Enrollments: {c.enrollmentsCount}, Lessons: {c.lessonsCount}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
