'use client';
import { PlusIcon } from "lucide-react";
import React, { JSX } from "react";
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";
// Data for overview cards
const overviewCards = [
  {
    title: "Average Score",
    value: "78%",
    trend: "+2% higher score than last week",
    iconSrc: "/greenarrow.svg",
    positive: true,
  },
  {
    title: "Total Time Spent",
    value: "6h 32m",
    trend: "+5% growth in average time spent",
    iconSrc: "/redarrow.svg",
    positive: false,
  },
  {
    title: "Completion Rate",
    value: "94%",
    trend: "+3% growth in course completions",
    iconSrc: "/greenarrow.svg",
    positive: true,
  },
];

// Data for course cards
const courseCards = [
  {
    title: "JavaScript Essentials",
    updated: "Updated 2 weeks ago",
    progress: "5 / 10 resolved",
    progressValue: 50,
    imageSrc: "/1.png",
  },
  {
    title: "Responsive Design Principles",
    updated: "Updated 3 weeks ago",
    progress: "7 / 10 resolved",
    progressValue: 70,
    imageSrc: "/2.png",
  },
  {
    title: "Python for Beginners",
    updated: "Updated 1 month ago",
    progress: "3 / 10 resolved",
    progressValue: 30,
    imageSrc: "/3.jpg",
  },
  {
    title: "Data Science Basics with Python and Pandas",
    updated: "Updated 2 months ago",
    progress: "6 / 10 resolved",
    progressValue: 60,
    imageSrc: "/4.jpg",
  },
];

const TeacherSDashboard = (): JSX.Element => {
  return (
    <>
      <Sphere />
   
    <div className="relative w-full min-h-screen overflow-x-hidden ">
      <div className="flex flex-col w-full max-w-4xl mx-auto pt-16 px-4 sm:px-6 lg:px-8 pb-10 relative z-10">
        {/* Classroom Overview section */}
        <section className="flex flex-col gap-6 w-full mb-12">
          {/* FONT: font-bold text-[18px] leading-[22px] */}
          <h2 className="font-bold text-[18px] leading-[22px] text-[#394169]">
            Classroom Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
            {overviewCards.map((card, index) => (
              <Card
                key={index}
                className="border border-[#566fe966] rounded-xl bg-white"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-[18px]">
                    {/* FONT: font-semibold text-[12px] leading-[16px] */}
                    <p className="font-semibold text-[12px] leading-[16px] text-[#8187a0]">
                      {card.title}
                    </p>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        {/* FONT: font-bold text-[28px] leading-[34px] */}
                        <span className="font-bold text-[28px] leading-[34px] text-[#394169]">
                          {card.value}
                        </span>
                        <img
                          className="w-6 h-6"
                          alt="Trend indicator"
                          src={card.iconSrc}
                        />
                      </div>
                      {/* FONT: font-semibold text-[12px] leading-[16px] whitespace-nowrap */}
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
            {/* FONT: font-bold text-[18px] leading-[22px] */}
            <h2 className="font-bold text-[18px] leading-[22px] text-[#394169]">
              My Courses &amp; Insights
            </h2>
            <Button
              variant="ghost"
              // BUTTON: Custom styles for padding, border-radius
              className="bg-[#566fe91a] rounded-[40px] text-[#566fe9] hover:bg-[#566fe930] h-[32px] px-4 py-2 flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" />
              {/* FONT: font-semibold text-[12px] leading-[16px] */}
              <span className="font-semibold text-[12px] leading-[16px]">
                New Course
              </span>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {courseCards.map((course, index) => (
              <Card
                key={index}
                className="border border-[#566fe966] rounded-xl bg-white"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <img
                      className="w-[88px] h-[88px] flex-shrink-0"
                      alt={course.title}
                      src={course.imageSrc}
                    />
                    <div className="flex flex-col flex-1 gap-3 min-w-0">
                      <div className="flex flex-col gap-0.5">
                        {/* FONT: font-semibold text-[12px] leading-[16px] */}
                        <h3 className="font-semibold text-[14px] leading-tight text-[#394169] truncate">
                          {course.title}
                        </h3>
                        <p className="font-semibold text-[12px] leading-[16px] text-[#8187a0]">
                          {course.updated}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="font-semibold text-[12px] leading-[16px] text-[#394169]">
                          {course.progress}
                        </p>
                        <div className="w-full h-1.5 bg-[#566fe926] rounded-md">
                          <div
                            className="h-1.5 bg-[#566fe9] rounded-md opacity-90"
                            style={{ width: `${course.progressValue}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
    <Footer />
     </>
     
  );
};

export default TeacherSDashboard;