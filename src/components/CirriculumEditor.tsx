"use client";

import { SearchIcon, XIcon } from "lucide-react";
import React, { JSX, useState } from "react";
import { v4 as uuidv4 } from 'uuid';

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { CurriculumSection, SectionData } from "@/components/CurriculumSection"; 
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";

const initialBackendData: SectionData[] = [
  {
    id: uuidv4(),
    title: "CSS Styling Techniques",
    description:
      "Dive into the world of CSS and discover how to transform your web pages into visually stunning experiences. This comprehensive course covers essential CSS concepts such as selectors, properties, and values. You'll learn to style HTML elements effectively and utilize advanced layout techniques like Flexbox and Grid to create responsive designs that captivate users.",
    modules: [
        { id: uuidv4(), title: "Understanding CSS Selectors" },
        { id: uuidv4(), title: "Creating Adaptive Designs" },
    ],
    scope:
      "This course is dedicated to mastering CSS, a vital skill for aspiring web developers. While we will touch on animations, our main focus is on the diverse styling techniques available in CSS. You will explore selectors, properties, and the effective application of styles to HTML elements, including a deep dive into the box model and layout strategies.",
  },
];

const CirriculumEditor = (): JSX.Element => {
  const [sections, setSections] = useState<SectionData[]>(initialBackendData);
  const [searchQuery, setSearchQuery] = useState("");

  const handleAddSection = () => {
    const newSection: SectionData = {
      id: uuidv4(),
      title: "",
      description: "",
      modules: [],
      scope: "",
    };
    setSections(currentSections => [...currentSections, newSection]);
  };
  
  const handleDeleteSection = (idToDelete: string) => {
    setSections(currentSections => currentSections.filter(section => section.id !== idToDelete));
  };

  const handleUpdateSection = (idToUpdate: string, updatedField: Partial<SectionData>) => {
    setSections(currentSections => 
      currentSections.map(section => 
        section.id === idToUpdate ? { ...section, ...updatedField } : section
      )
    );
  };

  return (
    <>
      <Sphere/>
      
      <div className="w-full h-[90%] bg-transparent overflow-y-auto relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 right-6 w-6 h-6 p-0 hover:bg-gray-100"
        >
          <XIcon className="w-4 h-4" />
        </Button>

        <div className="flex flex-col w-full max-w-[850px] mx-auto gap-4 pt-20 px-4 pb-32">
          <div className="flex flex-col items-start gap-6 relative self-stretch w-full">
            <div className="relative self-stretch mt-[-1.00px] font-updated-title-2">
              Curriculum Editor
            </div>
            <div className="flex flex-wrap gap-4 w-full">
               <Button variant="outline" className="flex-1 md:flex-initial md:w-auto px-7 py-4 h-auto rounded-[600px] border-[#566fe9] text-[#566fe9] hover:bg-[#566fe9] hover:text-white">
                  Course Map
                </Button>
        
                <div className="w-full order-last md:w-auto md:flex-1 md:order-none flex h-[50px] items-center pl-5 pr-0 py-1.5 relative bg-white rounded-[600px] border border-solid border-[#c7ccf8]">
                  <Input
                    placeholder="Search for specific module"
                    className="border-0 bg-transparent p-0 h-auto flex-grow placeholder:text-[#8187a0] focus-visible:ring-0"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button
                    size="icon"
                    className={`rounded-full flex-shrink-0 p-2.5 mr-1 h-[38px] w-[38px] transition-colors ${
                      searchQuery ? "bg-[#566fe9]" : "bg-[#e6e8ff]"
                    }`}
                  >
                    <SearchIcon
                      className={`w-5 h-5 transition-colors ${
                        searchQuery ? "text-white" : "text-[#566fe9]"
                      }`}
                    />
                  </Button>
                </div>
                <Button className="flex-1 md:flex-initial md:w-auto px-7 py-4 h-auto bg-[#566fe9] rounded-[600px] text-white hover:bg-[#4a5fd1]">
                  Finalize
                </Button>
            </div>
          </div>

          {sections.map(section => (
            <CurriculumSection 
              key={section.id}
              section={section}
              onUpdate={handleUpdateSection}
              onDelete={handleDeleteSection}
            />
          ))}

          <Button 
            onClick={handleAddSection}
            className="w-full h-auto px-7 py-4 bg-[#566fe9] hover:bg-[#4a5fd1] rounded-[600px] transition-colors"
          >
            <span className="text-white">Add new section</span>
          </Button>
        </div>
      </div>
      <Footer/>
    </>
  );
};

export default CirriculumEditor;