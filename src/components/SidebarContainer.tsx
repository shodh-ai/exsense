"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

// Paths where the sidebar should be hidden (all routes in (login) and (register) groups)
const HIDDEN_PATH_PREFIXES = [
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
