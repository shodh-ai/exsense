'use client';

import React, { JSX } from "react";
import { Card, CardContent } from "@/components/card";
import { Progress } from "@/components/progress";
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";

// 1. Import the font
import { Plus_Jakarta_Sans } from "next/font/google";

// 2. Initialize the font
// Ensure to include the weights used in your Tailwind classes (e.g., font-medium, font-semibold)
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Added 500 (for font-medium) and 600 (for font-semibold)
  variable: "--font-plus-jakarta-sans", // Optional: if you want to use it with CSS variables
});

const MyCoursesPage = (): JSX.Element => {
  // Course data remains the same for demonstration
  const courses = [
    {
      id: 1,
      title: "Advanced Graphic Design T...",
      lastStudied: "Studied 3 days ago",
      progress: 87,
      image: "/4.jpg",
    },
    {
      id: 2,
      title: "Web Development Fundam...",
      lastStudied: "Studied 9 days ago",
      progress: 25,
      image: "/2.png",
    },
    {
      id: 3,
      title: "Introduction to Data Science",
      lastStudied: "Studied 5 days ago",
      progress: 40,
      image: "/3.jpg",
    },
    {
      id: 4,
      title: "User Experience Research",
      lastStudied: "Studied 2 days ago",
      progress: 60,
      image: "/1.png",
    },
  ];

  return (
    <>
      <Sphere />
      {/* 
        3. Apply the font's className to the root div.
        Removed the hardcoded `font-[Plus_Jakarta_Sans]` here.
      */}
      <div
        className={`relative w-full h-full bg-transparent flex flex-col ${plusJakartaSans.className}`}
      >
        <main className="relative z-10 flex flex-col w-full h-[85%] p-4 sm:p-6 md:p-8 bg-transparent justify-center items-center overflow-auto">
          {/* Content wrapper for max-width and centering */}
          <div className="w-full max-w-4xl">
            {/* 
              The course grid. All text inside this grid will inherit the
              'Plus Jakarta Sans' font from the root container.
            */}
            <div className="grid w-full grid-cols-1 lg:grid-cols-2 gap-4">
              {courses.map((course) => (
                <Card
                  key={course.id}
                  className="flex flex-col w-full h-[120px] items-start p-4 rounded-xl border border-[#566fe9]/40 bg-white   "
                >
                  {/* Removed `font-[Plus_Jakarta_Sans]` from CardContent */}
                  <CardContent className="p-0 flex items-center gap-3 w-full">
                    <img
                      className="relative w-20 h-20 sm:w-[88px] sm:h-[88px] object-cover rounded-md"
                      alt={course.title}
                      src={course.image}
                    />

                    <div className="flex flex-col flex-1 items-start gap-3 overflow-hidden">
                      {/* Course Title and Last Studied Info */}
                      <div className="flex flex-col items-start self-stretch w-full">
                        {/* 
                          This text is "Plus Jakarta Sans SemiBold".
                          `font-semibold` only changes the font weight, not the family.
                          Removed `font-[Plus_Jakarta_Sans]`.
                        */}
                        <div className="font-semibold text-black text-base tracking-[0] leading-6 whitespace-nowrap truncate w-full">
                          {course.title}
                        </div>
                        {/* 
                          This text is "Plus Jakarta Sans Medium".
                          `font-medium` only changes the font weight.
                          Removed `font-[Plus_Jakarta_Sans]`.
                        */}
                        <div className="opacity-60 font-medium text-black text-sm tracking-[0] leading-[21px] whitespace-nowrap">
                          {course.lastStudied}
                        </div>
                      </div>

                      {/* Progress Bar Section */}
                      <div className="flex flex-col h-[31px] items-start justify-center gap-1 self-stretch w-full">
                        {/* 
                          This text is also "Plus Jakarta Sans Medium".
                          It will inherit the font.
                        */}
                        <div className="font-medium text-black text-sm tracking-[0] leading-[21px] whitespace-nowrap">
                          {course.progress}% complete
                        </div>
                        <Progress
                          value={course.progress}
                          className="h-1.5 w-full bg-[#566fe926] rounded-md"
                          indicatorClassName="bg-[#566fe9] opacity-90"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
};

export default MyCoursesPage;