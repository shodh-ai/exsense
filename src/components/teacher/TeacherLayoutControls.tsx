"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { PublishTemplateButton } from "@/components/teacher/PublishTemplateButton";
import { Room } from "livekit-client";

interface TeacherLayoutControlsProps {
  room?: Room | null;
}

export default function TeacherLayoutControls({ room }: TeacherLayoutControlsProps) {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");

  if (!courseId) return null;

  return (
    <div className="flex items-center gap-2">
      <PublishTemplateButton courseId={courseId} variant="compact" room={room} />
    </div>
  );
}
