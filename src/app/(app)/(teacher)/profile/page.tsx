"use client";

import { ChevronLeftIcon, EditIcon } from "lucide-react";
import React, { useState, useMemo, JSX, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

// --- UI Components ---
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Sphere from "@/components/compositions/Sphere";
import { ProfileStatsSkeleton } from "@/components/utility/ProfileStatsSkeleton";

// --- Hooks ---
import { useProfileStats } from "@/hooks/useApi";

const STATS_TEMPLATE = [
  { icon: "/studentname.svg", label: "Instructor Name" },
  { icon: "/assignment.svg", label: "Courses Taught" },
  { icon: "/usercount.svg", label: "Total Students" },
  { icon: "/star.svg", label: "Average Rating" },
  { icon: "/time.svg", label: "Total Reviews" },
  { icon: "/completion.svg", label: "Completion Rate" },
];

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

export default function TeacherProfilePage(): JSX.Element {
  const { isLoaded, isSignedIn, user } = useUser();
  const { data: profileStatsFromApi = [], isLoading: statsLoading } = useProfileStats();
  
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
        "bio": (user.unsafeMetadata?.bio as string) || "",
      };
      setFormData(userData);
      setInitialFormData(userData);
    }
  }, [isLoaded, isSignedIn, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !isFormDirty) return;
    setIsSaving(true);
    
    try {
      const coreProfileChanged = formData["first-name"] !== initialFormData["first-name"] || formData["last-name"] !== initialFormData["last-name"];
      const metadataChanged = formData["bio"] !== initialFormData["bio"];

      if (coreProfileChanged) {
        await user.update({
          firstName: formData["first-name"],
          lastName: formData["last-name"],
        });
      }

      if (metadataChanged) {
        await user.update({
          unsafeMetadata: { bio: formData["bio"] },
        });
      }
      
      // --- THIS IS THE FIX FOR THE UI NOT UPDATING ---
      // After a successful update, we tell Clerk's hook to refetch the user object.
      // This will provide the latest data to our component and trigger the useEffect
      // to correctly update the `initialFormData` and `formData` state.
      await user.reload();
      // --- END OF FIX ---

      alert("Profile updated successfully!");

    } catch (error: any) {
      console.error("Error updating profile:", error);
      const clerkError = error.errors?.[0]?.longMessage || error.message || "An unknown error occurred.";
      alert(`Error: Could not update profile.\n\nReason: ${clerkError}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => setFormData(initialFormData);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      try { await user.setProfileImage({ file }); }
      catch (error) { console.error("Error updating profile image:", error); }
    }
  };

  const isFormDirty = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialFormData), [formData, initialFormData]);

  const finalDisplayStats = useMemo(() => {
    const apiStatsMap = new Map(profileStatsFromApi.map(stat => [stat.label, stat.value]));
    const fullName = `${formData["first-name"] || ""} ${formData["last-name"] || ""}`.trim();
    return STATS_TEMPLATE.map(templateStat => {
      let value = "N/A";
      if (templateStat.label === "Instructor Name") { value = fullName || "..."; }
      else if (apiStatsMap.has(templateStat.label)) { value = apiStatsMap.get(templateStat.label)!; }
      return { ...templateStat, value };
    });
  }, [formData, profileStatsFromApi]);

  const firstColumnStats = finalDisplayStats.slice(0, 3);
  const secondColumnStats = finalDisplayStats.slice(3, 6);

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
    <div className="w-full h-full bg-transparent overflow-y-auto">
      <Sphere />
      <main className="flex w-full max-w-4xl flex-col items-start gap-6 py-8 px-4 mx-auto">
        <nav className="inline-flex items-center gap-3">
          <Link href="/teacher-dash">
            <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-0 bg-white hover:bg-gray-100">
              <ChevronLeftIcon className="h-6 w-6" />
            </Button>
          </Link>
          <Breadcrumb>
            <BreadcrumbList className="inline-flex items-center gap-2">
              <BreadcrumbItem><BreadcrumbLink href="/teacher-dash" className="font-medium text-[#8187a0] hover:text-[#394169]">Dashboard</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator>·</BreadcrumbSeparator>
              <BreadcrumbItem><span className="font-medium text-[#8187a0]">Profile</span></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </nav>
        <section className="flex w-full flex-col items-start gap-6">
          <h1 className="text-3xl font-bold text-[#394169]">Instructor Profile</h1>
          <form onSubmit={handleSubmit} className="w-full">
            <Card className="w-full rounded-xl border border-solid border-[#c7ccf8] p-4">
              <CardContent className="w-full p-0">
                <div className="mb-5 flex flex-col items-center gap-6 md:flex-row md:items-center">
                  <div className="relative flex-shrink-0">
                    <img className="h-52 w-52 rounded-lg object-cover" alt="Profile" src={user?.imageUrl || "/default-avatar.png"} />
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*"/>
                    <Button type="button" size="icon" className="absolute bottom-2 right-2 h-10 w-10 rounded-full bg-white hover:bg-gray-100" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <EditIcon className="h-5 w-5 text-gray-600" />
                    </Button>
                  </div>
                  <div className="flex w-full flex-col gap-6 sm:flex-row sm:gap-8">
                    <div className="flex flex-1 flex-col justify-center gap-6">{firstColumnStats.map((stat) => <StatItem key={stat.label} {...stat} />)}</div>
                    <div className="flex flex-1 flex-col justify-center gap-6">{secondColumnStats.map((stat) => <StatItem key={stat.label} {...stat} />)}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div><Label htmlFor="first-name" className="font-semibold text-[#394169]">First Name</Label><Input id="first-name" name="first-name" value={formData["first-name"] || ""} onChange={handleInputChange} className="h-[50px] rounded-full border border-solid border-[#c7ccf8] bg-white px-5" /></div>
                  <div><Label htmlFor="last-name" className="font-semibold text-[#394169]">Last Name</Label><Input id="last-name" name="last-name" value={formData["last-name"] || ""} onChange={handleInputChange} className="h-[50px] rounded-full border border-solid border-[#c7ccf8] bg-white px-5" /></div>
                  <div><Label htmlFor="email" className="font-semibold text-[#394169]">Email</Label><Input id="email" name="email" value={formData["email"] || ""} className="h-[50px] rounded-full border border-solid border-[#c7ccf8] bg-gray-50 px-5" disabled /></div>
                  <div><Label htmlFor="phone-number" className="font-semibold text-[#394169]">Phone Number</Label><Input id="phone-number" name="phone-number" value={formData["phone-number"] || ""} onChange={handleInputChange} className="h-[50px] rounded-full border border-solid border-[#c7ccf8] bg-white px-5" /></div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="bio" className="font-semibold text-[#394169]">Bio</Label>
                  <Textarea id="bio" name="bio" value={formData["bio"] || ""} onChange={handleInputChange} className="min-h-[120px] w-full rounded-xl border border-solid border-[#c7ccf8] bg-white p-4" placeholder="Tell your students a little about yourself, your experience, and your teaching style." />
                </div>
                
                <div className="mt-6 flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={!isFormDirty || isSaving}>Cancel</Button>
                  <Button type="submit" disabled={!isFormDirty || isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </section>
      </main>
    </div>
  );
}



