"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const role = useMemo(() => {
    const pm = (user?.publicMetadata as any) || {};
    const um = (user?.unsafeMetadata as any) || {};
    return pm.role || um.role;
  }, [user]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/login");
      return;
    }
    if (role !== "admin") {
      router.replace("/");
      return;
    }
  }, [isLoaded, isSignedIn, role, router]);

  if (!isLoaded) return <div className="p-6">Loading...</div>;
  if (!isSignedIn || role !== "admin") return null;

  return <>{children}</>;
}
