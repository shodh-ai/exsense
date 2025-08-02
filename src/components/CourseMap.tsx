// components/CourseMap.tsx
"use client";
import React from "react";
import { Card, CardContent } from "@/components/card";
import Link from "next/link"; // Import Link for navigation

/**
 * CourseMap component displays a visual representation of the course progression.
 */
const CourseMap = () => {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-black">Course Map</h2>
      <Card className="w-full max-w-3xl min-h-[200px] bg-transparent rounded-xl shadow-md p-6 relative"> {/* Added 'relative' here for absolute positioning of the button */}
        <CardContent className="p-6 bg-transparent">
          <div className="relative w-[700px] h-[95px]">
            {/* These are the specific SVG/structure details for the course map */}
            <div className="flex w-[137px] h-[27px] items-center justify-center gap-[6.48px] px-[12.96px] py-[6.48px] absolute top-0 left-0 bg-[#7085ec] rounded-[25.93px]">
              <div className="text-[9.1px] leading-[13.6px] font-semibold text-white">
                English Learning Sessions
              </div>
            </div>
            <img
              className="absolute w-[104px] h-px top-[13px] left-[137px]"
              alt="Line"
              src="/line-463.svg"
            />
            <div className="w-[93px] top-0 left-[241px] bg-[#7085ec] flex h-[27px] items-center justify-center gap-[6.48px] px-[12.96px] py-[6.48px] absolute rounded-[25.93px]">
              <div className="text-[9.1px] leading-[13.6px] font-semibold text-white">
                Beginner stage
              </div>
            </div>
            <div className="absolute w-[178px] h-[27px] top-0 left-[334px]">
              <img
                className="absolute w-[91px] h-px top-[13px] left-0"
                alt="Line"
                src="/line-464.svg"
              />
              <div className="w-[100px] top-0 left-[78px] bg-[#7085ec] flex h-[27px] items-center justify-center gap-[6.48px] px-[12.96px] py-[6.48px] absolute rounded-[25.93px]">
                <div className="text-[9.1px] leading-[13.6px] font-semibold text-white">
                  Grammar Boost 1
                </div>
              </div>
            </div>
            <img
              className="absolute w-px h-[42px] top-[27px] left-[461px]"
              alt="Line"
              src="/line-465.svg"
            />
            <div className="w-[116px] top-[69px] left-[404px] bg-[#d5dcfb] flex h-[27px] items-center justify-center gap-[6.48px] px-[12.96px] py-[6.48px] absolute rounded-[25.93px]">
              <div className="text-[9.1px] leading-[13.6px] font-semibold text-white">
                Essay Writing Level 3
              </div>
            </div>
            <img
              className="absolute w-16 h-px top-[82px] left-[520px]"
              alt="Line"
              src="/line-466.svg"
            />
            <div className="w-[117px] top-[69px] left-[583px] bg-[#d5dcfb] flex h-[27px] items-center justify-center gap-[6.48px] px-[12.96px] py-[6.48px] absolute rounded-[25.93px]">
              <div className="text-[9.1px] leading-[13.6px] font-semibold text-white">
                Reading Sharpness 5
              </div>
            </div>
          </div>
        </CardContent>
        {/* The new button/link structure */}
        <Link href="/course-map" passHref> {/* Specify the destination path */}
          <button className="inline-flex items-center justify-center p-2 absolute bottom-4 right-4 bg-[#566fe9] rounded-lg cursor-pointer transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
            <span className="relative w-4 h-4">
              <img
                className="absolute w-[11px] h-[11px] top-0.5 left-0.5"
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