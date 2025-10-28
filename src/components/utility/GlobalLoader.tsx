"use client";

import React from 'react';
import { useSessionStore } from '@/lib/store';
import Loading from '@/app/(app)/loading';

export function GlobalLoader() {
  const isNavigating = useSessionStore((state) => state.isNavigating);

  if (!isNavigating) {
    return null;
  }
  
  // Renders the loading component inside a fixed, full-screen container
  // with a high z-index to ensure it covers all other content.
  return (
    <div className="fixed inset-0 z-[9999]">
      <Loading />
    </div>
  );
}