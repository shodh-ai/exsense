"use client";

import React, { JSX, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCourses, useMyEnrollments, useEnrollInCourse } from "@/hooks/useApi";
import Link from "next/link";
import { Button } from "@/components/button";

// Import your components
import { Plus_Jakarta_Sans } from "next/font/google";
import CourseCard, { Course } from "@/components/CourseCard";
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";


const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function CoursesPage(): JSX.Element {
  // --- AUTHENTICATION ---
  const { isSignedIn } = useAuth();
  const router = useRouter();

  // --- DATA VIA REACT QUERY ---
  const { data: coursesData = [], isLoading: coursesLoading, error: coursesError } = useCourses();
  const { data: myEnrollments = [], isLoading: enrollmentsLoading } = useMyEnrollments({ enabled: isSignedIn });
  const enrollMutation = useEnrollInCourse();

  // Normalize backend courses into CourseCard.Course shape
  const allCourses: Course[] = useMemo(() => {
    return (coursesData || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description || "",
      instructor: c?.teacher?.name || c?.teacher?.email || "Unknown Instructor",
      rating: "4.8",
      reviews: String(c?.enrollmentCount ?? 0),
      level: "Beginner",
      duration: c?.lessonCount ? `${c.lessonCount} lessons` : "Self-paced",
      image: "/1.png",
    }));
  }, [coursesData]);

  // --- EVENT HANDLERS ---
  const handleEnroll = async (courseId: string | number) => {
    try {
      await enrollMutation.mutateAsync(String(courseId));
      toast.success("Successfully enrolled!");
    } catch (err: any) {
      toast.error(`Enrollment failed: ${err.message}`);
    }
  };

  // --- SESSION HANDLER ---
  const handleStartSession = async (courseId: string | number) => {
    try {
      console.log(`Starting session for course: ${courseId}`);
      
      // Find the course details for the session
      const selectedCourse = allCourses.find(course => course.id === courseId);
      
      if (!selectedCourse) {
        throw new Error('Course not found');
      }

      // Navigate to session page with course details
      router.push(`/session?courseId=${courseId}&title=${encodeURIComponent(selectedCourse.title)}`);
      
    } catch (err: any) {
      toast.error(`Failed to start session: ${err.message}`);
    }
  };

  // --- RENDER LOGIC ---
  const isLoading = coursesLoading || (isSignedIn && enrollmentsLoading) || enrollMutation.isPending;
  if (isLoading) {
    return <div>Loading courses...</div>; // Or your fancy loading component
  }

  if (coursesError) {
    const msg = (coursesError as any)?.message || 'Failed to load courses';
    return <div className="text-red-500">Error: {msg}</div>;
  }

  // Create a set of enrolled course IDs for quick lookups (normalize to string to avoid type mismatches)
  const enrolledCourseIds = new Set((myEnrollments || []).map((e: any) => String(e.courseId)));

  // Only show courses the student is enrolled in
  const enrolledCourses = allCourses.filter((c) => enrolledCourseIds.has(String(c.id)));

  return (
    <>
      <Sphere />
      <div className={`h-[97%] w-full bg-transparent flex flex-col px-4 pt-4 pb-4 ${plusJakartaSans.className}`}>
        {/* ... (Your existing header and background JSX) ... */}

        <main className="relative w-full max-w-4xl self-center overflow-y-auto rounded-3xl p-6 md:p-8 z-10 flex flex-col mt-0">
          {/* ... (Your existing filter and search JSX) ... */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-black">My Courses</h2>
            <Button asChild>
              <Link href="/course-listing">Browse courses</Link>
            </Button>
          </div>

          {/* Course cards list - show only enrolled courses */}
          <div className="flex flex-col gap-6 overflow-y-scroll pr-2 max-h-[480px] custom-scrollbar">
            {enrolledCourses.length > 0 ? (
              enrolledCourses.map((course, index) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isActive={index === 0}
                  isEnrolled={true}
                  onEnroll={handleEnroll}
                  onStartSession={handleStartSession}
                />
              ))
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <p>You have not enrolled in any courses yet.</p>
                <Button asChild variant="outline">
                  <Link href="/course-listing">Browse courses</Link>
                </Button>
              </div>
            )}
          </div>
        </main>

       <div className="fixed bottom-0 left-0 right-0">
        <Footer />
      </div>
    </div>
    </>
  );
};