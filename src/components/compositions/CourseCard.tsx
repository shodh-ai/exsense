"use client";


import React, { JSX } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";


// Interface for Course data (no changes)
export interface Course {
 id: number | string;
 title: string;
 instructor: string;
 description: string;
 rating: string;
 reviews: string;
 level: string;
 duration: string;
 image: string;
}


// Interface for Component's props (no changes)
interface CourseCardProps {
 course: Course;
 isActive: boolean;
 isEnrolled: boolean;
 onEnroll: (courseId: number | string) => void;
 onStartSession?: (courseId: number | string) => void;
}


const CourseCard = ({ course, isActive, isEnrolled, onEnroll, onStartSession }: CourseCardProps): JSX.Element => {
 return (
 <Card
 className={cn(
 // --- THE DEFINITIVE FIX ---
 // 1. Add `h-full` to make the Card component fill its parent grid cell completely.
 // This is the key to achieving uniform height.
 "flex h-full w-full flex-col gap-4 overflow-hidden rounded-2xl bg-white p-4 transition-all duration-300 sm:flex-row",
 
 // 2. Keep the transparent ring to prevent size shifts on click and set the initial border color.
 "border ring-2 shadow-sm",

        // 2. Keep the transparent ring to prevent size shifts on click and set the initial border color.
        "border ring-2 shadow-sm",
        "border-[#C7CCF8] ring-transparent", // MODIFIED: Changed border-transparent to border-[#ffffff]

        // 3. Apply active styles by changing color, not size.
        isActive && "border-blue-500 ring-blue-200/50"
      )}
    >
      {/* Course Image */}
      <img
        className="w-[260px] h-[168px] rounded-[8px] object-cover opacity-100"
        alt={`Cover image for ${course.title}`}
        src={course.image}
      />
      <CardContent className="flex flex-1 flex-col p-0">
        {/* This container will grow to push the button section to the bottom */}
        <div className="flex-1">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col">
              <h3 className="font-semibold text-lg leading-tight text-black">
                {course.title}
              </h3>
              <p className="text-sm text-gray-500">by {course.instructor}</p>
            </div>
            <p className="text-sm text-gray-700 line-clamp-2">
              {course.description}
            </p>
          </div>
        </div>


        {/* Details and Button Section */}
 <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
 <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
 <div className="flex items-center gap-1">
 <img src="/star.svg" alt="Rating" className="h-4 w-4" />
 <span>{course.rating} ({course.reviews} reviews)</span>
 </div>
 <div className="flex items-center gap-1">
 <img src="/difficulty.svg" alt="Level" className="h-4 w-4" />
 <span>{course.level}</span>
 </div>
 <div className="flex items-center gap-1">
 <img src="/duration.svg" alt="Duration" className="h-4 w-4" />
 <span>{course.duration}</span>
 </div>
 </div>
 {isEnrolled ? (
 <Button
 onClick={() => onStartSession?.(course.id)}
 className="h-9 rounded-full px-6 text-sm font-semibold bg-green-600 text-white hover:bg-green-700"
 >
 Start Session
 </Button>
 ) : (
 <Button
 onClick={() => onEnroll(course.id)}
 className="h-9 rounded-full px-6 text-sm font-semibold bg-[#566fe9] text-white hover:bg-[#4a5fcf]"
 >
 Enroll Now
 </Button>
 )}
 </div>
 </CardContent>
 </Card>
 );
};


export default CourseCard;