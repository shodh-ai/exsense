'use client';

import { SearchIcon } from "lucide-react";
import React, { JSX } from "react";
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";
import Link from "next/link";
// Updated import to use the correct hook from your useApi file
import { useMyEnrollments } from "@/hooks/useApi";

// Overview cards will be computed dynamically from enrollments

// Narrow types for enrollments to align with expected UI usage
type Enrollment = {
  id: string | number;
  progress?: number | null;
  course: {
    id: string | number;
    title?: string; // used in text and <img alt>, must be string when present
    imageUrl?: string | null;
    instructorName?: string | null;
  } | null;
};

const StudentDashboard = (): JSX.Element => {
  // Use the useMyEnrollments hook to fetch the student's enrolled courses
  // The data will be an array of Enrollment objects, which we assume contain course details
  const { data: enrollments = [], isLoading, error } = useMyEnrollments();

  // Compute overview stats from enrollments
  const numericProgress = enrollments
    .map((e: Enrollment) => (typeof e.progress === 'number' ? (e.progress as number) : null))
    .filter((p: number | null): p is number => p !== null);

  const inProgressCount = isLoading ? null : numericProgress.filter((p: number) => p > 0 && p < 100).length;
  const completedCount = isLoading ? null : numericProgress.filter((p: number) => p === 100).length;
  const averageProgress = isLoading || numericProgress.length === 0
    ? null
    : Math.round(numericProgress.reduce((sum: number, p: number) => sum + p, 0) / numericProgress.length);

  const overviewCards = [
    {
      title: "Courses in Progress",
      value: inProgressCount === null ? "—" : String(inProgressCount),
      positive: true,
    },
    {
      title: "Completed Courses",
      value: completedCount === null ? "—" : String(completedCount),
      positive: true,
    },
    {
      title: "Average Progress",
      value: averageProgress === null ? "—" : `${averageProgress}%`,
      positive: averageProgress !== null ? averageProgress >= 50 : true,
    },
  ];

  return (
    <>
      <Sphere />
      <div className="relative w-full max-h-[87%] overflow-x-hidden ">
        <div className="flex flex-col w-full max-w-4xl mx-auto pt-16 px-4 sm:px-6 lg:px-8 pb-10 relative z-10">
          {/* Student Overview section */}
          <section className="flex flex-col gap-6 w-full mb-12">
            <h2 className="font-bold text-[18px] leading-[22px] text-[#394169]">
              My Performance Summary
            </h2>
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
                              card.positive
                                ? "/up_arrow.svg"
                                : "/down_arrow.svg"
                            }
                          />
                        </div>
                        {"trend" in card && (card as any).trend ? (
                          <p className="font-semibold text-[12px] leading-[16px] text-[#8187a0] whitespace-nowrap">
                            {(card as any).trend}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* My Enrolled Courses section */}
          <section className="flex flex-col gap-5 w-full">
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <h2 className="font-bold text-[18px] leading-[22px] text-[#394169]">
                My Enrolled Courses
              </h2>
              <Button
                asChild
                variant="ghost"
                className="bg-[#566fe91a] rounded-[40px] text-[#566fe9] hover:bg-[#566fe930] h-[32px] px-4 py-2 flex items-center gap-1"
              >
                <Link href="/browse-courses">
                  <SearchIcon className="w-4 h-4" />
                  <span className="font-semibold text-[12px] leading-[16px]">
                    Browse
                  </span>
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {isLoading && <p>Loading your enrolled courses...</p>}
              {error && <p className="text-red-500">Error loading your courses</p>}
              {!isLoading && !error && enrollments.map((enrollment: Enrollment) => (
                // Assuming the API returns the course object nested within the enrollment object
                enrollment.course && (
                  <Link key={enrollment.id} href={`/student/course/${enrollment.course.id}`} className="block">
                    <Card
                      className="border border-[#566fe966] rounded-xl bg-white overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                          <img
                            className="w-full h-40 object-cover sm:w-[88px] sm:h-[88px] sm:flex-shrink-0 sm:m-4"
                            alt={enrollment.course.title || "Course image"}
                            src={enrollment.course.imageUrl || "/1.png"} // Use course image if available
                          />
                          <div className="flex flex-col flex-1 gap-3 min-w-0 p-4 sm:p-0 sm:pr-4">
                            <div className="flex flex-col gap-0.5">
                              <h3 className="font-semibold text-[14px] leading-tight text-[#394169] truncate">
                                {enrollment.course.title}
                              </h3>
                              <p className="font-semibold text-[12px] leading-[16px] text-[#8187a0]">
                                {enrollment.course.instructorName || 'Instructor not specified'}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              {/* Student's progress would likely be on the enrollment record */}
                              {typeof enrollment.progress === 'number' && (
                                <div>
                                  <p className="font-semibold text-[12px] leading-[16px] text-[#394169] mb-1">
                                    {enrollment.progress}% complete
                                  </p>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div className="bg-[#566fe9] h-1.5 rounded-full" style={{ width: `${enrollment.progress}%` }}></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              ))}
              {!isLoading && !error && enrollments.length === 0 && (
                <p>You haven't enrolled in any courses yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default StudentDashboard;