"use client";
import { XIcon, Star } from "lucide-react";
import React, { JSX, useMemo } from "react";
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
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
// We keep the real hooks imported, ready for when the backend is live
import { useCourse, useLessons, useEnrollInCourse } from "@/hooks/useApi";
import type { Review as ApiReview, Faq as ApiFaq } from "@/lib/api";

// --- TYPE DEFINITIONS ---
type CourseDetail = {
  icon: string;
  label: string;
  value: string;
};

// --- MOCK DATA CONSTANTS (USED FOR SIMULATION) ---
const MOCK_COURSE_TAGS: string[] = ["Top Rated", "AI-Powered", "Beginner Friendly"];
const MOCK_SKILLS: string[] = [
  "Data Preprocessing", "Hyperparameter Tuning", "Deep Learning Architectures",
  "Feature Engineering", "Neural Networks", "Deep Learning Models",
];
const MOCK_LEARNING_OUTCOMES: string[] = [
  "Learn the fundamentals of neural networks and how to build them using TensorFlow.",
  "Explore the advanced techniques in deep learning, including convolutional and recurrent neural networks.",
];
const MOCK_REVIEWS: ApiReview[] = [
    { id: 'rev1', rating: 5, createdAt: "2024-06-15T10:00:00Z", comment: "This course truly transformed my understanding of machine learning...", user: { name: "Peter Lewis", avatarUrl: "/learner1.svg" } },
    { id: 'rev2', rating: 5, createdAt: "2024-08-01T10:00:00Z", comment: "The hands-on projects were a game changer for me...", user: { name: "Sarah Johnson", avatarUrl: "/learner2.svg" } },
    { id: 'rev3', rating: 4.5, createdAt: "2024-08-20T10:00:00Z", comment: "I really appreciated the focus on real-world applications...", user: { name: "Michael Chen", avatarUrl: "/learner3.svg" } },
    { id: 'rev4', rating: 5, createdAt: "2024-09-01T10:00:00Z", comment: "The community support was outstanding!...", user: { name: "Emily Davis", avatarUrl: "/learner4.svg" } },
];
const MOCK_FAQS: ApiFaq[] = [
  { id: 'faq1', question: "Do I need prior programming experience to take this course?", answer: "Not necessarily! While basic Python knowledge is helpful, the course starts with a beginner-friendly introduction to key concepts." },
  { id: 'faq2', question: "What kind of support is available if I get stuck?", answer: "You'll have access to our community forums and dedicated Q&A sessions with the instructor." },
];
const MOCK_TEACHER_BIO = `I'm a Digital Designer & teacher at BYOL international. Sharing is who I am...`;


// --- REUSABLE SUB-COMPONENTS ---

const StarRating = ({ rating }: { rating: number }) => { /* ... component code ... */ const totalStars = 5; return (<div className="flex items-center gap-[4px]">{Array.from({ length: totalStars }, (_, index) => { const starValue = index + 1; const fillPercentage = rating >= starValue ? "100%" : rating > index ? `${(rating - index) * 100}%` : "0%"; return (<div key={index} className="relative h-5 w-5"><Star className="absolute left-0 top-0 h-5 w-5 fill-gray-300 text-gray-300" /><div className="absolute left-0 top-0 h-full overflow-hidden" style={{ width: fillPercentage }}><Star className="h-5 w-5 flex-shrink-0 fill-[#566FE9] text-[#566FE9]" /></div></div>); })}</div>); };
const CourseHeader = () => (<div className="flex justify-between items-center"><h2 className="text-base font-bold text-[#394169]">Course Overview</h2></div>);
const CourseBanner = ({ imageUrl }: { imageUrl?: string }) => (<div className="flex justify-center"><img className="w-full rounded-lg h-auto max-h-48 md:max-h-[200px] object-cover" alt="Course banner" src={imageUrl || "/banner.svg"} /></div>);
const CourseIntroduction = ({ tags, title, description }: { tags?: string[], title: string, description: string }) => ( <section className="flex flex-col gap-3">{tags && tags.length > 0 && (<div className="flex flex-wrap gap-2">{tags.map((tag) => (<Badge key={tag} variant="outline" className="rounded-[30px] h-[32px] bg-[#566fe91a] px-4 py-2 font-medium text-[#566fe9] border-0">{tag}</Badge>))}</div>)}<div className="flex flex-col gap-4"><h1 className="text-2xl font-bold leading-tight text-[#394169] md:text-[28px] md:leading-[33.6px]">{title}</h1><p className="text-base text-[16px] font-semibold leading-6 text-[#394169]">{description}</p></div></section>);
const CourseDetailsSection = ({ details, onEnroll, isEnrolling }: { details: CourseDetail[], onEnroll: () => void, isEnrolling: boolean }) => ( <section className="flex flex-col gap-7"><div className="flex flex-col gap-6"><h2 className="text-xl font-bold text-[#394169]">Course details</h2><div className="flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-x-12 md:gap-y-8">{details.map((detail) => (<div key={detail.label} className="flex items-center gap-3"><div className="p-3 bg-[#566fe91a] rounded-xl"><div className="w-7 h-7 relative"><img className="absolute inset-0 m-auto" alt={detail.label} src={detail.icon} /></div></div><div className="flex flex-col gap-[3px]"><div className="text-sm font-medium text-[#8187a0]">{detail.label}</div><div className="text-base text-[#394169]">{detail.value}</div></div></div>))}</div></div><Button className="w-full rounded-[100px] h-[50px] bg-[#566fe9] px-12 py-3 font-semibold text-white sm:px-20" onClick={onEnroll} disabled={isEnrolling}>{isEnrolling ? "Enrolling..." : "Start Your Journey"}</Button></section>);
const WhatYouWillLearnSection = ({ skills, outcomes }: { skills?: string[], outcomes?: string[] }) => ( <section className="flex flex-col gap-6"><h2 className="text-xl font-bold text-[#394169]">What you'll learn</h2><div className="flex flex-col gap-5">{skills && skills.length > 0 && (<div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap">{skills.map((skill) => (<Badge key={skill} className="flex h-[32px] w-auto items-center justify-center rounded-[30px] bg-[#f6f6fe] px-4 py-2 text-sm font-medium text-[#566fe9] shadow-none">{skill}</Badge>))}</div>)}{outcomes && outcomes.length > 0 && (<div className="flex flex-col gap-4">{outcomes.map((outcome) => (<div key={outcome} className="flex items-start gap-3"><div className="flex-shrink-0 mt-1"><img className="h-[16.25px] w-[16.25px]" alt="Checkmark" src="/ticked.svg" /></div><p className="text-base text-[16px] font-semibold leading-6 text-[#394169]">{outcome}</p></div>))}</div>)}</div></section>);
const TeacherProfileSection = ({ teacherName, teacherTitle, teacherBio }: { teacherName: string, teacherTitle: string, teacherBio?: string }) => ( <section className="flex flex-col gap-6"><h2 className="text-xl font-bold text-[#394169]">Meet your teacher</h2><div className="flex flex-col gap-5"><div className="flex items-center gap-4"><Avatar className="h-14 w-14"><AvatarImage src="/teacher1.svg" alt={teacherName} /></Avatar><div className="flex flex-col gap-1"><div className="flex flex-wrap items-center gap-2.5"><span className="text-base font-semibold text-[#394169]">{teacherName}</span><Badge variant="outline" className="flex items-center gap-1 rounded-[30px] border-[#566fe940] bg-[#566fe91a] py-1 pl-2.5 pr-3.5 text-[#566fe9]"><div className="relative h-4 w-4"><div className="relative left-px top-px h-[13px] w-3.5"><img className="absolute left-px top-0 h-3 w-[13px]" alt="Vector" src="/vector.svg" /><img className="absolute left-0 top-0 h-[13px] w-3.5" alt="Vector" src="/star1.svg" /></div></div><span className="text-sm font-medium">Top Educator</span></Badge></div><span className="text-sm font-medium text-[#8187a0]">{teacherTitle}</span></div></div>{teacherBio && <p className="text-base text-[16px] font-semibold leading-6 text-[#394169]" dangerouslySetInnerHTML={{ __html: teacherBio.replace(/\n/g, '<br />') }} />}</div></section>);
const ReviewsSection = ({ reviews }: { reviews?: ApiReview[] }) => { if (!reviews || reviews.length === 0) return null; return ( <section className="flex flex-col gap-6"><h2 className="text-xl font-bold text-[#394169]">What Learners Think</h2><div className="flex flex-col gap-4">{reviews.map((review, index) => (<React.Fragment key={review.id}><div className="flex flex-col gap-3"><div className="flex items-start gap-4"><Avatar className="h-12 w-12"><AvatarImage src={review.user.avatarUrl || "/learner1.svg"} alt={review.user.name} /></Avatar><div className="flex flex-col gap-2"><div className="text-base font-semibold text-[#394169]">{review.user.name}</div><div className="flex flex-wrap items-center gap-x-[9px] gap-y-2"><StarRating rating={review.rating} /><img className="hidden h-[15px] w-[1.5px] sm:block" alt="Divider" src="/line-21.svg" /><div className="text-sm font-medium text-[#394169] opacity-60">{new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</div></div></div></div><p className="text-base text-[16px] font-semibold leading-6 text-[#394169] sm:pl-16">{review.comment}</p></div>{index < reviews.length - 1 && <Separator className="h-px w-full" />}</React.Fragment>))}</div></section>);};
const FaqSection = ({ faqs }: { faqs?: ApiFaq[] }) => { if (!faqs || faqs.length === 0) return null; return ( <section className="flex flex-col gap-6"><h2 className="text-xl font-bold text-[#394169]">FAQs</h2><Accordion type="single" collapsible className="w-full">{faqs.map((faq, index) => (<AccordionItem key={faq.id} value={`faq-${index}`} className="border-b border-solid border-gray-200"><AccordionTrigger className="py-4 text-left text-base font-semibold text-[#394169]">{faq.question}</AccordionTrigger><AccordionContent className="pb-4 text-base text-[#8187a0]">{faq.answer}</AccordionContent></AccordionItem>))} </Accordion></section>);};


// --- MAIN PAGE COMPONENT ---
export default function MyCoursesPage(): JSX.Element {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  
  // ---
  // --- ⬇️ (START) API SIMULATION BLOCK ⬇️ ---
  // ---
  
  // STEP 1: The real data-fetching hooks are commented out for now.
  // const { data: course, isLoading: courseLoading, error: courseError } = useCourse(String(courseId));
  // const { refetch: refetchLessons } = useLessons(String(courseId));
  // const enrollMutation = useEnrollInCourse();

  // STEP 2: We create a complete 'course' object using our mock data.
  const course = {
    id: String(courseId) || 'mock-course-id',
    title: "AI Foundations with TensorFlow",
    description: "This beginner-friendly course introduces AI through practical projects...",
    imageUrl: "/banner.svg",
    tags: MOCK_COURSE_TAGS,
    skills: MOCK_SKILLS,
    learningOutcomes: MOCK_LEARNING_OUTCOMES,
    reviews: MOCK_REVIEWS,
    faqs: MOCK_FAQS,
    difficulty: "Intermediate",
    duration: "8 hrs 21 mins",
    enrollmentCount: 4200,
    lessonCount: 83,
    language: "English Only",
    teacher: { name: "Arjun Mehta", email: "AI Educator at DeepLearn Lab.", bio: MOCK_TEACHER_BIO },
  };
  const courseLoading = false;
  const courseError = null;

  // We simulate the other hooks so the page doesn't crash.
  const enrollMutation = { isPending: false, mutateAsync: async () => console.log("Simulating enrollment...") };
  const refetchLessons = () => console.log("Simulating lesson refetch...");

  // ---
  // --- ⬆️ (END) API SIMULATION BLOCK ⬆️ ---
  // ---

  const enroll = async () => {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }
    try {
      await enrollMutation.mutateAsync(String(courseId));
      await refetchLessons();
      alert("Enrollment successful!"); // Temporary feedback
    } catch (_) {
      alert("Enrollment failed."); // Temporary feedback
    }
  };

  if (courseLoading) return <div className="p-6 text-center text-lg">Loading course details...</div>;
  if (courseError) return <div className="p-6 text-center text-red-500">Error: {(courseError as any)?.message || "Failed to load the course."}</div>;
  if (!course) return <div className="p-6 text-center">Course not found.</div>;

  const courseDetails: CourseDetail[] = [
    { icon: "/difficulty.svg", label: "Difficulty", value: course.difficulty ?? "Intermediate" },
    { icon: "/star.svg", label: "Rating", value: "4.7 (320 reviews)" },
    { icon: "/duration.svg", label: "Duration", value: course.duration ?? "8 hrs 21 mins" },
    { icon: "/usercount.svg", label: "User Count", value: `${course.enrollmentCount ?? 0}+ enrolled` },
    { icon: "/language.svg", label: "Language", value: course.language ?? "English Only" },
    { icon: "/assignment.svg", label: "Assignments", value: `${course.lessonCount ?? 0}` },
  ];
  
  return (
    <>
      <Sphere />
      <div className="flex h-full w-full flex-col font-sans text-gray-900">
        <main className="flex-grow overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 md:py-12">
            <div className="mx-auto flex w-full max-w-[80%] flex-col gap-10 md:gap-12">
              {/* Added a Breadcrumb for better navigation, which was missing */}
              <div className="flex items-center text-sm text-gray-500"><a href="/dashboard" className="hover:underline">Dashboard</a><span className="mx-2">·</span><span className="text-gray-800">{course.title}</span></div>
              
              <div className="flex flex-col gap-6">
                <CourseHeader />
                <CourseBanner imageUrl={course.imageUrl} />
              </div>
              <CourseIntroduction tags={course.tags} title={course.title} description={course.description} />
              <CourseDetailsSection details={courseDetails} onEnroll={enroll} isEnrolling={enrollMutation.isPending} />
              <WhatYouWillLearnSection skills={course.skills} outcomes={course.learningOutcomes} />
              <CourseMap />
              <TeacherProfileSection teacherName={course.teacher.name} teacherTitle={course.teacher.email} teacherBio={course.teacher.bio} />
              <ReviewsSection reviews={course.reviews} />
              <FaqSection faqs={course.faqs} />
            </div>
          </div>
        </main>
        <div className="h-[60px] w-full flex-shrink-0"><Footer /></div>
      </div>
    </>
  );
}