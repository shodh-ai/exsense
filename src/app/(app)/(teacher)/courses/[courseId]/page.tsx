"use client";

import { Star } from "lucide-react";
import React, { JSX, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCourse, useLessons } from "@/hooks/useApi";
import { useApiService } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// --- UI Components ---
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CourseMap from "@/components/compositions/CourseMap";
import { Separator } from "@/components/ui/separator";
import Sphere from "@/components/compositions/Sphere";
import Footer from "@/components/compositions/Footer";

// --- Type Definitions ---
type CourseDetail = { icon: string; label: string; value: string; };
type FaqItem = { id: string; question: string; answer: string; };

// --- Reusable Sub-components ---

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-[4px]">{Array.from({ length: 5 }, (_, index) => { const starValue = index + 1; const fillPercentage = rating >= starValue ? "100%" : rating > index ? `${(rating - index) * 100}%` : "0%"; return (<div key={index} className="relative h-5 w-5"><Star className="absolute left-0 top-0 h-5 w-5 fill-gray-300 text-gray-300" /><div className="absolute left-0 top-0 h-full overflow-hidden" style={{ width: fillPercentage }}><Star className="h-5 w-5 flex-shrink-0 fill-[#566FE9] text-[#566FE9]" /></div></div>); })}</div>
);

const CourseHeader = ({ courseId, status, onStatusChange }: { courseId: string, status?: 'DRAFT' | 'PUBLISHED', onStatusChange: (newStatus: 'DRAFT' | 'PUBLISHED') => void }) => {
    const isPublished = status === 'PUBLISHED';
    return (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-[#394169]">Course Overview</h2>
                {status && (
                    <Badge variant={isPublished ? "default" : "secondary"} className={isPublished ? "bg-green-100 text-green-800 border-green-200" : "bg-yellow-100 text-yellow-800 border-yellow-200"}>
                        {status}
                    </Badge>
                )}
            </div>
            <div className="flex gap-2">
                <Button asChild>
                    <Link href={`/courses/${courseId}/edit`}>Edit Curriculum</Link>
                </Button>
                <Button
                    variant={isPublished ? "destructive" : "default"}
                    onClick={() => onStatusChange(isPublished ? 'DRAFT' : 'PUBLISHED')}
                >
                    {isPublished ? 'Unpublish' : 'Publish Course'}
                </Button>
            </div>
        </div>
    );
};

const CourseBanner = ({ imageUrl }: { imageUrl?: string }) => (<div className="flex justify-center"><img className="w-full rounded-lg h-auto max-h-48 md:max-h-[200px] object-cover" alt="Course banner" src={imageUrl || "/banner.svg"} /></div>);
const CourseIntroduction = ({ tags, title, description }: { tags: string[], title: string, description: string }) => (
  <section className="flex flex-col gap-3">
    <div className="flex flex-wrap gap-2">{tags.map((tag) => (<Badge key={tag} variant="outline" className="rounded-[30px] h-[32px] bg-[#566fe91a] px-4 py-2font-medium text-[#566fe9] border-0">{tag}</Badge>))}</div>
    <div className="flex flex-col gap-2"><h1 className="text-2xl font-bold leading-tight text-[#394169] md:text-[28px] md:leading-[33.6px]">{title}</h1><p className="text-base text-[16px] font-semibold leading-6 text-[#394169]">{description}</p></div>
  </section>
);
const CourseAnalyticsSection = ({ details, courseId, unresolvedDoubts }: { details: CourseDetail[], courseId: string, unresolvedDoubts: number }) => (
    <section className="flex flex-col gap-7">
      <div className="flex flex-col gap-6"><h2 className=" font-bold font-[Plus Jakarta Sans] text-[20px] text-[#394169]">Course Analytics</h2><div className="flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-x-[120px] md:gap-y-8">{details.map((detail) => (<div key={detail.label} className="flex items-center gap-3"><div className="p-3 bg-[#566fe91a] rounded-xl"><div className="w-7 h-7 relative"><img className="absolute inset-0 m-auto" alt={detail.label} src={detail.icon} /></div></div><div className="flex flex-col gap-[3px]"><div className="text-sm font-medium text-[#8187a0]">{detail.label}</div><div className="text-base text-[#394169]">{detail.value}</div></div></div>))}</div></div>
      <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <Button asChild variant="outline" className="w-full rounded-[100px] h-[50px] px-12 py-3 font-semibold text-[#566fe9] border border-[#566fe9] bg-white sm:px-20">
        <Link href={`/courses/${courseId}/settings`}>Course Settings</Link>
    </Button>
    <Button asChild className="w-full rounded-[100px] h-[50px] px-12 py-3 font-semibold text-[#566fe9] border border-[#566fe9] bg-white sm:px-20">
                <Link href={`/courses/${courseId}/enrollments`}>View Enrolled Students</Link>
            </Button>
    </div>
    <Button className="w-full rounded-[100px] h-[50px] bg-[#566fe9] px-12 py-3 font-semibold text-white sm:px-20">
        View {unresolvedDoubts} Unresolved Doubts
    </Button>
</div>
    </section>
);
const CourseDetailsSection = ({ details }: { details: CourseDetail[] }) => (
  <section className="flex flex-col gap-7"><div className="flex flex-col gap-6"><h2 className="text-xl font-bold text-[#394169]">Course details</h2><div className="flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-x-[120px] md:gap-y-8">{details.map((detail) => (<div key={detail.label} className="flex items-center gap-3"><div className="p-3 bg-[#566fe91a] rounded-xl"><div className="w-7 h-7 relative"><img className="absolute inset-0 m-auto" alt={detail.label} src={detail.icon} /></div></div><div className="flex flex-col gap-[3px]"><div className="text-sm font-medium text-[#8187a0]">{detail.label}</div><div className="text-base text-[#394169]">{detail.value}</div></div></div>))}</div></div>
  </section>
);
const WhatYouWillLearnSection = ({ skills, outcomes }: { skills: string[]; outcomes: string[]; }) => (
  <section className="flex flex-col gap-6"><h2 className="text-xl font-bold text-[#394169]">What you'll learn</h2><div className="flex flex-col gap-5"><div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap">{skills.map((skill) => (<Badge key={skill} className="flex h-[32px] w-auto items-center justify-center rounded-[30px] bg-[#f6f6fe] px-4 py-2 text-sm font-medium text-[#566fe9] shadow-none">{skill}</Badge>))}</div><div className="flex flex-col gap-4">{outcomes.map((outcome) => (<div key={outcome} className="flex items-start gap-3"><div className="flex-shrink-0 mt-1"><img className="h-[16.25px] w-[16.25px]" alt="Checkmark" src="/ticked.svg" /></div><p className="text-base text-[16px] font-semibold leading-6 text-[#394169]">{outcome}</p></div>))}</div></div>
  </section>
);
const TeacherProfileSection = ({ name, title, bio }: { name?: string; title?: string; bio?: string }) => (
  <section className="flex flex-col gap-6"><h2 className="text-xl font-bold text-[#394169]">Meet your teacher</h2><div className="flex flex-col gap-5"><div className="flex items-center gap-4"><Avatar className="h-14 w-14"><AvatarImage src="/teacher1.svg" alt={name} /></Avatar><div className="flex flex-col gap-1"><div className="flex flex-wrap items-center gap-2.5"><span className="text-base font-semibold text-[#394169]">{name || "Arjun Mehta"}</span><Badge variant="outline" className="flex items-center gap-1 rounded-[30px] border-[#566fe940] bg-[#566fe91a] py-1 pl-2.5 pr-3.5 text-[#566fe9]"><div className="relative h-4 w-4"><div className="relative left-px top-px h-[13px] w-3.5"><img className="absolute left-px top-0 h-3 w-[13px]" alt="Vector" src="/vector.svg" /><img className="absolute left-0 top-0 h-[13px] w-3.5" alt="Vector" src="/star1.svg" /></div></div><span className="text-sm font-medium">Top Educator</span></Badge></div><span className="text-sm font-medium text-[#8187a0]">{title || "AI Educator at DeepLearn Lab."}</span></div></div>{bio && <p className="text-base text-[16px] font-semibold leading-6 text-[#394169]" dangerouslySetInnerHTML={{ __html: bio.replace(/\n/g, "<br />") }}></p>}</div>
  </section>
);
const FaqSection = ({ faqs }: { faqs: FaqItem[] }) => (
  <section className="flex flex-col gap-6"><h2 className="text-xl font-bold text-[#394169]">FAQs</h2><Accordion type="single" collapsible className="w-full">{faqs.map((faq, index) => (<AccordionItem key={faq.id} value={`faq-${index}`} className="border-b border-solid border-gray-200 "><AccordionTrigger className="py-4 text-left text-base font-semibold text-[#394169]">{faq.question}</AccordionTrigger><AccordionContent className="pb-4 text-base text-[#8187a0]">{faq.answer}</AccordionContent></AccordionItem>))} </Accordion>
  </section>
);
const Breadcrumb = ({ courseTitle }: { courseTitle?: string }) => (
  <div className="flex items-center text-sm text-gray-500"><a href="/teacher-dash" className="flex items-center hover:underline"><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>Dashboard</a><span className="mx-1">·</span><span className="text-gray-800">{courseTitle || 'Course Overview'}</span></div>
);

// --- MAIN PAGE COMPONENT ---
export default function TeacherCoursePage(): JSX.Element {
  const params = useParams();
  const courseId = (params.courseId as string);
  const api = useApiService();
  const queryClient = useQueryClient();

  const { data: course, isLoading, error, refetch: refetchCourse } = useCourse(courseId);
  const { data: lessons, isLoading: lessonsLoading } = useLessons(courseId);

  const handleStatusChange = async (newStatus: 'DRAFT' | 'PUBLISHED') => {
    const actionVerb = newStatus === 'PUBLISHED' ? 'Publishing' : 'Unpublishing';
    toast.loading(`${actionVerb} course...`);
    try {
        await api.updateCourse(courseId, { status: newStatus });
        
        await queryClient.invalidateQueries({ queryKey: ['courses', courseId] });
        await queryClient.invalidateQueries({ queryKey: ['teacherCourses'] });
        await queryClient.invalidateQueries({ queryKey: ['courses'] }); // Invalidate general course list for student view
        
        toast.dismiss();
        toast.success(`Course ${newStatus === 'PUBLISHED' ? 'published' : 'unpublished'} successfully!`);

        refetchCourse();
    } catch (err) {
        toast.dismiss();
        toast.error(`Failed to ${newStatus === 'PUBLISHED' ? 'publish' : 'unpublish'} course.`);
        console.error("Status change failed:", err);
    }
  };

  const courseAnalyticsDetails: CourseDetail[] = useMemo(() => {
    if (!course?.analytics) return [];
    return [
        { icon: "/Score.svg", label: "Average Test score", value: `${course.analytics.averageTestScore || 'N/A'}%` },
        { icon: "/time.svg", label: "Average Time Spent", value: course.analytics.averageTimeSpent || 'N/A' },
        { icon: "/completion.svg", label: "Completion Rate", value: `${course.analytics.completionRate || 'N/A'}%` },
        { icon: "/doubt.svg", label: "Unsolved Doubts", value: `${course.analytics.unsolvedDoubts || 0} pending` },
        { icon: "/accuracy.svg", label: "Accuracy Rate", value: `${course.analytics.accuracyRate || 'N/A'}%` },
        { icon: "/satisfaction.svg", label: "Satisfaction level", value: `${course.analytics.satisfactionLevel || 'N/A'}/5.0` },
    ];
  }, [course]);

  const courseDetails: CourseDetail[] = useMemo(() => {
    if (!course) return [];
    return [
      { icon: "/difficulty.svg", label: "Difficulty", value: course.difficulty || "Not Set" },
      { icon: "/star.svg", label: "Rating", value: "Not Rated Yet" },
      { icon: "/duration.svg", label: "Duration", value: course.duration || "Not Set" },
      { icon: "/usercount.svg", label: "User Count", value: `${course.enrollmentCount || 0} enrolled` },
      { icon: "/language.svg", label: "Language", value: course.language || "English" },
      { icon: "/assignment.svg", label: "Assignments", value: `${course.lessonCount || 0}` },
    ];
  }, [course]);
  
  // --- MODIFIED LOADING AND ERROR HANDLING ---

  // If data is still loading, render nothing.
  // This allows the global loader to be the only thing visible.
  if (isLoading) {
    return <></>; // or return null;
  }

  // If an error occurred, show an error message.
  if (error) {
    return <div className="p-8 text-center text-red-500">Error: Failed to load course data.</div>;
  }

  // If loading is finished and there is still no course, then show "Course not found".
  if (!course) {
    return <div className="p-8 text-center">Course not found.</div>;
  }
  
  return (
    <>
      <Sphere />
      <div className="flex h-full w-full flex-col font-sans text-gray-900">
        <main className="flex-grow overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 md:py-12">
            <div className="mx-auto flex w-full max-w-[80%] flex-col gap-24 md:gap-12">
              <div className="flex flex-col gap-6">
                <Breadcrumb courseTitle={course.title} />
                <CourseHeader courseId={course.id} status={course.status} onStatusChange={handleStatusChange} />
                <CourseBanner imageUrl={course.imageUrl} />
              </div>

              <CourseIntroduction tags={course.tags || []} title={course.title} description={course.description} />
              <CourseAnalyticsSection details={courseAnalyticsDetails} courseId={course.id} unresolvedDoubts={course.analytics?.unsolvedDoubts || 0} />
              {/* <CourseDetailsSection details={courseDetails} />
              <section className="flex flex-col gap-4">
                <h2 className="text-xl font-bold text-[#394169]">Lessons</h2>
                {lessonsLoading ? (
                  <div className="text-sm text-[#8187a0]">Loading lessons...</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {(lessons && lessons.length > 0) ? (
                      lessons.map((lesson) => (
                        <div key={lesson.id} className="flex items-center justify-between border border-[#c7ccf8] rounded-lg p-4 bg-white">
                          <div className="flex flex-col">
                            <div className="text-base font-semibold text-[#394169]">{lesson.title}</div>
                            {lesson.description && (
                              <div className="text-sm text-[#8187a0]">{lesson.description}</div>
                            )}
                          </div>
                          <Button asChild className="rounded-[100px] h-[40px] px-5 bg-[#566fe9] text-white hover:bg-[#4a5fd1]">
                            <Link href={`/teacher?courseId=${course.id}&lessonId=${lesson.id}&lessonTitle=${encodeURIComponent(lesson.title)}`}>
                              Teach this Topic
                            </Link>
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-[#8187a0]">No lessons created yet.</div>
                    )}
                  </div>
                )}
              </section> */}
              <WhatYouWillLearnSection skills={course.skills || []} outcomes={course.learningOutcomes || []} />
              <CourseMap />
              <TeacherProfileSection name={course.teacher?.name} title={course.teacher?.title} bio={course.teacher?.bio} />
              <FaqSection faqs={course.faqs || []} />
            </div>
          </div>
        </main>
        <div className="h-[60px] w-full flex-shrink-0"><Footer /></div>
      </div>
    </>
  );
}