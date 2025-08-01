"use client";

import React, { JSX, useState, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/nextjs"; // Import Clerk's auth hook
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

        setAllCourses(coursesResponse.courses || []);
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
                  course={{
                    ...course,
                    onEnroll: handleEnroll, // Pass the enroll handler
                    isEnrolled: enrolledCourseIds.has(course.id) // Check if user is enrolled
                  }}
                  isActive={index === 0} // You might want to change this logic
                />
              ))
            ) : (
              <p>No courses available at the moment.</p>
            )}
          </div>
        </main>

        <div>
          <Footer />
        </div>
      </div>
    </>
  );
};