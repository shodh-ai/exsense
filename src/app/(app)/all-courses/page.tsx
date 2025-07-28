// src/pages/CoursesPage.tsx
import { ChevronDownIcon, SearchIcon, XIcon, Mic, MessageSquare } from "lucide-react";
import React, { JSX } from "react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import CourseCard, { Course } from "@/components/CourseCard";
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";

const CoursesPage = (): JSX.Element => {
  const courses: Course[] = [
    {
      id: 1,
      title: "Creative Writing for Beginners",
      instructor: "Prof. Akash Jain",
      description: "Discover your writing voice and explore storytelling, dialogue, and narrative structure.",
      rating: "4.5",
      reviews: "1203",
      level: "Beginner",
      duration: "2 Months",
      image: "/teacher2.svg", // Placeholder from original code
    },
    {
      id: 2,
      title: "Advanced Graphic Design Techniques",
      instructor: "Jane Smith",
      description: "Master the principles of design, color theory, and advanced software tools to elevate your projects.",
      rating: "4.8",
      reviews: "895",
      level: "Intermediate",
      duration: "3 Months",
      image: "/teacher3.svg", // Placeholder from original code
    },
    {
      id: 3,
      title: "Introduction to UX/UI Design",
      instructor: "Michael Chen",
      description: "Learn user-centered design principles, prototyping, and usability testing to create intuitive interfaces.",
      rating: "4.7",
      reviews: "1530",
      level: "Beginner",
      duration: "3 Months",
      image: "/teacher2.svg", // Placeholder from original code
    },
    {
      id: 4,
      title: "Introduction to UX/UI Design",
      instructor: "Michael Chen",
      description: "Learn user-centered design principles, prototyping, and usability testing to create intuitive interfaces.",
      rating: "4.7",
      reviews: "1530",
      level: "Beginner",
      duration: "3 Months",
      image: "/teacher2.svg", // Placeholder from original code
    },
    {
      id: 5,
      title: "Introduction to UX/UI Design",
      instructor: "Michael Chen",
      description: "Learn user-centered design principles, prototyping, and usability testing to create intuitive interfaces.",
      rating: "4.7",
      reviews: "1530",
      level: "Beginner",
      duration: "3 Months",
      image: "/teacher3.svg", // Placeholder from original code
    },
  ];

  return (
    // Main page wrapper with the background gradient effect
    
  <>
  <Sphere />
  
    <div className="h-full w-full bg-transparent flex items-center justify-center p-4 font-[Plus_Jakarta_Sans]">
      <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-bl from-blue-200/50 via-purple-200/30 to-transparent -z-0 blur-3xl"></div>

      {/* Main content container card */}
      <main className="relative w-full h-[90%] max-w-4xl   overflow-y-auto rounded-3xl p-6 md:p-8 z-10 flex flex-col ">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 ">
          <h1 className="font-semibold text-black text-xl md:text-2xl">
            Our Interactive Courses
          </h1>
          <button className="p-1.5 rounded-full hover:bg-gray-200/50 transition-colors">
            <XIcon className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Filter and Search section */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
          <Button
            variant="outline"
            className="h-12 w-full md:w-auto pl-4 pr-3 py-[13px] rounded-full border border-solid border-[#566fe9] text-[#566fe9] bg-white hover:bg-blue-50 transition-colors"
          >
            <span className="font-medium text-sm">Browse</span>
            <ChevronDownIcon className="w-4 h-4 ml-1" />
          </Button>

          <div className="flex w-full flex-grow items-center rounded-full border border-solid border-gray-300/70 bg-white/80 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200/50 transition-all duration-300">
            <Input
              className="border-0 bg-transparent shadow-none w-full h-[48px] pl-5 pr-2 text-black placeholder:text-gray-400 focus:ring-0"
              placeholder="Search for anything..."
            />
            <Button size="icon" className="p-1 mr-1  rounded-full flex-shrink-0 w-11 h-11">
                <SearchIcon className="w-5 h-5 text-[#566fe9]" />
            </Button>
          </div>
        </div>
      

        {/* Course cards list */}
        {/*
          MODIFIED LINE:
          - Added `force-show-scrollbar` to apply our new styles.
          - Changed padding to `pr-2` (which is 8px) to match the scrollbar width we set in the CSS.
        */}
        <div className="force-show-scrollbar flex flex-col items-start h-full gap-6 overflow-y-scroll flex-grow pr-2">
          {courses.map((course, index) => (
            <CourseCard key={course.id} course={course} isActive={index === 0} />
          ))}
        </div>

      
      </main>
      <Footer />
    </div>
    </>
  );
};

export default CoursesPage;