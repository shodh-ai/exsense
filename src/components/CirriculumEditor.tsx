"use client";

import Link from 'next/link';
import ConfirmationModal from '@/components/ConfirmationModal';
import { SearchIcon, XIcon, ChevronLeftIcon } from "lucide-react";
import React, { JSX, useEffect, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';

// --- UI Components & Types ---
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import Sphere from "@/components/Sphere";
import { CurriculumSection, SectionData } from "@/components/CurriculumSection";

type CirriculumEditorProps = {
  initialSections?: SectionData[];
  initialTitle?: string;
  initialDescription?: string;
  onSaveDraft?: (data: { title:string; description:string; sections: SectionData[] }) => Promise<void> | void;
  onPublish?: (data: { title:string; description:string; sections: SectionData[] }) => Promise<void> | void;
  isSaving?: boolean;
  isPublishing?: boolean;
  courseId?: string; 
};

const CirriculumEditor = ({
  initialSections,
  initialTitle,
  initialDescription,
  onSaveDraft,
  onPublish,
  isSaving,
  isPublishing,
  courseId,
}: CirriculumEditorProps): JSX.Element => {
  const router = useRouter();
  const [sections, setSections] = useState<SectionData[]>(initialSections && initialSections.length ? initialSections : [{ id: uuidv4(), title: "", description: "", modules: [], scope: "" }]);
  const [searchQuery, setSearchQuery] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sectionIdToDelete, setSectionIdToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (initialSections && initialSections.length > 0) {
        const firstSectionTitle = initialTitle === 'Untitled Course' ? '' : initialTitle;
        const updatedInitialSections = initialSections.map((s, i) => i === 0 ? { ...s, title: firstSectionTitle || s.title, description: initialDescription || s.description } : s);
        setSections(updatedInitialSections);
    }
  }, [initialSections, initialTitle, initialDescription]);

  const handleAddSection = () => {
    const newSection: SectionData = { id: uuidv4(), title: "", description: "", modules: [], scope: "" };
    setSections(currentSections => [...currentSections, newSection]);
  };

  const handleRequestDelete = (idToDelete: string) => {
    if (sections.length <= 1) return;
    setSectionIdToDelete(idToDelete);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSection = () => {
    if (!sectionIdToDelete) return;
    setSections(currentSections => currentSections.filter(section => section.id !== sectionIdToDelete));
    setIsDeleteModalOpen(false);
    setSectionIdToDelete(null);
  };

  const handleUpdateSection = (idToUpdate: string, updatedField: Partial<SectionData>) => {
    if (sections.length > 0 && sections[0].id === idToUpdate && 'title' in updatedField) {
        if (titleError) setTitleError(null);
    }
    setSections(currentSections =>
      currentSections.map(section =>
        section.id === idToUpdate ? { ...section, ...updatedField } : section
      )
    );
  };

  const handleAction = (actionCallback?: Function) => {
    if (isSaving || isPublishing) return;
    if (!sections.length || !sections[0].title.trim()) {
      setTitleError('A course title is required. Please set it in the first section.');
      return;
    }
    setTitleError(null);
    const title = sections[0].title.trim();
    const description = sections[0].description.trim() || "";
    
    if (actionCallback) {
      actionCallback({ title, description, sections });
    }
  };

  const courseOverviewUrl = courseId ? `/courses/${courseId}` : '/courses/new/details-form';

  return (
    <>
      <Sphere/>
      <div className="w-full h-[90%] bg-transparent flex flex-col relative custom=scrollbar">
        <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDeleteSection} title="Are you sure?" message="This action cannot be undone." />
        <Button variant="ghost" size="icon" className="absolute top-6 right-6 w-6 h-6 p-0 hover:bg-gray-100 z-20"><XIcon className="w-4 h-4" /></Button>

        <div className="w-full max-w-[850px] mx-auto flex flex-col h-full">
            <div className="px-4 flex-shrink-0">
                <div className="flex items-center pt-12 mb-4">
                    <Link href="/teacher-dash" className="p-2 -ml-2 text-gray-400 hover:text-gray-700"><ChevronLeftIcon className="w-6 h-6" /></Link>
                    <nav className="flex items-center text-sm" aria-label="Breadcrumb"><Link href="/teacher-dash" className="text-gray-500 hover:text-gray-800 hover:underline">Dashboard</Link><span className="mx-2 text-gray-400">•</span><span className="font-medium text-gray-800">Curriculum Editor</span></nav>
                </div>
                <div className="flex flex-col items-start gap-6 relative self-stretch w-full pb-4">
                    <div className="relative self-stretch font-updated-title-2 font-[18px] font-bold">Curriculum Editor</div>
                    <div className="flex flex-wrap gap-[8px] w-full">
                        <Button variant="outline" className="flex-1 h-[50px] md:flex-initial md:w-auto px-7 py-4 rounded-[600px] border-[#566fe9] text-[#566fe9] hover:bg-[#566fe9] hover:text-white">Course Map</Button>
                        <Button asChild variant="outline" className="flex-1 h-[50px] md:flex-initial md:w-auto px-7 py-4 rounded-[600px] border-[#566fe9] text-[#566fe9] hover:bg-[#566fe9] hover:text-white">
                            <Link href={courseOverviewUrl}>Course Details</Link>
                        </Button>
                        <div className="w-full order-last md:w-auto md:flex-1 md:order-none flex h-[50px] items-center pl-5 pr-0 py-1.5 relative bg-white rounded-[600px] border border-solid border-[#c7ccf8]">
                            <Input placeholder="Search..." className="border-0 bg-transparent p-0 h-auto flex-grow placeholder:text-[#8187a0] focus-outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            <Button size="icon" className={`rounded-full flex-shrink-0 p-2.5 mr-1 h-[38px] w-[38px] transition-colors ${searchQuery ? "bg-[#566fe9]" : "bg-[#e6e8ff]"}`}><SearchIcon className={`w-5 h-5 transition-colors ${searchQuery ? "text-white" : "text-[#566fe9]"}`}/></Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-12 custom-scrollbar">
                <div className="flex flex-col gap-4">
                    {sections.map((section, index) => (
                        <CurriculumSection
                            key={section.id}
                            section={section}
                            onUpdate={handleUpdateSection}
                            onDelete={handleRequestDelete}
                            titleError={index === 0 ? titleError : null}
                            courseId={courseId}
                        />
                    ))}

                    {/* --- THIS IS THE FINAL, CORRECTED BUTTON LAYOUT --- */}
                    <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Button 
                                onClick={() => handleAction(onSaveDraft)} 
                                disabled={isSaving || isPublishing} 
                                variant="outline" 
                                className="w-full h-12 rounded-full border-2 border-[#E9EBFD] bg-white px-8 py-3 font-semibold text-[#394169] hover:bg-[#F6F6FE]"
                            >
                                {isSaving ? 'Saving…' : 'Save Progress'}
                            </Button>
                            <Button 
                                onClick={handleAddSection} 
                                disabled={isSaving || isPublishing}
                                variant="outline"
                                className="w-full h-12 rounded-full border-2 border-[#E9EBFD] bg-white px-8 py-3 font-semibold text-[#394169] hover:bg-[#F6F6FE]"
                            >
                                Add New Section
                            </Button>
                        </div>
                        <Button 
                            onClick={() => handleAction(onPublish)} 
                            disabled={isSaving || isPublishing} 
                            className="w-full h-12 rounded-full bg-[#566fe9] text-white font-semibold hover:bg-[#4a5fd1]"
                        >
                            {isPublishing ? 'Publishing…' : 'Publish Course'}
                        </Button>
                    </div>
                    {/* --- END OF CORRECTED BUTTON LAYOUT --- */}
                </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default CirriculumEditor;