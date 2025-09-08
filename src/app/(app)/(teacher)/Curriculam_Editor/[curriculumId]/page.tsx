"use-client";

import React, { JSX } from 'react';
import { useParams } from 'next/navigation';
import CirriculumEditor from '@/components/CirriculumEditor';
// We need to import a hook to fetch the curriculum data
// NOTE: We will assume a hook named `useCurriculum` exists. 
// You will need to add this to your `src/hooks/useApi.ts` file.
import { useCurriculum } from '@/hooks/useApi'; 
import { SectionData } from "@/components/CurriculumSection"; // Assuming this type is exported

/**
 * This page is a dynamic route that fetches a specific curriculum
 * from the backend and passes it to the editor component.
 */
export default function EditorPage(): JSX.Element {
  // Step 1: Get the unique ID from the URL.
  const { curriculumId } = useParams<{ curriculumId: string }>();

  // Step 2: Fetch the data for that specific curriculum from the backend.
  // We will add `useCurriculum` to our hooks file in the next step.
  const { 
    data: curriculum, 
    isLoading, 
    error 
  } = useCurriculum(String(curriculumId));

  // Step 3: Handle the loading and error states.
  if (isLoading) {
    return <div className="p-8 text-center">Loading curriculum...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">
      Error: {(error as any)?.message || "Failed to load the curriculum."}
    </div>;
  }
  
  // The backend might return the sections inside a property, e.g., `curriculum.sections`
  // We use a fallback to an empty array if the data is not there.
  const initialSections: SectionData[] = curriculum?.sections ?? [];

  // Step 4: Pass the fetched data down to the component as a prop.
  return (
    <CirriculumEditor 
      initialSections={initialSections} 
    />
  );
}