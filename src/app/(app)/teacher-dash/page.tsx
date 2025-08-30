'use client';
import { PlusIcon } from "lucide-react";
import React, { JSX } from "react";
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useTeacherCourses } from "@/hooks/useApi";

// Data for overview cards
const overviewCards = [
{
title: "Average Score",
value: "78%",
trend: "+2% higher score than last week",
positive: true,
},
{
title: "Total Time Spent",
value: "6h 32m",
trend: "+5% growth in average time spent",
positive: false,
},
{
title: "Completion Rate",
value: "94%",
trend: "+3% growth in course completions",
positive: true,
},
];
// Courses will be fetched dynamically for the logged-in teacher
const TeacherSDashboard = (): JSX.Element => {
  const { data: courses = [], isLoading, error } = useTeacherCourses();

return (
<>
<Sphere />
<div className="relative w-full max-h-[87%] overflow-x-hidden ">
    <div className="flex flex-col w-full max-w-4xl mx-auto pt-16 px-4 sm:px-6 lg:px-8 pb-10 relative z-10">
      {/* Classroom Overview section */}
      <section className="flex flex-col gap-6 w-full mb-12">
        <h2 className="font-bold text-[18px] leading-[22px] text-[#394169]">
          Classroom Overview
        </h2>
        {/* This grid is already responsive for mobile (1-col), tablet (2-col), and desktop (3-col) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
          {overviewCards.map((card, index) => (
            <Card
              key={index}
              className="border border-[#566fe966] rounded-xl bg-white"
            >
              <CardContent className="p-4">
                <div className="flex flex-col gap-[18px]">
                  <p className="font-semibold text-[16px] leading-[16px] text-[#8187a0]">
                    {card.title}
                  </p>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[28px] leading-[34px] text-[#394169]">
                        {card.value}
                      </span>
                      <img
                        className="w-6 h-6"
                        alt="Trend indicator"
                        src={
                          card.positive ? "/up_arrow.svg" : "/down_arrow.svg"
                        }
                      />
                    </div>
                    <p className="font-semibold text-[12px] leading-[16px] text-[#8187a0] whitespace-nowrap">
                      {card.trend}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* My Courses & Insights section */}
      <section className="flex flex-col gap-5 w-full">
        <div className="flex flex-wrap items-center justify-between w-full gap-2">
          <h2 className="font-bold text-[18px] leading-[22px] text-[#394169]">
            My Courses &amp; Insights
          </h2>
          <Button
            asChild
            variant="ghost"
            className="bg-[#566fe91a] rounded-[40px] text-[#566fe9] hover:bg-[#566fe930] h-[32px] px-4 py-2 flex items-center gap-1"
          >
            <Link href="/teacher/create-course">
              <PlusIcon className="w-4 h-4" />
              <span className="font-semibold text-[12px] leading-[16px]">
                New Course
              </span>
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {isLoading && <p>Loading your courses...</p>}
          {error && <p className="text-red-500">Error loading courses</p>}
          {!isLoading && !error && courses.map((course) => (
            <Link key={course.id} href={`/teacher/course/${course.id}`} className="block">
              <Card
                className="border border-[#566fe966] rounded-xl bg-white overflow-hidden hover:shadow-md transition-shadow"
              >
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                    <img
                      className="w-full h-40 object-cover sm:w-[88px] sm:h-[88px] sm:flex-shrink-0 sm:m-4"
                      alt={course.title}
                      src={"/1.png"}
                    />
                    <div className="flex flex-col flex-1 gap-3 min-w-0 p-4 sm:p-0 sm:pr-4">
                      <div className="flex flex-col gap-0.5">
                        <h3 className="font-semibold text-[14px] leading-tight text-[#394169] truncate">
                          {course.title}
                        </h3>
                        <p className="font-semibold text-[12px] leading-[16px] text-[#8187a0]">
                          {course.updatedAt ? `Updated ${new Date(course.updatedAt).toLocaleDateString()}` : null}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        {typeof course.enrollmentCount === 'number' && (
                          <p className="font-semibold text-[12px] leading-[16px] text-[#394169]">
                            {course.enrollmentCount} enrollments
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {!isLoading && !error && courses.length === 0 && (
            <p>You haven't created any courses yet.</p>
          )}
        </div>
      </section>
    </div>
  </div>
  <Footer />
</>
);
};
export default TeacherSDashboard;