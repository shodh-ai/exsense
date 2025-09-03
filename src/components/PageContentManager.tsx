"use client";

import React from 'react';
import { useSessionStore } from '@/lib/store';
import Loading from '@/app/(app)/loading'; // <-- Make sure this path is correct

export function PageContentManager({ children }: { children: React.ReactNode }) {
  const isNavigating = useSessionStore((state) => state.isNavigating);

  // This is the conditional logic:
  // If `isNavigating` is true, render your existing Loading component.
  // Otherwise, render the actual page content that is passed in as `children`.
  return isNavigating ? <Loading /> : <>{children}</>;
}