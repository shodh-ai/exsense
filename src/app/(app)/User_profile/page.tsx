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
} from "@/components/Breadcrumb";
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import Sphere from "@/components/Sphere";
// --- Initial Data Structure & Constants ---
const initialProfileStats = [
  {
    icon: "/studentname.svg",
    label: "Student Name",
    value: "Sanket Sharma",
  },
  {
    icon: "/learning.svg",
    label: "Learning Style",
    value: "Visual + Theoretical",
  },
  {
    icon: "/score.svg",
    label: "Average Test Score",
    value: "78%",
  },
  {
    icon: "/time.svg",
    label: "Completion Rate",
    value: "65%",
  },
  {
    icon: "/time.svg",
    label: "Average Time Spent",
    value: "3h 42m",
  },
  {
    icon: "/accuracy.svg",
    label: "Accuracy Rate",
    value: "82%",
  },
];

const formFieldsTemplate = [
  { id: "first-name", label: "First Name" },
  { id: "last-name", label: "Last Name" },
  { id: "email", label: "Email" },
  { id: "phone-number", label: "Phone Number" },
  { id: "education", label: "Education" },
  { id: "country", label: "Country" },
];

// --- Helper component for a single stat item ---
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

// --- Main Profile Component ---
export default function ProfileDetails(): JSX.Element {
  const { isLoaded, isSignedIn, user } = useUser();

  // State for the original data (to enable "cancel")
  const [initialFormData, setInitialFormData] = useState<Record<string, string>>({});
  // State for the currently edited data
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effect to populate the form once Clerk user data is loaded
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const userData = {
        "first-name": user.firstName || "",
        "last-name": user.lastName || "",
        "email": user.primaryEmailAddress?.emailAddress || "",
        "phone-number": user.primaryPhoneNumber?.phoneNumber || "",
        // Custom fields like these should be stored in Clerk's user.unsafeMetadata
        "education": (user.unsafeMetadata?.education as string) || "B. Tech Information Technology",
        "country": (user.unsafeMetadata?.country as string) || "India",
      };
      setFormData(userData);
      setInitialFormData(userData); // Store the initial state for the cancel button
    }
  }, [isLoaded, isSignedIn, user]);

  // Handler for input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handler for saving the form
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !isFormDirty) return; // Don't submit if nothing has changed

    setIsSaving(true);
    try {
      await user.update({
        firstName: formData["first-name"],
        lastName: formData["last-name"],
        // To save custom fields, update unsafeMetadata
        unsafeMetadata: {
          ...user.unsafeMetadata,
          education: formData["education"],
          country: formData["country"],
        }
      });
      // After a successful save, update the initial state to match the new saved state
      setInitialFormData(formData);
      // Add a success notification here (e.g., a toast message)
      console.log("Profile updated successfully!");
    } catch (error) {
      // Add an error notification here
      console.error("Error updating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler for the "Cancel" button
  const handleCancel = () => {
    setFormData(initialFormData); // Revert all changes by resetting to the initial state
  };

  // Handler for profile image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      try {
        await user.setProfileImage({ file });
        // Add a success notification here
        console.log("Profile image updated!");
      } catch (error) {
        // Add an error notification here
        console.error("Error updating profile image:", error);
      }
    }
  };

  // Memoized value to check if the form has been changed from its initial state
  const isFormDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  // --- Dynamic Data Derivation for Display ---
  const profileStats = useMemo(() => {
    const fullName = `${formData["first-name"] || ""} ${formData["last-name"] || ""}`.trim();
    return initialProfileStats.map((stat) =>
      stat.label === "Student Name" ? { ...stat, value: fullName || "..." } : stat
    );
  }, [formData]);

  const firstColumnStats = profileStats.filter((_, index) => index % 2 === 0);
  const secondColumnStats = profileStats.filter((_, index) => index % 2 !== 0);

  // Show a loading state until Clerk has loaded user data
  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full items-center justify-center bg-transparent p-4">
            <Sphere />

    <div className="flex min-h-screen w-full items-start justify-center bg-transparent">
      <main className="flex w-full max-w-4xl flex-col items-start gap-6 py-8 px-4">
        <nav className="inline-flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-full border-0 bg-white transition-colors hover:bg-gray-100"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </Button>

          <Breadcrumb>
            <BreadcrumbList className="inline-flex items-center gap-2">
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="#"
                  className="font-medium text-[#8187a0] transition-colors hover:text-[#394169]"
                >
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
          <h1 className="text-3xl font-bold text-[#394169]">Profile Details</h1>
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
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      className="hidden"
                      accept="image/*"
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="absolute bottom-2 right-2 h-10 w-10 rounded-full border border-gray-200 bg-white transition-colors hover:bg-gray-100"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
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
                      <Label htmlFor={field.id} className="font-semibold text-[#394169]">
                        {field.label}
                      </Label>
                      <Input
                        id={field.id}
                        name={field.id}
                        value={formData[field.id] || ""}
                        onChange={handleInputChange}
                        className="h-[50px] w-full rounded-full border border-solid border-[#c7ccf8] bg-white px-5 font-medium text-[#394169] transition-colors focus:border-[#8187a0]"
                        disabled={field.id === 'email'} // Email is a primary identifier and shouldn't be changed here
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={!isFormDirty || isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isFormDirty || isSaving}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
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