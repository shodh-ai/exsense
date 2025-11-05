"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/compositions/Sidebar";

// Exported so other modules can reuse it if needed
export const HIDDEN_PATH_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/password-changed",
  "/register",
  "/confirm-register",
  "/registration-test",
];

export default function SidebarContainer() {
  const pathname = usePathname();

  const shouldHide = HIDDEN_PATH_PREFIXES.some((prefix) =>
    pathname?.startsWith(prefix)
  );

  if (shouldHide) return null;

  return <Sidebar />;
}
