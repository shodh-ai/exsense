// src/lib/api.ts
import { createApiClient } from './apiclient';
import { useAuth } from '@clerk/nextjs';

// Type definitions for your backend API
export interface Course {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  courseId: string;
  userId: string;
  enrolledAt: string;
  status: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  createdAt: string;
}

export interface LessonContent {
  id: string;
  lessonId: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT';
  content: any;
  order: number;
}

// Main API service class
export class ApiService {
  private client: ReturnType<typeof createApiClient>;

  constructor(getToken: () => Promise<string | null>) {
    this.client = createApiClient({ getToken });
  }

  // Courses API
  async getCourses(): Promise<Course[]> {
    return this.client.get('/api/courses');
  }

  async getCourse(id: string): Promise<Course> {
    return this.client.get(`/api/courses/${id}`);
  }

  async createCourse(course: Partial<Course>): Promise<Course> {
    return this.client.post('/api/courses', course);
  }

  // Enrollments API
  async getEnrollments(): Promise<Enrollment[]> {
    return this.client.get('/api/enrollments');
  }

  async enrollInCourse(courseId: string): Promise<Enrollment> {
    return this.client.post('/api/enrollments', { courseId });
  }

  async getUserEnrollments(userId: string): Promise<Enrollment[]> {
    return this.client.get(`/api/enrollments/user/${userId}`);
  }

  // Lessons API
  async getLessons(courseId: string): Promise<Lesson[]> {
    return this.client.get(`/api/lessons/course/${courseId}`);
  }

  async getLesson(id: string): Promise<Lesson> {
    return this.client.get(`/api/lessons/${id}`);
  }

  // Lesson Contents API
  async getLessonContents(lessonId: string): Promise<LessonContent[]> {
    return this.client.get(`/api/lesson-contents/lesson/${lessonId}`);
  }

  async getLessonContent(id: string): Promise<LessonContent> {
    return this.client.get(`/api/lesson-contents/${id}`);
  }

  // BRUM API (AI/Memory system)
  async getBrumData(): Promise<any> {
    return this.client.get('/api/brum');
  }

  async createBrumSession(sessionData: any): Promise<any> {
    return this.client.post('/api/brum/sessions', sessionData);
  }

  // Reports API
  async getReports(): Promise<any> {
    return this.client.get('/api/reports');
  }

  async getUserProgress(userId: string): Promise<any> {
    return this.client.get(`/api/reports/progress/${userId}`);
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    return this.client.get('/health');
  }
}

// Custom hook for using the API service
export const useApiService = () => {
  const { getToken } = useAuth();
  
  // Create a new instance on each call to ensure fresh token retrieval
  return new ApiService(getToken);
};
