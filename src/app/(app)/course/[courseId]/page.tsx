"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { useCourse, useLessons, useEnrollInCourse } from "@/hooks/useApi";

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { data: course, isLoading: courseLoading, error: courseError } = useCourse(String(courseId));
  const { data: lessons = [], isLoading: lessonsLoading, refetch: refetchLessons } = useLessons(String(courseId));
  const enrollMutation = useEnrollInCourse();
  // Static presentation details reused from the marketing page
  const courseTags: string[] = ["Top Rated", "AI-Powered", "Beginner Friendly"];
  const learningOutcomes: string[] = [
    "Learn the fundamentals of neural networks and how to build them.",
    "Explore advanced techniques including CNNs and RNNs.",
    "Understand reinforcement learning basics and applications.",
    "Dive into NLP with sentiment analysis and text generation.",
  ];

  // Data fetching handled by React Query hooks

  const enroll = async () => {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }
    try {
      await enrollMutation.mutateAsync(String(courseId));
      await refetchLessons();
    } catch (_) {
      // Errors are handled via mutation toast
    }
  };

  if (courseLoading) return <div className="p-6">Loading course...</div>;
  if (courseError) return <div className="p-6 text-red-500">{(courseError as any)?.message || "Failed to load course"}</div>;
  if (!course) return <div className="p-6">Course not found</div>;

  return (
    <div className="w-full h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="rounded-2xl overflow-hidden">
          <img src="/banner.svg" alt="Course banner" className="w-full h-48 md:h-56 object-cover" />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h1 className="text-2xl font-bold text-[#394169]">{course.title}</h1>
          <p className="mt-2 text-[#8187a0]">{course.description}</p>
          <div className="mt-4 text-sm text-[#394169]">
            <div>Teacher: {course?.teacher?.name || course?.teacher?.email || "Unknown"}</div>
            <div className="mt-1">Lessons: {course?.lessonCount ?? 0}</div>
            <div className="mt-1">Enrolled: {course?.enrollmentCount ?? 0}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex flex-wrap gap-2">
            {courseTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="rounded-[30px] bg-[#566fe91a] px-4 py-1.5 font-medium text-[#566fe9]"
              >
                {tag}
              </Badge>
            ))}
          </div>
          <div className="mt-4">
            <h2 className="text-lg font-semibold text-[#394169]">What you'll learn</h2>
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm text-[#394169]">
              {learningOutcomes.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#394169]">Curriculum</h2>
            <Button onClick={enroll} disabled={enrollMutation.isPending}>{enrollMutation.isPending ? "Enrolling..." : "Enroll"}</Button>
          </div>
          {lessons.length === 0 ? (
            <p className="mt-4 text-[#8187a0]">Lessons are locked or unavailable until enrollment.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {lessons.map((l) => (
                <li key={l.id} className="p-3 border rounded-lg">{l.order}. {l.title}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
