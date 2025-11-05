// components/CourseMap.tsx
"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// --- Data for the MOBILE course stages (Unchanged) ---
const mobileCourseStages = [
  { name: "English Learning Sessions", completed: true },
  { name: "Beginner stage", completed: true },
  { name: "Grammar Boost 1", completed: true },
  { name: "Essay Writing Level 3", completed: false },
  { name: "Reading Sharpness 5", completed: false },
];

// --- SVG Coordinate and State Data for DESKTOP view ---
// This data provides pixel-perfect coordinates for every element inside the SVG canvas.
const courseMapElements = {
  badges: [
    { id: 1, title: "English Learning Sessions", completed: true, x: 1, y: 1, width: 155, height: 27 },
    { id: 2, title: "Beginner stage", completed: true, x: 273, y: 1, width: 105, height: 27 },
    { id: 3, title: "Grammar Boost 1", completed: true, x: 466, y: 1, width: 115, height: 27 },
    { id: 4, title: "Essay Writing Level 3", completed: false, x: 458, y: 70, width: 130, height: 27 },
    { id: 5, title: "Reading Sharpness 5", completed: false, x: 661, y: 70, width: 135, height: 27 },
  ],
  lines: [
    // from English Learning to Beginner stage
    { id: 'l1', completed: true, x1: 156, y1: 14.5, x2: 273, y2: 14.5 },
    // from Beginner stage to Grammar Boost
    { id: 'l2', completed: true, x1: 378, y1: 14.5, x2: 466, y2: 14.5 },
    // from Grammar Boost down to Essay Writing
    { id: 'l3', completed: true, x1: 523.5, y1: 28, x2: 523.5, y2: 70 },
    // from Essay Writing to Reading Sharpness
    { id: 'l4', completed: false, x1: 588, y1: 83.5, x2: 661, y2: 83.5 },
  ],
};


/**
 * A responsive component that displays a visual representation of the course progression.
 * - On mobile, it shows a simple vertical path.
 * - On medium screens, it displays a horizontal, simplified path.
 * - On desktop, it uses a single SVG for a pixel-perfect graphical layout.
 */
const CourseMap = () => {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-[#394169]">Student Course Map Progress</h2>
      <Card className="w-full bg-white rounded-xl border border-solid border-[#c7ccf8] p-6 relative overflow-x-auto">

        {/* --- MOBILE VIEW --- */}
        <div className="flex flex-col md:hidden items-center justify-center">
          {mobileCourseStages.map((stage, index) => {
            const pillColor = stage.completed ? "bg-[#7085ec]" : "bg-[#d5dcfb]";
            const connectorColor = stage.completed ? "bg-[#7085ec]" : "bg-gray-300";

            return (
              <div key={stage.name} className="flex flex-col items-center">
                <div
                  className={`${pillColor} rounded-full px-4 py-2 text-white text-sm font-semibold text-center whitespace-nowrap z-10`}
                >
                  {stage.name}
                </div>
                {index < mobileCourseStages.length - 1 && (
                  <div className={`flex-shrink-0 ${connectorColor} h-8 w-px`} />
                )}
              </div>
            );
          })}
        </div>

        {/* --- MEDIUM SCREEN (TABLET) VIEW --- */}
        <div className="hidden md:flex lg:hidden items-center justify-center w-full">
          <div className="flex items-center">
            {mobileCourseStages.map((stage, index) => {
              const pillColor = stage.completed ? "bg-[#7085ec]" : "bg-[#d5dcfb]";
              const connectorColor = stage.completed ? "bg-[#7085ec]" : "bg-gray-300";

              return (
                <div key={stage.name} className="flex items-center">
                  <div
                    className={`${pillColor} rounded-full px-3 py-1.5 text-white text-xs font-semibold text-center whitespace-nowrap z-10`}
                  >
                    {stage.name}
                  </div>
                  {index < mobileCourseStages.length - 1 && (
                    <div className={`flex-shrink-0 ${connectorColor} h-px w-4 mx-1`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* --- DESKTOP VIEW (SVG) --- */}
        <div className="hidden lg:flex justify-center items-center w-full h-[120px]" style={{minWidth: '850px'}}>
            <svg width="796" height="97" viewBox="0 0 796 97" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Render Lines */}
                {courseMapElements.lines.map(line => (
                    <line
                        key={line.id}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        stroke={line.completed ? "#778bee" : "#c7ccf8"}
                        strokeWidth="1"
                    />
                ))}
                {/* Render Badges using foreignObject to embed HTML */}
                {courseMapElements.badges.map(badge => (
                    <foreignObject
                        key={badge.id}
                        x={badge.x}
                        y={badge.y}
                        width={badge.width}
                        height={badge.height}
                    >
                        <Badge
                            variant="secondary"
                            className={`w-full h-full flex items-center justify-center ${
                                badge.completed
                                ? "bg-[#778bee] text-white"
                                : "bg-[#c7ccf8] text-white"
                            } rounded-[25.93px] font-['Plus_Jakarta_Sans',_sans-serif] font-semibold text-[9.1px] leading-[13.6px] whitespace-nowrap`}
                            >
                            {badge.title}
                        </Badge>
                    </foreignObject>
                ))}
            </svg>
        </div>

        {/* Expand Button (Unchanged) */}
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