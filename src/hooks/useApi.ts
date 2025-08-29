// src/hooks/useApi.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiService, Course, Enrollment, Lesson, LessonContent } from '@/lib/api';
import { toast } from 'sonner'; // Assuming you're using Sonner for notifications

// Query Keys for React Query
export const queryKeys = {
  courses: ['courses'] as const,
  teacherCourses: ['courses', 'teacher', 'me'] as const,
  course: (id: string) => ['courses', id] as const,
  enrollments: ['enrollments'] as const,
  myEnrollments: ['enrollments', 'me'] as const,
  userEnrollments: (userId: string) => ['enrollments', 'user', userId] as const,
  lessons: (courseId: string) => ['lessons', 'course', courseId] as const,
  lesson: (id: string) => ['lessons', id] as const,
  lessonContents: (lessonId: string) => ['lesson-contents', 'lesson', lessonId] as const,
  lessonContent: (id: string) => ['lesson-contents', id] as const,
  brumData: ['brum'] as const,
  reports: ['reports'] as const,
  userProgress: (userId: string) => ['reports', 'progress', userId] as const,
  adminUsers: ['admin', 'users'] as const,
  adminCourses: ['admin', 'courses'] as const,
  adminAnalytics: ['admin', 'analytics', 'overview'] as const,
};

// ===== COURSES HOOKS =====
export const useCourses = () => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: queryKeys.courses,
    queryFn: () => apiService.getCourses(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useTeacherCourses = () => {
  const apiService = useApiService();

  return useQuery({
    queryKey: queryKeys.teacherCourses,
    queryFn: () => apiService.getMyCourses(),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

export const useCourse = (id: string) => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: queryKeys.course(id),
    queryFn: () => apiService.getCourse(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateCourse = () => {
  const apiService = useApiService();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (course: Partial<Course>) => apiService.createCourse(course),
    onSuccess: (newCourse: Course) => {
      // Invalidate and refetch courses list
      queryClient.invalidateQueries({ queryKey: queryKeys.courses });
      queryClient.invalidateQueries({ queryKey: queryKeys.teacherCourses });
      toast.success('Course created successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create course: ${error.message}`);
    },
  });
};

// ===== ENROLLMENTS HOOKS =====
export const useEnrollments = () => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: queryKeys.enrollments,
    queryFn: () => apiService.getEnrollments(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useUserEnrollments = (userId: string) => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: queryKeys.userEnrollments(userId),
    queryFn: () => apiService.getUserEnrollments(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useEnrollInCourse = () => {
  const apiService = useApiService();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (courseId: string) => apiService.enrollInCourse(courseId),
    onSuccess: (enrollment: Enrollment) => {
      // Invalidate enrollments queries
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollments });
      queryClient.invalidateQueries({ queryKey: queryKeys.myEnrollments });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.userEnrollments(enrollment.userId) 
      });
      toast.success('Successfully enrolled in course!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to enroll: ${error.message}`);
    },
  });
};

// Current user's enrollments (normalized)
export const useMyEnrollments = (options?: { enabled?: boolean }) => {
  const apiService = useApiService();
  return useQuery({
    queryKey: queryKeys.myEnrollments,
    queryFn: async () => {
      const res: any = await apiService.getMyEnrollments();
      // Backend may return an array or { enrollments: [] }
      return Array.isArray(res) ? res : (res?.enrollments ?? []);
    },
    staleTime: 2 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
};

// ===== LESSONS HOOKS =====
export const useLessons = (courseId: string) => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: queryKeys.lessons(courseId),
    queryFn: () => apiService.getLessons(courseId),
    enabled: !!courseId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateLesson = (courseId: string) => {
  const apiService = useApiService();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string }) => apiService.createLesson(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons(courseId) });
      toast.success('Lesson created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create lesson: ${error.message}`);
    },
  });
};

export const useDeleteLesson = (courseId: string) => {
  const apiService = useApiService();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => apiService.deleteLesson(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons(courseId) });
      toast.success('Lesson deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete lesson: ${error.message}`);
    },
  });
};

export const useReorderLessons = (courseId: string) => {
  const apiService = useApiService();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedLessonIds: string[]) => apiService.reorderLessons(courseId, orderedLessonIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons(courseId) });
      toast.success('Lessons reordered');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder lessons: ${error.message}`);
    },
  });
};

export const useLesson = (id: string) => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: queryKeys.lesson(id),
    queryFn: () => apiService.getLesson(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
};

// ===== LESSON CONTENTS HOOKS =====
export const useLessonContents = (lessonId: string) => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: queryKeys.lessonContents(lessonId),
    queryFn: () => apiService.getLessonContents(lessonId),
    enabled: !!lessonId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useAddLessonContent = (lessonId: string) => {
  const apiService = useApiService();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiService.addLessonContent(lessonId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lessonContents(lessonId) });
      toast.success('Content added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add content: ${error.message}`);
    }
  });
};

export const useDeleteLessonContent = (lessonId: string) => {
  const apiService = useApiService();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contentId: string) => apiService.deleteLessonContent(contentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lessonContents(lessonId) });
      toast.success('Content deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete content: ${error.message}`);
    }
  });
};

export const useLessonContent = (id: string) => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: queryKeys.lessonContent(id),
    queryFn: () => apiService.getLessonContent(id),
    enabled: !!id,
    staleTime: 15 * 60 * 1000,
  });
};

// ===== BRUM/AI HOOKS =====
export const useBrumData = () => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: queryKeys.brumData,
    queryFn: () => apiService.getBrumData(),
    staleTime: 1 * 60 * 1000, // 1 minute (more dynamic data)
  });
};

export const useCreateBrumSession = () => {
  const apiService = useApiService();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sessionData: any) => apiService.createBrumSession(sessionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.brumData });
      toast.success('AI session created successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create AI session: ${error.message}`);
    },
  });
};

// ===== REPORTS HOOKS =====
export const useReports = () => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: queryKeys.reports,
    queryFn: () => apiService.getReports(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useUserProgress = (userId: string) => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: queryKeys.userProgress(userId),
    queryFn: () => apiService.getUserProgress(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
};

// ===== HEALTH CHECK HOOK =====
export const useHealthCheck = () => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiService.healthCheck(),
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
    refetchInterval: 60 * 1000, // Check every minute
  });
};

// ===== ADMIN HOOKS =====
export const useAdminAnalytics = () => {
  const apiService = useApiService();
  return useQuery({
    queryKey: queryKeys.adminAnalytics,
    queryFn: () => apiService.getAdminAnalyticsOverview(),
    staleTime: 60 * 1000,
    retry: 2,
  });
};

export const useAdminUsers = () => {
  const apiService = useApiService();
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: () => apiService.getAdminUsers(),
    staleTime: 60 * 1000,
  });
};

export const useToggleUserDisabled = () => {
  const apiService = useApiService();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, isDisabled }: { userId: string; isDisabled: boolean }) => {
      // Toggle the state: if currently disabled, enable; otherwise disable
      if (isDisabled) {
        return apiService.enableUser(userId);
      }
      return apiService.disableUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
      toast.success('User status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user: ${error.message}`);
    },
  });
};

export const useAdminCourses = () => {
  const apiService = useApiService();
  return useQuery({
    queryKey: queryKeys.adminCourses,
    queryFn: () => apiService.getAdminCourses(),
    staleTime: 60 * 1000,
  });
};
