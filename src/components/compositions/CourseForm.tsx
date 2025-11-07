"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeftIcon, Trash2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

// --- State Management & API Hooks ---
import { useNewCourseStore } from "@/lib/newCourseStore";
import { useCourse } from "@/hooks/useApi";
import { useApiService } from "@/lib/api";

// --- UI Components ---
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import Sphere from "@/components/compositions/Sphere";
import Footer from "@/components/compositions/Footer";

// --- Helper component for dynamic input lists (No changes) ---
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
          <div key={index} className="flex items-center bg-white border border-[#c7ccf8] h-[50px] rounded-full ">
            <span className="flex-1 px-4 text-sm font-semibold text-[#394169]">{item}</span>
            <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full" onClick={() => handleRemoveItem(index)}>
              <Trash2Icon className="w-5 h-5 text-[#566fe9]" />
            </Button>
          </div>
        ))}
        <div className="flex items-center bg-white border border-[#c7ccf8] rounded-full ">
          <Input placeholder={placeholder} className="flex-1 h-[50px] border-0 bg-transparent px-4 text-sm font-semibold" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={handleKeyDown} />
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full" onClick={handleAddItem}>
            <PlusIcon className="w-5 h-5 text-[#566fe9]" />
          </Button>
        </div>
      </div>
    </div>
  );
};


// --- The Unified Form Component ---
export default function CourseForm({ courseId }: { courseId?: string }) {
  const router = useRouter();
  const api = useApiService();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!courseId;

  const [isSaving, setIsSaving] = useState(false);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const courseIdStr = courseId ?? '';
  const { data: existingCourse, isLoading: isLoadingCourse } = useCourse(courseIdStr, { enabled: isEditMode });
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBannerImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    if (isEditMode) {
      try {
        const cid = courseId as string;
        // In a real application, you would handle the bannerImage upload here
        // and get back a URL to save in the course details.
        await api.updateCourse(cid, formState);
        toast.success("Course updated successfully!");
        setTimeout(() => {
          router.push(`/courses/${cid}`);
        }, 3000);
      } catch (err) {
        toast.error(`Error: Could not update the course. ${(err as Error).message}`);
      } finally {
        setIsSaving(false);
      }
    } else {
      toast.loading("Creating your new course draft...");

      if (!globalState.title.trim()) {
        toast.dismiss();
        toast.error("A course title is required to create a draft.");
        setIsSaving(false);
        return;
      }

      try {
        // In a real application, you would handle the bannerImage upload here
        // and get back a URL to save in the course details.
        const coursePayload = {
          title: globalState.title,
          description: globalState.description,
          tags: globalState.tags,
          skills: globalState.skills,
          learningOutcomes: globalState.learningOutcomes,
          difficulty: globalState.difficulty,
          language: globalState.language,
        };

        const newCourse = await api.createCourse(coursePayload);

        if (!newCourse || !newCourse.id) {
          throw new Error("Course creation failed: No ID was returned from the server.");
        }

        toast.dismiss();
        toast.success("Draft created successfully! Let's build the curriculum.");

        useNewCourseStore.getState().reset();

        setTimeout(() => {
          router.push(`/courses/${newCourse.id}/edit`);
        }, 3000);

      } catch (err) {
        toast.dismiss();
        toast.error(`Error: Could not create the course. ${(err as Error).message}`);
        setIsSaving(false);
      }
    }
  };

  const handleDelete = async () => {
    if (isEditMode && courseId) {
      router.push(`/courses/${courseId}`);
      return;
    }
    router.back();
  };

  if (isEditMode && isLoadingCourse) {
    return <div className="p-8 text-center text-lg">Loading Course Settings...</div>;
  }

  return (
    <>
      <Sphere />
      <div className="w-full h-[90%] overflow-y-auto bg-transparent relative z-10 custom-scrollbar">
        <div className="max-w-4xl mx-auto px-6 py-8 pb-20">
          <div className="translate-y-[-1rem] animate-fade-in">
            <header className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="w-8 h-8 p-0.5"><ChevronLeftIcon className="w-6 h-6" /></Button>
              <nav className="flex items-center gap-2 text-sm font-semibold">
                <Link href="/teacher-dash" className="text-[#8187a0] hover:underline">Dashboard</Link>
                <span className="text-[#8187a0]">·</span>
                <span className="text-[#8187a0]">{isEditMode ? 'Settings' : 'Course Details'}</span>
              </nav>
            </header>
            <h1 className="text-xl font-bold text-[#394169] mb-6">{isEditMode ? 'Update Course Details' : 'Course Details'}</h1>
          </div>

          <Card className="border-[#c7ccf8] translate-y-[-1rem] animate-fade-in">
            <CardContent className="p-4 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#394169]">Course Title</label>
                <div className="flex items-center bg-white border border-[#c7ccf8] rounded-full p-0">
                  <Input
                    value={formState.title}
                    onChange={(e) => handleUpdateField('title', e.target.value)}
                    className={`flex-1 h-[50px] border-0 bg-transparent px-4`}
                    placeholder={"Enter course title"}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-auto h-10 rounded-full px-4"
                    onClick={() => handleUpdateField('title', '')}
                  >
                    <img src="/deleteIcon.png" alt="Clear title" className="w-5 h-5 mr-2" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#394169]">Course Banner</label>
                <div className="flex items-center bg-white border border-[#c7ccf8] rounded-full p-0">
                  <Input
                    readOnly
                    value={bannerImage ? bannerImage.name : "Upload Course Banner"}
                    className="flex-1 border-0 bg-transparent px-4 text-sm font-normal text-gray-500"
                    placeholder="Upload course banner"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-auto h-10 rounded-full px-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <img src="/Uploadimage.svg" alt="Upload" className="w-5 h-5 mr-2" />
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
                {preview && (
                  <div className="mt-4">
                    <img src={preview} alt="Banner Preview" className="w-full h-auto rounded-lg" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-[#394169]">Course Description</label>
                  <span className="text-xs font-medium text-[#8187a0]">{(formState.description?.length ?? 0)}/500</span>
                </div>
                <Textarea
                  value={formState.description}
                  onChange={(e) => handleUpdateField('description', (e.target.value || '').slice(0, 500))}
                  className="h-[100px] border-[1px] border-[#c7ccf8] bg-white px- rounded-[12px]"
                />
              </div>

              <DynamicInputList label="Course Highlights" placeholder="Add new highlight" items={formState.tags} onItemsChange={(items) => handleUpdateField('tags', items)} />

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#394169]">Select Course Difficulty</label>
                <div className="bg-white border border-[#c7ccf8] rounded-full p-1">
                  <ToggleGroup type="single" value={formState.difficulty} onValueChange={(val) => val && handleUpdateField('difficulty', val)} className="justify-start">
                    {[
                      { label: "Beginner", icon: "/BeginnerIcon.png" },
                      { label: "Intermediate", icon: "/IntermediateIcon.png" },
                      { label: "Expert", icon: "/AdvancedIcon.png" },
                    ].map(({ label, icon }) => (
                      <ToggleGroupItem key={label} value={label} className="w-[150px] h-[42px] rounded-full data-[state=on]:bg-[#e9ebfd] ">
                        <span className="flex items-center justify-center gap-2">
                          <img src={icon} alt={`${label} icon`} className="w-5 h-5" />
                          <span className="text-sm font-semibold text-[#566fe9]">{label}</span>
                        </span>
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>

              <DynamicInputList label="Learning Outcomes" placeholder="e.g., Learn fundamentals" items={formState.learningOutcomes} onItemsChange={(items) => handleUpdateField('learningOutcomes', items)} />
              <DynamicInputList label="Course Keywords (Skills)" placeholder="e.g., TensorFlow, NLP" items={formState.skills} onItemsChange={(items) => handleUpdateField('skills', items)} />

            </CardContent>
          </Card>

          <div className="h-full space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={handleDelete}
                className="w-full h-auto px-7 py-4 rounded-full border-1 border-[#566fe9] text-[#566fe9] hover:bg-[#e9ebfd] hover:text-[#566fe9]"
              >
                <span className="text-sm font-semibold">Delete Course</span>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full h-auto px-7 py-4 rounded-full border-1 border-[#566fe9] text-[#566fe9] hover:bg-[#e9ebfd] hover:text-[#566fe9]"
              >
                <Link href="/courses/new/preview" passHref>
                  <span className="text-sm font-semibold">Preview Course Details</span>
                </Link>
              </Button>
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full h-auto px-7 pt-4 py-4 rounded-full bg-[#566fe9] hover:bg-[#4557d2]">
              <span className="text-sm font-semibold text-white">{isSaving ? 'Saving...' : (isEditMode ? 'Update Course Details' : 'Update Course Details')}</span>
            </Button>
          </div>

        </div>

      </div>
      <Footer />
    </>
  );
}