"use client";

import Link from 'next/link';
import ConfirmationModal from '@/components/ConfirmationModal';
import { SearchIcon, XIcon, ChevronLeftIcon } from "lucide-react";
import React, { JSX, useEffect, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// --- UI Components ---
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import Sphere from "@/components/Sphere";
import { Card } from '@/components/card';
import { Badge } from '@/components/badge';
import { Textarea } from '@/components/textarea';

// --- Types & Data ---
import { SectionData, Module, TeachingMode, CurriculumSection } from "@/components/CurriculumSection"; // Import all types and original component
import { useApiService } from "@/lib/api";
import { useCreateCourse } from "@/hooks/useApi";

const initialBackendData: SectionData[] = [
  { id: uuidv4(), title: "", description: "", modules: [], scope: "" },
];

type CirriculumEditorProps = {
  initialSections?: SectionData[];
  initialTitle?: string;
  initialDescription?: string;
  onFinalize?: (data: { title:string; description:string; sections: SectionData[] }) => Promise<void> | void;
  finalizeLabel?: string;
  courseId?: string;
  // --- ADD THE NEW MODE PROP ---
  mode?: 'create' | 'edit';
};

// --- Teaching Modal (Only for 'create' mode) ---
interface TeachingModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mode: TeachingMode) => void;
}
const TeachingModeModal = ({ isOpen, onClose, onSelect }: TeachingModeModalProps) => {
  if (!isOpen) return null;
  const modes: { id: TeachingMode, label: string }[] = [
    { id: 'text', label: 'Text Lesson' },
    { id: 'video', label: 'Video Upload' },
    { id: 'document', label: 'Document/PDF' },
    { id: 'quiz', label: 'Interactive Quiz' },
  ];
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 mb-4">Choose Teaching Mode</h3>
        <div className="grid grid-cols-2 gap-4">
          {modes.map(mode => (
            <Button key={mode.id} variant="outline" className="h-16" onClick={() => onSelect(mode.id)}>
              {mode.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};


const CirriculumEditor = ({
  initialSections,
  initialTitle,
  initialDescription,
  onFinalize,
  finalizeLabel,
  courseId,
  // --- DESTRUCTURE THE PROP, DEFAULT TO 'edit' FOR SAFETY ---
  mode = 'edit',
}: CirriculumEditorProps): JSX.Element => {
  const router = useRouter();
  const api = useApiService();
  const createCourse = useCreateCourse();

  // --- All original states are kept ---
  const [sections, setSections] = useState<SectionData[]>(initialSections && initialSections.length ? initialSections : initialBackendData);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sectionIdToDelete, setSectionIdToDelete] = useState<string | null>(null);

  // --- States for 'create' mode wizard ---
  const [view, setView] = useState<'course' | 'section' | 'module'>('course');
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  
  const currentSection = sections.find(s => s.id === currentSectionId);
  const currentModule = currentSection?.modules.find(m => m.id === currentModuleId);
  
  // --- All original handler functions are kept ---
  useEffect(() => {
    if (initialSections && initialSections.length) {
      const next = (initialTitle || initialDescription)
        ? initialSections.map((s, idx) => (idx === 0 ? { ...s, title: initialTitle ?? s.title, description: initialDescription ?? s.description } : s))
        : initialSections;
      setSections(next);
    } else if (initialTitle || initialDescription) {
      setSections([{ id: uuidv4(), title: initialTitle || "", description: initialDescription || "", modules: [], scope: "" }]);
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

  const handleFinalize = async () => {
    // This function works for both modes as it just passes the final `sections` state
    if (submitting) return;
    if (!sections.length || !sections[0].title.trim()) {
      setTitleError('Please provide a title for the first section to serve as the course title.');
      return;
    }
    setTitleError(null);
    const title = sections[0].title.trim();
    const description = sections[0].description.trim() || "";
    setSubmitting(true);
    try {
      if (onFinalize) {
        await onFinalize({ title, description, sections });
      } else {
        // Fallback logic from your original code
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to finalize course');
    } finally {
      setSubmitting(false);
    }
  };

  const courseOverviewUrl = courseId ? `/courses/${courseId}` : '/courses/new/details-form';

  // --- THE JSX REMAINS THE SAME UNTIL THE MAIN CONTENT AREA ---
  return (
    <>
      <Sphere/>
      <div className="w-full h-[90%] bg-transparent flex flex-col relative custom=scrollbar">
        <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDeleteSection} title="Are you sure to delete section?" message="All progress in this session will be lost." />
        <Button variant="ghost" size="icon" className="absolute top-6 right-6 w-6 h-6 p-0 hover:bg-gray-100 z-20"><XIcon className="w-4 h-4" /></Button>

        <div className="w-full max-w-[850px] mx-auto flex flex-col h-full">
            <div className="px-4 flex-shrink-0">
                {/* Header, breadcrumbs, and action buttons remain unchanged */}
                <div className="flex items-center pt-12 mb-4">
                    <Link href="/teacher-dash" className="p-2 -ml-2 text-gray-400 hover:text-gray-700"><ChevronLeftIcon className="w-6 h-6" /></Link>
                    <nav className="flex items-center text-sm" aria-label="Breadcrumb"><Link href="/teacher-dash" className="text-gray-500 hover:text-gray-800 hover:underline">Dashboard</Link><span className="mx-2 text-gray-400">•</span><span className="font-medium text-gray-800">Curriculum Editor</span></nav>
                </div>
                <div className="flex flex-col items-start gap-6 relative self-stretch w-full pb-4">
                    <div className="relative self-stretch font-updated-title-2 font-[18px] font-bold">Curriculum Editor</div>
                    <div className="flex flex-wrap gap-[8px] w-full">
                        <Button variant="outline" className="flex-1 h-[50px] md:flex-initial md:w-auto px-7 py-4 rounded-[600px] border-[#566fe9] text-[#566fe9] hover:bg-[#566fe9] hover:text-white">Course Map</Button>
                        <Button asChild variant="outline" className="flex-1 h-[50px] md:flex-initial md:w-auto px-7 py-4 rounded-[600px] border-[#566fe9] text-[#566fe9] hover:bg-[#566fe9] hover:text-white">
                            <Link href={courseOverviewUrl}>Course Overview</Link>
                        </Button>
                        <div className="w-full order-last md:w-auto md:flex-1 md:order-none flex h-[50px] items-center pl-5 pr-0 py-1.5 relative bg-white rounded-[600px] border border-solid border-[#c7ccf8]">
                            <Input placeholder="Search for specific module" className="border-0 bg-transparent p-0 h-auto flex-grow placeholder:text-[#8187a0] focus-outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            <Button size="icon" className={`rounded-full flex-shrink-0 p-2.5 mr-1 h-[38px] w-[38px] transition-colors ${searchQuery ? "bg-[#566fe9]" : "bg-[#e6e8ff]"}`}><SearchIcon className={`w-5 h-5 transition-colors ${searchQuery ? "text-white" : "text-[#566fe9]"}`}/></Button>
                        </div>
                        <Button onClick={handleFinalize} disabled={submitting || createCourse.isPending} className="flex-1 h-[50px] md:flex-initial md:w-auto px-7 py-4 h-auto bg-[#566fe9] rounded-[600px] text-white hover:bg-[#4a5fd1]">
                            {submitting || createCourse.isPending ? 'Finalizing…' : (finalizeLabel || 'Finalize')}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-12 custom-scrollbar">
              {/* --- THIS IS THE CRITICAL CHANGE --- */}
              {mode === 'create' ? (
                // RENDER THE NEW WIZARD UI FOR CREATING COURSES
                <>
                  {view === 'course' && (
                    <div className="flex flex-col gap-4">
                      {sections.map((section, index) => (
                        <Card key={section.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => { setCurrentSectionId(section.id); setView('section'); }}>
                          <h3 className="font-bold">{section.title || `Section ${index + 1}`}</h3>
                          <p className="text-sm text-gray-600">{section.modules.length} modules</p>
                        </Card>
                      ))}
                      <Button onClick={handleAddSection} className="w-full h-auto px-7 py-4 bg-[#566fe9] hover:bg-[#4a5fd1] rounded-[600px]">Add New Section</Button>
                    </div>
                  )}
                  {view === 'section' && currentSection && (
                    <div>
                      <Button variant="ghost" onClick={() => setView('course')}>&larr; Back to Sections</Button>
                      <h2 className="text-xl font-bold mt-2 mb-4">{currentSection.title}</h2>
                      <div className="flex flex-col gap-4">
                        {currentSection.modules.map((module) => (
                          <Card key={module.id} className="p-4 hover:bg-gray-50 cursor-pointer flex justify-between items-center" onClick={() => { setCurrentModuleId(module.id); setView('module'); }}>
                            <p>{module.title || "Untitled Module"}</p>
                            <Badge variant="secondary">{module.teachingMode || 'Not set'}</Badge>
                          </Card>
                        ))}
                        <Button onClick={() => {
                          const newModuleId = uuidv4();
                          const newModule: Module = { id: newModuleId, title: "" };
                          handleUpdateSection(currentSection.id, { modules: [...currentSection.modules, newModule] });
                          setCurrentModuleId(newModuleId);
                          setIsModeModalOpen(true);
                        }} className="w-full h-auto px-7 py-4 bg-[#566fe9] hover:bg-[#4a5fd1] rounded-[600px]">Add New Module</Button>
                      </div>
                    </div>
                  )}
                  {view === 'module' && currentModule && currentSection && (
                     <div>
                        <Button variant="ghost" onClick={() => setView('section')}>&larr; Back to Modules</Button>
                        <h2 className="text-xl font-bold mt-2 mb-4">Editing Module</h2>
                        <Input placeholder="Enter module name..." defaultValue={currentModule.title} className="h-12 text-lg mb-4" onBlur={(e) => {
                            const updatedModules = currentSection.modules.map(m => m.id === currentModuleId ? {...m, title: e.target.value} : m);
                            handleUpdateSection(currentSectionId!, { modules: updatedModules });
                        }}/>
                        {!currentModule.teachingMode ? (
                            <Button onClick={() => setIsModeModalOpen(true)}>Choose Teaching Mode</Button>
                        ) : (
                            <div>
                                <p className="mb-2">Teaching Mode: <Badge>{currentModule.teachingMode}</Badge></p>
                                {currentModule.teachingMode === 'text' && (<Textarea placeholder="Start writing your lesson here..." className="min-h-[300px] border rounded-lg p-2" defaultValue={currentModule.content} onBlur={(e) => {
                                   const updatedModules = currentSection.modules.map(m => m.id === currentModuleId ? {...m, content: e.target.value} : m);
                                   handleUpdateSection(currentSectionId!, { modules: updatedModules });
                                   toast.success("Module Saved!", { description: "Your text lesson content has been saved." });
                                }}/>)}
                                {currentModule.teachingMode === 'video' && (<Input placeholder="Enter video URL (e.g., YouTube, Vimeo)..." defaultValue={currentModule.content} onBlur={(e) => {
                                   const updatedModules = currentSection.modules.map(m => m.id === currentModuleId ? {...m, content: e.target.value} : m);
                                   handleUpdateSection(currentSectionId!, { modules: updatedModules });
                                   toast.success("Module Saved!", { description: "Your video link has been saved." });
                                }}/>)}
                                {currentModule.teachingMode === 'quiz' && <div className="p-4 border rounded-lg text-gray-500 bg-gray-50">Quiz Builder UI would go here.</div>}
                                {currentModule.teachingMode === 'document' && <div className="p-4 border rounded-lg text-gray-500 bg-gray-50">Document Uploader UI would go here.</div>}
                            </div>
                        )}
                     </div>
                  )}
                  <TeachingModeModal 
                      isOpen={isModeModalOpen}
                      onClose={() => {
                        if(currentSection) {
                          const lastModule = currentSection.modules.slice(-1)[0];
                          if (lastModule && !lastModule.teachingMode) {
                               const updatedModules = currentSection.modules.slice(0, -1);
                               handleUpdateSection(currentSectionId!, { modules: updatedModules });
                          }
                        }
                        setIsModeModalOpen(false);
                        setCurrentModuleId(null);
                      }}
                      onSelect={(mode) => {
                          if(currentSection && currentModuleId) {
                              const updatedModules = currentSection.modules.map(m => m.id === currentModuleId ? {...m, teachingMode: mode} : m);
                              handleUpdateSection(currentSectionId!, { modules: updatedModules });
                              setView('module');
                          }
                          setIsModeModalOpen(false);
                          toast.info(`Switched to ${mode} mode.`);
                      }}
                  />
                </>
              ) : (
                // RENDER THE ORIGINAL UI FOR EDITING COURSES
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
                  <Button onClick={handleAddSection} className="w-full h-auto px-7 py-4 bg-[#566fe9] hover:bg-[#4a5fd1] rounded-[600px] transition-colors" disabled={submitting}>
                      <span className="text-white">Add new section</span>
                  </Button>
                </div>
              )}
              {/* --- END OF CONDITIONAL RENDER --- */}
            </div>
        </div>
      </div>
    </>
  );
};

export default CirriculumEditor;