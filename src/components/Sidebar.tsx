"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// The navigation links data still needs the label for accessibility (`aria-label`)
const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '/icons/nav-dashboard-inactive.svg', activeIcon: '/icons/nav-dashboard-active.svg' },
  { href: '/session', label: 'Live Session', icon: '/icons/nav-whiteboard-inactive.svg', activeIcon: '/icons/nav-whiteboard-active.svg' },
  { href: '/chat', label: 'Messages', icon: '/icons/nav-chat-inactive.svg', activeIcon: '/icons/nav-chat-active.svg' },
  { href: '/notifications', label: 'Notifications', icon: '/icons/nav-notifications-inactive.svg', activeIcon: '/icons/nav-notifications-active.svg' },
  { href: '/student-profile', label: 'Profile', icon: '/account.svg', activeIcon: '/account.svg' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      {/* Invisible hover trigger area */}
      <div
        onMouseEnter={() => setIsVisible(true)}
        className="fixed top-0 left-0 h-full w-4 z-40" 
      />

      <aside
        onMouseLeave={() => setIsVisible(false)}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-md border border-gray-200/80 shadow-lg flex flex-col items-center py-6 px-2 transition-all duration-300 ease-in-out z-50",
          "h-[99%] w-14 rounded-lg",
          isVisible ? 'left-[8px] translate-x-0 opacity-100' : 'left-0 -translate-x-full opacity-0'
        )}
      >
        {/* Logo at the top */}
        <div className="flex-shrink-0">
          {/* <Link href="/dashboard"> */}
            <Image src="/favicon.svg" alt="ShodhAI Logo" width={32} height={32} />
          {/* </Link> */}
        </div>

        {/* Wrapper for centering the nav icons */}
        <div className="flex-1 flex flex-col justify-center">
          <nav className="flex flex-col items-center gap-6">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  // The aria-label is important for screen readers now that there's no visible text
                  aria-label={link.label}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200',
                      isActive ? 'bg-[#566FE9]' : 'bg-transparent hover:bg-gray-200/70'
                    )}
                  >
                    <Image
                      src={isActive ? link.activeIcon : link.icon}
                      alt="" // Alt is decorative since the link has an aria-label
                      width={20}
                      height={20}
                    />
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}