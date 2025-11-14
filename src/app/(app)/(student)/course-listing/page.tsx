'use client';

import { ChevronDownIcon, SearchIcon, ChevronLeftIcon, Link } from "lucide-react";
import React, { JSX, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CourseCard, { Course } from "@/components/compositions/CourseCard";
import Sphere from "@/components/compositions/Sphere";
import Footer from "@/components/compositions/Footer";
import { useCourses } from "@/hooks/useApi";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});


const CoursesPage = (): JSX.Element => {
  const { data, isLoading, error } = useCourses();
  const { user } = useUser();
  const router = useRouter();

  const [activeCourseId, setActiveCourseId] = useState<number | string | null>(null);

  const courses: Course[] = useMemo(() => {
    const fetchedCourses = data || [];
    const publishedCourses = fetchedCourses.filter((c: any) => c.status === 'PUBLISHED');

    const mappedCourses = publishedCourses.map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description || "No description available.",
      instructor: (() => {
        const teacherName = c?.teacher?.name;
        const teacherEmail = c?.teacher?.email?.toLowerCase?.();
        const viewerEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase?.();
        if (teacherName && teacherName.trim().length > 0) return teacherName;
        if (teacherEmail && viewerEmail && teacherEmail === viewerEmail && user?.fullName) return user.fullName;
        return c?.teacher?.email || "Unknown Instructor";
      })(),
      rating: String(c.rating ?? "4.8"),
      reviews: String(c.reviews ?? c.enrollmentCount ?? 0),
      level: c.difficulty ?? "Beginner",
      duration: c.duration ?? (c.lessonCount ? `${c.lessonCount} lessons` : "Self-paced"),
      image: "/RectangleImage.png",
    })) as Course[];

    if (mappedCourses.length && activeCourseId === null) {
      setActiveCourseId(mappedCourses[0].id);
    }

    return mappedCourses;
  }, [data, activeCourseId, user]);

  const [searchQuery, setSearchQuery] = useState("");

  // --- MODIFICATION START ---
  // Filter courses based on the search query.
  const filteredCourses = useMemo(() => {
    if (!searchQuery) {
      return courses;
    }
    return courses.filter((course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [courses, searchQuery]);
  // --- MODIFICATION END ---

  return (
    <>
      <Sphere />
      <div className={`h-full w-full bg-transparent flex flex-col px-4 pt-4 pb-4 ${plusJakartaSans.className}`}>
        <main className="relative w-full h-[90%] max-w-4xl self-center rounded-3xl p-6 md:p-8 z-10 flex flex-col mt-0 overflow-hidden custom-scrollbar pr-2">
          <div className="sticky top-0 bg-transparent z-20 pb-6">
            <nav className="flex items-center gap-3 mb-4">
              <Breadcrumb>
                <BreadcrumbList className="inline-flex items-center gap-[19px]">
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/student_dashboard" className="font-medium text-[#8187a0] transition-colors hover:text-[#394169]">
                      <span className="inline-flex items-center gap-1">
                        <img src="/ChevronBackIcon.png" alt="Chevron" className="h-4 w-4" />
                        <span>Dashboard</span>
                      </span>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <span
                    className="inline-flex items-center justify-center w-[3px] h-4 opacity-100 text-[#8187A0] text-[12px] leading-4 font-semibold tracking-[-0.3px]"
                    style={{ fontFamily: 'Inter Display' }}
                  >
                    ·
                  </span>
                  <BreadcrumbItem>
                    <span className="font-medium text-[#8187a0]">Explore Courses</span>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </nav>
            <div className="w-full flex justify-between items-center mb-8">
              <h1 className="font-semibold text-[#394169] text-xl md:text-2xl">
                Our Interactive Session
              </h1>
            </div>

            <div className="flex flex-col min-[500px]:flex-row min-[500px]:items-center gap-4">
              <Button variant="outline" className="h-12 w-full min-[500px]:w-auto min-[500px]:flex-shrink-0 pl-4 pr-3 py-[13px] rounded-full border border-solid border-[#566fe9] text-[#566fe9] bg-white hover:bg-blue-50 transition-colors">
                <span className="font-medium text-sm">Browse</span>
                <ChevronDownIcon className="w-4 h-4 " />
              </Button>

              <div className="flex w-full flex-grow items-center rounded-full border border-solid border-gray-300/70 bg-white/80 transition-all duration-300">
                <Input
                  className="border-0 bg-transparent shadow-none w-full h-[48px] pl-5 pr-2 text-black placeholder:text-gray-400 placeholder:font-medium placeholder:text-sm placeholder:leading-normal focus:ring-0"
                  placeholder="Search Course"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button size="icon" className={`rounded-full flex-shrink-0 p-2.5 mr-1 h-[38px] w-[38px] transition-colors ${searchQuery ? "bg-[#566fe9]" : "bg-[#e6e8ff]"}`}>
                  <SearchIcon className={`w-5 h-5 transition-colors ${searchQuery ? "text-white" : "text-[#566fe9]"}`} />
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto h-full mt-0 custom-scrollbar pr-4">
            <div className="grid gap-6 auto-rows-fr">
              {isLoading && <p>Loading courses...</p>}
              {error && <p className="text-red-500">Error: {(error as any)?.message || 'Failed to load courses'}</p>}
              
              {/* --- MODIFICATION START --- */}
              {!isLoading && !error && filteredCourses.length === 0 && (
                <p className="text-center text-gray-500 col-span-full">
                  {searchQuery ? "No courses found matching your search." : "No published courses available at the moment. Please check back later!"}
                </p>
              )}
              {!isLoading && !error && filteredCourses.map((course) => (
                <div key={course.id} onClick={() => { setActiveCourseId(course.id); router.push(`/course/${course.id}`); }} className="cursor-pointer">
                  <CourseCard course={course} isActive={activeCourseId === course.id} isEnrolled={false} onEnroll={() => router.push(`/course/${course.id}`)} />
                </div>
              ))}
              {/* --- MODIFICATION END --- */}
            </div>
          </div>
        </main>

        
          <Footer />
        
      </div>
    </>
  );
};

export default CoursesPage;
