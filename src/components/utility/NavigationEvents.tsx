"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/lib/store';

export function NavigationEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setIsNavigating } = useSessionStore();

  useEffect(() => {
    // Hide the loader when the route change is complete.
    setIsNavigating(false);
  }, [pathname, searchParams, setIsNavigating]);

  useEffect(() => {
    // This is the global click handler to detect when a navigation should start.
    const handleClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest('a');
      
      if (target && target.hasAttribute('href')) {
        const href = target.getAttribute('href')!;
        const currentPath = window.location.pathname + window.location.search;

        // Check if it's an internal, different-page navigation.
        if (href.startsWith('/') && href !== currentPath) {
          setIsNavigating(true);
        }
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [setIsNavigating]);

  return null;
}