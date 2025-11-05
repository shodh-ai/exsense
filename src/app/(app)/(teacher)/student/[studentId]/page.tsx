"use client";

import React, { JSX } from "react";
import { ChevronLeftIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Sphere from "@/components/compositions/Sphere";
import Footer from "@/components/compositions/Footer";
import CourseMap from "@/components/compositions/CourseMap";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// --- Data Definitions ---
const studentData = [
  {
    icon: "/studentname.svg",
    label: "Student Name",
    value: "Sanket Sharma",
  },
  {
    icon: "/learning.svg",
    label: "Learning Style",
    value: "Visual + Theoretical",
  },
  {
    icon: "/score.svg",
    label: "Average Test Score",
    value: "78%",
  },
  {
    icon: "/time.svg",
    label: "Completion Rate",
    value: "65%",
  },
  {
    icon: "/time.svg",
    label: "Average Time Spent",
    value: "3h 42m",
  },
  {
    icon: "/accuracy.svg",
    label: "Accuracy Rate",
    value: "82%",
  },
];

const strengths = [
  "Practical Engagement",
  "Foundational Understanding",
  "AI Adaptability",
  "Focused Learning",
  "Clear Communication",
];

const achievements = [
  "Riya completed all hands-on lab exercises within the first attempt for 80% of the modules.",
  "She demonstrates excellent recall of key networking and storage concepts in multi-cloud setups.",
  "Her score improvement between Module 2 and Module 4 was +18% after applying targeted AI suggestions.",
  "Her code comments and explanations in collaborative assignments are clear and concise.",
];

const improvementAreas = [
  "Engagement Strategies Needed",
  "Core Concepts Revisit Required",
  "Targeted Focus Areas",
  "Communication Gaps Detected",
];

const improvementPoints = [
  "Riya faced challenges in completing hands-on lab exercises for 20% of the modules on her first attempt.",
  "She occasionally struggles to recall advanced networking and storage concepts in cloud environments.",
  "Her score improvement between Module 2 and Module 4 was only +5%, indicating a need for more effective AI suggestions.",
  "Her code comments and explanations in collaborative assignments sometimes lack clarity and detail.",
];

const actionPlanTags = [
  "Interactive Learning Modules",
  "Address barriers to effective teamwork",
  "Skill Development Focus on Collaboration",
  "Monthly workshops to enhance understanding of key principles",
];

// --- MODIFIED: Data structure updated to be a flat array ---
const implementationItems = [
  "Feedback Loop Implementation",
  "Weekly sessions to review participant input and adjust strategies.",
  "Mentorship Program Expansion",
  "Establish connections to foster peer learning and support.",
];

// --- STYLES ---
const pillBaseStyles =
  "px-4 py-2 rounded-[30px] font-['Plus_Jakarta_Sans',_sans-serif] font-semibold text-xs leading-4 tracking-normal border-0";
const sectionTitleStyles =
  "w-full font-['Plus_Jakarta_Sans',_sans-serif] font-bold text-[#394169] text-[18px]";

// --- SUB-COMPONENTS ---

const BreadcrumbNav = () => (
  <nav className="flex items-center gap-3 mb-6">
    <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-0 bg-white transition-colors hover:bg-gray-100" asChild>
      <a href="/teacher-dash">
        <ChevronLeftIcon className="h-6 w-6" />
      </a>
    </Button>
    <Breadcrumb>
      <BreadcrumbList className="inline-flex items-center gap-2">
        <BreadcrumbItem>
          <BreadcrumbLink href="/teacher-dash" className="font-medium text-[#8187a0] transition-colors hover:text-[#394169]">
            Dashboard
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>·</BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink href="#" className="font-medium text-[#8187a0] transition-colors hover:text-[#394169]">
            Enrolled Students
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>·</BreadcrumbSeparator>
        <BreadcrumbItem>
          <span className="font-medium text-[#394169]">Student Profile</span>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  </nav>
);

const StudentProfileSection = (): JSX.Element => (
  <section className="flex flex-col w-full items-start gap-6 relative animate-fade-in [--animation-delay:400ms]">
    <h2 className={sectionTitleStyles}>Student Profile</h2>
    <div className="flex flex-col md:flex-row items-center md:items-center gap-6 w-full animate-fade-in [--animation-delay:600ms]">
      <img
        className="w-48 h-48 md:w-60 md:h-60 rounded-lg object-cover flex-shrink-0"
        alt="Student profile picture"
        src="https://c.animaapp.com/metm9igaQcD0W7/img/rectangle-3777.png"
      />
      <div className="flex flex-col flex-1 items-start w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          {studentData.map((item, index) => (
            <Card
              key={index}
              className="animate-fade-in border-none bg-transparent shadow-none"
              style={{ "--animation-delay": `${700 + index * 100}ms` } as React.CSSProperties}
            >
              <CardContent className="flex items-center gap-[10px] p-0">
                {/* This is the new styled container for the icon */}
                <div className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-[12px] bg-[#E9EBFD] p-[12px]">
                  <img
                    className="h-full w-full object-contain"
                    alt={`${item.label} icon`}
                    src={item.icon}
                  />
                </div>
                <div className="flex flex-col items-start gap-1.5 min-w-0">
                  <div className="w-full font-['Plus_Jakarta_Sans',_sans-serif] font-semibold text-sm text-[#8187a0] truncate">
                    {item.label}
                  </div>
                  <div className="font-['Plus_Jakarta_Sans',_sans-serif] font-semibold text-base font-semibold text-[#394169]">
                    {item.value}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const StrengthsSection = (): JSX.Element => (
  <section className="flex flex-col items-start gap-6 w-full animate-fade-in [--animation-delay:800ms]">
    <h2 className={sectionTitleStyles}>Personalised Strengths</h2>
    <div className="flex flex-col items-start gap-5 w-full">
      <div className="w-full grid grid-cols-1 gap-2 sm:flex sm:flex-wrap animate-fade-in [--animation-delay:1000ms]">
        {strengths.map((strength, index) => (
          <Badge
            key={`strength-${index}`}
            variant="secondary"
            className={`${pillBaseStyles} flex justify-center bg-[#e8f6e7] text-[#40bb33] hover:bg-[#dff0de]`}
          >
            {strength}
          </Badge>
        ))}
      </div>
      <ul className="flex flex-col items-start gap-4 w-full animate-fade-in [--animation-delay:1200ms]">
        {achievements.map((achievement, index) => (
          <li key={`achievement-${index}`} className="flex items-start gap-3 w-full">
            <img src="/good.svg" alt="Strength icon" className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="flex-1 font-['Plus_Jakarta_Sans',_sans-serif] font-medium text-base font-semibold text-[#394169]">
              {achievement}
            </p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

const ImprovementAreasSection = (): JSX.Element => (
  <section className="flex flex-col items-start gap-6 w-full animate-fade-in [--animation-delay:1400ms]">
    <h2 className={sectionTitleStyles}>Identified Areas for Improvement</h2>
    <div className="flex flex-col items-start gap-5 w-full">
      <div className="w-full grid grid-cols-1 gap-2 sm:flex sm:flex-wrap animate-fade-in [--animation-delay:1600ms]">
        {improvementAreas.map((area, index) => (
          <Badge
            key={index}
            variant="secondary"
            className={`${pillBaseStyles} flex justify-center bg-[#feedf0] text-[#e3837e] hover:bg-[#fce5e8]`}
          >
            {area}
          </Badge>
        ))}
      </div>
      <div className="flex flex-col items-start gap-4 w-full animate-fade-in [--animation-delay:1800ms]">
        {improvementPoints.map((point, index) => (
          <div key={index} className="flex items-start gap-3 w-full">
            <img src="/bad.svg" alt="Improvement area icon" className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="flex-1 font-['Plus_Jakarta_Sans',_sans-serif] font-medium text-base font-semibold text-[#394169]">
              {point}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const ActionPlanSection = (): JSX.Element => (
  <section className="flex flex-col items-start gap-6 w-full animate-fade-in [--animation-delay:2000ms]">
    <h2 className={sectionTitleStyles}>AI-Suggested Action Plan</h2>
    <div className="flex flex-col items-start gap-5 w-full animate-fade-in [--animation-delay:2200ms]">
      <div className="w-full grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        {actionPlanTags.map((tag, index) => (
          <Badge
            key={index}
            variant="secondary"
            className={`${pillBaseStyles} flex justify-center bg-[#f6f6fe] text-[#566fe9] hover:bg-[#eeeefe] transition-colors`}
          >
            {tag}
          </Badge>
        ))}
      </div>
      <div className="flex flex-col items-start gap-4 w-full animate-fade-in [--animation-delay:2400ms]">
        {implementationItems.map((item, index) => (
          <div key={index} className="flex items-start gap-3 w-full">
            <img src="/aisuggestion.svg" alt="AI suggestion icon" className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="flex-1 font-['Plus_Jakarta_Sans',_sans-serif] font-medium text-base font-semibold text-[#394169]">
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const ActionButtonsSection = ({ studentName }: { studentName: string }): JSX.Element => (
  <section className="w-full animate-fade-in [--animation-delay:3000ms] flex flex-col gap-3">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
      <Button
        variant="outline"
        className="w-full h-auto px-6 py-4 rounded-[100px] border-1 border-[#566fe9] text-[#566fe9] font-semibold text-base hover:bg-[#566fe9] hover:text-white transition-colors"
      >
        Update Course Map
      </Button>
      <Button
        variant="outline"
        className="w-full h-auto px-6 py-4 rounded-[100px] border-1 border-[#566fe9] text-[#566fe9] font-semibold text-base hover:bg-[#566fe9] hover:text-white transition-colors"
      >
        Schedule 1:1 Session
      </Button>
    </div>

    <Button className="w-full h-auto px-6 py-4 bg-[#566fe9] hover:bg-[#4a5fd1] rounded-[50px] text-white font-semibold text-base transition-colors">
      {`Message ${studentName}`}
    </Button>
  </section>
);

// --- MAIN PAGE COMPONENT ---
export default function StudentProfilePage(): JSX.Element {
  const studentName = studentData.find(item => item.label === "Student Name")?.value.split(" ")[0] || "Student";

  return (
    <>
      <Sphere />
      <div className="flex h-full w-full flex-col font-['Plus_Jakarta_Sans',_sans-serif] text-gray-900">
        <main className="flex-grow overflow-y-auto">
          <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 md:py-12">
            {/* Central Content Container */}
            <div className="mx-auto flex w-full max-w-[850px] flex-col items-start gap-15 ">
              <BreadcrumbNav />
              <StudentProfileSection />
              <StrengthsSection />
              <ImprovementAreasSection />
              <ActionPlanSection />
              <CourseMap />
              <ActionButtonsSection studentName={studentName} />
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