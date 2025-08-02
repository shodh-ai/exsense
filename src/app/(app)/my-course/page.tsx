"use client";

import React, { JSX, useState, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/nextjs"; // Import Clerk's auth hook
import { useRouter } from "next/navigation"; // Import Next.js router for navigation
import { createApiClient } from "@/lib/apiclient"; // Import our new API client

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
  // --- STATE MANAGEMENT ---
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- AUTHENTICATION & API CLIENT ---
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter(); // For navigation to session page
  // Memoize the apiClient so it's not recreated on every render
  const apiClient = useMemo(() => createApiClient({ getToken }), [getToken]);

  // --- DATA FETCHING ---
  useEffect(() => {
    // We only fetch data if the user is signed in.
    if (!isSignedIn) {
      setIsLoading(false);
      return;
    }

    const fetchCourseData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch both sets of data in parallel for performance
        const [coursesResponse, enrollmentsResponse] = await Promise.all([
          apiClient.get('/api/courses'),             // Fetches all available courses
          apiClient.get('/api/enrollments/student/me') // Fetches courses the user is enrolled in
        ]);

        setAllCourses(coursesResponse || []);
        setMyEnrollments(enrollmentsResponse.enrollments || []);

      } catch (err: any) {
        setError(err.message);
        console.error("Failed to fetch course data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseData();
  }, [isSignedIn, apiClient]); // Re-run this effect if isSignedIn or the apiClient changes

  // --- EVENT HANDLERS ---
  const handleEnroll = async (courseId: string | number) => {
    try {
      console.log(`Enrolling in course: ${courseId}`);
      // Send the enrollment request to the backend
      const newEnrollment = await apiClient.post('/api/enrollments', { courseId });

      // Update our local state to immediately reflect the change without a page refresh
      setMyEnrollments(prevEnrollments => [...prevEnrollments, { courseId }]); // Simple update

      alert("Successfully enrolled!");

    } catch (err: any) {
      setError(`Enrollment failed: ${err.message}`);
      alert(`Enrollment failed: ${err.message}`);
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
      setError(`Failed to start session: ${err.message}`);
      alert(`Failed to start session: ${err.message}`);
    }
  };

  // --- RENDER LOGIC ---
  if (isLoading) {
    return <div>Loading courses...</div>; // Or your fancy loading component
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  // Create a set of enrolled course IDs for quick lookups
  const enrolledCourseIds = new Set(myEnrollments.map(e => e.courseId));

  return (
    <>
      <Sphere />
      <div className={`h-[97%] w-full bg-transparent flex flex-col px-4 pt-4 pb-4 ${plusJakartaSans.className}`}>
        {/* ... (Your existing header and background JSX) ... */}

        <main className="relative w-full max-w-4xl self-center overflow-y-auto rounded-3xl p-6 md:p-8 z-10 flex flex-col mt-0">
          {/* ... (Your existing filter and search JSX) ... */}

          {/* Course cards list - NOW DYNAMIC */}
          <div className="flex flex-col gap-6 overflow-y-scroll pr-2 max-h-[480px] custom-scrollbar">
            {allCourses.length > 0 ? (
              allCourses.map((course, index) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isActive={index === 0}
                  isEnrolled={enrolledCourseIds.has(course.id)}
                  onEnroll={handleEnroll}
                  onStartSession={handleStartSession}
                />
              ))
            ) : (
              <p>No courses available at the moment.</p>
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