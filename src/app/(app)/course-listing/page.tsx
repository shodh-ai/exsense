"use client";
// src/pages/CoursesPage.tsx
import { ChevronDownIcon, SearchIcon, XIcon } from "lucide-react";
import React, { JSX, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import CourseCard, { Course } from "@/components/CourseCard";
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";
import { useCourses } from "@/hooks/useApi";


const plusJakartaSans = Plus_Jakarta_Sans({
 subsets: ["latin"],
 weight: ["400", "500", "600", "700"],
});

const Breadcrumb = () => (
    <div className="flex items-center text-sm text-gray-500 mb-4">
      <a href="/student_dashboard" className="flex items-center hover:underline">
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 19l-7-7 7-7"
          ></path>
        </svg>
      </a>
      <a href="/student_dashboard" className="hover:underline">
        Dashboard
      </a>
      <span className="mx-2">·</span>
      <span className="text-gray-800">Explore Courses</span>
    </div>
  );


const CoursesPage = (): JSX.Element => {
 // Dynamic courses state
 const { data, isLoading, error } = useCourses();
 const router = useRouter();
 


 const [activeCourseId, setActiveCourseId] = useState<number | string | null>(null);

 const courses: Course[] = useMemo(() => {
   const fetched = data || [];
   const mapped = fetched.map((c: any) => ({
     id: c.id,
     title: c.title,
     description: c.description || "",
     instructor: c?.teacher?.name || c?.teacher?.email || "Unknown Instructor",
     rating: "4.8",
     reviews: String(c?.enrollmentCount ?? 0),
     level: "Beginner",
     duration: c?.lessonCount ? `${c.lessonCount} lessons` : "Self-paced",
     image: "/1.png",
   })) as Course[];
   if (mapped.length && activeCourseId === null) {
     setActiveCourseId(mapped[0].id);
   }
   return mapped;
 }, [data, activeCourseId]);


 const [searchQuery, setSearchQuery] = useState("");


 return (
 <>
 <Sphere />
 <div
 className={`h-full w-full bg-transparent flex flex-col px-4 pt-4 pb-4 ${plusJakartaSans.className}`}
 >
 <main className="relative w-full h-[90%] max-w-4xl self-center rounded-3xl p-6 md:p-8 z-10 flex flex-col mt-0 overflow-hidden custom-scrollbar pr-2">
 {/* STICKY HEADER CONTAINER */}
 <div className="sticky top-0 bg-transparent z-20 pb-6">
 <Breadcrumb />
 <div className="w-full flex justify-between items-center mb-8">
 <h1 className="font-semibold text-black text-xl md:text-2xl">
 Our Interactive Session
 </h1>

 </div>


 <div className="flex flex-col min-[500px]:flex-row min-[500px]:items-center gap-4">
 <Button
 variant="outline"
 className="h-12 w-full min-[500px]:w-auto min-[500px]:flex-shrink-0 pl-4 pr-3 py-[13px] rounded-full border border-solid border-[#566fe9] text-[#566fe9] bg-white hover:bg-blue-50 transition-colors"
 >
 <span className="font-medium text-sm">Browse</span>
 <ChevronDownIcon className="w-4 h-4 " />
 </Button>
 
 <div className="flex w-full flex-grow items-center rounded-full border border-solid border-gray-300/70 bg-white/80 transition-all duration-300">
 <Input
 className="border-0 bg-transparent shadow-none w-full h-[48px] pl-5 pr-2 text-black placeholder:text-gray-400 placeholder:font-medium placeholder:text-sm placeholder:leading-normal focus:ring-0"
 placeholder="Search for anything..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 />
 <Button
 size="icon"
 className={`rounded-full flex-shrink-0 p-2.5 mr-1 h-[38px] w-[38px] transition-colors ${
 searchQuery ? "bg-[#566fe9]" : "bg-[#e6e8ff]"
 }`}
 >
 <SearchIcon
 className={`w-5 h-5 transition-colors ${
 searchQuery ? "text-white" : "text-[#566fe9]"
 }`}
 />
 </Button>
 </div>
 </div>
 </div>


 {/* SCROLLABLE COURSE LIST */}
 <div className="overflow-y-auto h-full mt-8 custom-scrollbar pr-4">
 <div className="grid gap-6 auto-rows-fr">
 {isLoading && <p>Loading courses...</p>}
 {error && <p className="text-red-500">Error: {(error as any)?.message || 'Failed to load courses'}</p>}
 {!isLoading && !error && courses.map((course) => (
 <div
 key={course.id}
 onClick={() => { setActiveCourseId(course.id); router.push(`/course/${course.id}`); }}
 className="cursor-pointer"
 >
 <CourseCard
 course={course}
 isActive={activeCourseId === course.id}
 isEnrolled={false}
 onEnroll={() => router.push(`/course/${course.id}`)}
 />
 </div>
 ))}
 </div>
 </div>
 </main>


 <div className="fixed bottom-0 left-0 right-0">
  <Footer />
</div>
 </div>
 </>
 );
};


export default CoursesPage;