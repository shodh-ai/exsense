"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import ConfirmationModal from './ConfirmationModal';

export function Sidebar() {
  const pathname = usePathname();
  const { isLoaded, user } = useUser();
  const { signOut } = useClerk();

  const [isVisible, setIsVisible] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [activeLink, setActiveLink] = useState(pathname);
  const [hoveredLink, setHoveredLink] = useState(null);
  
  const [dashboardPath, setDashboardPath] = useState(''); 

  useEffect(() => {
    if (isLoaded && user) {
      const role = user.publicMetadata.role;

      if (role === 'expert') {
        setDashboardPath('/teacher-dash'); // Set path for teachers
        } else {
          setDashboardPath('/student_dashboard'); // Set path for students
      }
    }
  }, [isLoaded, user]); 


  const navLinks = [
    { href: dashboardPath, label: 'Dashboard', icon: '/Dashboard.svg' },
    { href: '/session', label: 'Live Session', icon: '/CourseMap.svg' },
    { href: '/chat', label: 'Messages', icon: '/Chat.svg' },
    { href: '/notifications', label: 'Notifications', icon: '/Notification.svg' },
    { href: '/logout', label: 'Sign Out', icon: '/account.svg' },
  ];

  useEffect(() => {
    setActiveLink(pathname);
  }, [pathname]);


  const handleConfirmSignOut = async () => {
    setIsLogoutModalOpen(false);
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
          <Image src="/favicon.svg" alt="ShodhAI Logo" width={28.1} height={28} />
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <nav className="flex flex-col items-center gap-6">
            {navLinks.map((link, index) => {
              const isActive = activeLink.startsWith(link.href);
              const isHovered = hoveredLink === link.href;
              const isLogoutButton = index === navLinks.length - 1;

              if (isLogoutButton) {
                return (
                  <button
                    key={link.href}
                    onClick={() => setIsLogoutModalOpen(true)}
                    aria-label={link.label}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 bg-transparent hover:bg-red-100/70">
                      <Image src={link.icon} alt="" width={24} height={24} />
                    </div>
                  </button>
                );
              }

              return (
                <Link 
                  key={link.href} 
                  href={link.href} 
                  aria-label={link.label}
                  onClick={() => setActiveLink(link.href)}
                  onMouseEnter={() => setHoveredLink(link.href)}
                  onMouseLeave={() => setHoveredLink(null)}
                >
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200',
                    isActive || isHovered ? 'bg-[#566FE9]' : 'bg-transparent'
                  )}>
                    <Image 
                      src={link.icon} 
                      alt="" 
                      width={24} 
                      height={24}
                      className={cn(
                        'transition-all',
                        (isActive || isHovered) && 'invert brightness-0'
                      )}
                    />
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
