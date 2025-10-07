"use client";

import { LinkedinIcon, Copy, Check, Play, Users } from "lucide-react";
import React, { JSX, useRef, useLayoutEffect, useCallback, useState } from "react";

import { Button } from "@/components/button";
import { Separator } from "@/components/separator";
import { useSessionStore } from "@/lib/store";

export default function ShodhAiWebsite(): JSX.Element {
  // Refs for DOM elements
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  // State to manage text visibility - start with true to prevent hydration mismatch
  const [isTextVisible, setIsTextVisible] = useState(true);
  
  // Demo session state
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoRoomName, setDemoRoomName] = useState<string | null>(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const currentRoomName = useSessionStore((s) => s.currentRoomName);
  const userRole = useSessionStore((s) => s.userRole);

  // Logic for resizing the font
  const fitText = useCallback(() => {
    const container = containerRef.current;
    const text = textRef.current;

    if (!container || !text) return;

    const maxWidth = container.clientWidth * 0.9;
    const maxHeight = container.clientHeight * 0.9;
    let currentFontSize = 200;
    text.style.fontSize = `${currentFontSize}px`;

    while (
      (text.scrollWidth > maxWidth || text.scrollHeight > maxHeight) &&
      currentFontSize > 10
    ) {
      currentFontSize--;
      text.style.fontSize = `${currentFontSize}px`;
    }
    
    setIsTextVisible(true);
  }, []);

  // Effect to handle resizing
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => {
      setIsTextVisible(false);
      fitText();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, [fitText]);

  // Generate invite link
  const generateInviteLink = useCallback(() => {
    if (!currentRoomName) return '';
    const baseUrl = window.location.origin;
    // Use a default demo course ID for the invite
    const demoCourseId = 'demo_course_01';
    return `${baseUrl}/session?courseId=${demoCourseId}&joinRoom=${encodeURIComponent(currentRoomName)}`;
  }, [currentRoomName]);

  // Copy invite link to clipboard
  const copyInviteLink = useCallback(async () => {
    const link = generateInviteLink();
    if (!link) return;
    
    try {
      await navigator.clipboard.writeText(link);
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }, [generateInviteLink]);

  // Start demo session
  const startDemoSession = useCallback(() => {
    // Navigate to session page with demo course
    const demoCourseId = 'demo_course_01';
    window.location.href = `/session?courseId=${demoCourseId}`;
  }, []);

  // Data for footer and social media
  const footerLinks = [
    { text: "All rights reserved by Shodh AI" },
    { text: "Privacy Policy" },
    { text: "Terms & Conditions" },
  ];
  const socialMedia = [
    { icon: <LinkedinIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#566FE9]" />, ariaLabel: "LinkedIn", href: "https://www.linkedin.com/company/shodh-ai" },
  ];

  return (
    <main className="bg-[#f7f9ff] min-h-full w-full overflow-x-hidden">
      <div className="relative flex flex-col h-screen w-full max-w-[88%] mx-auto">
        {/* Background elements */}
        <img className="absolute w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] lg:w-[734px] lg:h-[733px] top-[20px] sm:top-[30px] right-0 object-cover opacity-80" alt="Element mash" src="/animation2.svg" />

        {/* Header */}
        <header className="relative z-10 w-full pt-6 sm:pt-8 lg:pt-[43px]">
          <div className="flex justify-between items-center">
            <img className="w-[100px] h-auto sm:w-[150px] sm:h-[36px] lg:w-[190px] lg:h-[45px]" alt="Shodh AI Logo" src="/Frame1.svg" />
            <div className="flex items-center gap-x-2 sm:gap-x-3">
              {/* <Button className="bg-transparent text-[#000042] rounded-[40px] py-2 sm:py-3 lg:py-5 font-medium text-sm sm:text-base text-center w-[85px] sm:w-[120px] lg:w-[150px] border-[#566FE9] border-[1px] text-[#566FE9]" asChild>
                <a href="/register">Register</a>
              </Button> */}
              <Button className="bg-transparent text-[#566FE9] rounded-[40px] py-2 sm:py-3 lg:py-5 font-medium text-sm sm:text-base text-center w-[85px] sm:w-[120px] lg:w-[150px] border-[#566FE9] border-[1px]" asChild>
                <a href="/login">Demo</a>
              </Button>
              <Button className="bg-[#566FE9] text-white rounded-[40px] py-2 sm:py-3 lg:py-5 font-medium text-sm sm:text-base text-center w-[85px] sm:w-[120px] lg:w-[150px]" asChild>
                <a href="/login">Login</a>
              </Button>
            </div>
          </div>
        </header>

        {/* Main content section */}
        <section className="relative z-10 flex-grow flex flex-col lg:flex-row items-center w-full gap-8">
          
          <div ref={containerRef} className="order-1 lg:order-2 w-full lg:w-6/10 h-full flex flex-col justify-center items-end gap-6">
            <h1
              ref={textRef}
              className={`font-manrope font-extrabold uppercase text-right text-[#000042] leading-[95%] letter-spacing-[0.05em] transition-opacity duration-300 ${isTextVisible ? 'opacity-100' : 'opacity-0'}`}
            >
              <span className="block">BUILDING</span>
              <span className="block tracking-wide">FUTURE OF</span>
              <span className="block tracking-wider">EDUCATION</span>
            </h1>
            
            {/* Demo Session Card */}
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 border border-[#E9EBFD]">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#566fe91a] rounded-full p-2">
                  <Users className="w-5 h-5 text-[#566FE9]" />
                </div>
                <h3 className="text-lg font-bold text-[#000042]">Live Demo Session</h3>
              </div>
              
              {!currentRoomName ? (
                <>
                  <p className="text-sm text-[#00004280] mb-4">
                    Start a live demo session and invite viewers to watch your presentation in real-time.
                  </p>
                  <Button 
                    onClick={startDemoSession}
                    className="w-full bg-[#566FE9] hover:bg-[#4556d8] text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start Demo Session
                  </Button>
                </>
              ) : (
                <>
                  <div className="bg-[#f7f9ff] rounded-lg p-3 mb-3">
                    <p className="text-xs text-[#00004280] mb-1">Your Role</p>
                    <p className="text-sm font-semibold text-[#000042] capitalize">
                      {userRole || 'Presenter'}
                    </p>
                  </div>
                  
                  {userRole === 'presenter' && (
                    <>
                      <p className="text-sm text-[#00004280] mb-3">
                        Share this link with viewers to let them join your session:
                      </p>
                      <div className="bg-[#f7f9ff] rounded-lg p-3 mb-3 break-all text-xs text-[#000042] font-mono">
                        {generateInviteLink()}
                      </div>
                      <Button 
                        onClick={copyInviteLink}
                        className="w-full bg-[#566FE9] hover:bg-[#4556d8] text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
                      >
                        {inviteLinkCopied ? (
                          <>
                            <Check className="w-4 h-4" />
                            Link Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy Invite Link
                          </>
                        )}
                      </Button>
                    </>
                  )}
                  
                  {userRole === 'viewer' && (
                    <div className="bg-[#f7f9ff] rounded-lg p-4 text-center">
                      <p className="text-sm text-[#00004280]">
                        You are viewing this session. Only the presenter can control the demo.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="order-2 lg:order-1 w-full lg:w-4/10 h-full flex justify-center items-center">
            <img
              className="w-full h-full object-contain"
              src="/animation77.gif"
              alt="Animated demonstration of the product"
            />
          </div>

        </section>

        {/* Footer */}
        <footer className="relative z-10 w-full pb-4 sm:pb-6 lg:pb-8">
          <Separator className="w-full mx-auto mb-4 bg-[#E9EBFD] h-px" />
          <div className="flex flex-col sm:flex-row items-center justify-between w-full mx-auto gap-4 sm:gap-0">
            <div className="order-2 sm:order-1">
              <img className="w-[120px] h-[28px] sm:w-[130px] sm:h-[31px] lg:w-[152.4px] lg:h-9" alt="Shodh AI Logo" src="/frame2.svg" />
            </div>
            <div className="order-1 sm:order-2 flex flex-col sm:flex-row items-center gap-2 sm:gap-0">
              {footerLinks.map((link, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <div className="hidden sm:block w-1.5 h-1.5 bg-[#00004240] rounded-[3px] mx-2" />}
                  <Button variant="ghost" className="px-3 py-2 sm:px-4 lg:px-7 font-semibold text-[#00004240] text-xs sm:text-sm lg:text-base rounded-[100px] whitespace-nowrap">
                    {link.text}
                  </Button>
                </React.Fragment>
              ))}
            </div>
            <div className="order-3 flex items-center gap-2 sm:gap-2.5">
              {socialMedia.map((social, index) => (
                <Button key={index} variant="ghost" size="icon" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-[#566fe91a] rounded-2xl sm:rounded-3xl" aria-label={social.ariaLabel} asChild>
                  <a href={social.href} target="_blank" rel="noopener noreferrer">{social.icon}</a>
                </Button>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}