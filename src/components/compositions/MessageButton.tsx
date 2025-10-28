"use client";

import React, { JSX } from "react";
import { MessageSquare } from "lucide-react"; // A suitable icon from your existing library

// File: exsense/src/components/MessageButton.tsx

interface MessageButtonProps {
  /**
   * The function to call when the button is clicked.
   */
  onClick?: () => void;
  /**
   * If true, displays a small notification dot on the button.
   */
  hasNotification?: boolean;
  /**
   * Optional additional class names for styling.
   */
  className?: string;
}

export const MessageButton = ({ onClick, hasNotification, className }: MessageButtonProps): JSX.Element => {
  return (
    // A relative wrapper is used to correctly position the notification dot.
    <div className="relative">
      <button
        onClick={onClick}
        className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center bg-[#566FE91A] hover:bg-[#566FE9]/20 transition-colors ${className || ''}`}
        aria-label="Open Messages"
      >
        <MessageSquare className="w-6 h-6 text-[#566FE9]" />
      </button>

      {/* This span will only render if hasNotification is true, creating the red dot. */}
      {hasNotification && (
        <span className="absolute top-2 right-2 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
      )}
    </div>
  );
};