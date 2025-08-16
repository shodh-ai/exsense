"use client";

import React, { JSX } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";

// 1. DEFINE THE SHAPE OF THE COURSE DATA
// This interface defines the "contract" for the data this component expects to receive.
export interface Course {
  id: number | string; // Use string if your database uses UUIDs
  title: string;
  instructor: string;
  description: string;
  rating: string;
  reviews: string;
  level: string;
  duration: string;
  image: string;
}

// 2. DEFINE THE COMPONENT'S PROPS
// We pass the course object, an `isActive` flag for styling, and the new interactive props.
interface CourseCardProps {
  course: Course;
  isActive: boolean;
  isEnrolled: boolean; // NEW: Determines the button's state
  onEnroll: (courseId: number | string) => void; // NEW: The function to call when the button is clicked
  onStartSession?: (courseId: number | string) => void; // NEW: The function to call when starting a session
}

const CourseCard = ({ course, isActive, isEnrolled, onEnroll, onStartSession }: CourseCardProps): JSX.Element => {
  return (
    // The main card container. It uses `cn` to conditionally apply a blue border if it's "active".
    <Card
      className={cn(
        "flex w-full flex-col gap-4 overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all duration-300 sm:flex-row",
        isActive && "border-blue-500 ring-2 ring-blue-200/50" // Highlight style for active card
      )}
    >
      {/* Course Image */}
      <img
        className="h-32 w-full rounded-lg object-cover sm:h-full sm:w-32"
        alt={`Cover image for ${course.title}`}
        src={course.image}
      />

      {/* Course Content */}
      <CardContent className="flex flex-1 flex-col p-0">
        <div className="flex flex-1 flex-col gap-2">
          {/* Title and Instructor */}
          <div className="flex flex-col">
            <h3 className="font-semibold text-lg leading-tight text-black">
              {course.title}
            </h3>
            <p className="text-sm text-gray-500">by {course.instructor}</p>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 line-clamp-2">
            {course.description}
          </p>
        </div>

        {/* Course Details and Enroll Button */}
        <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          {/* Details like rating, level, duration */}
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

          {/* 3. THE INTERACTIVE ENROLLMENT/SESSION BUTTON */}
          {isEnrolled ? (
            // Show "Start Session" button for enrolled courses
            <Button
              onClick={() => onStartSession?.(course.id)}
              className="h-9 rounded-full px-6 text-sm font-semibold bg-green-600 text-white hover:bg-green-700"
            >
              Start Session
            </Button>
          ) : (
            // Show "Enroll Now" button for non-enrolled courses
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