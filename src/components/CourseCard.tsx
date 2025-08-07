"use client";

import { Star } from "lucide-react";
import Image from "next/image";
import React from "react";

export interface Course {
  id: number;
  title: string;
  instructor: string;
  description: string;
  rating: string;
  reviews: string;
  level: string;
  duration: string;
  image: string;
}

// MODIFICATION: Removed isActive from the component's props
interface CourseCardProps {
  course: Course;
}

const CourseCard = ({ course }: CourseCardProps) => {
  const renderStars = () => {
    const totalStars = 5;
    const filledStars = Math.floor(parseFloat(course.rating));
    const stars = [];

    for (let i = 0; i < totalStars; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-5 h-5 ${
            i < filledStars ? "text-indigo-500 fill-indigo-500" : "text-gray-300"
          }`}
        />
      );
    }
    return stars;
  };

  return (
    // MODIFICATION: Removed the conditional styling. 
    // All cards will now have the same style.
    <div
      className="flex items-center gap-5 p-4 w-full rounded-2xl bg-white shadow-lg border border-blue-200/50"
    >
      <Image
        className="w-[200px] h-[140px] rounded-lg object-cover flex-shrink-0"
        alt={course.title}
        src={course.image}
        width={200}
        height={140}
      />

      <div className="flex flex-col items-start gap-3 w-full">
        <div className="flex flex-col items-start w-full">
          <h3 className="text-xl font-bold text-[#394169]">{course.title}</h3>
          <p className="text-md text-[#8187a0]">{course.instructor}</p>
        </div>

        <p className="text-sm text-[#394169] w-full max-w-lg">
          {course.description}
        </p>

        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="text-md font-bold text-[#566fe9]">
              {course.rating}
            </span>
            <div className="flex items-center">{renderStars()}</div>
            <span className="text-sm text-[#8187a0] whitespace-nowrap">
              ({course.reviews} reviews)
            </span>
          </div>
          <p className="text-sm text-[#8187a0]">
            {course.level} · {course.duration}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;