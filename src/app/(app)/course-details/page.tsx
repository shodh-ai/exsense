"use client";
import { XIcon } from "lucide-react";
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
import { Card, CardContent } from "@/components/card";
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
  rating: string;
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
    rating: "/frame-218.svg",
    time: "3 months ago",
    comment:
      "This course truly transformed my understanding of machine learning. The AI explanations were not only clear but also engaging, making complex concepts like propagation easy to grasp. I found myself excited to learn more with each lesson!",
  },    
  {
    name: "Sarah Johnson",
    avatar: "/learner2.svg",
    rating: "/frame-218-3.svg",
    time: "1 month ago",
    comment:
      "The hands-on projects were a game changer for me. They allowed me to apply what I learned in a practical way, reinforcing the concepts and boosting my confidence in using machine learning techniques in real-world scenarios.",
  },
  {
    name: "Michael Chen",
    avatar: "/learner3.svg",
    rating: "/frame-218-2.svg",
    time: "2 weeks ago",
    comment:
      "I really appreciated the focus on real-world applications throughout the course. The case studies were particularly helpful, as they provided valuable context for the theories we explored, making the learning experience much more relevant.",
  },
  {
    name: "Emily Davis",
    avatar: "/learner4.svg",
    rating: "/frame-218-1.svg",
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

const CourseDetailsPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900 font-sans">
      <Sphere />
      <CourseHeader />
      <CourseBanner />
      <CourseIntroduction tags={courseTags} />
      <CourseDetailsSection details={courseDetails} />
      <WhatYouWillLearnSection skills={skills} outcomes={learningOutcomes} />
      <CourseMapSection />
      <TeacherProfileSection />
      <ReviewsSection reviews={reviews} />
      <FaqSection faqs={faqs} />
      <Footer />
    </div>
  );
};

const CourseHeader = () => (
  <div className="flex justify-between items-center mb-8">
    <h2 className="font-semibold text-base text-black">
      Our Interactive Courses
    </h2>
    <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
      <XIcon className="h-6 w-6" />
    </Button>
  </div>
);

const CourseBanner = () => (
  <div className="flex justify-center mb-8">
    <img
      className="w-[750px] h-[200px]"
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
          className="bg-[#566fe91a] text-[#566fe9] font-medium px-4 py-1.5 rounded-[30px]"
        >
          {tag}
        </Badge>
      ))}
    </div>
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] leading-[33.6px] font-semibold text-black">
        AI Foundations with TensorFlow
      </h1>
      <p className="text-base leading-6 text-black">
        This beginner-friendly course introduces AI through practical projects
        in image recognition, covering user flows, wire framing, and real-world
        case studies.chatbots, and smart predictions.
      </p>
    </div>
  </section>
);

const CourseDetailsSection = ({ details }: { details: CourseDetail[] }) => (
  <section className="flex flex-col gap-7">
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-black">Course details</h2>
      <div className="flex flex-col gap-6">
        {[0, 3].map((start) => (
          <div key={start} className="flex flex-wrap gap-[60px]">
            {details.slice(start, start + 3).map((detail) => (
              <div key={detail.label} className="flex items-center gap-3 w-[210px]">
                <div className="p-3 bg-[#566fe91a] rounded-xl">
                  <div className="w-7 h-7 relative">
                    <img
                      className="absolute inset-0 m-auto"
                      alt={detail.label}
                      src={detail.icon}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium text-black opacity-60">
                    {detail.label}
                  </div>
                  <div className="text-base text-black">{detail.value}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
    <Button className="w-full py-3 px-[81px] bg-[#566fe9] text-white rounded-[100px] font-semibold z-[-1]">
      Start Your Journey
    </Button>
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
    <h2 className="text-xl font-semibold text-black">What you'll learn</h2>
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <Badge
            key={skill}
            variant="outline"
            className="h-10 px-5 py-2.5 bg-[#566fe91a] text-[#566fe9] font-medium rounded-[100px]"
          >
            {skill}
          </Badge>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        {outcomes.map((outcome) => (
          <div key={outcome} className="flex items-center gap-2">
            <div className="w-5 h-5 relative">
              <img
                className="absolute w-4 h-4 top-0.5 left-0.5"
                alt="Checkmark"
                src="/ticked.svg"
              />
            </div>
            <p className="text-base leading-6 text-black">{outcome}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CourseMapSection = () => (
  <section className="flex flex-col gap-6">
    <h2 className="text-xl font-semibold text-black">Course Map</h2>
    <Card className="w-full max-w-3xl min-h-[200px] bg-transparent rounded-xl shadow-md p-6">
      <CardContent className="p-6  bg-transparent">
        <div className="relative w-[700px] h-[95px]">
          <div className="flex w-[137px] h-[27px] items-center justify-center gap-[6.48px] px-[12.96px] py-[6.48px] absolute top-0 left-0 bg-[#7085ec] rounded-[25.93px]">
            <div className="text-[9.1px] leading-[13.6px] font-semibold text-white">
              English Learning Sessions
            </div>
          </div>
          <img
            className="absolute w-[104px] h-px top-[13px] left-[137px]"
            alt="Line"
            src="/line-463.svg"
          />
          <div className="w-[93px] top-0 left-[241px] bg-[#7085ec] flex h-[27px] items-center justify-center gap-[6.48px] px-[12.96px] py-[6.48px] absolute rounded-[25.93px]">
            <div className="text-[9.1px] leading-[13.6px] font-semibold text-white">
              Beginner stage
            </div>
          </div>
          <div className="absolute w-[178px] h-[27px] top-0 left-[334px]">
            <img
              className="absolute w-[91px] h-px top-[13px] left-0"
              alt="Line"
              src="/line-464.svg"
            />
            <div className="w-[100px] top-0 left-[78px] bg-[#7085ec] flex h-[27px] items-center justify-center gap-[6.48px] px-[12.96px] py-[6.48px] absolute rounded-[25.93px]">
              <div className="text-[9.1px] leading-[13.6px] font-semibold text-white">
                Grammar Boost 1
              </div>
            </div>
          </div>
          <img
            className="absolute w-px h-[42px] top-[27px] left-[461px]"
            alt="Line"
            src="/line-465.svg"
          />
          <div className="w-[116px] top-[69px] left-[404px] bg-[#d5dcfb] flex h-[27px] items-center justify-center gap-[6.48px] px-[12.96px] py-[6.48px] absolute rounded-[25.93px]">
            <div className="text-[9.1px] leading-[13.6px] font-semibold text-white">
              Essay Writing Level 3
            </div>
          </div>
          <img
            className="absolute w-16 h-px top-[82px] left-[520px]"
            alt="Line"
            src="/line-466.svg"
          />
          <div className="w-[117px] top-[69px] left-[583px] bg-[#d5dcfb] flex h-[27px] items-center justify-center gap-[6.48px] px-[12.96px] py-[6.48px] absolute rounded-[25.93px]">
            <div className="text-[9.1px] leading-[13.6px] font-semibold text-white">
              Reading Sharpness 5
            </div>
          </div>
        </div>
      </CardContent>
      <div className="inline-flex items-center justify-center p-2 absolute bottom-4 right-4 bg-[#566fe9] rounded-lg">
        <div className="relative w-4 h-4">
          <img
            className="absolute w-[11px] h-[11px] top-0.5 left-0.5"
            alt="Expand"
            src="/vector-14.svg"
          />
        </div>
      </div>
    </Card>
  </section>
);

const TeacherProfileSection = () => (
  <section className="flex flex-col gap-6">
    <h2 className="text-xl font-semibold text-black">Meet your teacher</h2>
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar className="w-14 h-14">
          <AvatarImage src="/teacher1.svg" alt="Arjun Mehta" />
        </Avatar>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-base text-black">Arjun Mehta</span>
            <Badge
              variant="outline"
              className="flex items-center gap-1 pl-2.5 pr-3.5 py-1 bg-[#566fe91a] text-[#566fe9] border-[#566fe940] rounded-[30px]"
            >
              <div className="relative w-4 h-4">
                <div className="relative w-3.5 h-[13px] top-px left-px">
                  <img
                    className="absolute w-[13px] h-3 top-0 left-px"
                    alt="Vector"
                    src="/vector.svg"
                  />
                  <img
                    className="absolute w-3.5 h-[13px] top-0 left-0"
                    alt="Vector"
                    src="/star1.svg"
                  />
                </div>
              </div>
              <span className="text-sm font-medium">Top Educator</span>
            </Badge>
          </div>
          <span className="text-sm font-medium text-black opacity-60">
            AI Educator at DeepLearn Lab.
          </span>
        </div>
      </div>
      <p className="text-base leading-6 text-black">
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

const ReviewsSection = ({ reviews }: { reviews: Review[] }) => (
  <section className="flex flex-col gap-6">
    <h2 className="text-xl font-semibold text-black">What Learners Think</h2>
    <div className="flex flex-col gap-4">
      {reviews.map((review, index) => (
        <React.Fragment key={review.name}>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={review.avatar} alt={review.name} />
              </Avatar>
              <div className="flex flex-col gap-2">
                <div className="font-semibold text-base text-black">{review.name}</div>
                <div className="flex items-center gap-[9px]">
                  <img className="h-5" alt="Rating" src={review.rating} />
                  <img
                    className="w-[1.5px] h-[15px]"
                    alt="Divider"
                    src="/line-21.svg"
                  />
                  <div className="text-sm font-medium text-black opacity-60">
                    {review.time}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-base leading-6 text-black pl-16">
              {review.comment}
            </p>
          </div>
          {index < reviews.length - 1 && <Separator className="w-full h-px" />}
        </React.Fragment>
      ))}
    </div>
  </section>
);

const FaqSection = ({ faqs }: { faqs: FaqItem[] }) => (
  <section className="flex flex-col gap-6">
    <h2 className="text-xl font-semibold text-black">FAQs</h2>
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((faq, index) => (
        <AccordionItem
          key={index}
          value={`faq-${index}`}
          className="border-b border-solid border-gray-200"
        >
          <AccordionTrigger className="py-4 text-base font-semibold text-left text-black">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-base text-black pb-4">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </section>
);

// --- MAIN PAGE COMPONENT ---
export default function MyCoursesPage(): JSX.Element {
  return (
    <div className="w-full h-full flex flex-col">
    <main className="flex-grow overflow-y-auto font-['Plus_Jakarta_Sans'] ">
      <div className="max-w-[1440px] mx-auto px-6 py-12 z-[-1]">
        <CourseHeader />
        <CourseBanner />
        <Sphere />

        {/* Central Content Container */}
        <div className="flex flex-col w-full max-w-[750px] mx-auto gap-[60px]">
          <CourseIntroduction tags={courseTags} />
          <CourseDetailsSection details={courseDetails} />
          <WhatYouWillLearnSection
            skills={skills}
            outcomes={learningOutcomes}
          />
          <CourseMapSection />
          <TeacherProfileSection />
          <ReviewsSection reviews={reviews} />
          <FaqSection faqs={faqs} />
        </div>
      </div>
    </main>
      <div className="w-full h-[60px] flex-shrink-0 mr-10 ">
        <Footer />
      </div>
    </div>
  );
}