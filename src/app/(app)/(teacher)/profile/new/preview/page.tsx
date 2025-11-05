"use client";

import { Star } from "lucide-react";
import React, { JSX } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs"; // --- MODIFICATION: Import useUser hook ---

// --- UI Components ---
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CourseMap from "@/components/compositions/CourseMap";
import { Separator } from "@/components/ui/separator";
import Sphere from "@/components/compositions/Sphere";
import Footer from "@/components/compositions/Footer";

// --- State Management ---
import { useNewCourseStore } from "@/lib/newCourseStore";
import type { Review as ApiReview, Faq as ApiFaq } from "@/lib/api";

// --- TYPE DEFINITIONS ---
type CourseDetail = {
  icon: string;
  label: string;
  value: string;
};

// --- REUSABLE SUB-COMPONENTS ---

const StarRating = ({ rating }: { rating: number }) => {
  const totalStars = 5;
  return (
    <div className="flex items-center gap-[4px]">
      {Array.from({ length: totalStars }, (_, index) => {
        const starValue = index + 1;
        const fillPercentage =
          rating >= starValue
            ? "100%"
            : rating > index
            ? `${(rating - index) * 100}%`
            : "0%";
        return (
          <div key={index} className="relative h-5 w-5">
            <Star className="absolute left-0 top-0 h-5 w-5 fill-gray-300 text-gray-300" />
            <div
              className="absolute left-0 top-0 h-full overflow-hidden"
              style={{ width: fillPercentage }}
            >
              <Star className="h-5 w-5 flex-shrink-0 fill-[#566FE9] text-[#566FE9]" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CourseHeader = () => (
  <div className="flex justify-between items-center">
    <h2 className="text-base font-bold text-[#394169]">Course Overview (Preview Mode)</h2>
  </div>
);

const CourseBanner = ({ imageUrl }: { imageUrl?: string }) => (
  <div className="flex justify-center">
    <img
      className="w-full rounded-lg h-auto max-h-48 md:max-h-[200px] object-cover"
      alt="Course banner"
      src={imageUrl || "/banner.svg"}
    />
  </div>
);

const CourseIntroduction = ({ tags, title, description }: { tags?: string[], title: string, description: string }) => (
  <section className="flex flex-col gap-3">
    {tags && tags.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="outline" className="rounded-[30px] h-[32px] bg-[#566fe91a] px-4 py-2 font-medium text-[#566fe9] border-0">{tag}</Badge>
        ))}
      </div>
    )}
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold leading-tight text-[#394169] md:text-[28px] md:leading-[33.6px]">{title || "Untitled Course"}</h1>
      <p className="text-base text-[16px] font-semibold leading-6 text-[#394169]">{description || "No description provided yet."}</p>
    </div>
  </section>
);

const CourseDetailsSection = ({ details }: { details: CourseDetail[] }) => (
  <section className="flex flex-col gap-7">
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-[#394169]">Course details</h2>
      <div className="flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-x-12 md:gap-y-8">
        {details.map((detail) => (
          <div key={detail.label} className="flex items-center gap-3">
            <div className="p-3 bg-[#566fe91a] rounded-xl">
              <div className="w-7 h-7 relative">
                <img className="absolute inset-0 m-auto" alt={detail.label} src={detail.icon} />
              </div>
            </div>
            <div className="flex flex-col gap-[3px]">
              <div className="text-sm font-medium text-[#8187a0]">{detail.label}</div>
              <div className="text-base text-[#394169]">{detail.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
    
  </section>
);

const WhatYouWillLearnSection = ({ skills, outcomes }: { skills?: string[], outcomes?: string[] }) => (
  <section className="flex flex-col gap-6">
    <h2 className="text-xl font-bold text-[#394169]">What you'll learn</h2>
    <div className="flex flex-col gap-5">
      {skills && skills.length > 0 && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap">
          {skills.map((skill) => (
            <Badge key={skill} className="flex h-[32px] w-auto items-center justify-center rounded-[30px] bg-[#f6f6fe] px-4 py-2 text-sm font-medium text-[#566fe9] shadow-none">{skill}</Badge>
          ))}
        </div>
      )}
      {outcomes && outcomes.length > 0 && (
        <div className="flex flex-col gap-4">
          {outcomes.map((outcome) => (
            <div key={outcome} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <img className="h-[16.25px] w-[16.25px]" alt="Checkmark" src="/ticked.svg" />
              </div>
              <p className="text-base text-[16px] font-semibold leading-6 text-[#394169]">{outcome}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  </section>
);

// --- MODIFICATION START ---
// The component now accepts props for the teacher's data.
const TeacherProfileSection = ({ name, title, bio, imageUrl }: { name?: string; title?: string; bio?: string; imageUrl?: string; }) => (
  <section className="flex flex-col gap-6">
    <h2 className="text-xl font-bold text-[#394169]">Meet your teacher</h2>
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={imageUrl || "/teacher1.svg"} alt={name || "Teacher"} />
        </Avatar>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-base font-semibold text-[#394169]">{name || "Your Name"}</span>
            <Badge variant="outline" className="flex items-center gap-1 rounded-[30px] border-[#566fe940] bg-[#566fe91a] py-1 pl-2.5 pr-3.5 text-[#566fe9]">
              <div className="relative h-4 w-4"><div className="relative left-px top-px h-[13px] w-3.5"><img className="absolute left-px top-0 h-3 w-[13px]" alt="Vector" src="/vector.svg" /><img className="absolute left-0 top-0 h-[13px] w-3.5" alt="Vector" src="/star1.svg" /></div></div>
              <span className="text-sm font-medium">Top Educator</span>
            </Badge>
          </div>
          <span className="text-sm font-medium text-[#8187a0]">{title || "Your Title"}</span>
        </div>
      </div>
      {bio && <p className="text-base text-[16px] font-semibold leading-6 text-[#394169]" dangerouslySetInnerHTML={{ __html: bio.replace(/\n/g, '<br />') }} />}
    </div>
  </section>
);
// --- MODIFICATION END ---

// --- MAIN PREVIEW PAGE COMPONENT ---
export default function NewCoursePreviewPage(): JSX.Element {
  const courseData = useNewCourseStore();
  // --- MODIFICATION START ---
  // We use the `useUser` hook to get the logged-in teacher's data.
  const { user } = useUser();
  // --- MODIFICATION END ---

  const courseDetails: CourseDetail[] = [
    { icon: "/difficulty.svg", label: "Difficulty", value: courseData.difficulty || "Not Set" },
    { icon: "/star.svg", label: "Rating", value: "Not Rated Yet" },
    { icon: "/duration.svg", label: "Duration", value: "Self-paced" },
    { icon: "/usercount.svg", label: "User Count", value: "0 enrolled" },
    { icon: "/language.svg", label: "Language", value: courseData.language || "English" },
    { icon: "/assignment.svg", label: "Assignments", value: "To be added" },
  ];
  
  return (
    <>
      <Sphere />
      <div className="flex h-full w-full flex-col font-sans text-gray-900">
        <main className="flex-grow overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 md:py-12">
            <div className="mx-auto flex w-full max-w-[80%] flex-col gap-10 md:gap-12">
              <div className="flex items-center text-sm text-gray-500">
                <Link href="/teacher-dash" className="hover:underline">Dashboard</Link>
                <span className="mx-2">·</span>
                <span className="text-gray-800">{courseData.title || "Course Preview"}</span>
              </div>
              
              <div className="flex flex-col gap-6">
                <CourseHeader />
                <CourseBanner imageUrl={"/banner.svg"} />
              </div>

              <CourseIntroduction tags={courseData.tags} title={courseData.title} description={courseData.description} />
              <CourseDetailsSection details={courseDetails} />
              <WhatYouWillLearnSection skills={courseData.skills} outcomes={courseData.learningOutcomes} />
              <CourseMap />
              
              {/* --- MODIFICATION START --- */}
              {/* We now pass the real teacher data from the `useUser` hook to the component */}
              <TeacherProfileSection 
                name={user?.fullName || "Your Name"}
                title={(user?.unsafeMetadata?.title as string) || "AI Educator"}
                bio={(user?.unsafeMetadata?.bio as string)}
                imageUrl={user?.imageUrl}
              />
              {/* --- MODIFICATION END --- */}
              <Button asChild className="w-full rounded-[100px] h-[50px] bg-[#566fe9] px-12 py-3 font-semibold text-white sm:px-20 hover:bg-[#4a5fd1]">
      <Link href="/courses/new/details-form">
        Back to Editor
      </Link>
    </Button>

            </div>
          </div>
        </main>
        <div className="h-[60px] w-full flex-shrink-0"><Footer /></div>
      </div>
    </>
  );
}

