"use client";
import { XIcon, Star } from "lucide-react";
import React, { JSX } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/accordion";
import { Avatar, AvatarImage } from "@/components/avatar";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
// import { Card, CardContent } from "@/components/card";
import CourseMap from "@/components/CourseMap";
import { Separator } from "@/components/separator";
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";

// --- TYPE DEFINITIONS ---
type CourseDetail = {
  icon: string;
  label: string;
  value: string;
};

type Review = {
  name: string;
  avatar: string;
  rating: number;
  time: string;
  comment: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

// --- DATA CONSTANTS ---
const courseTags: string[] = ["Top Rated", "AI-Powered", "Beginner Friendly"];

const courseDetails: CourseDetail[] = [
  { icon: "/difficulty.svg", label: "Difficulty", value: "Intermediate" },
  { icon: "/star.svg", label: "Rating", value: "4.7 (320 reviews)" },
  { icon: "/duration.svg", label: "Duration", value: "8 hrs 21 mins" },
  { icon: "/usercount.svg", label: "User Count", value: "4,200+ enrolled" },
  { icon: "/language.svg", label: "Language", value: "English Only" },
  { icon: "/assignment.svg", label: "Assignments", value: "83" },
];

// --- NEW DATA FROM CODE2 ---
const courseAnalytics: CourseDetail[] = [
    { icon: "/Score.svg", label: "Average Test score", value: "78%" },
    { icon: "/time.svg", label: "Average Time Spent", value: "3h42m per student" },
    { icon: "/completion.svg", label: "Completion Rate", value: "65%" },
    { icon: "/doubt.svg", label: "Unsolved Doubtst", value: "6 pending" },
    { icon: "/accuracy.svg", label: "Accuracy Rate", value: "82%" },
    { icon: "/satisfaction.svg", label: "Satisfaction level", value: "4.3/5.0(91 reviews)" },
];


const skills: string[] = [
  "Data Preprocessing",
  "Hyperparameter Tuning",
  "Deep Learning Architectures",
  "Feature Engineering",
  "Neural Networks",
  "Deep Learning Models",
];

const learningOutcomes: string[] = [
  "Learn the fundamentals of neural networks and how to build them using TensorFlow.",
  "Explore the advanced techniques in deep learning, including convolutional and recurrent neural networks.",
  "Understand the principles of reinforcement learning and how it applies to game AI.",
  "Dive into natural language processing and develop models for sentiment analysis and text generation.",
  "Get hands-on experience with real-world projects by participating in Kaggle competitions.",
];

const reviews: Review[] = [
  {
    name: "Peter Lewis",
    avatar: "/learner1.svg",
    rating: 5,
    time: "3 months ago",
    comment:
      "This course truly transformed my understanding of machine learning. The AI explanations were not only clear but also engaging, making complex concepts like propagation easy to grasp. I found myself excited to learn more with each lesson!",
  },
  {
    name: "Sarah Johnson",
    avatar: "/learner2.svg",
    rating: 5,
    time: "1 month ago",
    comment:
      "The hands-on projects were a game changer for me. They allowed me to apply what I learned in a practical way, reinforcing the concepts and boosting my confidence in using machine learning techniques in real-world scenarios.",
  },
  {
    name: "Michael Chen",
    avatar: "/learner3.svg",
    rating: 4.5,
    time: "2 weeks ago",
    comment:
      "I really appreciated the focus on real-world applications throughout the course. The case studies were particularly helpful, as they provided valuable context for the theories we explored, making the learning experience much more relevant.",
  },
  {
    name: "Emily Davis",
    avatar: "/learner4.svg",
    rating: 5,
    time: "5 days ago",
    comment:
      "The community support was outstanding! I connected with fellow learners and gained insights from their experiences, which enriched my own learning journey. The collaborative environment made the course even more enjoyable.",
  },
];

const faqs: FaqItem[] = [
  {
    question: "Do I need prior programming experience to take this course?",
    answer:
      "Not necessarily! While basic Python knowledge is helpful, the course starts with a beginner-friendly introduction to key concepts.",
  },
  {
    question: "What kind of support is available if I get stuck?",
    answer:
      "You'll have access to our community forums and dedicated Q&A sessions with the instructor.",
  },
  {
    question: "Which version of TensorFlow is used in this course?",
    answer:
      "We use the latest stable version of TensorFlow. The course materials are regularly updated to reflect any significant changes.",
  },
  {
    question:
      "What's the difference between this course and the advanced TensorFlow course?",
    answer:
      "This course focuses on the fundamentals, while the advanced course dives into more complex topics like generative models and custom architectures.",
  },
];

// --- SUB-COMPONENTS ---

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
          <div key={index} className="relative h-5 w-5 ">
            <Star className="absolute left-0 top-0 h-5 w-5  fill-gray-300 text-gray-300" />
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
    <h2 className="text-base font-semibold text-[#394169]">Course Overview</h2>
  </div>
);

const CourseBanner = () => (
  <div className="flex justify-center">
    <img
      className="w-full rounded-lg h-auto max-h-48 md:max-h-[200px] object-cover"
      alt="Course banner"
      src="/banner.svg"
    />
  </div>
);

const CourseIntroduction = ({ tags }: { tags: string[] }) => (
  <section className="flex flex-col gap-3">
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          className="rounded-[30px] h-[32px] bg-[#566fe91a] px-4 py-2font-medium text-[#566fe9] border-0"
        >
          {tag}
        </Badge>
      ))}
    </div>
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold leading-tight text-[#394169] md:text-[28px] md:leading-[33.6px]">
        AI Foundations with TensorFlow
      </h1>
      <p className="text-base text-[16px] font-semibold leading-6 text-[#394169]">
        This beginner-friendly course introduces AI through practical projects
        in image recognition, covering user flows, wire framing, and real-world
        case studies.chatbots, and smart predictions.
      </p>
    </div>
  </section>
);

// --- NEW COMPONENT FROM CODE2 ---
const CourseAnalyticsSection = ({ details }: { details: CourseDetail[] }) => (
    <section className="flex flex-col gap-7">
      <div className="flex flex-col gap-6">
        <h2 className=" font-bold font-[Plus Jakarta Sans] text-[20px] text-[#394169]">Course Analytics</h2>
        <div className="flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-x-[120px] md:gap-y-8">
          {details.map((detail) => (
            <div
              key={detail.label}
              className="flex items-center gap-3"
            >
              <div className="p-3 bg-[#566fe91a] rounded-xl">
                <div className="w-7 h-7 relative">
                  <img
                    className="absolute inset-0 m-auto"
                    alt={detail.label}
                    src={detail.icon}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-[3px]">
                <div className="text-sm font-medium text-[#8187a0] opacity-100">
                  {detail.label}
                </div>
                <div className="text-base text-[#394169]">{detail.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button className="w-full rounded-[100px] h-[50px] px-12 py-3 font-semibold text-[#566fe9] border border-[#566fe9] bg-white sm:px-20">
            Update Course Detail
          </Button>
          <Button className="w-full rounded-[100px] h-[50px] px-12 py-3 font-semibold text-[#566fe9] border border-[#566fe9] bg-white sm:px-20">
            View Enrolled Students
          </Button>
        </div>

        <Button className="w-full rounded-[100px] h-[50px] bg-[#566fe9] px-12 py-3 font-semibold text-white sm:px-20">
          View 6 Unresolved Doubts
        </Button>
      </div>
    </section>
  );

const CourseDetailsSection = ({ details }: { details: CourseDetail[] }) => (
  <section className="flex flex-col gap-7">
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-[#394169]">Course details</h2>
      <div className="flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-x-[120px] md:gap-y-8">
        {details.map((detail) => (
          <div
            key={detail.label}
            className="flex items-center gap-3"
          >
            <div className="p-3 bg-[#566fe91a] rounded-xl">
              <div className="w-7 h-7 relative">
                <img
                  className="absolute inset-0 m-auto"
                  alt={detail.label}
                  src={detail.icon}
                />
              </div>
            </div>
            <div className="flex flex-col gap-[3px]">
              <div className="text-sm font-medium text-[#8187a0] opacity-100">
                {detail.label}
              </div>
              <div className="text-base text-[#394169]">{detail.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
    {/* Button was removed from here to avoid duplication */}
  </section>
);

const WhatYouWillLearnSection = ({
  skills,
  outcomes,
}: {
  skills: string[];
  outcomes: string[];
}) => (
  <section className="flex flex-col gap-6">
    <h2 className="text-xl font-bold text-[#394169]">What you'll learn</h2>
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap">
        {skills.map((skill) => (
          <Badge
            key={skill}
            className="flex h-[32px] w-64 items-center justify-center rounded-[30px] bg-[#f6f6fe] px-4 py-2 text-sm font-medium text-[#566fe9] sm:w-auto sm:justify-start shadow-none"
          >

            {skill}
          </Badge>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        {outcomes.map((outcome) => (
          <div key={outcome} className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <img
                className="h-[16.25px] w-[16.25px]"
                alt="Checkmark"
                src="/ticked.svg"
              />
            </div>
            <p className="text-base text-[16px] font-semibold leading-6 text-[#394169]">{outcome}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const TeacherProfileSection = () => (
  <section className="flex flex-col gap-6">
    <h2 className="text-xl font-bold text-[#394169]">Meet your teacher</h2>
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src="/teacher1.svg" alt="Arjun Mehta" />
        </Avatar>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-base font-semibold text-[#394169]">
              Arjun Mehta
            </span>
            <Badge
              variant="outline"
              className="flex items-center gap-1 rounded-[30px] border-[#566fe940] bg-[#566fe91a] py-1 pl-2.5 pr-3.5 text-[#566fe9]"
            >
              <div className="relative h-4 w-4">
                <div className="relative left-px top-px h-[13px] w-3.5">
                  <img
                    className="absolute left-px top-0 h-3 w-[13px]"
                    alt="Vector"
                    src="/vector.svg"
                  />
                  <img
                    className="absolute left-0 top-0 h-[13px] w-3.5"
                    alt="Vector"
                    src="/star1.svg"
                  />
                </div>
              </div>
              <span className="text-sm font-medium">Top Educator</span>
            </Badge>
          </div>
          <span className="text-sm font-medium text-[#8187a0] opacity-100">
            AI Educator at DeepLearn Lab.
          </span>
        </div>
      </div>
      <p className="text-base text-[16px] font-semibold text-[#394169]">
        I'm a Digital Designer & teacher at BYOL international. Sharing is who I
        am, and teaching is where I am at my best, because I've been on both
        sides of that equation, and getting to deliver useful training is my
        meaningful way to be a part of the creative community.
        <br />
        <br />
        I've spent a long time watching others learn, and teach, to refine how I
        work with you to be efficient, useful and, most importantly, memorable.
        I want you to carry what I've shown you into a bright future.
      </p>
    </div>
  </section>
);


const FaqSection = ({ faqs }: { faqs: FaqItem[] }) => (
  <section className="flex flex-col gap-6">
    <h2 className="text-xl font-bold text-[#394169]">FAQs</h2>
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((faq, index) => (
        <AccordionItem
          key={index}
          value={`faq-${index}`}
          className="border-b border-solid border-gray-200 "
        >
          <AccordionTrigger className="py-4 text-left text-base font-semibold text-[#394169]">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="pb-4 text-base text-[#8187a0] opacity-100">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </section>
);

const Breadcrumb = () => (
  <div className="flex items-center text-sm text-gray-500">
    <a href="#" className="flex items-center hover:underline">
      <svg
        className="w-5 h-5 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M15 19l-7-7 7-7"
        ></path>
      </svg>
    </a>
    <a href="/teacher-dash" className="hover:underline">
      Dashboard
    </a>
    
    <span className="mx-2">·</span>
    <a href="/Process_Curriculum" className="hover:underline">
      Curriculum Editor
    </a>
    <span className="mx-2">·</span>
    <span className="text-gray-800">Course Overview</span>
  </div>
);

// --- MAIN PAGE COMPONENT ---
export default function MyCoursesPage(): JSX.Element {
  return (
    <>
      <Sphere />
      <div className="flex h-full w-full flex-col font-sans text-gray-900">
        <main className="flex-grow overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 md:py-12">
            {/* Central Content Container */}
            <div className="mx-auto flex w-full max-w-[80%] flex-col gap-10 md:gap-12">
              <Breadcrumb />
              <div className="flex flex-col gap-6">
                <CourseHeader />
                <CourseBanner />
              </div>

              <CourseIntroduction tags={courseTags} />
              {/* --- SECTION ADDED HERE --- */}
              <CourseAnalyticsSection details={courseAnalytics} />
              <CourseDetailsSection details={courseDetails} />
              <WhatYouWillLearnSection
                skills={skills}
                outcomes={learningOutcomes}
              />
              <CourseMap />
              <TeacherProfileSection />
              <FaqSection faqs={faqs} />
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