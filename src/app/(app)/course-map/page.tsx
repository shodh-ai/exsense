"use client";
import React, { JSX } from "react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import Sphere from "@/components/Sphere"; // Sphere component imported
import Footer from "@/components/Footer"; // Footer component imported


export const CourseMap = (): JSX.Element => {
  // Course map data for the learning path
  const learningPath = [
    {
      id: "english-learning",
      label: "English Learning Sessions",
      active: true,
      position: "left-0 top-0",
    },
    {
      id: "beginner-stage",
      label: "Beginner stage",
      active: true,
      position: "left-[372px] top-0",
    },
    {
      id: "grammar-boost",
      label: "Grammar Boost 1",
      active: true,
      position: "left-[635px] top-0",
    },
    {
      id: "essay-writing",
      label: "Essay Writing Level 3",
      active: false,
      position: "left-[623px] top-[106px]",
    },
    {
      id: "reading-sharpness",
      label: "Reading Sharpness 5",
      active: false,
      position: "left-[900px] top-[106px]",
    },
  ];

  // Connection lines between nodes
  const connectionLines = [
    {
      id: "line-1",
      className: "w-40 h-px top-5 left-[212px] absolute object-cover",
      src: "/line-463.svg",
      alt: "Line connecting English Learning to Beginner stage",
    },
    {
      id: "line-2",
      className: "w-[140px] h-px top-5 left-[515px] absolute object-cover",
      src: "/line-464.svg",
      alt: "Line connecting Beginner stage to Grammar Boost",
    },
    {
      id: "line-3",
      className: "w-px h-[65px] top-[41px] left-[712px] absolute object-cover",
      src: "/line-465.svg",
      alt: "Line connecting Grammar Boost to Essay Writing",
    },
    {
      id: "line-4",
      className: "w-[98px] h-px top-[126px] left-[802px] absolute object-cover",
      src: "/line-466.svg",
      alt: "Line connecting Essay Writing to Reading Sharpness",
    },
  ];

  return (
    // Use a React.Fragment to return multiple top-level elements (Card and Footer)
    <>
      <Sphere />
      <Card className="w-[1440px] h-[820px] bg-transparent overflow-hidden border-0">
        <CardContent className="p-0 relative">
          <div className="relative w-[2012px] h-[1284px] top-[-359px] -left-36">

            {/* Sphere component placed within the large content div */}
            {/* Positioned absolutely to be visible without disrupting other elements. */}
            {/* Example position: top-right area of the visible card */}


            {/* Control buttons */}
          

            {/* Course Map title */}
            <h1
              className="absolute top-[410px] left-[196px] 
               font-[700] 
               font-[Plus Jakarta Sans] 
               text-[16px] 
               leading-[100%] 
               tracking-[0%] 
               text-black"
            >
              Course Map
            </h1>


            {/* Learning path nodes and connections */}
            <div className="absolute w-[1080px] h-[147px] top-[626px] left-[296px]">
              {/* Learning path nodes */}
              {learningPath.map((node) => (
                <Badge
                  key={node.id}
                  className={`absolute ${node.position} inline-flex items-center justify-center gap-2.5 px-5 py-2.5 ${node.active ? "bg-[#7085ec]" : "bg-[#d5dcfb]"
                    } rounded-[40px] border-0`}
                >
                  <span className="relative w-fit mt-[-1.00px] font-label-large font-[number:var(--label-large-font-weight)] text-white text-[length:var(--label-large-font-size)] tracking-[var(--label-large-letter-spacing)] leading-[var(--label-large-line-height)] whitespace-nowrap [font-style:var(--label-large-font-style)]">
                    {node.label}
                  </span>
                </Badge>
              ))}

              {/* Connection lines */}
              {connectionLines.map((line) => (
                <img
                  key={line.id}
                  className={line.className}
                  alt={line.alt}
                  src={line.src}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Footer component placed after the main Card element */}
      <Footer />
    </>
  );
};

export default CourseMap;