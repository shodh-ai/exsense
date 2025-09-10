"use client";

import Link from 'next/link';
import ConfirmationModal from '@/components/ConfirmationModal';
import { SearchIcon, XIcon, ChevronLeftIcon } from "lucide-react";
import React, { JSX, useEffect, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { CurriculumSection, SectionData } from "@/components/CurriculumSection";
import Sphere from "@/components/Sphere";

import { useApiService } from "@/lib/api";
import { useCreateCourse } from "@/hooks/useApi";

const initialBackendData: SectionData[] = [
  {
    id: uuidv4(),
    title: "",
    description: "",
    modules: [],
    scope: "",
  },
];

type CirriculumEditorProps = {
  initialSections?: SectionData[];
  initialTitle?: string;
  initialDescription?: string;
  onFinalize?: (data: { title:string; description:string; sections: SectionData[] }) => Promise<void> | void;
  finalizeLabel?: string;
  // --- CHANGE 1: Add a new optional prop for the course ID ---
  courseId?: string; 
};

const CirriculumEditor = ({
  initialSections,
  initialTitle,
  initialDescription,
  onFinalize,
  finalizeLabel,
  // --- CHANGE 2: Receive the new courseId prop ---
  courseId,
}: CirriculumEditorProps): JSX.Element => {
  const router = useRouter();
  const api = useApiService();
  const createCourse = useCreateCourse();

  const [sections, setSections] = useState<SectionData[]>(initialSections && initialSections.length ? initialSections : initialBackendData);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sectionIdToDelete, setSectionIdToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (initialSections && initialSections.length) {
      const next = (initialTitle || initialDescription)
        ? initialSections.map((s, idx) => (
            idx === 0
              ? {
                  ...s,
                  title: initialTitle ?? s.title,
                  description: initialDescription ?? s.description,
                }
              : s
          ))
        : initialSections;
      setSections(next);
    } else if (initialTitle || initialDescription) {
      setSections([
        {
          id: uuidv4(),
          title: initialTitle || "",
          description: initialDescription || "",
          modules: [],
          scope: "",
        },
      ]);
    }
  }, [initialSections, initialTitle, initialDescription]);

  const handleAddSection = () => {
    const newSection: SectionData = { id: uuidv4(), title: "", description: "", modules: [], scope: "" };
    setSections(currentSections => [...currentSections, newSection]);
  };

  const handleRequestDelete = (idToDelete: string) => {
    if (sections.length <= 1) {
      return;
    }
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
        const created: any = await createCourse.mutateAsync({ title, description: description || undefined });
        const newCourseId: string | undefined = created?.id;
        if (!newCourseId) throw new Error('Course created, but no ID returned');
        for (const s of sections) {
          const lesson = await api.createLesson(newCourseId, {
            title: (s.title && s.title.trim()) || `Section`,
            description: s.description.trim() || undefined,
            content: JSON.stringify({ scope: s.scope ?? "" }),
          });
          for (const [j, m] of (s.modules || []).entries()) {
            await api.addLessonContent(lesson.id, {
              type: 'TEXT',
              title: m.title,
              text: m.title,
              content: JSON.stringify({ environment: m.environment || null }),
              order: j,
            } as any);
          }
        }
        router.push(`/teacher?courseId=${encodeURIComponent(newCourseId)}`);
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to finalize course');
    } finally {
      setSubmitting(false);
    }
  };

  const courseOverviewUrl = courseId 
    ? `/course/${courseId}` 
    : '/teacher/courses/new/details-form';

  return (
    <>
      <Sphere/>
      <div className="w-full h-[90%] bg-transparent flex flex-col relative">
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDeleteSection}
          title="Are you sure to delete section?"
          message="All progress in this session will be lost."
        />

        <Button variant="ghost" size="icon" className="absolute top-6 right-6 w-6 h-6 p-0 hover:bg-gray-100 z-20">
            <XIcon className="w-4 h-4" />
        </Button>

        <div className="w-full max-w-[850px] mx-auto flex flex-col h-full">
            <div className="px-4 flex-shrink-0">
                <div className="flex items-center pt-12 mb-4">
                    <Link href="/teacher-dash" className="p-2 -ml-2 text-gray-400 hover:text-gray-700">
                        <ChevronLeftIcon className="w-6 h-6" />
                    </Link>
                    <nav className="flex items-center text-sm" aria-label="Breadcrumb">
                        <Link href="/teacher-dash" className="text-gray-500 hover:text-gray-800 hover:underline">Dashboard</Link>
                        <span className="mx-2 text-gray-400">•</span>
                        <span className="font-medium text-gray-800">Curriculum Editor</span>
                    </nav>
                </div>
                <div className="flex flex-col items-start gap-6 relative self-stretch w-full pb-4">
                    <div className="relative self-stretch font-updated-title-2 font-[18px] font-bold">Curriculum Editor</div>
                    <div className="flex flex-wrap gap-[8px] w-full">
                        <Button variant="outline" className="flex-1 h-[50px] md:flex-initial md:w-auto px-7 py-4 rounded-[600px] border-[#566fe9] text-[#566fe9] hover:bg-[#566fe9] hover:text-white">Course Map</Button>
                        
                        {/* The Course Overview Button now uses a Link component and our dynamic URL */}
                        <Button asChild variant="outline" className="flex-1 h-[50px] md:flex-initial md:w-auto px-7 py-4 rounded-[600px] border-[#566fe9] text-[#566fe9] hover:bg-[#566fe9] hover:text-white">
                            <Link href={courseOverviewUrl}>Course Overview</Link>
                        </Button>

                        <div className="w-full order-last md:w-auto md:flex-1 md:order-none flex h-[50px] items-center pl-5 pr-0 py-1.5 relative bg-white rounded-[600px] border border-solid border-[#c7ccf8]">
                            <Input placeholder="Search for specific module" className="border-0 bg-transparent p-0 h-auto flex-grow placeholder:text-[#8187a0] focus-outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            <Button size="icon" className={`rounded-full flex-shrink-0 p-2.5 mr-1 h-[38px] w-[38px] transition-colors ${searchQuery ? "bg-[#566fe9]" : "bg-[#e6e8ff]"}`}>
                                <SearchIcon className={`w-5 h-5 transition-colors ${searchQuery ? "text-white" : "text-[#566fe9]"}`}/>
                            </Button>
                        </div>
                        <Button onClick={handleFinalize} disabled={submitting || createCourse.isPending} className="flex-1 h-[50px] md:flex-initial md:w-auto px-7 py-4 h-auto bg-[#566fe9] rounded-[600px] text-white hover:bg-[#4a5fd1]">
                            {submitting || createCourse.isPending ? 'Finalizing…' : (finalizeLabel || 'Finalize')}
                        </Button>
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
                        />
                    ))}
                    <Button onClick={handleAddSection} className="w-full h-auto px-7 py-4 bg-[#566fe9] hover:bg-[#4a5fd1] rounded-[600px] transition-colors" disabled={submitting}>
                        <span className="text-white">Add new section</span>
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default CirriculumEditor;