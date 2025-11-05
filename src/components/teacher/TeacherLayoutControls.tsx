"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { PublishTemplateButton } from "@/components/teacher/PublishTemplateButton";

export default function TeacherLayoutControls() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");

  if (!courseId) return null;

  return (
    <div className="flex items-center gap-2">
      <PublishTemplateButton courseId={courseId} variant="compact" />
    </div>
  );
}
