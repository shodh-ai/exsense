"use client";

import React, { JSX, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { PlusIcon, Trash2Icon } from "lucide-react";

// --- TYPE DEFINITIONS ---
export interface Module {
  id: string;
  title: string;
}

export interface SectionData {
  id: string;
  title: string;
  description: string;
  modules: Module[];
  scope: string;
}

interface CurriculumSectionProps {
  section: SectionData;
  onUpdate: (id: string, updatedField: Partial<SectionData>) => void;
  onDelete: (id: string) => void;
}


export const CurriculumSection = ({ section, onUpdate, onDelete }: CurriculumSectionProps): JSX.Element => {
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleAddModule = () => {
    if (newModuleTitle.trim() === "") {
      // Focus the input to guide the user instead of doing nothing
      inputRef.current?.focus();
      return;
    }
    const newModule: Module = { id: uuidv4(), title: newModuleTitle.trim() };
    const updatedModules = [...section.modules, newModule];
    onUpdate(section.id, { modules: updatedModules });
    setNewModuleTitle("");
  };

  const handleDeleteModule = (moduleId: string) => {
    const updatedModules = section.modules.filter(m => m.id !== moduleId);
    onUpdate(section.id, { modules: updatedModules });
  };
  
  // Base classes for all containers to avoid repetition
  const containerBaseClasses = "flex items-center w-full bg-white border border-gray-200 p-3 gap-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200";

  return (
    <div className="w-full bg-[#fbfbfe] border border-gray-200 rounded-2xl p-6 space-y-6">
      {/* --- Section Title --- */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-gray-800">Section Title</label>
        {/* MODIFICATION: Applied rounded-pill style here */}
        <div className={`${containerBaseClasses} rounded-[600px]`}>
          <Input
            placeholder="e.g., Introduction to Python"
            value={section.title}
            onChange={(e) => onUpdate(section.id, { title: e.target.value })}
            className="flex-grow border-0 p-0 h-auto bg-transparent focus:outline-none"
          />
          <Button variant="ghost" size="icon" onClick={() => onDelete(section.id)} className="text-[#566FE9] hover:text-red-500 hover:bg-red-50 w-8 h-8">
            <Trash2Icon className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* --- Section Description --- */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-gray-800">Section Description</label>
        {/* MODIFICATION: Applied rounded-lg (12px) style here */}
        <div className={`${containerBaseClasses} rounded-lg`}>
            <Textarea
              placeholder="Provide a detailed description of this course section..."
              value={section.description}
              onChange={(e) => onUpdate(section.id, { description: e.target.value })}
              className="w-full border-0 p-0 h-auto bg-transparent focus:outline-none min-h-[80px] resize-none"
            />
        </div>
      </div>

      {/* --- Modules --- */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-gray-800">Modules</label>
        <div className="space-y-2">
          {section.modules.map(module => (
            // MODIFICATION: Applied rounded-pill style here
            <div key={module.id} className={`${containerBaseClasses} rounded-[600px]`}>
              <div className="flex-grow select-none">{module.title}</div>
              <Button variant="ghost" size="icon" onClick={() => handleDeleteModule(module.id)} className="text-[#566FE9] hover:text-red-500 hover:bg-red-50 w-8 h-8">
                <Trash2Icon className="w-5 h-5" />
              </Button>
            </div>
          ))}
          {/* MODIFICATION: Applied rounded-pill style here */}
          <div className={`${containerBaseClasses} rounded-[600px]`}>
            <Input
              placeholder="Add new concept"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddModule(); }}
              ref={inputRef}
              className="flex-grow border-0 p-0 h-auto bg-transparent focus:outline-none"
            />
            <Button onClick={() => {
              if (newModuleTitle.trim() === "") {
                inputRef.current?.focus();
              } else {
                handleAddModule();
              }
            }} size="icon" className="bg-[#E9EBFD] hover:bg-[#4a5fd1] w-8 h-8 flex-shrink-0 rounded-[600px]">
              <PlusIcon className="w-5 h-5 text-[#566FE9]" />
            </Button>
          </div>
        </div>
      </div>

      {/* --- Scope --- */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-gray-800">Scope</label>
        {/* MODIFICATION: Applied rounded-lg (12px) style here */}
        <div className={`${containerBaseClasses} rounded-lg`}>
            <Textarea
              placeholder="Define the in-scope and out-of-scope boundaries for this section..."
              value={section.scope}
              onChange={(e) => onUpdate(section.id, { scope: e.target.value })}
              className="w-full border-0 p-0 h-auto bg-transparent focus:outline-none min-h-[80px] resize-none"
            />
        </div>
      </div>
    </div>
  );
};