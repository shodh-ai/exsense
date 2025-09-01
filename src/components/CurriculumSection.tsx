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

  return (
    <div className="w-full bg-[#fbfbfe] border border-gray-200 rounded-2xl p-4 space-y-[20px]">
      {/* --- Section Title --- */}
      <div className="space-y-[20px]" >
        <label className="text-sm font-semibold text-[#394169]">Section Title</label>
        <div className="mt-2 flex items-center w-full bg-white border border-gray-200 p-3 pr-[5px] gap-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200 rounded-[600px] h-[50px]">
          <Input
            placeholder="e.g., Introduction to Python"
            value={section.title}
            onChange={(e) => onUpdate(section.id, { title: e.target.value })}
            className="flex-grow border-0 h-auto bg-transparent focus:outline-none text-sm font-semibold"
          />
          <Button variant="ghost" size="icon" onClick={() => onDelete(section.id)} className="text-[#566FE9] hover:text-red-500 hover:bg-red-50 w-10 h-10 rounded-[100px]">
            <Trash2Icon className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* --- Section Description --- */}
      <div className="space-y-[20px]">
        <label className="text-sm font-semibold text-[#394169]">Section Description</label>
        <div className="mt-2 flex items-center w-full bg-white border border-gray-200 p-3 pr-[5px] gap-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200 rounded-[12px]">
            <Textarea
              placeholder="Provide a detailed description of this course section..."
              value={section.description}
              onChange={(e) => onUpdate(section.id, { description: e.target.value })}
              className="w-full border-0 p-0 h-auto bg-transparent focus:outline-none min-h-[80px] resize-none text-sm font-semibold pl-[8px]"
            />
        </div>
      </div>

      {/* --- Modules --- */}
      <div className="space-y-[20px]">
        <label className="text-sm font-semibold text-[#394169]">Modules</label>
        <div className="mt-2 space-y-[8px]">
          {section.modules.map(module => (
            <div key={module.id} className="flex items-center w-full bg-white border border-gray-200 p-3 pr-[5px] gap-2 transition-all duration-200 rounded-[600px] h-[50px]">
              <div className="flex-grow select-none text-sm font-semibold p-[16px]">{module.title}</div>
              <Button variant="ghost" size="icon" onClick={() => handleDeleteModule(module.id)} className="text-[#566FE9] hover:text-red-500 hover:bg-red-50 w-10 h-10  rounded-[100px]">
                <Trash2Icon className="w-5 h-5" />
              </Button>
            </div>
          ))}
          <div className="flex items-center w-full bg-white border border-gray-200 p-2 pr-[5px] gap-2 focus-within:ring-2 focus-outline-none transition-all duration-200 rounded-[600px] h-[50px]">
            <Input
              placeholder="Add new concept"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddModule(); }}
              ref={inputRef}
              className="flex-grow border-0 p-0 pl-[16px] h-auto bg-transparent focus:outline-none text-sm font-semibold"
            />
            {/* MODIFICATION START */}
            <Button onClick={() => {
              if (newModuleTitle.trim() === "") {
                inputRef.current?.focus();
              } else {
                handleAddModule();
              }
            }} size="icon" className="group bg-[#E9EBFD] hover:bg-[#4a5fd1] w-10 h-10 flex-shrink-0 rounded-[600px]">
              <PlusIcon className="w-5 h-5 text-[#566FE9] group-hover:text-white" />
            </Button>
            {/* MODIFICATION END */}
          </div>
        </div>
      </div>

      {/* --- Scope --- */}
      <div className="space-y-[20px]">
        <label className="text-sm font-semibold text-[#394169]">Scope</label>
        <div className="mt-2 flex items-center w-full bg-white border border-gray-200 p-3 pr-[5px] gap-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200 rounded-[12px]">
            <Textarea
              placeholder="Define the in-scope and out-of-scope boundaries for this section..."
              value={section.scope}
              onChange={(e) => onUpdate(section.id, { scope: e.target.value })}
              className="w-full border-0 p-0 pl-[8px] h-auto bg-transparent focus:outline-none min-h-[80px] resize-none text-sm font-semibold"
            />
        </div>
      </div>
    </div>
  );
};