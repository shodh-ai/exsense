"use client";

import Link from "next/link";

export default function AdminHome() {
  return (
    <div className="w-full h-full p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-[#394169]">Admin</h1>
        <div className="space-x-3">
          <Link href="/admin/users" className="underline text-blue-600">Users</Link>
          <Link href="/admin/courses" className="underline text-blue-600">Courses</Link>
          <Link href="/admin/analytics" className="underline text-blue-600">Analytics</Link>
        </div>
      </div>
    </div>
  );
}
