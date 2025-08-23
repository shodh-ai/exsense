// components/CourseMap.tsx
"use client";
import React from "react";
import { Card } from "@/components/card";
import Link from "next/link";

// --- Data for the course stages ---
// This makes the component easier to update and manage.
const courseStages = [
  { name: "English Learning Sessions", color: "bg-[#7085ec]" },
  { name: "Beginner stage", color: "bg-[#7085ec]" },
  { name: "Grammar Boost 1", color: "bg-[#7085ec]" },
  { name: "Essay Writing Level 3", color: "bg-[#d5dcfb]" },
  { name: "Reading Sharpness 5", color: "bg-[#d5dcfb]" },
];

/**
 * A responsive component that displays a visual representation of the course progression.
 * It stacks vertically on mobile and flows horizontally on larger screens.
 */
const CourseMap = () => {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-black">Course Map</h2>
      <Card className="w-full bg-transparent rounded-xl shadow-md p-6 relative">
        {/* Main responsive container */}
        <div className="flex flex-col md:flex-row md:flex-wrap items-center justify-center gap-y-4 md:gap-y-8 md:gap-x-4">
          {courseStages.map((stage, index) => (
            <React.Fragment key={stage.name}>
              {/* Stage Pill */}
              <div
                className={`${stage.color} rounded-full px-4 py-2 text-white text-sm font-semibold text-center whitespace-nowrap`}
              >
                {stage.name}
              </div>

              {/* Responsive Connector: Renders between items, but not after the last one */}
              {index < courseStages.length - 1 && (
                <div className="w-px h-6 bg-gray-300 md:w-10 md:h-px" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Expand Button */}
        <Link href="/course-map" passHref>
          <button
            aria-label="Expand course map"
            className="inline-flex items-center justify-center p-2 absolute bottom-4 right-4 bg-[#566fe9] rounded-lg cursor-pointer transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            <span className="relative w-4 h-4">
              <img
                className="w-full h-full"
                alt="Expand"
                src="/extend.svg"
              />
            </span>
          </button>
        </Link>
      </Card>
    </section>
  );
};

export default CourseMap;