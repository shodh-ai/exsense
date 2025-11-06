// exsense/src/lib/store/newCourseStore.ts

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { SectionData } from '@/components/compositions/CurriculumSection'; // Adjust this import path if needed

// Define the shape of the data for a new course
interface NewCourseState {
  // From the Curriculum Editor
  title: string;
  description: string;
  sections: SectionData[];

  // From the new details-form page
  tags: string[];
  skills: string[];
  learningOutcomes: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  language: string;
  // Add any other fields you need for the course overview page
  
  // Actions to update the state
  setData: (data: Partial<NewCourseState>) => void;
  setSections: (sections: SectionData[]) => void;
  reset: () => void;
}

const initialState = {
  title: '',
  description: '',
  sections: [{ id: uuidv4(), title: "", description: "", modules: [], scope: "" }],
  tags: [],
  skills: [],
  learningOutcomes: [],
  difficulty: 'Beginner',
  language: 'English',
};

export const useNewCourseStore = create<NewCourseState>((set) => ({
  ...initialState,

  // A generic action to update any part of the state
  setData: (data) => set((state) => ({ ...state, ...data })),

  // A specific action for updating sections from the editor
  setSections: (sections) => set({ sections }),

  // Action to reset the form back to its initial state after course creation
  reset: () => set(initialState),
}));