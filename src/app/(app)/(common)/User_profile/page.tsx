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
import { useProfileStats } from "@/hooks/useApi";
import { ProfileStatsSkeleton } from "@/components/utility/ProfileStatsSkeleton";

// --- THIS IS THE FIX ---
// This constant needs to exist for the form rendering logic to work.
const formFieldsTemplate = [
  { id: "first-name", label: "First Name" },
  { id: "last-name", label: "Last Name" },
  { id: "email", label: "Email" },
  { id: "phone-number", label: "Phone Number" },
  { id: "education", label: "Education" },
  { id: "country", label: "Country" },
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
  const { data: profileStats = [], isLoading: statsLoading } = useProfileStats();
  
  const [initialFormData, setInitialFormData] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const userData = {
        "first-name": user.firstName || "",
        "last-name": user.lastName || "",
        "email": user.primaryEmailAddress?.emailAddress || "",
        "phone-number": user.primaryPhoneNumber?.phoneNumber || "",
        "education": (user.unsafeMetadata?.education as string) || "B. Tech Information Technology",
        "country": (user.unsafeMetadata?.country as string) || "India",
      };
      setFormData(userData);
      setInitialFormData(userData);
    }
  }, [isLoaded, isSignedIn, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !isFormDirty) return;
    setIsSaving(true);
    try {
      await user.update({
        firstName: formData["first-name"],
        lastName: formData["last-name"],
        unsafeMetadata: {
          ...user.unsafeMetadata,
          education: formData["education"],
          country: formData["country"],
        }
      });
      setInitialFormData(formData);
      console.log("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(initialFormData);
  };

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

  const isFormDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  const dynamicProfileStats = useMemo(() => {
    const fullName = `${formData["first-name"] || ""} ${formData["last-name"] || ""}`.trim();
    return profileStats.map((stat) =>
      stat.label.toLowerCase().includes("name") ? { ...stat, value: fullName || "..." } : stat
    );
  }, [formData, profileStats]);

  const firstColumnStats = dynamicProfileStats.filter((_, index) => index % 2 === 0);
  const secondColumnStats = dynamicProfileStats.filter((_, index) => index % 2 !== 0);

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
    <div className="flex min-h-full w-full items-center justify-center bg-transparent p-4">
      <Sphere />
      <div className="flex min-h-screen w-full items-start justify-center bg-transparent">
        <main className="flex w-full max-w-4xl flex-col items-start gap-6 py-8 px-4">
          <nav className="inline-flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-0 bg-white transition-colors hover:bg-gray-100">
              <ChevronLeftIcon className="h-6 w-6" />
            </Button>
            <Breadcrumb>
              <BreadcrumbList className="inline-flex items-center gap-2">
                <BreadcrumbItem>
                  <BreadcrumbLink href="#" className="font-medium text-[#8187a0] transition-colors hover:text-[#394169]">
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
              {userRole === 'teacher' ? 'Instructor Profile' : 'Profile Details'}
            </h1>
            <form onSubmit={handleSubmit} className="w-full">
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
                      <div key={field.id} className="flex flex-col gap-2">
                        <Label htmlFor={field.id} className="font-semibold text-[#394169]">{field.label}</Label>
                        <Input id={field.id} name={field.id} value={formData[field.id] || ""} onChange={handleInputChange} className="h-[50px] w-full rounded-full border border-solid border-[#c7ccf8] bg-white px-5 font-medium text-[#394169] transition-colors focus:border-[#8187a0]" disabled={field.id === 'email'} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={handleCancel} disabled={!isFormDirty || isSaving}>Cancel</Button>
                    <Button type="submit" disabled={!isFormDirty || isSaving}>{isSaving ? "Saving..." : "Save"}</Button>
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



