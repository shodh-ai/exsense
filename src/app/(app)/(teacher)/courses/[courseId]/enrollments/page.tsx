'use client';
import { ChevronLeftIcon } from "lucide-react";
import React, { JSX } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// --- Custom Hooks for API data ---
import { useCourseEnrollments } from "@/hooks/useApi"; // <-- USE THE CORRECT HOOK

// --- UI Components ---
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import Sphere from "@/components/compositions/Sphere";
import Footer from "@/components/compositions/Footer";

const tableHeaders = [
  { label: "Student Name", width: "w-[226px]" },
  { label: "Completion Rate", width: "w-[177px]" },
  { label: "Average Score", width: "w-40" },
  { label: "Doubts Status", width: "w-[156px]" },
  { label: "AI Insights", width: "w-[131px]" },
];

export default function EnrolledStudentsPage(): JSX.Element {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  // --- THIS IS THE FIX ---
  // Call the correct hook: useCourseEnrollments
  const { data: enrollments = [], isLoading, error } = useCourseEnrollments(courseId);
  // --- END OF FIX ---

  const getDoubtsStatusBadge = (status: string) => {
    const isResolved = status === "Resolved";
    return (
      <Badge className={`${isResolved ? 'bg-[#e8f6e7] text-[#29981d]' : 'bg-[#feedf0] text-[#e35746]'} hover:bg-opacity-90 flex items-center justify-center w-[107px] h-8 rounded-[30px] font-semibold text-xs`}>
        {isResolved ? "Resolved" : "Unresolved"}
      </Badge>
    );
  };

  const getAIInsightBadge = (insight: string) => {
    return (
      <Badge className="bg-[#e9ebfd] text-[#566fe9] hover:bg-[#e9ebfd] flex items-center justify-center w-[130px] h-8 rounded-[30px] font-semibold text-xs">
        {insight || "N/A"}
      </Badge>
    );
  };

  return (
    <>
      <Sphere/>
      <div className="w-full h-full flex flex-col bg-transparent">
        <main className="flex-grow w-full overflow-y-auto">
          <div className="max-w-[850px] mx-auto pt-11 px-6 pb-20">
            <nav className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="sm" className="h-auto p-0.5 bg-white rounded-[30px]" onClick={() => router.back()}>
                <ChevronLeftIcon className="w-6 h-6" />
              </Button>
              <Breadcrumb>
                <BreadcrumbList className="flex items-center gap-2">
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/teacher-dash" className="font-semibold text-sm text-[#8187a0] hover:text-[#394169]">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>·</BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbLink href={`/courses/${courseId}`} className="font-semibold text-sm text-[#8187a0] hover:text-[#394169]">Course Overview</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>·</BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <span className="font-semibold text-sm text-[#394169]">Enrolled Students</span>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </nav>

            <section className="flex flex-col gap-3">
              <h1 className="text-xl font-bold text-[#394169]">Enrolled Students</h1>
              <div className="flex flex-col w-full">
                <header className="flex w-full border-b border-[#e9ebfd]">
                  {tableHeaders.map((header) => (
                    <div key={header.label} className={`flex ${header.width} items-center py-4`}>
                      <span className="font-semibold text-sm text-[#8187a0]">{header.label}</span>
                    </div>
                  ))}
                </header>
                
                <div className="flex flex-col">
                  {isLoading && <p className="py-4 text-center text-gray-500">Loading enrolled students...</p>}
                  {error && <p className="py-4 text-center text-red-500">Failed to load students: {(error as Error).message}</p>}
                  {!isLoading && !error && enrollments.map((enrollment: any) => (
                    <Link href={`/student/${enrollment.user.id}?courseId=${courseId}`} key={enrollment.id} className="flex items-center py-3 hover:bg-gray-50/50 transition-colors border-b border-[#e9ebfd]">
                      <div className={`flex items-center gap-3 ${tableHeaders[0].width}`}>
                        <img src={enrollment.user.avatar || `https://ui-avatars.com/api/?name=${enrollment.user.name.replace(' ', '+')}`} alt={enrollment.user.name} className="w-10 h-10 rounded-full object-cover" />
                        <span className="flex-1 font-semibold text-sm text-[#394169] truncate">{enrollment.user.name}</span>
                      </div>
                      <div className={`${tableHeaders[1].width} font-semibold text-sm text-[#394169]`}>{enrollment.completionRate || "0"}%</div>
                      <div className={`${tableHeaders[2].width} font-semibold text-sm text-[#394169]`}>{enrollment.averageScore || "0"}%</div>
      
                      <div className={`flex flex-col ${tableHeaders[3].width} items-start`}>{getDoubtsStatusBadge(enrollment.doubtsStatus || "Resolved")}</div>
                      <div className={`flex flex-col ${tableHeaders[4].width} items-start`}>{getAIInsightBadge(enrollment.aiInsight || "Consistent")}</div>
                    </Link>
                  ))}
                   {!isLoading && !error && enrollments.length === 0 && (
                    <p className="py-10 text-center text-gray-500">No students are currently enrolled in this course.</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
        <Footer/>
      </div>
    </>
  );
};