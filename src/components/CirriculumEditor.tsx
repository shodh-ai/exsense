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
import { toast } from 'sonner';

type CirriculumEditorProps = {
  initialSections?: SectionData[];
  // --- MODIFICATION: Remove initialTitle and initialDescription from props ---
  onSaveDraft?: (data: { sections: SectionData[] }) => Promise<void> | void;
  onPublish?: (data: { sections: SectionData[] }) => Promise<void> | void;
  isSaving?: boolean;
  isPublishing?: boolean;
  courseId?: string; 
};

const CirriculumEditor = ({
  initialSections,
  onSaveDraft,
  onPublish,
  isSaving,
  isPublishing,
  courseId,
}: CirriculumEditorProps): JSX.Element => {
  const router = useRouter();
  const [sections, setSections] = useState<SectionData[]>(initialSections && initialSections.length ? initialSections : [{ id: uuidv4(), title: "", description: "", scope: "", environment: null }]);
  const [searchQuery, setSearchQuery] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null); // This can be removed or kept for lesson title validation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sectionIdToDelete, setSectionIdToDelete] = useState<string | null>(null);

  // --- MODIFICATION: This effect is now simpler, it just sets the sections ---
  useEffect(() => {
    if (initialSections && initialSections.length > 0) {
        setSections(initialSections);
    }
  }, [initialSections]);

  const handleAddSection = () => {
    const newSection: SectionData = { id: uuidv4(), title: "", description: "", scope: "", environment: null };
    setSections(currentSections => [...currentSections, newSection]);
  };

  const handleRequestDelete = (idToDelete: string) => {
    // Keep a minimum of one lesson
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
    setSections(currentSections =>
      currentSections.map(section =>
        section.id === idToUpdate ? { ...section, ...updatedField } : section
      )
    );
  };

  // --- MODIFICATION: This function is simplified significantly ---
  const handleAction = (actionCallback?: (data: { sections: SectionData[] }) => void) => {
    if (isSaving || isPublishing) return;
    
    // Optional: You can add validation here to check if any lesson titles are empty.
    const anyEmptyTitles = sections.some(s => !s.title.trim());
    if (anyEmptyTitles) {
        toast.error("All lessons must have a title before saving.");
        return;
    }

    if (actionCallback) {
      // It now only passes the sections array up to the parent page.
      actionCallback({ sections });
    }
  };

  const courseDetailsUrl = courseId ? `/courses/${courseId}/settings` : '/courses/new/details-form';

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
                            <Link href={courseDetailsUrl}>Course Details</Link>
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
                            // --- MODIFICATION: titleError is no longer relevant for the main course title ---
                            // You could repurpose this to validate lesson titles if needed
                            titleError={null} 
                            courseId={courseId}
                        />
                    ))}
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
                                Add New Lesson
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
                </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default CirriculumEditor;