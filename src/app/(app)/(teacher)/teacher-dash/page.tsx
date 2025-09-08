'use client';
import { PlusIcon } from "lucide-react";
import React, { JSX, useMemo } from "react";
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";
import Link from "next/link";
// Import both hooks we need for this page
import { useTeacherCourses, useTeacherAnalytics } from "@/hooks/useApi";

// The component to show while overview data is loading
const OverviewCardSkeleton = () => (
    <Card className="border border-[#566fe966] rounded-xl bg-white animate-pulse">
        <CardContent className="p-4">
            <div className="flex flex-col gap-[18px]">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div className="h-8 bg-gray-300 rounded w-1/2"></div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-full mt-1"></div>
                </div>
            </div>
        </CardContent>
    </Card>
);

const TeacherDashboard = (): JSX.Element => {
  // Fetch the teacher's list of courses
  const { data: courses = [], isLoading: coursesLoading, error: coursesError } = useTeacherCourses();
  
  // Fetch the teacher's aggregated analytics data
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useTeacherAnalytics();

  // Prepare the overview cards using the fetched analytics data, with fallbacks.
  const overviewCards = useMemo(() => {
    // We use the 'analytics' object fetched from our new hook.
    // The '??' provides a fallback if the backend data is not available.
    return [
      {
        title: "Average Score",
        value: analytics?.averageScore != null ? `${analytics.averageScore}%` : "—",
        trend: analytics?.scoreTrend || "No recent trend data",
        positive: (analytics?.scoreTrend?.startsWith('+') ?? true),
      },
      {
        title: "Total Time Spent",
        value: analytics?.totalTimeSpent || "—",
        trend: analytics?.timeTrend || "No recent trend data",
        positive: (analytics?.timeTrend?.startsWith('+') ?? true), // Assuming more time is positive
      },
      {
        title: "Completion Rate",
        value: analytics?.completionRate != null ? `${analytics.completionRate}%` : "—",
        trend: analytics?.completionTrend || "No recent trend data",
        positive: (analytics?.completionTrend?.startsWith('+') ?? true),
      },
    ];
  }, [analytics]);

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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
              {analyticsLoading ? (
                // Show skeleton loaders while analytics are loading
                <>
                  <OverviewCardSkeleton />
                  <OverviewCardSkeleton />
                  <OverviewCardSkeleton />
                </>
              ) : analyticsError ? (
                <p className="text-red-500 col-span-full">Could not load analytics data.</p>
              ) : (
                overviewCards.map((card, index) => (
                  <Card key={index} className="border border-[#566fe966] rounded-xl bg-white">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-[18px]">
                        <p className="font-semibold text-[16px] leading-[16px] text-[#8187a0]">{card.title}</p>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-[28px] leading-[34px] text-[#394169]">{card.value}</span>
                            <img className="w-6 h-6" alt="Trend indicator" src={card.positive ? "/up_arrow.svg" : "/down_arrow.svg"} />
                          </div>
                          <p className="font-semibold text-[12px] leading-[16px] text-[#8187a0] whitespace-nowrap">{card.trend}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>

          {/* My Courses & Insights section */}
          <section className="flex flex-col gap-5 w-full">
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <h2 className="font-bold text-[18px] leading-[22px] text-[#394169]">
                My Courses &amp; Insights
              </h2>
              <Button asChild variant="ghost" className="bg-[#566fe91a] rounded-[40px] text-[#566fe9] hover:bg-[#566fe930] h-[32px] px-4 py-2 flex items-center gap-1">
                <Link href="/teacher_course_creation">
                  <PlusIcon className="w-4 h-4" />
                  <span className="font-semibold text-[12px] leading-[16px]">New Course</span>
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {coursesLoading && <p>Loading your courses...</p>}
              {coursesError && <p className="text-red-500">Error loading courses.</p>}
              
              {!coursesLoading && !coursesError && courses.map((course) => (
                // This logic is already dynamic and correct
                <Link key={course.id} href={`/teacher/courses/${course.id}`} className="block">
                  <Card className="border border-[#566fe966] rounded-xl bg-white overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                        <img
                          className="w-full h-40 object-cover sm:w-[88px] sm:h-[88px] sm:flex-shrink-0 sm:m-4"
                          alt={course.title}
                          src={(course as any).imageUrl || "/1.png"} // Added fallback for image
                        />
                        <div className="flex flex-col flex-1 gap-3 min-w-0 p-4 sm:p-0 sm:pr-4">
                          <div className="flex flex-col gap-0.5">
                            <h3 className="font-semibold text-[14px] leading-tight text-[#394169] truncate">{course.title}</h3>
                            <p className="font-semibold text-[12px] leading-[16px] text-[#8187a0]">
                              {course.updatedAt ? `Updated ${new Date(course.updatedAt).toLocaleDateString()}` : `Created ${new Date(course.createdAt).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1">
                            {typeof course.enrollmentCount === 'number' && (<p className="font-semibold text-[12px] leading-[16px] text-[#394169]">{course.enrollmentCount} enrollments</p>)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              
              {!coursesLoading && !coursesError && courses.length === 0 && (
                <p>You haven't created any courses yet. Click "New Course" to get started!</p>
              )}
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
};
export default TeacherDashboard;