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
  enrollmentCount?: number;
  lessonCount?: number;
  teacher?: {
    name?: string;
    email?: string;
  };
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
  description?: string | null;
  content?: string | null;
  order?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface LessonContent {
  id: string;
  lessonId: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'LINK' | 'FILE' | 'OTHER' | 'ASSIGNMENT';
  title?: string | null;
  text?: string | null;
  url?: string | null;
  data?: any;
  order?: number;
}

// --- ADD THIS NEW INTERFACE ---
export interface ProfileStat {
  icon: string;
  label: string;
  value: string;
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

  async updateCourse(id: string, course: Partial<Course>): Promise<Course> {
    return this.client.put(`/api/courses/${id}`, course as any);
  }

  async getMyCourses(): Promise<Course[]> {
    return this.client.get('/api/courses/teacher/me');
  }

  // Enrollments API
  async getEnrollments(): Promise<Enrollment[]> {
    return this.client.get('/api/enrollments');
  }

  async enrollInCourse(courseId: string): Promise<Enrollment> {
    return this.client.post('/api/enrollments', { courseId });
  }

  async getMyEnrollments(): Promise<Enrollment[] | { enrollments: Enrollment[] }> {
    return this.client.get('/api/enrollments/student/me');
  }

  async getUserEnrollments(userId: string): Promise<Enrollment[]> {
    return this.client.get(`/api/enrollments/user/${userId}`);
  }

  // --- ADD THIS NEW METHOD ---
  async getProfileStats(): Promise<ProfileStat[]> {
    return this.client.get('/api/users/me/profile-stats');
  }

  // Lessons API
  async getLessons(courseId: string): Promise<Lesson[]> {
    return this.client.get(`/api/courses/${courseId}/lessons`);
  }

  async getLesson(id: string): Promise<Lesson> {
    return this.client.get(`/api/lessons/${id}`);
  }

  async createLesson(
    courseId: string,
    data: { title: string; description?: string | null; content?: string | null; order?: number }
  ): Promise<Lesson> {
    return this.client.post(`/api/courses/${courseId}/lessons`, data);
  }

  async deleteLesson(lessonId: string): Promise<{ success?: boolean }> {
    return this.client.delete(`/api/lessons/${lessonId}`);
  }

  async reorderLessons(courseId: string, orderedLessonIds: string[]): Promise<void> {
    return this.client.patch(`/api/courses/${courseId}/lessons/reorder`, { orderedLessonIds } as any);
  }

  // Lesson Contents API
  async getLessonContents(lessonId: string): Promise<LessonContent[]> {
    return this.client.get(`/api/lessons/${lessonId}/contents`);
  }

  async getLessonContent(id: string): Promise<LessonContent> {
    return this.client.get(`/api/lesson-contents/${id}`);
  }

  async addLessonContent(lessonId: string, data: any): Promise<LessonContent> {
    return this.client.post(`/api/lessons/${lessonId}/contents`, data);
  }

  async deleteLessonContent(contentId: string): Promise<void> {
    return this.client.delete(`/api/lesson-contents/${contentId}`);
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

  // Admin API
  async getAdminUsers(): Promise<any[]> {
    return this.client.get('/api/admin/users');
  }

  async enableUser(userId: string): Promise<{ id: string; isDisabled: boolean }> {
    return this.client.patch(`/api/admin/users/${userId}/enable`, {} as any);
  }

  async disableUser(userId: string): Promise<{ id: string; isDisabled: boolean }> {
    return this.client.patch(`/api/admin/users/${userId}/disable`, {} as any);
  }

  async getAdminCourses(): Promise<any[]> {
    return this.client.get('/api/admin/courses');
  }

  async getAdminAnalyticsOverview(): Promise<{ users: number; courses: number; enrollments: number; lessons: number }> {
    return this.client.get('/api/admin/analytics/overview');
  }
}

// Custom hook for using the API service
export const useApiService = () => {
  const { getToken } = useAuth();
  
  return new ApiService(getToken);
};