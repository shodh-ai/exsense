"use client";

import { UserProfile } from "@clerk/nextjs";

export default function ProfilePage() {
  return (
    <div className="w-full h-full p-6 overflow-y-auto flex items-start justify-center">
      <UserProfile routing="hash"/>
    </div>
  );
}
