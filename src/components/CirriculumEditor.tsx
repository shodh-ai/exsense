"use client";

import { SearchIcon, XIcon } from "lucide-react";
import React, { JSX, useEffect, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { CurriculumSection, SectionData } from "@/components/CurriculumSection"; 
import Sphere from "@/components/Sphere";
import Footer from "@/components/Footer";
import { useApiService } from "@/lib/api";
import { useCreateCourse } from "@/hooks/useApi";

const initialBackendData: SectionData[] = [
  {
    id: uuidv4(),
    title: "CSS Styling Techniques",
    description:
      "Dive into the world of CSS and discover how to transform your web pages into visually stunning experiences. This comprehensive course covers essential CSS concepts such as selectors, properties, and values. You'll learn to style HTML elements effectively and utilize advanced layout techniques like Flexbox and Grid to create responsive designs that captivate users.",
    modules: [
        { id: uuidv4(), title: "Understanding CSS Selectors" },
        { id: uuidv4(), title: "Creating Adaptive Designs" },
    ],
    scope:
      "This course is dedicated to mastering CSS, a vital skill for aspiring web developers. While we will touch on animations, our main focus is on the diverse styling techniques available in CSS. You will explore selectors, properties, and the effective application of styles to HTML elements, including a deep dive into the box model and layout strategies.",
  },
];

type CirriculumEditorProps = {
  initialSections?: SectionData[];
  initialTitle?: string;
  initialDescription?: string;
  onFinalize?: (data: { title: string; description: string; sections: SectionData[] }) => Promise<void> | void;
  finalizeLabel?: string;
};

const CirriculumEditor = ({
  initialSections,
  initialTitle,
  initialDescription,
  onFinalize,
  finalizeLabel,
}: CirriculumEditorProps): JSX.Element => {
  const router = useRouter();
  const api = useApiService();
  const createCourse = useCreateCourse();

  const [sections, setSections] = useState<SectionData[]>(initialSections && initialSections.length ? initialSections : initialBackendData);
  const [searchQuery, setSearchQuery] = useState("");
  const [courseTitle, setCourseTitle] = useState(initialTitle || "");
  const [courseDescription, setCourseDescription] = useState(initialDescription || "");
  const [submitting, setSubmitting] = useState(false);

  // Hydrate state when initial props arrive/update (e.g., edit mode after fetch)
  useEffect(() => {
    if (initialSections && initialSections.length) setSections(initialSections);
  }, [initialSections]);
  useEffect(() => { if (typeof initialTitle === 'string') setCourseTitle(initialTitle); }, [initialTitle]);
  useEffect(() => { if (typeof initialDescription === 'string') setCourseDescription(initialDescription); }, [initialDescription]);

  const handleAddSection = () => {
    const newSection: SectionData = {
      id: uuidv4(),
      title: "",
      description: "",
      modules: [],
      scope: "",
    };
    setSections(currentSections => [...currentSections, newSection]);
  };
  
  const handleDeleteSection = (idToDelete: string) => {
    setSections(currentSections => currentSections.filter(section => section.id !== idToDelete));
  };

  const handleUpdateSection = (idToUpdate: string, updatedField: Partial<SectionData>) => {
    setSections(currentSections => 
      currentSections.map(section => 
        section.id === idToUpdate ? { ...section, ...updatedField } : section
      )
    );
  };

  const handleFinalize = async () => {
    if (submitting) return;
    const title = courseTitle.trim();
    if (!title) {
      // Basic guard; the mutation hook will also surface errors
      alert('Please provide a Course Title');
      return;
    }

    setSubmitting(true);
    try {
      if (onFinalize) {
        // Delegate save to parent (edit mode)
        await onFinalize({ title, description: courseDescription, sections });
      } else {
        // Default: create course flow
        // 1) Create Course
        const created: any = await createCourse.mutateAsync({
          title,
          description: courseDescription.trim() || undefined,
        });
        const courseId: string | undefined = created?.id;
        if (!courseId) throw new Error('Course created, but no ID returned');

        // 2) Persist Sections as Lessons (with scope in content JSON)
        for (let i = 0; i < sections.length; i++) {
          const s = sections[i];
          const lesson = await api.createLesson(courseId, {
            title: (s.title && s.title.trim()) || `Section ${i + 1}`,
            description: s.description?.trim() || undefined,
            content: JSON.stringify({ scope: s.scope ?? "" }),
          });

          // 3) Persist Modules as Lesson Contents
          for (let j = 0; j < (s.modules?.length || 0); j++) {
            const m = s.modules[j];
            await api.addLessonContent(lesson.id, {
              type: 'TEXT',
              title: m.title,
              text: m.title,
              order: j,
            } as any);
          }
        }

        // 4) Navigate to Teacher page for the new course
        router.push(`/teacher?courseId=${encodeURIComponent(courseId)}`);
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to finalize course');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Sphere/>
      
      <div className="w-full h-[90%] bg-transparent overflow-y-auto relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 right-6 w-6 h-6 p-0 hover:bg-gray-100"
        >
          <XIcon className="w-4 h-4" />
        </Button>

        <div className="flex flex-col w-full max-w-[850px] mx-auto gap-4 pt-20 px-4 pb-32">
          {/* Course Meta */}
          <div className="w-full bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-800">Course Title</label>
              <div className="flex items-center w-full bg-white border border-gray-200 p-3 gap-2 rounded-[600px]">
                <Input
                  placeholder="e.g., JavaScript Essentials"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  disabled={submitting}
                  className="flex-grow border-0 p-0 h-auto bg-transparent focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-800">Course Description (optional)</label>
              <div className="flex items-center w-full bg-white border border-gray-200 p-3 gap-2 rounded-lg">
                <Textarea
                  placeholder="Short description..."
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  disabled={submitting}
                  className="w-full border-0 p-0 h-auto bg-transparent focus:outline-none min-h-[60px] resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-6 relative self-stretch w-full">
            <div className="relative self-stretch mt-[-1.00px] font-updated-title-2 font-[18px] font-bold">
              Curriculum Editor
            </div>
            <div className="flex flex-wrap gap-[8px] w-full">
               <Button variant="outline" className="flex-1 h-[50px] md:flex-initial md:w-auto px-7 py-4  rounded-[600px] border-[#566fe9] text-[#566fe9] hover:bg-[#566fe9] hover:text-white">
                  Course Map
                </Button>
        
                <div className="w-full order-last md:w-auto md:flex-1 md:order-none flex h-[50px] items-center pl-5 pr-0 py-1.5 relative bg-white rounded-[600px] border border-solid border-[#c7ccf8]">
                  <Input
                    placeholder="Search for specific module"
                    className="border-0 bg-transparent p-0 h-auto flex-grow placeholder:text-[#8187a0] focus-outline-none "
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button
                    size="icon"
                    className={`rounded-full flex-shrink-0 p-2.5 mr-1 h-[38px] w-[38px] transition-colors ${
                      searchQuery ? "bg-[#566fe9]" : "bg-[#e6e8ff]"
                    }`}
                  >
                    <SearchIcon
                      className={`w-5 h-5 transition-colors ${
                        searchQuery ? "text-white" : "text-[#566fe9]"
                      }`}
                    />
                  </Button>
                </div>
                <Button onClick={handleFinalize} disabled={submitting || createCourse.isPending} className="flex-1 h-[50px] md:flex-initial md:w-auto px-7 py-4 h-auto bg-[#566fe9] rounded-[600px] text-white hover:bg-[#4a5fd1]">
                  {submitting || createCourse.isPending ? (onFinalize ? 'Saving…' : 'Finalizing…') : (finalizeLabel || (onFinalize ? 'Save' : 'Finalize'))}
                </Button>
            </div>
          </div>

          {sections.map(section => (
            <CurriculumSection 
              key={section.id}
              section={section}
              onUpdate={handleUpdateSection}
              onDelete={handleDeleteSection}
            />
          ))}

          <Button 
            onClick={handleAddSection}
            className="w-full h-auto px-7 py-4 bg-[#566fe9] hover:bg-[#4a5fd1] rounded-[600px] transition-colors"
            disabled={submitting}
          >
            <span className="text-white">Add new section</span>
          </Button>
        </div>
      </div>
      <Footer/>
    </>
  );
};

export default CirriculumEditor;