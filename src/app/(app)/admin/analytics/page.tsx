"use client";

import React from "react";
import { useAdminAnalytics } from "@/hooks/useApi";

export default function AdminAnalyticsPage() {
  const { data, isLoading, error } = useAdminAnalytics();

  return (
    <div className="w-full h-full p-6 overflow-y-auto">
      <h1 className="text-xl font-bold text-[#394169] mb-4">Analytics</h1>
      {isLoading && <p>Loading analytics...</p>}
      {error && <p className="text-red-500">{String((error as any)?.message || error)}</p>}
      {data && !isLoading && (
        <ul className="space-y-1">
          <li>Users: {data.users}</li>
          <li>Courses: {data.courses}</li>
          <li>Enrollments: {data.enrollments}</li>
          <li>Lessons: {data.lessons}</li>
        </ul>
      )}
    </div>
  );
}
