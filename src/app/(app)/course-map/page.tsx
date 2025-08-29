"use client";
import React, { JSX, useState } from "react";
import Xarrow, { Xwrapper } from "react-xarrows";
import { Badge } from "@/components/badge";
import { Card, CardContent } from "@/components/card";
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";

// Types
type CourseNode = {
  id: string;
  label: string;
  children?: CourseNode[];
  isAction?: boolean;
};

// Data for the hierarchical course list in the sidebar
const courseData: CourseNode[] = [
  {
    id: "english-learning-sessions",
    label: "English Learning Sessions",
    children: [
      {
        id: "beginner-stage",
        label: "Beginner Stage",
        children: [
          { id: "grammar-boost-1", label: "Grammar Boost 1" },
          { id: "microcontrollers", label: "Microcontrollers" },
          { id: "communication-protocol", label: "Communication Protocol" },
          { id: "network-securities-concerns", label: "Network Securities Concerns" },
        ],
      },
    ],
  },
  {
    id: "control-systems",
    label: "Control Systems",
    children: [
      {
        id: "types-of-loop-systems",
        label: "Types of Loop Systems",
        children: [
          { id: "open-loop-system", label: "Open Loop System" },
          { id: "closed-loop-system", label: "Closed Loop System" },
          { id: "hybrid-loop-system", label: "Hybrid Loop System" },
        ],
      },
    ],
  },
  {
    id: "root-locus-technique",
    label: "Root Locus Technique",
  },
  {
    id: "signal-flow-graphs",
    label: "Signal Flow Graphs",
    isAction: true, // Indicates a different type of icon/action
  },
];

// A recursive component to render each item in the course list
const CourseItem = ({
  item,
  level = 0,
  openItems,
  toggleItem,
  activeItem,
  setActiveItem,
}: {
  item: CourseNode;
  level?: number;
  openItems: string[];
  toggleItem: (id: string) => void;
  activeItem: string;
  setActiveItem: (id: string) => void;
}) => {
  const isOpen = openItems.includes(item.id);
  const hasChildren = item.children && item.children.length > 0;

  const handleToggle = () => {
    if (hasChildren) {
      toggleItem(item.id);
    }
    setActiveItem(item.id);
  };
  
  // Icon components for clarity
  const ChevronDown = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6L8 10L12 6" stroke="#4B4B4B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const ChevronRight = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 12L10 8L6 4" stroke="#4B4B4B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <>
      <div
        onClick={handleToggle}
        className={`flex items-center p-2 rounded-lg cursor-pointer ${
          activeItem === item.id ? "bg-[#EBEFFF]" : "hover:bg-gray-100"
        }`}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        {hasChildren ? (
          isOpen ? <ChevronDown /> : <ChevronRight />
        ) : (
          // Use a placeholder for alignment if item is not an action and has no children
          <span className="w-4 h-4 mr-2">{item.isAction && <ChevronRight />}</span>
        )}
        <span className={`ml-2 text-sm font-medium ${activeItem === item.id ? 'text-[#333]' : 'text-gray-600'}`}>
          {item.label}
        </span>
      </div>
      {isOpen && hasChildren && (
        <div>
          {(item.children ?? []).map((child: CourseNode) => (
            <CourseItem
              key={child.id}
              item={child}
              level={level + 1}
              openItems={openItems}
              toggleItem={toggleItem}
              activeItem={activeItem}
              setActiveItem={setActiveItem}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default function CourseMap(): JSX.Element {
  // State for the new sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openItems, setOpenItems] = useState(['english-learning-sessions', 'beginner-stage', 'control-systems', 'types-of-loop-systems']);
  const [activeItem, setActiveItem] = useState('microcontrollers');

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // --- Existing course map data ---
  const learningPath = [
    { id: "english-learning", label: "English Learning Sessions", active: true, position: "left-0 top-0" },
    { id: "beginner-stage", label: "Beginner stage", active: true, position: "left-[372px] top-0" },
    { id: "grammar-boost", label: "Grammar Boost 1", active: true, position: "left-[635px] top-0" },
    { id: "essay-writing", label: "Essay Writing Level 3", active: false, position: "left-[623px] top-[106px]" },
    { id: "reading-sharpness", label: "Reading Sharpness 5", active: false, position: "left-[900px] top-[106px]" },
  ];
  const connections = [
    { start: "english-learning", end: "beginner-stage" },
    { start: "beginner-stage", end: "grammar-boost" },
    { start: "grammar-boost", end: "essay-writing" },
    { start: "essay-writing", end: "reading-sharpness" },
  ];
  const nodeStatusMap = new Map(learningPath.map(node => [node.id, node.active]));

  return (
    <div className="flex flex-col justify-center items-center w-full min-h-screen bg-transparent">
      <Sphere />

      {/* --- New Interactive Sidebar --- */}
      <div className="absolute top-8 left-8 w-80 bg-white rounded-xl border border-gray-200 shadow-lg p-4 z-10">
        <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          <h2 className="font-bold text-lg text-gray-800">Course Map</h2>
          <svg className={`w-5 h-5 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>

        {isSidebarOpen && (
          <div className="mt-4 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search for anything"
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
            </div>

            {/* Course List */}
            <nav className="space-y-1">
              {courseData.map((item) => (
                <CourseItem
                  key={item.id}
                  item={item}
                  openItems={openItems}
                  toggleItem={toggleItem}
                  activeItem={activeItem}
                  setActiveItem={setActiveItem}
                />
              ))}
            </nav>
          </div>
        )}
      </div>

      <Card className="w-[1440px] h-[820px] bg-transparent overflow-hidden border-0">
        <CardContent className="p-0 relative">
          <div className="relative w-[2012px] h-[1284px] top-[-359px] -left-36">
            <div className="absolute w-[1080px] h-[147px] top-[626px] left-[296px]">
              <Xwrapper>
                {learningPath.map((node) => (
                  <Badge
                    key={node.id}
                    id={node.id}
                    className={`absolute ${node.position} inline-flex items-center justify-center gap-2.5 px-5 py-2.5 ${
                      node.active ? "bg-[#7085ec]" : "bg-[#d5dcfb]"
                    } rounded-[40px] border-0`}
                  >
                    <span className="relative w-fit mt-[-1.00px] font-label-large font-[number:var(--label-large-font-weight)] text-white text-[length:var(--label-large-font-size)] tracking-[var(--label-large-letter-spacing)] leading-[var(--label-large-line-height)] whitespace-nowrap [font-style:var(--label-large-font-style)]">
                      {node.label}
                    </span>
                  </Badge>
                ))}
                {connections.map((line, index) => {
                  const isStartActive = nodeStatusMap.get(line.start);
                  const isEndActive = nodeStatusMap.get(line.end);
                  const lineColor = isStartActive && isEndActive ? "#7085ec" : "#d5dcfb";
                  return (
                    <Xarrow
                      key={index}
                      start={line.start}
                      end={line.end}
                      strokeWidth={2}
                      color={lineColor}
                      path="straight"
                      showHead={false}
                    />
                  );
                })}
              </Xwrapper>
            </div>
          </div>
        </CardContent>
      </Card>
      <Footer />
    </div>
  );
}