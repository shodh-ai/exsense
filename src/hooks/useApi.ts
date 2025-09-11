import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiService, Course, Enrollment, Lesson, LessonContent } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';

// Query Keys for React Query
export const queryKeys = {
  courses: ['courses'] as const,
  teacherCourses: ['courses', 'teacher', 'me'] as const,
  course: (id: string) => ['courses', id] as const,
  enrollments: ['enrollments'] as const,
  myEnrollments: ['enrollments', 'me'] as const,
  userEnrollments: (userId: string) => ['enrollments', 'user', userId] as const,
  // --- THIS KEY IS ADDED ---
  courseEnrollments: (courseId: string) => ['enrollments', 'course', courseId] as const,
  lessons: (courseId: string) => ['lessons', 'course', courseId] as const,
  lesson: (id: string) => ['lessons', id] as const,
  lessonContents: (lessonId: string) => ['lesson-contents', 'lesson', lessonId] as const,
  lessonContent: (id: string) => ['lesson-contents', id] as const,
  brumData: ['brum'] as const,
  reports: ['reports'] as const,
  userProgress: (userId: string) => ['reports', 'progress', userId] as const,
  profileStats: ['profile-stats'] as const,
  adminUsers: ['admin', 'users'] as const,
  adminCourses: ['admin', 'courses'] as const,
  adminAnalytics: ['admin', 'analytics', 'overview'] as const,
  curriculum: (id: string) => ['curriculums', id] as const,
  teacherAnalytics: ['teacher', 'me', 'analytics'] as const,
};

// ===== COURSES HOOKS =====
export const useCourses = () => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: queryKeys.courses,
    queryFn: () => apiService.getCourses(),
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useTeacherAnalytics = () => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: queryKeys.teacherAnalytics,
    queryFn: async () => {
      try {
        return await apiService.getTeacherAnalytics();
      } catch (err: any) {
        const status = err?.status as number | undefined;
        // Gracefully degrade for unauthorized/forbidden
        if (status === 401 || status === 403) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // Analytics can be cached for 5 minutes
    retry: (failureCount, error: any) => {
      const status = error?.status as number | undefined;
      if (status === 401 || status === 403) return false;
      return failureCount < 2;
    },
  });
};

export const useTeacherCourses = () => {
  const apiService = useApiService();

  return useQuery({
    queryKey: queryKeys.teacherCourses,
    queryFn: () => apiService.getMyCourses(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error: any) => {
      const status = error?.status as number | undefined;
      if (status === 401 || status === 403) return false;
      if (status === 429) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => {
      const base = Math.min(1000 * 2 ** attemptIndex, 15000);
      const jitter = Math.random() * 250;
      return base + jitter;
    },
  });
};
export const useUpdateCourse = () => {
  const apiService = useApiService();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ courseId, courseData }: { courseId: string, courseData: any }) => 
      apiService.updateCourse(courseId, courseData),
    onSuccess: (updatedCourse) => {
      // Invalidate the course query to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.course(updatedCourse.id) });
      toast.success('Course updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update course: ${error.message}`);
    },
  });
};

export const useCourse = (id: string, options?: { enabled?: boolean }) => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: queryKeys.course(id),
    queryFn: () => apiService.getCourse(id),
    enabled: options?.enabled ?? !!id,
    staleTime: 5 * 60 * 1000,
  });
};
export const useCurriculum = (id: string) => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: queryKeys.curriculum(id),
    queryFn: () => apiService.getCurriculum(id),
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
    staleTime: 2 * 60 * 1000,
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

// --- THIS IS THE NEW, CORRECT HOOK FOR YOUR PAGE ---
/**
 * Fetches all student enrollments for a specific course.
 * @param courseId The ID of the course to fetch enrollments for.
 */
export const useCourseEnrollments = (courseId: string) => {
  const apiService = useApiService();
  
  return useQuery({
    queryKey: queryKeys.courseEnrollments(courseId),
    // This now correctly calls the `getCourseEnrollments` method from your ApiService
    queryFn: () => apiService.getCourseEnrollments(courseId),
    enabled: !!courseId, // Only run the query if a courseId is provided
    staleTime: 2 * 60 * 1000,
  });
};
// --- END OF NEW HOOK ---

export const useEnrollInCourse = () => {
  const apiService = useApiService();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (courseId: string) => apiService.enrollInCourse(courseId),
    onSuccess: (enrollment: Enrollment) => {
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

export const useMyEnrollments = (options?: { enabled?: boolean }) => {
  const apiService = useApiService();
  return useQuery({
    queryKey: queryKeys.myEnrollments,
    queryFn: async () => {
      const res: any = await apiService.getMyEnrollments();
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
    staleTime: 10 * 60 * 1000,
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

// --- Profile Stats Hook ---
export const useProfileStats = () => {
  const apiService = useApiService();
  const { isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.profileStats,
    queryFn: () => apiService.getProfileStats(),
    enabled: !!isSignedIn,
    staleTime: 5 * 60 * 1000,
    retry: 2,
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