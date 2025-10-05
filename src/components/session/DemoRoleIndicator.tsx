"use client";

import React, { useState } from 'react';
import { Users, Copy, Check, X } from 'lucide-react';
import { useSessionStore } from '@/lib/store';
import { Button } from '@/components/button';

/**
 * DemoRoleIndicator
 * 
 * A floating indicator that shows the user's role in a demo session
 * and provides quick access to the invite link for presenters.
 */
export function DemoRoleIndicator() {
  const userRole = useSessionStore((s) => s.userRole);
  const currentRoomName = useSessionStore((s) => s.currentRoomName);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

  // Don't show if no role is set
  if (!userRole || !currentRoomName) {
    return null;
  }

  const generateInviteLink = () => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin;
    const demoCourseId = 'demo_course_01';
    return `${baseUrl}/session?courseId=${demoCourseId}&joinRoom=${encodeURIComponent(currentRoomName)}`;
  };

  const copyInviteLink = async () => {
    const link = generateInviteLink();
    if (!link) return;
    
    try {
      await navigator.clipboard.writeText(link);
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const isPresenter = userRole === 'presenter';

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isExpanded ? (
        // Collapsed badge
        <button
          onClick={() => setIsExpanded(true)}
          className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105 ${
            isPresenter 
              ? 'bg-[#566FE9] text-white' 
              : 'bg-white text-[#566FE9] border-2 border-[#566FE9]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="font-semibold text-sm capitalize">{userRole}</span>
        </button>
      ) : (
        // Expanded card
        <div className="bg-white rounded-2xl shadow-2xl p-5 w-80 border border-[#E9EBFD]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`rounded-full p-2 ${isPresenter ? 'bg-[#566fe91a]' : 'bg-[#f7f9ff]'}`}>
                <Users className={`w-4 h-4 ${isPresenter ? 'text-[#566FE9]' : 'text-[#00004280]'}`} />
              </div>
              <div>
                <p className="text-xs text-[#00004280]">Demo Session</p>
                <p className="text-sm font-bold text-[#000042] capitalize">{userRole}</p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-[#00004280] hover:text-[#000042] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isPresenter ? (
            <>
              <p className="text-xs text-[#00004280] mb-2">
                Share this link with viewers:
              </p>
              <div className="bg-[#f7f9ff] rounded-lg p-2 mb-3 break-all text-xs text-[#000042] font-mono max-h-20 overflow-y-auto">
                {generateInviteLink()}
              </div>
              <Button 
                onClick={copyInviteLink}
                className="w-full bg-[#566FE9] hover:bg-[#4556d8] text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2"
              >
                {inviteLinkCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="bg-[#f7f9ff] rounded-lg p-3 text-center">
              <p className="text-xs text-[#00004280]">
                You are viewing this session. Only the presenter can control the demo.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
