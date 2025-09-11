"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeftIcon, PlusIcon, Trash2Icon } from "lucide-react";

// --- State Management & API Hooks ---
import { useNewCourseStore } from "@/lib/newCourseStore"; // Adjust import path
import { useCourse } from "@/hooks/useApi";
import { useApiService } from "@/lib/api";

// --- UI Components ---
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/toggle-group";
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";

// --- Helper component for dynamic input lists (No changes here) ---
interface DynamicInputListProps {
  label: string;
  placeholder: string;
  items: string[];
  onItemsChange: (items: string[]) => void;
}
const DynamicInputList: React.FC<DynamicInputListProps> = ({ label, placeholder, items, onItemsChange }) => {
  const [newItem, setNewItem] = useState("");
  const handleAddItem = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      onItemsChange([...items, newItem.trim()]);
      setNewItem("");
    }
  };
  const handleRemoveItem = (index: number) => onItemsChange(items.filter((_, i) => i !== index));
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); }
  };
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-[#394169]">{label}</label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center bg-white border border-[#c7ccf8] rounded-full p-1">
            <span className="flex-1 px-4 text-sm font-semibold text-[#394169]">{item}</span>
            <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full" onClick={() => handleRemoveItem(index)}>
              <Trash2Icon className="w-5 h-5" />
            </Button>
          </div>
        ))}
        <div className="flex items-center bg-white border border-[#c7ccf8] rounded-full p-1">
          <Input placeholder={placeholder} className="flex-1 border-0 bg-transparent px-4 text-sm font-semibold" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={handleKeyDown} />
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full" onClick={handleAddItem}><PlusIcon className="w-5 h-5" /></Button>
        </div>
      </div>
    </div>
  );
};


// --- The Unified Form Component ---
export default function CourseForm({ courseId }: { courseId?: string }) {
  const router = useRouter();
  const api = useApiService();
  
  const isEditMode = !!courseId;

  // --- State Setup (No changes in logic) ---
  const [isSaving, setIsSaving] = useState(false);
  const { data: existingCourse, isLoading: isLoadingCourse } = useCourse(courseId, { enabled: isEditMode });
  const [localState, setLocalState] = useState({ title: "", description: "", tags: [] as string[], skills: [] as string[], learningOutcomes: [] as string[], difficulty: "Intermediate" });
  const { setData: setGlobalData, ...globalState } = useNewCourseStore();

  useEffect(() => {
    if (isEditMode && existingCourse) {
      setLocalState({
        title: existingCourse.title || "",
        description: existingCourse.description || "",
        tags: existingCourse.tags || [],
        skills: existingCourse.skills || [],
        learningOutcomes: existingCourse.learningOutcomes || [],
        difficulty: existingCourse.difficulty || "Intermediate",
      });
    }
  }, [existingCourse, isEditMode]);

  const formState = isEditMode ? localState : globalState;
  

  const handleUpdateField = (field: keyof typeof formState, value: any) => {
    if (isEditMode) {
      setLocalState(prevState => ({ ...prevState, [field]: value }));
    } else {
      setGlobalData({ [field]: value });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
  
    if (isEditMode) {
      try {
        await api.updateCourse(courseId, formState);
        alert("Course updated successfully!");
        router.push(`/courses/${courseId}`);
      } catch (err) {
        alert(`Error: Could not update the course. ${(err as Error).message}`);
        setIsSaving(false);
      }
    } else {
      router.back();
    }
  };
  
  if (isEditMode && isLoadingCourse) {
    return <div className="p-8 text-center text-lg">Loading Course Settings...</div>;
  }

  // --- CORRECTED JSX RETURN ---
  return (
    <>
      <Sphere />
      {/*
        LAYOUT FIX: This is now a simple content wrapper. The `min-h-screen`, `flex`, and `<main>`
        tags have been removed to prevent conflicts with the main `layout.tsx`.
      */}
      <div className="w-full h-[87%] overflow-y-auto bg-transparent relative z-10">
        {/*
          LAYOUT FIX: This `div` with `mx-auto` is the content block that will be
          correctly centered by the parent layout.
        */}
        <div className="max-w-4xl mx-auto px-6 py-8 pb-20">
          <div className="translate-y-[-1rem] animate-fade-in">
            <header className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="w-8 h-8 p-0.5"><ChevronLeftIcon className="w-6 h-6" /></Button>
              <nav className="flex items-center gap-2 text-sm font-semibold">
                <Link href="/teacher-dash" className="text-[#8187a0] hover:underline">Dashboard</Link>
                <span className="text-[#8187a0]">·</span>
                <Link href={isEditMode ? `/courses/${courseId}` : "/courses/new"} className="text-[#8187a0] hover:underline">{isEditMode ? 'Course Overview' : 'Curriculum Editor'}</Link>
                <span className="text-[#8187a0]">·</span>
                <span className="text-[#394169]">{isEditMode ? 'Settings' : 'Course Details'}</span>
              </nav>
            </header>
            <h1 className="text-xl font-bold text-[#394169] mb-6">{isEditMode ? 'Update Course Details' : 'Add Course Details'}</h1>
          </div>

          <Card className="border-[#c7ccf8] translate-y-[-1rem] animate-fade-in">
            <CardContent className="p-4 space-y-5">
              {/* Title and Description */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#394169]">Course Title</label>
                <Input readOnly={!isEditMode && !!globalState.title} value={formState.title} onChange={(e) => handleUpdateField('title', e.target.value)} className={`h-[46px] rounded-full border border-[#c7ccf8] bg-white px-4 ${!isEditMode && 'bg-gray-50 text-gray-500'}`} placeholder={!isEditMode ? "Set in Curriculum Editor" : "Enter course title"}/>
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#394169]">Course Description</label>
                  <Textarea value={formState.description} onChange={(e) => handleUpdateField('description', e.target.value)} className="min-h-[100px] border-[#c7ccf8] rounded-xl" />
              </div>
              
              {/* Dynamic Lists */}
              <DynamicInputList label="Course Highlights (Tags)" placeholder="Add new highlight" items={formState.tags} onItemsChange={(items) => handleUpdateField('tags', items)} />
              <DynamicInputList label="Learning Outcomes" placeholder="e.g., Learn fundamentals" items={formState.learningOutcomes} onItemsChange={(items) => handleUpdateField('learningOutcomes', items)} />
              <DynamicInputList label="Course Keywords (Skills)" placeholder="e.g., TensorFlow, NLP" items={formState.skills} onItemsChange={(items) => handleUpdateField('skills', items)} />

              {/* Difficulty Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#394169]">Select Course Difficulty</label>
                <div className="bg-white border border-[#c7ccf8] rounded-full p-1">
                  <ToggleGroup type="single" value={formState.difficulty} onValueChange={(val) => val && handleUpdateField('difficulty', val)} className="justify-start">
                    {["Beginner", "Intermediate", "Advanced"].map(level => (
                      <ToggleGroupItem key={level} value={level} className="w-[150px] h-[42px] rounded-full data-[state=on]:bg-[#e9ebfd]"><span className="text-sm font-semibold text-[#566fe9]">{level}</span></ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>

            </CardContent>
          </Card>

          <div className="space-y-4 mt-6">
            <Button onClick={handleSave} disabled={isSaving} className="w-full h-auto px-7 py-4 rounded-full bg-[#566fe9] hover:bg-[#4557d2]">
              <span className="text-sm font-semibold text-white">{isSaving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Save & Return to Editor')}</span>
            </Button>
          </div>
        </div>
        
        {/* The Footer naturally follows the main content block */}
       
      </div>
      <Footer />
    </>
  );
}