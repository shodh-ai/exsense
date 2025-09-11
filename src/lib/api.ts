// exsense/src/lib/api.ts

import { useAuth } from '@clerk/nextjs';
import { useMemo } from 'react';

// --- TYPE DEFINITIONS ---

export interface Teacher {
  name?: string;
  email?: string;
  title?: string;
  bio?: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
}

export interface CourseAnalytics {
  averageTestScore?: number;
  averageTimeSpent?: string;
  completionRate?: number;
  unsolvedDoubts?: number;
  accuracyRate?: number;
  satisfactionLevel?: number;
  satisfactionReviews?: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  enrollmentCount?: number;
  lessonCount?: number;
  teacher?: Teacher;
  imageUrl?: string;
  tags?: string[];
  difficulty?: string;
  duration?: string;
  language?: string;
  skills?: string[];
  learningOutcomes?: string[];
  reviews?: Review[];
  faqs?: Faq[];
  analytics?: CourseAnalytics;
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

export interface ProfileStat {
  icon: string;
  label: string;
  value: string;
}

// THIS IS THE NEW TYPE FOR THE STUDENT'S PROFILE DATA
export interface StudentProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  imageUrl: string;
  createdAt: number;
}


// --- API CLIENT CREATION LOGIC ---
// (This is your existing apiclient.ts logic, merged here)

type ApiClientOptions = {
    getToken?: () => Promise<string | null>;
};

export class ApiError extends Error {
    status: number;
    retryAfter?: number;
    data?: any;
    constructor(message: string, status: number, retryAfter?: number, data?: any) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.retryAfter = retryAfter;
        this.data = data;
    }
}

const createApiClient = ({ getToken }: ApiClientOptions) => {
    const request = async (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: object) => {
        const token = getToken ? await getToken() : null;
        const headers = new Headers({ 'Content-Type': 'application/json' });
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
        const fullUrl = `${baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
        const response = await fetch(fullUrl, { method, headers, body: body ? JSON.stringify(body) : undefined });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "An unknown API error occurred." }));
            const retryAfterHeader = response.headers.get('Retry-After');
            const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;
            const message = errorData.message || `API request failed with status ${response.status}`;
            throw new ApiError(message, response.status, retryAfter, errorData);
        }
        if (response.status === 201 || response.status === 204) { return null; }
        return response.json();
    };
    return {
        get: (path: string) => request('GET', path),
        post: (path: string, body: object) => request('POST', path, body),
        put: (path: string, body: object) => request('PUT', path, body),
        patch: (path: string, body: object) => request('PATCH', path, body),
        delete: (path: string) => request('DELETE', path),
    };
};

// --- THE MAIN API SERVICE CLASS ---
export class ApiService {
  private client: ReturnType<typeof createApiClient>;

  constructor(getToken: () => Promise<string | null>) {
    this.client = createApiClient({ getToken });
  }

  // --- Courses API ---
  async getCourses(): Promise<Course[]> { return this.client.get('/api/courses'); }
  async getCourse(id: string): Promise<Course> { return this.client.get(`/api/courses/${id}`); }
  async createCourse(course: Partial<Course>): Promise<Course> { return this.client.post('/api/courses', course); }
  async updateCourse(id: string, course: Partial<Course>): Promise<Course> { return this.client.put(`/api/courses/${id}`, course as any); }
  async getMyCourses(): Promise<Course[]> { return this.client.get('/api/courses/teacher/me'); }

  // --- Enrollments API ---
  async getEnrollments(): Promise<Enrollment[]> { return this.client.get('/api/enrollments'); }
  async getTeacherAnalytics(): Promise<any> { 
    try { return await this.client.get('/api/teacher/me/analytics'); }
    catch (err: any) {
      if ([404, 401, 403].includes(err?.status)) return null;
      throw err;
    }
  }
  async enrollInCourse(courseId: string): Promise<Enrollment> { return this.client.post('/api/enrollments', { courseId }); }
  async getMyEnrollments(): Promise<Enrollment[] | { enrollments: Enrollment[] }> { return this.client.get('/api/enrollments/student/me'); }
  async getUserEnrollments(userId: string): Promise<Enrollment[]> { return this.client.get(`/api/enrollments/user/${userId}`); }
  async getCourseEnrollments(courseId: string): Promise<Enrollment[]> { return this.client.get(`/api/courses/${courseId}/enrollments`); }

  // --- User & Profile API ---
  async getProfileStats(): Promise<ProfileStat[]> { return this.client.get('/api/users/me/profile-stats'); }

  // THIS IS THE NEW FUNCTION
  async getStudentProfile(studentId: string): Promise<StudentProfile> {
    return this.client.get(`/api/users/${studentId}/profile`);
  }

  // --- Curriculum & Lesson API ---
  async getCurriculum(id: string): Promise<any> { return this.client.get(`/api/curriculums/${id}`); }
  async getLessons(courseId: string): Promise<Lesson[]> { return this.client.get(`/api/courses/${courseId}/lessons`); }
  async getLesson(id: string): Promise<Lesson> { return this.client.get(`/api/lessons/${id}`); }
  async createLesson(courseId: string, data: { title: string; description?: string | null; content?: string | null; order?: number }): Promise<Lesson> { return this.client.post(`/api/courses/${courseId}/lessons`, data); }
  async deleteLesson(lessonId: string): Promise<{ success?: boolean }> { return this.client.delete(`/api/lessons/${lessonId}`); }
  async reorderLessons(courseId: string, orderedLessonIds: string[]): Promise<void> { return this.client.patch(`/api/courses/${courseId}/lessons/reorder`, { orderedLessonIds } as any); }

  // --- Lesson Contents API ---
  async getLessonContents(lessonId: string): Promise<LessonContent[]> { return this.client.get(`/api/lessons/${lessonId}/contents`); }
  async getLessonContent(id: string): Promise<LessonContent> { return this.client.get(`/api/lesson-contents/${id}`); }
  async addLessonContent(lessonId: string, data: any): Promise<LessonContent> { return this.client.post(`/api/lessons/${lessonId}/contents`, data); }
  async deleteLessonContent(contentId: string): Promise<void> { return this.client.delete(`/api/lesson-contents/${contentId}`); }

  // --- Other APIs ---
  async getBrumData(): Promise<any> { return this.client.get('/api/brum'); }
  async createBrumSession(sessionData: any): Promise<any> { return this.client.post('/api/brum/sessions', sessionData); }
  async getReports(): Promise<any> { return this.client.get('/api/reports'); }
  async getUserProgress(userId: string): Promise<any> { return this.client.get(`/api/reports/progress/${userId}`); }
  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> { return this.client.get('/health'); }

  // --- Admin API ---
  async getAdminUsers(): Promise<any[]> { return this.client.get('/api/admin/users'); }
  async enableUser(userId: string): Promise<{ id: string; isDisabled: boolean }> { return this.client.patch(`/api/admin/users/${userId}/enable`, {} as any); }
  async disableUser(userId: string): Promise<{ id: string; isDisabled: boolean }> { return this.client.patch(`/api/admin/users/${userId}/disable`, {} as any); }
  async getAdminCourses(): Promise<any[]> { return this.client.get('/api/admin/courses'); }
  async getAdminAnalyticsOverview(): Promise<{ users: number; courses: number; enrollments: number; lessons: number }> { return this.client.get('/api/admin/analytics/overview'); }
}

// --- THE CUSTOM HOOK ---
export const useApiService = () => {
  const { getToken } = useAuth();
  return useMemo(() => new ApiService(getToken), [getToken]);
};