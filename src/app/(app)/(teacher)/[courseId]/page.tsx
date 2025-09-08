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
// We are temporarily not using the real hook, but we keep the import for later.
import { useCourse } from "@/hooks/useApi"; 
import type { Faq as ApiFaq } from "@/lib/api";

// --- TYPE DEFINITIONS ---
type CourseDetail = {
  icon: string;
  label: string;
  value: string;
};

// --- MOCK DATA CONSTANTS (USED FOR SIMULATION) ---
const MOCK_COURSE_TAGS: string[] = ["Top Rated", "AI-Powered", "Beginner Friendly"];
const MOCK_COURSE_TITLE = "AI Foundations with TensorFlow";
const MOCK_COURSE_DESCRIPTION = "This beginner-friendly course introduces AI through practical projects in image recognition, covering user flows, wireframing, and real-world case studies.";
const MOCK_SKILLS: string[] = [
  "Data Preprocessing", "Hyperparameter Tuning", "Deep Learning Architectures",
  "Feature Engineering", "Neural Networks", "Deep Learning Models",
];
const MOCK_LEARNING_OUTCOMES: string[] = [
  "Learn the fundamentals of neural networks and how to build them using TensorFlow.",
  "Explore the advanced techniques in deep learning, including convolutional and recurrent neural networks.",
];
const MOCK_FAQS: ApiFaq[] = [
  { id: 'faq1', question: "Do I need prior programming experience to take this course?", answer: "Not necessarily! While basic Python knowledge is helpful, the course starts with a beginner-friendly introduction." },
  { id: 'faq2', question: "What kind of support is available if I get stuck?", answer: "You'll have access to our community forums and dedicated Q&A sessions with the instructor." },
];
const MOCK_TEACHER_NAME = "Arjun Mehta";
const MOCK_TEACHER_TITLE = "AI Educator at DeepLearn Lab.";
const MOCK_TEACHER_BIO = `I'm a Digital Designer & teacher at BYOL international...`;

// --- SUB-COMPONENTS (These are unchanged and correctly receive props) ---

const Breadcrumb = ({ courseTitle }: { courseTitle?: string }) => (
    <div className="flex items-center text-sm text-gray-500">
        <a href="/teacher-dash" className="flex items-center hover:underline">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            Dashboard
        </a>
        <span className="mx-2">·</span>
        <a href="/teacher/courses" className="hover:underline">My Courses</a>
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

const CourseAnalyticsSection = ({ details, unsolvedDoubts, courseId }: { details: CourseDetail[], unsolvedDoubts: number, courseId: string }) => {
    const router = useRouter();
    return (
        <section className="flex flex-col gap-7">
            <div className="flex flex-col gap-6">
                <h2 className="font-bold font-[Plus Jakarta Sans] text-[20px] text-[#394169]">Course Analytics</h2>
                <div className="flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-x-[120px] md:gap-y-8">
                    {details.map((detail) => (
                        <div key={detail.label} className="flex items-center gap-3">
                            <div className="p-3 bg-[#566fe91a] rounded-xl"><div className="w-7 h-7 relative"><img className="absolute inset-0 m-auto" alt={detail.label} src={detail.icon} /></div></div>
                            <div className="flex flex-col gap-[3px]">
                                <div className="text-sm font-medium text-[#8187a0]">{detail.label}</div>
                                <div className="text-base text-[#394169]">{detail.value}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button onClick={() => router.push(`/teacher/courses/${courseId}/edit`)} className="w-full rounded-[100px] h-[50px] px-12 py-3 font-semibold text-[#566fe9] border border-[#566fe9] bg-white sm:px-20">Update Course Detail</Button>
                    <Button onClick={() => router.push(`/teacher/students?courseId=${courseId}`)} className="w-full rounded-[100px] h-[50px] px-12 py-3 font-semibold text-[#566fe9] border border-[#566fe9] bg-white sm:px-20">View Enrolled Students</Button>
                </div>
                <Button className="w-full rounded-[100px] h-[50px] bg-[#566fe9] px-12 py-3 font-semibold text-white sm:px-20">View {unsolvedDoubts} Unresolved Doubts</Button>
            </div>
        </section>
    );
};

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
export default function TeacherCoursePage(): JSX.Element {
    const params = useParams();
    const courseIdFromUrl = (params.courseId as string) || 'mock-id'; // Use a mock ID if none is in the URL

    // --- 
    // --- ⬇️ (START) THIS IS THE SECTION TO CHANGE LATER ⬇️ ---
    // ---

    // STEP 1: We comment out the real data fetching hook.
    // const { data: course, isLoading, error } = useCourse(courseIdFromUrl);

    // STEP 2: We simulate a successful API call by creating a complete 'course' object.
    const course = {
        id: courseIdFromUrl,
        title: MOCK_COURSE_TITLE,
        description: MOCK_COURSE_DESCRIPTION,
        imageUrl: "/banner.svg",
        tags: MOCK_COURSE_TAGS,
        skills: MOCK_SKILLS,
        learningOutcomes: MOCK_LEARNING_OUTCOMES,
        faqs: MOCK_FAQS,
        difficulty: "Intermediate",
        duration: "8 hrs 21 mins",
        enrollmentCount: 4200,
        lessonCount: 83,
        language: "English Only",
        teacher: {
            name: MOCK_TEACHER_NAME,
            email: MOCK_TEACHER_TITLE,
            bio: MOCK_TEACHER_BIO,
        },
        analytics: {
            averageTestScore: 78,
            averageTimeSpent: "3h 42m",
            completionRate: 65,
            unsolvedDoubts: 6,
            accuracyRate: 82,
            satisfactionLevel: 4.3,
            satisfactionReviews: 91,
        }
    };
    const isLoading = false;
    const error = null;
    
    // ---
    // --- ⬆️ (END) THIS IS THE SECTION TO CHANGE LATER ⬆️ ---
    // ---

    // --- RENDER STATES ---
    if (isLoading) return <div className="p-8 text-center text-lg">Loading Course Data...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {(error as any)?.message || "Failed to load course data."}</div>;
    if (!course) return <div className="p-8 text-center">Course not found.</div>;

    // --- DYNAMIC DATA PREPARATION (This part remains the same) ---
    const courseAnalyticsDetails = useMemo((): CourseDetail[] => { /* ... unchanged ... */ return [ { icon: "/Score.svg", label: "Average Test score", value: course.analytics?.averageTestScore != null ? `${course.analytics.averageTestScore}%` : "N/A" }, { icon: "/time.svg", label: "Average Time Spent", value: course.analytics?.averageTimeSpent || "N/A" }, { icon: "/completion.svg", label: "Completion Rate", value: course.analytics?.completionRate != null ? `${course.analytics.completionRate}%` : "N/A" }, { icon: "/doubt.svg", label: "Unsolved Doubts", value: `${course.analytics?.unsolvedDoubts ?? 0} pending` }, { icon: "/accuracy.svg", label: "Accuracy Rate", value: course.analytics?.accuracyRate != null ? `${course.analytics.accuracyRate}%` : "N/A" }, { icon: "/satisfaction.svg", label: "Satisfaction level", value: course.analytics?.satisfactionLevel != null ? `${course.analytics.satisfactionLevel}/5.0 (${course.analytics.satisfactionReviews ?? 0} reviews)` : "N/A" }, ]; }, [course]);
    const courseDetails = useMemo((): CourseDetail[] => { /* ... unchanged ... */ return [ { icon: "/difficulty.svg", label: "Difficulty", value: course.difficulty || "Intermediate" }, { icon: "/star.svg", label: "Rating", value: "4.7 (320 reviews)" }, { icon: "/duration.svg", label: "Duration", value: course.duration || "8 hrs 21 mins" }, { icon: "/usercount.svg", label: "User Count", value: `${course.enrollmentCount ?? 0}+ enrolled` }, { icon: "/language.svg", label: "Language", value: course.language || "English Only" }, { icon: "/assignment.svg", label: "Assignments", value: `${course.lessonCount ?? 0}` }, ] }, [course]);

    return (
        <>
            <Sphere />
            <div className="flex h-full w-full flex-col font-sans text-gray-900">
                <main className="flex-grow overflow-y-auto">
                    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 md:py-12">
                        <div className="mx-auto flex w-full max-w-[80%] flex-col gap-10 md:gap-12">
                            <Breadcrumb courseTitle={course.title} />
                            <div className="flex flex-col gap-6"><CourseHeader /><CourseBanner imageUrl={course.imageUrl} /></div>
                            <CourseIntroduction tags={course.tags} title={course.title} description={course.description} />
                            <CourseAnalyticsSection details={courseAnalyticsDetails} unsolvedDoubts={course.analytics?.unsolvedDoubts ?? 0} courseId={course.id} />
                            <CourseDetailsSection details={courseDetails} />
                            <WhatYouWillLearnSection skills={course.skills} outcomes={course.learningOutcomes} />
                            <CourseMap />
                            <TeacherProfileSection name={course.teacher.name} title={course.teacher.email} bio={course.teacher.bio} />
                            <FaqSection faqs={course.faqs} />
                        </div>
                    </div>
                </main>
                <div className="h-[60px] w-full flex-shrink-0"><Footer /></div>
            </div>
        </>
    );
}