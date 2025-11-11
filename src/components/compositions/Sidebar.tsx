"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import ConfirmationModal from './ConfirmationModal'; // Adjust path if necessary
import { LogOut, User } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { isLoaded, user } = useUser();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const [isVisible, setIsVisible] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [activeLink, setActiveLink] = useState(pathname);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [dashboardPath, setDashboardPath] = useState('');
  const [profilePath, setProfilePath] = useState('');
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && user) {
      const role = user.publicMetadata.role;
      if (role === 'expert') {
        setDashboardPath('/teacher-dash');
      } else {
        setDashboardPath('/student_dashboard');
      }
      setProfilePath('/User_profile');
    }
  }, [isLoaded, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const navLinks = useMemo(() => [
    { href: dashboardPath || '', label: 'Dashboard', icon: '/Dashboard.svg' },
    { href: '/sessionpage', label: 'Live Session', icon: '/CourseMap.svg' },
    { href: '/chat', label: 'Messages', icon: '/Chat.svg' },
    { href: '/notifications', label: 'Notifications', icon: '/Notification.svg' },
    { href: '/logout', label: 'Sign Out', icon: '/account.svg' },
  ], [dashboardPath]);

  useEffect(() => {
    setActiveLink(pathname);
  }, [pathname]);

  const handleConfirmSignOut = async () => {
    setIsLogoutModalOpen(false);
    // Clear all React Query cache to prevent data from previous user being shown
    queryClient.clear();
    await signOut({ redirectUrl: '/login' });
  };

  if (!isLoaded || (!dashboardPath && !profilePath)) {
    return null;
  }

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
          <Image src="/Favicon.svg" alt="ShodhAI Logo" width={28.1} height={28} />
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <nav className="flex flex-col items-center gap-6">
            {navLinks.map((link, index) => {
              // Skip rendering dashboard link if dashboardPath is not set yet
              if (link.label === 'Dashboard' && !dashboardPath) return null;

              const isActive = activeLink.startsWith(link.href);
              const isHovered = hoveredLink === link.href;
              const isLogoutButton = index === navLinks.length - 1;

              if (isLogoutButton) {
                return (
                  <div key={link.href} className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      aria-label={link.label}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 bg-transparent hover:bg-gray-100/70"
                    >
                      <Image src={link.icon} alt="" width={24} height={24} />
                    </button>
                    {showProfileMenu && (
                      <div className={cn(
                        "absolute left-full ml-4 top-1/2 -translate-y-1/2",
                        "bg-white rounded-lg shadow-xl py-2 w-48 text-sm",
                        "border border-gray-200/80 backdrop-blur-md"
                      )}>
                        <Link href={profilePath} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100/70 cursor-pointer" onClick={() => setShowProfileMenu(false)}>
                          <User className="w-4 h-4 text-gray-600" />
                          <span>Profile Details</span>
                        </Link>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setIsLogoutModalOpen(true);
                          }}
                          className="w-full text-left flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50/70 cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href} // This should be safe now that dashboardPath is handled
                  aria-label={link.label}
                  onClick={() => {
                    setActiveLink(link.href);
                    setShowProfileMenu(false);
                  }}
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
}