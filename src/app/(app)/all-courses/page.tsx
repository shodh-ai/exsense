"use client";
// src/pages/CoursesPage.tsx
import { ChevronDownIcon, SearchIcon, XIcon } from "lucide-react";
import React, { JSX } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import CourseCard, { Course } from "@/components/CourseCard";
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const CoursesPage = (): JSX.Element => {
  const courses: Course[] = [
    {
      id: 1,
      title: "Creative Writing for Beginners",
      instructor: "Prof. Akash Jain",
      description:
        "Discover your writing voice and explore storytelling, dialogue, and narrative structure.",
      rating: "4.5",
      reviews: "1203",
      level: "Beginner",
      duration: "2 Months",
      image: "/teacher2.svg",
    },
    {
      id: 2,
      title: "Advanced Graphic Design Techniques",
      instructor: "Jane Smith",
      description:
        "Master the principles of design, color theory, and advanced software tools to elevate your projects.",
      rating: "4.8",
      reviews: "895",
      level: "Intermediate",
      duration: "3 Months",
      image: "/teacher3.svg",
    },
    {
      id: 3,
      title: "Introduction to UX/UI Design",
      instructor: "Michael Chen",
      description:
        "Learn user-centered design principles, prototyping, and usability testing to create intuitive interfaces.",
      rating: "4.7",
      reviews: "1530",
      level: "Beginner",
      duration: "3 Months",
      image: "/teacher2.svg",
    },
    {
      id: 4,
      title: "Introduction to UX/UI Design",
      instructor: "Michael Chen",
      description:
        "Learn user-centered design principles, prototyping, and usability testing to create intuitive interfaces.",
      rating: "4.7",
      reviews: "1530",
      level: "Beginner",
      duration: "3 Months",
      image: "/teacher2.svg",
    },
    {
      id: 5,
      title: "Introduction to UX/UI Design",
      instructor: "Michael Chen",
      description:
        "Learn user-centered design principles, prototyping, and usability testing to create intuitive interfaces.",
      rating: "4.7",
      reviews: "1530",
      level: "Beginner",
      duration: "3 Months",
      image: "/teacher3.svg",
    },
  ];

  // MODIFICATION: CSS for the scrollbar is defined here
 
  return (
    <>
      {/* MODIFICATION: Style tag to inject the CSS */}
   

      <Sphere />
      <div
        className={`h-full w-full bg-transparent flex flex-col px-4 pt-4 pb-4 ${plusJakartaSans.className}`}
      >
      

        <div className="w-full flex justify-between items-center mb-2 z-10">
          <h1 className="font-semibold text-black text-xl md:text-2xl">
            Our Interactive Session
          </h1>
          <button className="p-1.5 rounded-full hover:bg-gray-200/50 transition-colors">
            <XIcon className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* MODIFICATION: Added 'custom-scrollbar' and 'pr-2' to the main scrolling container */}
        <main className="relative w-full h-[80%] max-w-4xl self-center rounded-3xl p-6 md:p-8 z-10 flex flex-col mt-0 overflow-y-auto custom-scrollbar pr-2">
          {/* Filter and Search section */}
          <div className="flex flex-col min-[500px]:flex-row min-[500px]:items-center gap-4 mb-8">
            <Button
              variant="outline"
              className="h-12 w-full min-[500px]:w-auto min-[500px]:flex-shrink-0 pl-4 pr-3 py-[13px] rounded-full border border-solid border-[#566fe9] text-[#566fe9] bg-white hover:bg-blue-50 transition-colors"
            >
              <span className="font-medium text-sm">Browse</span>
              <ChevronDownIcon className="w-4 h-4 " />
            </Button>
            <div className="flex w-full flex-grow items-center rounded-full border border-solid border-gray-300/70 bg-white/80 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200/50 transition-all duration-300">
              <Input
                className="border-0 bg-transparent shadow-none w-full h-[48px] pl-5 pr-2 text-black placeholder:text-gray-400 placeholder:font-medium placeholder:text-sm placeholder:leading-normal focus:ring-0"
                placeholder="Search for anything..."
              />
              <Button
                size="icon"
                className="rounded-full flex-shrink-0 p-2.5 mr-1 bg-[#e6e8ff] h-[38px] w-[38px]"
              >
                <SearchIcon className="w-5 h-5 text-[#566fe9]" />
              </Button>
            </div>
          </div>
          
          {/* This inner div no longer needs any special classes */}
          <div className="flex flex-col gap-6">
            {courses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                isActive={index === 0}
              />
            ))}
          </div>
        </main>

        <div>
          <Footer />
        </div>
      </div>
    </>
  );
};

export default CoursesPage;
