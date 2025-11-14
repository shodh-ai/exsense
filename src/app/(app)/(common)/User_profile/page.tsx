"use client";

import { ChevronLeftIcon, EditIcon } from "lucide-react";
import React, { useState, useMemo, JSX, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Sphere from "@/components/compositions/Sphere";
import { useProfileStats, useTeacherAnalytics, useTeacherCourses } from "@/hooks/useApi";
import { useApiService } from "@/lib/api";
import { ProfileStatsSkeleton } from "@/components/utility/ProfileStatsSkeleton";

// A custom hook for debouncing a value
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const formFieldsTemplate = [
  { id: "first-name", label: "First Name" },
  { id: "last-name", label: "Last Name" },
  { id: "email", label: "Email" },
  { id: "phone-number", label: "Phone Number" },
  { id: "bio", label: "Bio" },
];

// Helper component for a single stat item
const StatItem = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <div className="flex items-center gap-3">
    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#f6f6fe] p-2">
      <img alt={`${label} icon`} src={icon} className="h-6 w-6" />
    </div>
    <div className="flex flex-col">
      <div className="text-sm font-medium text-[#8187a0]">{label}</div>
      <div className="text-base font-semibold text-[#394169]">{value}</div>
    </div>
  </div>
);

// Main Profile Component
export default function ProfileDetails(): JSX.Element {
  const { isLoaded, isSignedIn, user } = useUser();
  const userRole = useMemo(() => (user?.publicMetadata?.role as string) || 'student', [user]);
  const normalizedRole = useMemo(() => (userRole === 'expert' ? 'teacher' : userRole === 'learner' ? 'student' : 'student'), [userRole]);
  const { data: profileStats = [], isLoading: statsLoading } = useProfileStats();
  const { data: analytics } = useTeacherAnalytics();
  const { data: teacherCourses = [] } = useTeacherCourses();
  const apiService = useApiService();

  const [initialFormData, setInitialFormData] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"Saving..." | "All changes saved" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef<boolean>(false);
  const hasSyncedCoursesOnce = useRef<boolean>(false);

  const debouncedFormData = useDebounce(formData, 1000); // 1-second debounce delay

  useEffect(() => {
    if (isLoaded && isSignedIn && user && !hasInitialized.current) {
      const userData = {
        "first-name": user.firstName || "",
        "last-name": user.lastName || "",
        "email": user.primaryEmailAddress?.emailAddress || "",
        "phone-number": (user.unsafeMetadata?.phoneNumber as string) || user.primaryPhoneNumber?.phoneNumber || "",
        "bio": (user.unsafeMetadata?.bio as string) || "",
      };
      setFormData(userData);
      setInitialFormData(userData);
      hasInitialized.current = true;
    }
  }, [isLoaded, isSignedIn, user]);

  // One-time sync: ensure existing courses reflect current teacher name
  useEffect(() => {
    const runSync = async () => {
      if (hasSyncedCoursesOnce.current) return;
      if (!user || normalizedRole !== 'teacher') return;
      if (!Array.isArray(teacherCourses) || teacherCourses.length === 0) return;

      const fullName = `${formData["first-name"] || user.firstName || ""} ${formData["last-name"] || user.lastName || ""}`.trim();
      if (!fullName) return;

      const toUpdate = teacherCourses.filter((c: any) => (c?.teacher?.name || '').trim() !== fullName);
      if (toUpdate.length === 0) {
        hasSyncedCoursesOnce.current = true;
        return;
      }
      try {
        await Promise.allSettled(
          toUpdate.map((c: any) =>
            apiService.updateCourse(c.id, { teacher: { ...(c.teacher || {}), name: fullName } })
          )
        );
      } catch (e) {
        console.warn('One-time course name sync encountered errors', e);
      } finally {
        hasSyncedCoursesOnce.current = true;
      }
    };
    runSync();
  }, [normalizedRole, teacherCourses, apiService, user, formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const isFormDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  useEffect(() => {
    const autoSave = async () => {
      if (isFormDirty && user) {
        setIsSaving(true);
        setSaveStatus("Saving...");
        try {
          await user.update({
            firstName: debouncedFormData["first-name"],
            lastName: debouncedFormData["last-name"],
            unsafeMetadata: {
              ...user.unsafeMetadata,
              bio: debouncedFormData["bio"],
              phoneNumber: debouncedFormData["phone-number"],
            }
          });
          // Propagate teacher name change to all their courses so student pages reflect it
          const prevFullName = `${initialFormData["first-name"] || ""} ${initialFormData["last-name"] || ""}`.trim();
          const newFullName = `${debouncedFormData["first-name"] || ""} ${debouncedFormData["last-name"] || ""}`.trim();
          if (newFullName && newFullName !== prevFullName && Array.isArray(teacherCourses) && teacherCourses.length > 0) {
            try {
              await Promise.allSettled(
                teacherCourses.map((c: any) =>
                  apiService.updateCourse(c.id, { teacher: { ...(c.teacher || {}), name: newFullName } })
                )
              );
            } catch (e) {
              console.warn("Failed to propagate teacher name to courses", e);
            }
          }
          setInitialFormData(debouncedFormData);
          setSaveStatus("All changes saved");
        } catch (error) {
          console.error("Error updating profile:", error);
          // Optionally, set an error status
        } finally {
          setIsSaving(false);
          setTimeout(() => setSaveStatus(null), 2000); // Clear status after 2 seconds
        }
      }
    };

    autoSave();
  }, [debouncedFormData, user, isFormDirty]);


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      try {
        await user.setProfileImage({ file });
        console.log("Profile image updated!");
      } catch (error) {
        console.error("Error updating profile image:", error);
      }
    }
  };

  const dynamicProfileStats = useMemo(() => {
    const fullName = `${formData["first-name"] || ""} ${formData["last-name"] || ""}`.trim();
    return profileStats.map((stat) =>
      stat.label.toLowerCase().includes("name") ? { ...stat, value: fullName || "..." } : stat
    );
  }, [formData, profileStats]);

  // Rename labels for display only (icons and values remain as-is)
  const labelOverrides = [
    "Teacher Name",
    "Teaching Style",
    "Rating",
    "Course Created",
    "Total Time Spent",
    "Resolved Doubts",
  ];
  // Icon files from public/ for each display label
  const iconOverrides: Record<string, string> = {
    "Teacher Name": "/TeacherNamelogo.png",
    "Teaching Style": "/TeachingStylelogo.svg",
    "Rating": "/Ratinglogo.svg",
    "Course Created": "/CourseCreatedlogo.svg",
    "Total Time Spent": "/TotalTimeSpentlogo.svg",
    "Resolved Doubts": "/ResolvedDoubtslogo.svg",
  };
  const renamedProfileStats = useMemo(() => {
    const formatMinutes = (mins: number) => {
      const total = Math.max(0, Math.floor(mins || 0));
      const h = Math.floor(total / 60);
      const m = total % 60;
      return `${h}h ${m}m`;
    };

    const ratingNum = typeof (analytics as any)?.averageRating === 'number'
      ? (analytics as any).averageRating
      : (typeof (analytics as any)?.rating === 'number' ? (analytics as any).rating : null);
    const reviewsCount = (analytics as any)?.totalReviews ?? (analytics as any)?.reviewsCount ?? (analytics as any)?.reviews ?? null;
    const totalMinutes = (analytics as any)?.totalTimeMinutes ?? (analytics as any)?.totalTeachingMinutes ?? (analytics as any)?.minutesTaught ?? null;
    const resolvedDoubts = (analytics as any)?.resolvedDoubts ?? (analytics as any)?.doubtsResolved ?? (analytics as any)?.totalDoubtsResolved ?? null;
    const coursesCreated = Array.isArray(teacherCourses) ? teacherCourses.length : ((analytics as any)?.coursesCreated ?? (analytics as any)?.totalCourses ?? null);
    const teachingStyle = (user?.unsafeMetadata?.teachingStyle as string) || "Visual + Theoretical";

    return dynamicProfileStats.map((stat, index) => {
      const newLabel = labelOverrides[index] || stat.label;
      let value = stat.value;
      switch (newLabel) {
        case "Teacher Name": {
          const fullName = `${formData["first-name"] || ""} ${formData["last-name"] || ""}`.trim();
          value = fullName || value;
          break;
        }
        case "Teaching Style": {
          value = teachingStyle;
          break;
        }
        case "Rating": {
          if (ratingNum != null && reviewsCount != null) {
            const fixed = Number.isFinite(ratingNum) ? (ratingNum as number).toFixed(1) : String(ratingNum);
            value = `${fixed} (${reviewsCount} reviews)`;
          }
          break;
        }
        case "Course Created": {
          if (coursesCreated != null) value = String(coursesCreated);
          break;
        }
        case "Total Time Spent": {
          if (totalMinutes != null) value = formatMinutes(Number(totalMinutes));
          break;
        }
        case "Resolved Doubts": {
          if (resolvedDoubts != null) value = String(resolvedDoubts);
          break;
        }
      }
      return {
        ...stat,
        label: newLabel,
        icon: iconOverrides[newLabel] || (stat as any).icon,
        value,
      };
    });
  }, [dynamicProfileStats, labelOverrides, iconOverrides, formData, analytics, teacherCourses, user]);

  const firstColumnStats = renamedProfileStats.filter((_, index) => index % 2 === 0);
  const secondColumnStats = renamedProfileStats.filter((_, index) => index % 2 !== 0);

  if (!isLoaded || (isSignedIn && statsLoading)) {
    return (
        <div className="flex min-h-full w-full items-center justify-center bg-transparent p-4">
            <Sphere />
            <div className="flex w-full max-w-4xl flex-col items-start gap-6 py-8 px-4 animate-pulse">
                <div className="h-8 w-48 bg-gray-200 rounded-md" />
                <div className="h-10 w-full bg-gray-200 rounded-md" />
                <div className="w-full rounded-xl border border-solid border-gray-200 p-4">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="h-52 w-52 rounded-lg bg-gray-200" />
                        <ProfileStatsSkeleton />
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="flex h-[95%] w-full items-center justify-center pt-10 bg-transparent  overflow-y-auto custom-scrollbar">
      <Sphere />
      <div className="flex  w-full items-start justify-center bg-transparent">
        <main className="flex h-[90%] w-full max-w-4xl flex-col items-start gap-6 py-8 px-4 overflow-y-auto custom-scrollbar">
          <nav className="inline-flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-0 bg-white transition-colors hover:bg-gray-100">
              <ChevronLeftIcon className="h-6 w-6" />
            </Button>
            <Breadcrumb>
              <BreadcrumbList className="inline-flex items-center gap-2">
                <BreadcrumbItem>
                  <BreadcrumbLink href={normalizedRole === 'teacher' ? '/teacher-dash' : '/student_dashboard'} className="font-medium text-[#8187a0] transition-colors hover:text-[#394169]">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>·</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <span className="font-medium text-[#8187a0]">Profile Details</span>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </nav>
          <section className="flex w-full flex-col items-start gap-6">
            <h1 className="text-3xl font-bold text-[#394169]">
              {normalizedRole === 'teacher' ? 'Profile Details' : 'Student Profile'}
            </h1>
            <form className="w-full">
              <Card className="w-full rounded-xl border border-solid border-[#c7ccf8] p-4">
                <CardContent className="w-full p-0">
                  <div className="mb-5 flex flex-col items-center gap-6 md:flex-row md:items-center">
                    <div className="relative flex-shrink-0">
                      <img
                        className="h-52 w-52 rounded-lg object-cover"
                        alt="Profile"
                        src={user?.imageUrl || "https://c.animaapp.com/mf6ucscxc2epVL/img/rectangle-3777.png"}
                      />
                      <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*"/>
                      <Button type="button" size="icon" className="absolute bottom-2 right-2 h-10 w-10 rounded-full border border-gray-200 bg-white hover:bg-gray-100" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <EditIcon className="h-5 w-5 text-gray-600" />
                      </Button>
                    </div>
                    <div className="flex w-full flex-col gap-6 sm:flex-row sm:gap-8">
                      <div className="flex flex-1 flex-col justify-center gap-6">
                        {firstColumnStats.map((stat) => (
                          <StatItem key={stat.label} {...stat} />
                        ))}
                      </div>
                      <div className="flex flex-1 flex-col justify-center gap-6">
                        {secondColumnStats.map((stat) => (
                          <StatItem key={stat.label} {...stat} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {formFieldsTemplate.map((field) => (
                      field.id === 'bio' ? (
                        <div key={field.id} className="flex flex-col gap-2 md:col-span-2">
                          <div className="flex items-center justify-between w-[818px]">
                            <Label htmlFor={field.id} className="font-semibold text-[#394169]">{field.label}</Label>
                            <span className="font-sans font-semibold text-[14px] leading-[15px] text-[#8187a0]">{(formData[field.id] || "").length}/500</span>
                          </div>
                          <textarea
                            id={field.id}
                            name={field.id}
                            value={formData[field.id] || ""}
                            onChange={handleInputChange}
                            maxLength={500}
                            className="w-[818px] h-[170px] rounded-xl border border-solid border-[#c7ccf8] bg-white px-5 py-3 font-medium text-[#394169] opacity-100 focus:outline-none focus:border-[#8187a0]"
                            placeholder="Write a short bio..."
                          />
                        </div>
                      ) : (
                        <div key={field.id} className="flex flex-col gap-2">
                          <Label htmlFor={field.id} className="font-semibold text-[#394169]">{field.label}</Label>
                          {field.id === 'phone-number' ? (
                            <Input
                              id={field.id}
                              name={field.id}
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel"
                              value={formData[field.id] || ""}
                              onChange={handleInputChange}
                              className="h-[50px] w-full rounded-full border border-solid border-[#c7ccf8] bg-white px-5 font-medium text-[#394169] transition-colors focus:border-[#8187a0]"
                            />
                          ) : (
                            <Input
                              id={field.id}
                              name={field.id}
                              value={formData[field.id] || ""}
                              onChange={handleInputChange}
                              className="h-[50px] w-full rounded-full border border-solid border-[#c7ccf8] bg-white px-5 font-medium text-[#394169] transition-colors focus:border-[#8187a0]"
                              disabled={field.id === 'email'}
                            />
                          )}
                        </div>
                      )
                    ))}
                  </div>
                  <div className="mt-6 flex justify-end gap-4">
                    {saveStatus && <span className="text-gray-500">{saveStatus}</span>}
                  </div>
                </CardContent>
              </Card>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}