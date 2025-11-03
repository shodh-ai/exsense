"use client";

import React, { JSX, useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { PlusIcon, Trash2Icon, ChevronDown, EditIcon } from "lucide-react";
import Link from "next/link";
import { ENVIRONMENTS, EnvironmentDisplayName } from "@/config/environments";

// --- Type definitions ---
type Environment = EnvironmentDisplayName;
export type TeachingMode = 'video' | 'text' | 'quiz' | 'document';

// --- MODIFICATION START: The data structure is now flat ---
// The `Module` type is removed.
// `SectionData` no longer has a `modules` array. Instead, it has its own `title` and `environment`.
export interface SectionData {
  id: string;
  title: string; // Moved from Module to here
  environment?: Environment | null; // Moved from Module to here
  description: string;
  scope: string;
}
// --- MODIFICATION END ---

interface CurriculumSectionProps {
  section: SectionData;
  onUpdate: (id: string, updatedField: Partial<SectionData>) => void;
  onDelete: (id: string) => void;
  titleError?: string | null;
  courseId?: string;
}

// --- EnvironmentDropdown component (No changes) ---
const EnvironmentDropdown = ({
  selectedEnvironment,
  onEnvironmentChange,
}: {
  selectedEnvironment: Environment | null | undefined;
  onEnvironmentChange: (environment: Environment) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const placeholder = "Environment Type";
  const handleSelect = (environment: Environment) => { onEnvironmentChange(environment); setIsOpen(false); };
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) { setIsOpen(false); } };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div>
        <button type="button" className={`inline-flex items-center justify-between w-[180px] h-[42px] rounded-[40px] pl-[16px] pr-[12px] py-[12px] text-sm font-medium focus:outline-none ${ selectedEnvironment ? 'bg-blue-100 text-[#566FE9] hover:bg-blue-200' : 'bg-blue-100 text-[#566FE9] ' }`} onClick={() => setIsOpen(!isOpen)}>
          {selectedEnvironment || placeholder}
          <ChevronDown className="-mr-1 ml-2 h-5 w-5" />
        </button>
      </div>
      {isOpen && (
        <div className="origin-top-right absolute left-0 mt-2 w-56 rounded-md bg-white z-10">
          <div className="py-1" role="menu">
            {ENVIRONMENTS.map((env) => (<a key={env.displayName} href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" onClick={(e) => { e.preventDefault(); handleSelect(env.displayName as Environment); }}>{env.displayName}</a>))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Section Component ---
export const CurriculumSection = ({
    section,
    onUpdate,
    onDelete,
    titleError,
    courseId 
}: CurriculumSectionProps): JSX.Element => {

  // --- MODIFICATION START: All module-related state and handlers are removed ---
  // const [newModuleTitle, setNewModuleTitle] = useState("");
  // const [newModuleEnvironment, setNewModuleEnvironment] = useState<Environment | null>(null);
  // const inputRef = React.useRef<HTMLInputElement>(null);
  // const handleAddModule = ...
  // const handleDeleteModule = ...
  // const handleUpdateModule = ...
  // --- MODIFICATION END ---

  return (
    <div className="w-full bg-[#fbfbfe] border border-gray-200 rounded-2xl p-4 space-y-[20px] custom=scrollbar">
      
      {/* --- MODIFICATION START: The old "Section Title" block is GONE --- */}
      {/* The new primary title input is now here */}
      <div className="space-y-[20px]">
        <label className="text-sm font-semibold text-[#394169]">Lesson Title</label>
        <div className={`mt-2 flex items-center w-full bg-white border p-1 pr-[5px] gap-2 transition-all duration-200 rounded-[600px] h-[50px] ${ titleError ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200' }`}>
            <EnvironmentDropdown 
                selectedEnvironment={section.environment} 
                onEnvironmentChange={(env) => onUpdate(section.id, { environment: env })}
            />
            <Input 
                placeholder="e.g., Introduction to Python" 
                value={section.title} 
                onChange={(e) => onUpdate(section.id, { title: e.target.value })} 
                className="flex-grow border-0 h-auto bg-transparent focus:outline-none text-sm font-semibold pl-4"
            />
            <div className="flex items-center flex-shrink-0">
                {courseId && (
                    <Button asChild variant="ghost" size="icon" className="text-[#566FE9] hover:text-blue-700 hover:bg-blue-50 w-10 h-10 rounded-[100px]">
  <Link href={`/teacher?courseId=${courseId}&lessonId=${section.id}&lessonTitle=${encodeURIComponent(section.title)}${section.environment ? `&environment=${encodeURIComponent(section.environment)}` : ''}`} title={`Teach this lesson: ${section.title}`}>
                            <EditIcon className="w-5 h-5" />
                        </Link>
                    </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => onDelete(section.id)} className="text-[#566FE9] hover:text-red-500 hover:bg-red-50 w-10 h-10 rounded-[100px]">
                    <Trash2Icon className="w-5 h-5" />
                </Button>
            </div>
        </div>
        {titleError && (<p className="text-sm text-red-600 mt-1 pl-2">{titleError}</p>)}
      </div>
      {/* --- MODIFICATION END --- */}

      <div className="space-y-[20px]">
        <label className="text-sm font-semibold text-[#394169]">Lesson Description</label>
        <div className="mt-2 flex items-center w-full bg-white border border-gray-200 p-3 pr-[5px] gap-2 rounded-[12px]">
          <Textarea placeholder="Provide a detailed description for this lesson..." value={section.description} onChange={(e) => onUpdate(section.id, { description: e.target.value })} className="w-full border-0 p-0 h-auto bg-transparent focus:outline-none min-h-[80px] resize-none text-sm font-semibold pl-[8px]" />
        </div>
      </div>

      {/* --- MODIFICATION START: The entire "Modules" section is GONE --- */}
      {/* No more list of modules or "add new" row */}
      {/* --- MODIFICATION END --- */}

      <div className="space-y-[20px]">
        <label className="text-sm font-semibold text-[#394169]">Scope</label>
        <div className="mt-2 flex items-center w-full bg-white border border-gray-200 p-3 pr-[5px] gap-2 rounded-[12px]">
          <Textarea placeholder="Define the in-scope and out-of-scope boundaries for this lesson..." value={section.scope} onChange={(e) => onUpdate(section.id, { scope: e.target.value })} className="w-full border-0 p-0 pl-[8px] h-auto bg-transparent focus:outline-none min-h-[80px] resize-none text-sm font-semibold"/>
        </div>
      </div>
    </div>
  );
};