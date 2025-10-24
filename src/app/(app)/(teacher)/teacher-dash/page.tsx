'use client';

import { PlusIcon } from "lucide-react";
import React, { JSX, useMemo, useState } from "react";
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTeacherCourses, useTeacherAnalytics } from "@/hooks/useApi";
import { useApiService } from "@/lib/api";
import { toast } from "sonner";

const OverviewCardSkeleton = (): JSX.Element => (
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
  const { data: courses = [], isLoading: coursesLoading, error: coursesError } = useTeacherCourses();
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useTeacherAnalytics();
  
  const router = useRouter();
  const api = useApiService();
  // This state is no longer needed here but is kept in case of other async actions
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  const overviewCards = useMemo(() => {
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
        positive: (analytics?.timeTrend?.startsWith('+') ?? true),
      },
      {
        title: "Completion Rate",
        value: analytics?.completionRate != null ? `${analytics.completionRate}%` : "—",
        trend: analytics?.completionTrend || "No recent trend data",
        positive: (analytics?.completionTrend?.startsWith('+') ?? true),
      },
    ];
  }, [analytics]);

  // --- MODIFICATION START ---
  // This function is simplified to just navigate to the details form page.
  // The responsibility of creating the course is moved to the form itself.
  const handleCreateNewCourse = () => {
    router.push('/profile/new/details-form');
  };
  // --- MODIFICATION END ---

  return (
    <>
      <Sphere />
      <div className="relative w-full max-h-[87%] overflow-x-hidden ">
        <div className="flex flex-col w-full max-w-4xl mx-auto pt-16 px-4 sm:px-6 lg:px-8 pb-10 relative z-10">
          
          <section className="flex flex-col gap-6 w-full mb-12">
            <h2 className="font-bold text-[18px] leading-[22px] text-[#394169]">
              Classroom Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
              {analyticsLoading ? (
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

          <section className="flex flex-col gap-5 w-full">
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <h2 className="font-bold text-[18px] leading-[22px] text-[#394169]">
                My Courses & Insights
              </h2>
              <Button 
                variant="ghost" 
                className="bg-[#566fe91a] rounded-[40px] text-[#566fe9] hover:bg-[#566fe930] h-[32px] px-4 py-2 flex items-center gap-1"
                onClick={handleCreateNewCourse}
                disabled={isCreatingDraft}
              >
                <PlusIcon className="w-4 h-4" />
                <span className="font-semibold text-[12px] leading-[16px]">
                  {isCreatingDraft ? "Starting..." : "New Course"}
                </span>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {coursesLoading && <p>Loading your courses...</p>}
              {coursesError && <p className="text-red-500">Error loading courses.</p>}
              
              {!coursesLoading && !coursesError && courses.map((course: any) => (
                <Link key={course.id} href={`/courses/${course.id}`} className="block">
                  <Card className="border border-[#566fe966] rounded-xl bg-white overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                        <img
                          className="w-full h-52 object-cover rounded-xl sm:w-[88px] sm:h-[88px] sm:flex-shrink-0 sm:m-4"
                          alt={course.title}
                          src={course.imageUrl || "/1.png"}
                        />
                        <div className="flex flex-col flex-1 gap-3 min-w-0 p-4 sm:p-0 sm:pr-4">
                          <div className="flex flex-col gap-0.5">
                            <h3 className="font-semibold text-[14px] leading-tight text-[#394169] truncate">{course.title}</h3>
                            <p className="font-semibold text-[12px] leading-[16px] text-[#8187a0]">
                              {`Updated ${new Date(course.updatedAt).toLocaleDateString()}`}
                            </p>
                          </div>
                          {typeof course.enrollmentCount === 'number' && (
                            <p className="font-semibold text-[12px] leading-[16px] text-[#394169]">{course.enrollmentCount} enrollments</p>
                          )}
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
