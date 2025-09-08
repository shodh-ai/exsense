"use client";
import { Star } from "lucide-react";
import React, { JSX, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/accordion";
import { Avatar, AvatarImage } from "@/components/avatar";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import CourseMap from "@/components/CourseMap";
import { Separator } from "@/components/separator";
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";
// Import the hook to fetch course data
import { useCourse } from "@/hooks/useApi";
import type { Faq as ApiFaq } from "@/lib/api";

// --- TYPE DEFINITIONS ---
type CourseDetail = {
  icon: string;
  label: string;
  value: string;
};

// --- MOCK DATA CONSTANTS (RETAINED AS FALLBACKS) ---
const MOCK_COURSE_TAGS: string[] = ["Top Rated", "AI-Powered", "Beginner Friendly"];
const MOCK_COURSE_TITLE = "AI Foundations with TensorFlow";
const MOCK_COURSE_DESCRIPTION = "This beginner-friendly course introduces AI through practical projects in image recognition, covering user flows, wireframing, and real-world case studies.";
const MOCK_SKILLS: string[] = ["Data Preprocessing", "Hyperparameter Tuning"];
const MOCK_LEARNING_OUTCOMES: string[] = ["Learn the fundamentals of neural networks and how to build them using TensorFlow."];
const MOCK_FAQS: ApiFaq[] = [{ id: 'faq1', question: "Do I need prior programming experience?", answer: "Not necessarily!..." }];
const MOCK_TEACHER_NAME = "Arjun Mehta";
const MOCK_TEACHER_TITLE = "AI Educator at DeepLearn Lab.";
const MOCK_TEACHER_BIO = `I'm a Digital Designer & teacher at BYOL international...`;

// --- SUB-COMPONENTS (Now receive dynamic data via props) ---

const Breadcrumb = ({ courseTitle }: { courseTitle?: string }) => (
  <div className="flex items-center text-sm text-gray-500">
    <a href="/teacher-dash" className="flex items-center hover:underline">
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
      Dashboard
    </a>
    <span className="mx-2">·</span>
    <a href="/Process_Curriculum" className="hover:underline">Curriculum Editor</a>
    <span className="mx-2">·</span>
    <span className="text-gray-800 font-medium">{courseTitle || 'Course Overview'}</span>
  </div>
);

const CourseHeader = () => (<div className="flex justify-between items-center"><h2 className="text-base font-semibold text-[#394169]">Course Overview</h2></div>);
const CourseBanner = ({ imageUrl }: { imageUrl?: string }) => (<div className="flex justify-center"><img className="w-full rounded-lg h-auto max-h-48 md:max-h-[200px] object-cover" alt="Course banner" src={imageUrl || "/banner.svg"} /></div>);

const CourseIntroduction = ({ tags, title, description }: { tags?: string[], title: string, description: string }) => (
  <section className="flex flex-col gap-3">
    {tags && tags.length > 0 && (<div className="flex flex-wrap gap-2">{tags.map((tag) => (<Badge key={tag} variant="outline" className="rounded-[30px] h-[32px] bg-[#566fe91a] px-4 py-2 font-medium text-[#566fe9] border-0">{tag}</Badge>))}</div>)}
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold leading-tight text-[#394169] md:text-[28px] md:leading-[33.6px]">{title}</h1>
      <p className="text-base text-[16px] font-semibold leading-6 text-[#394169]">{description}</p>
    </div>
  </section>
);

const CourseDetailsSection = ({ details }: { details: CourseDetail[] }) => (
  <section className="flex flex-col gap-7">
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-[#394169]">Course details</h2>
      <div className="flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-x-[120px] md:gap-y-8">{details.map((detail) => (<div key={detail.label} className="flex items-center gap-3"><div className="p-3 bg-[#566fe91a] rounded-xl"><div className="w-7 h-7 relative"><img className="absolute inset-0 m-auto" alt={detail.label} src={detail.icon} /></div></div><div className="flex flex-col gap-[3px]"><div className="text-sm font-medium text-[#8187a0]">{detail.label}</div><div className="text-base text-[#394169]">{detail.value}</div></div></div>))}</div>
    </div>
  </section>
);

const WhatYouWillLearnSection = ({ skills, outcomes }: { skills: string[]; outcomes: string[] }) => (
    <section className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-[#394169]">What you'll learn</h2>
        <div className="flex flex-col gap-5"><div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap">{skills.map((skill) => (<Badge key={skill} className="flex h-[32px] w-auto items-center justify-center rounded-[30px] bg-[#f6f6fe] px-4 py-2 text-sm font-medium text-[#566fe9] shadow-none">{skill}</Badge>))}</div><div className="flex flex-col gap-4">{outcomes.map((outcome) => (<div key={outcome} className="flex items-start gap-3"><div className="flex-shrink-0 mt-1"><img className="h-[16.25px] w-[16.25px]" alt="Checkmark" src="/ticked.svg" /></div><p className="text-base text-[16px] font-semibold leading-6 text-[#394169]">{outcome}</p></div>))}</div></div>
    </section>
);

const TeacherProfileSection = ({ name, title, bio }: { name: string, title: string, bio: string }) => (
    <section className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-[#394169]">Meet your teacher</h2>
        <div className="flex flex-col gap-5"><div className="flex items-center gap-4"><Avatar className="h-14 w-14"><AvatarImage src="/teacher1.svg" alt={name} /></Avatar><div className="flex flex-col gap-1"><div className="flex flex-wrap items-center gap-2.5"><span className="text-base font-semibold text-[#394169]">{name}</span><Badge variant="outline" className="flex items-center gap-1 rounded-[30px] border-[#566fe940] bg-[#566fe91a] py-1 pl-2.5 pr-3.5 text-[#566fe9]"><div className="relative h-4 w-4"><div className="relative left-px top-px h-[13px] w-3.5"><img className="absolute left-px top-0 h-3 w-[13px]" alt="Vector" src="/vector.svg" /><img className="absolute left-0 top-0 h-[13px] w-3.5" alt="Vector" src="/star1.svg" /></div></div><span className="text-sm font-medium">Top Educator</span></Badge></div><span className="text-sm font-medium text-[#8187a0]">{title}</span></div></div><p className="text-base text-[16px] font-semibold leading-6 text-[#394169]" dangerouslySetInnerHTML={{ __html: bio.replace(/\n/g, '<br />') }} /></div>
    </section>
);

const FaqSection = ({ faqs }: { faqs: ApiFaq[] }) => (
    <section className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-[#394169]">FAQs</h2>
        <Accordion type="single" collapsible className="w-full">{faqs.map((faq, index) => (<AccordionItem key={faq.id} value={`faq-${index}`} className="border-b border-solid border-gray-200"><AccordionTrigger className="py-4 text-left text-base font-semibold text-[#394169]">{faq.question}</AccordionTrigger><AccordionContent className="pb-4 text-base text-[#8187a0]">{faq.answer}</AccordionContent></AccordionItem>))}
        </Accordion>
    </section>
);

// --- MAIN PAGE COMPONENT ---
export default function CourseCreatedPage(): JSX.Element {
  // This page needs to get the course ID from the URL.
  // We'll assume the creating page redirects to a URL like '/teacher_course_created/[courseId]'
  const params = useParams();
  const courseId = (params.courseId as string) || '';

  const { data: course, isLoading, error } = useCourse(courseId, { enabled: !!courseId });

  // --- RENDER STATES ---
  if (isLoading) return <div className="p-8 text-center text-lg">Loading Newly Created Course...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {(error as any)?.message || "Failed to load the course."}</div>;
  if (!course) return <div className="p-8 text-center">Course data could not be loaded. Please ensure you were redirected correctly.</div>;

  // --- DYNAMIC DATA PREPARATION WITH FALLBACKS (using useMemo for performance) ---
  const courseDetails = useMemo((): CourseDetail[] => ([
    { icon: "/difficulty.svg", label: "Difficulty", value: course.difficulty || "Not Set" },
    { icon: "/star.svg", label: "Rating", value: "Not Rated" },
    { icon: "/duration.svg", label: "Duration", value: course.duration || "Not Set" },
    { icon: "/usercount.svg", label: "User Count", value: `${course.enrollmentCount ?? 0} enrolled` },
    { icon: "/language.svg", label: "Language", value: course.language || "English" },
    { icon: "/assignment.svg", label: "Assignments", value: `${course.lessonCount ?? 0}` },
  ]), [course]);

  return (
    <>
      <Sphere />
      <div className="flex h-full w-full flex-col font-sans text-gray-900">
        <main className="flex-grow overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 md:py-12">
            <div className="mx-auto flex w-full max-w-[80%] flex-col gap-10 md:gap-12">
              <Breadcrumb courseTitle={course.title} />
              
              <div className="p-4 bg-green-100 border border-green-300 rounded-lg text-center">
                  <h3 className="text-lg font-semibold text-green-800">Course Created Successfully!</h3>
                  <p className="text-green-700">You can now view, edit, and manage your new course.</p>
              </div>

              <div className="flex flex-col gap-6">
                <CourseHeader />
                <CourseBanner imageUrl={course.imageUrl} />
              </div>

              <CourseIntroduction 
                tags={course.tags ?? MOCK_COURSE_TAGS} 
                title={course.title ?? MOCK_COURSE_TITLE}
                description={course.description ?? MOCK_COURSE_DESCRIPTION} 
              />
              
              <CourseDetailsSection details={courseDetails} />
              
              <WhatYouWillLearnSection 
                skills={course.skills ?? MOCK_SKILLS} 
                outcomes={course.learningOutcomes ?? MOCK_LEARNING_OUTCOMES} 
              />
              
              <CourseMap />
              
              <TeacherProfileSection 
                name={course.teacher?.name ?? MOCK_TEACHER_NAME}
                title={course.teacher?.email ?? MOCK_TEACHER_TITLE}
                bio={course.teacher?.bio ?? MOCK_TEACHER_BIO}
              />
              
              <FaqSection faqs={course.faqs ?? MOCK_FAQS} />
            </div>
          </div>
        </main>
        <div className="h-[60px] w-full flex-shrink-0">
          <Footer />
        </div>
      </div>
    </>
  );
}