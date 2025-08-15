// src/hooks/useApi.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiService, Course, Enrollment, Lesson, LessonContent } from '@/lib/api';
import { toast } from 'sonner'; // Assuming you're using Sonner for notifications

// Query Keys for React Query
export const queryKeys = {
  courses: ['courses'] as const,
  course: (id: string) => ['courses', id] as const,
  enrollments: ['enrollments'] as const,
  userEnrollments: (userId: string) => ['enrollments', 'user', userId] as const,
  lessons: (courseId: string) => ['lessons', 'course', courseId] as const,
  lesson: (id: string) => ['lessons', id] as const,
  lessonContents: (lessonId: string) => ['lesson-contents', 'lesson', lessonId] as const,
  lessonContent: (id: string) => ['lesson-contents', id] as const,
  brumData: ['brum'] as const,
  reports: ['reports'] as const,
  userProgress: (userId: string) => ['reports', 'progress', userId] as const,
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
