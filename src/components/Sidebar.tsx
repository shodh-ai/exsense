"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import ConfirmationModal from './ConfirmationModal';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '/icons/nav-dashboard-inactive.svg', activeIcon: '/icons/nav-dashboard-active.svg' },
  { href: '/session', label: 'Live Session', icon: '/icons/nav-whiteboard-inactive.svg', activeIcon: '/icons/nav-whiteboard-active.svg' },
  { href: '/chat', label: 'Messages', icon: '/icons/nav-chat-inactive.svg', activeIcon: '/icons/nav-chat-active.svg' },
  { href: '/notifications', label: 'Notifications', icon: '/icons/nav-notifications-inactive.svg', activeIcon: '/icons/nav-notifications-active.svg' },
  { href: '/logout', label: 'Sign Out', icon: '/account.svg', activeIcon: '/account.svg' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const { signOut } = useClerk();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // --- THIS IS THE CORRECTED LOGIC ---
  const handleConfirmSignOut = async () => {
    // 1. Close the modal immediately.
    setIsLogoutModalOpen(false);

    // 2. Then, initiate the sign-out process and redirect.
    await signOut({ redirectUrl: '/login' });
  };

  return (
    <>
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
        <div className="flex-shrink-0">
          <Image src="/favicon.svg" alt="ShodhAI Logo" width={32} height={32} />
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <nav className="flex flex-col items-center gap-6">
            {navLinks.map((link, index) => {
              const isActive = pathname.startsWith(link.href);
              const isLogoutButton = index === navLinks.length - 1;

              if (isLogoutButton) {
                return (
                  <button
                    key={link.href}
                    onClick={() => setIsLogoutModalOpen(true)} 
                    aria-label={link.label}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 bg-transparent hover:bg-red-100/70">
                      <Image src={link.icon} alt="" width={20} height={20} />
                    </div>
                  </button>
                );
              }

              return (
                <Link key={link.href} href={link.href} aria-label={link.label}>
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200', isActive ? 'bg-[#566FE9]' : 'bg-transparent hover:bg-gray-200/70')}>
                    <Image src={isActive ? link.activeIcon : link.icon} alt="" width={20} height={20} />
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmSignOut}
        title="Confirm Log Out"
        message="Are you sure you want to end your session and log out?"
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        confirmButtonVariant="destructive"
      />
    </>
  );
}