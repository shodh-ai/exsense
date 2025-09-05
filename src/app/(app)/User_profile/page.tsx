"use client";
import { ChevronLeftIcon, EditIcon } from "lucide-react";
import React, { useState, useMemo } from "react";
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

// --- Initial Data ---
const initialProfileStats = [
  {
    icon: "https://c.animaapp.com/mf6ucscxc2epVL/img/frame-1000012663-1.svg",
    label: "Student Name",
    value: "Sanket Sharma", // This will be dynamically replaced
  },
  {
    icon: "https://c.animaapp.com/mf6ucscxc2epVL/img/frame-1000012664-2.svg",
    label: "Learning Style",
    value: "Visual + Theoretical",
  },
  {
    icon: "https://c.animaapp.com/mf6ucscxc2epVL/img/frame-1000012663.svg",
    label: "Average Test Score",
    value: "78%",
  },
  {
    icon: "https://c.animaapp.com/mf6ucscxc2epVL/img/frame-1000012664-3.svg",
    label: "Completion Rate",
    value: "65%",
  },
  {
    icon: "https://c.animaapp.com/mf6ucscxc2epVL/img/frame-1000012664-1.svg",
    label: "Average Time Spent",
    value: "3h 42m",
  },
  {
    icon: "https://c.animaapp.com/mf6ucscxc2epVL/img/frame-1000012664.svg",
    label: "Accuracy Rate",
    value: "82%",
  },
];

const initialFormFields = [
  { id: "first-name", label: "First Name", value: "Jahnavi" },
  { id: "last-name", label: "Last Name", value: "Sharma" },
  { id: "email", label: "Email", value: "Jessicah@gmail.com" },
  { id: "phone-number", label: "Phone Number", value: "+91 8329851930" },
  { id: "education", label: "Education", value: "B. Tech Information Technology" },
  { id: "country", label: "Country", value: "India" },
];

// --- Helper component for a single stat item ---
const StatItem = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <div className="flex items-center gap-3">
    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#f6f6fe] p-2">
      <img alt={`${label} icon`} src={icon} className="h-full w-full" />
    </div>
    <div className="flex flex-col">
      <div className="text-sm font-medium text-[#8187a0]">{label}</div>
      <div className="text-base font-semibold text-[#394169]">{value}</div>
    </div>
  </div>
);


export default function ProfileDetails(): JSX.Element {
  // --- State Management ---
  const [formData, setFormData] = useState(() =>
    initialFormFields.reduce((acc, field) => {
      acc[field.id] = field.value;
      return acc;
    }, {} as Record<string, string>)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // --- Dynamic Data Derivation ---
  const profileStats = useMemo(() => {
    const fullName = `${formData["first-name"] || ""} ${formData["last-name"] || ""}`.trim();
    return initialProfileStats.map((stat) =>
      stat.label === "Student Name" ? { ...stat, value: fullName || "..." } : stat
    );
  }, [formData]);

  const firstColumnStats = profileStats.filter((_, index) => index % 2 === 0);
  const secondColumnStats = profileStats.filter((_, index) => index % 2 !== 0);

  return (
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
                <span className="font-medium text-[#8187a0]">
                  Profile Details
                </span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </nav>

        <section className="flex w-full flex-col items-start gap-6">
          <h1 className="text-3xl font-bold text-[#394169]">
            Profile Details
          </h1>

          <Card className="w-full rounded-xl border border-solid border-[#c7ccf8] p-4">
            <CardContent className="w-full p-0">
              <div className="mb-5 flex flex-col items-center gap-6 md:flex-row md:items-center">
                <div className="relative flex-shrink-0">
                  <img
                    className="h-52 w-52 rounded-lg object-cover"
                    alt="Profile"
                    src="https://c.animaapp.com/mf6ucscxc2epVL/img/rectangle-3777.png"
                  />
                  <Button
                    size="icon"
                    className="absolute bottom-2 right-2 h-10 w-10 rounded-full border border-gray-200 bg-white transition-colors hover:bg-gray-100"
                    variant="outline"
                  >
                    <EditIcon className="h-5 w-5 text-gray-600" />
                  </Button>
                </div>

                {/* --- MODIFIED: Explicit two-column layout for stats --- */}
                <div className="flex w-full flex-col gap-6 sm:flex-row sm:gap-8">
                  {/* Column 1 */}
                  <div className="flex flex-1 flex-col justify-center gap-6">
                    {firstColumnStats.map((stat) => (
                      <StatItem key={stat.label} {...stat} />
                    ))}
                  </div>
                  {/* Column 2 */}
                  <div className="flex flex-1 flex-col justify-center gap-6">
                    {secondColumnStats.map((stat) => (
                      <StatItem key={stat.label} {...stat} />
                    ))}
                  </div>
                </div>
              </div>

              {/* --- MODIFIED: Form fields are now controlled components --- */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {initialFormFields.map((field) => (
                  <div key={field.id} className="flex flex-col gap-2">
                    <Label htmlFor={field.id} className="font-semibold text-[#394169]">
                      {field.label}
                    </Label>
                    <Input
                      id={field.id}
                      name={field.id}
                      value={formData[field.id]}
                      onChange={handleInputChange}
                      className="h-[50px] w-full rounded-full border border-solid border-[#c7ccf8] bg-white px-5 font-medium text-[#394169] transition-colors focus:border-[#8187a0]"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}