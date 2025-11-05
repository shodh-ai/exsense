"use client";

import React, { JSX } from "react";
import { UploadIcon } from "lucide-react";

// File: exsense/src/components/UploadButton.tsx

interface UploadButtonProps {
  /**
   * If true, the button will be rendered.
   */
  isVisible?: boolean;
  /**
   * The function to call when the button is clicked.
   */
  onClick?: () => void;
  /**
   * Optional additional class names.
   */
  className?: string;
}

export const UploadButton = ({ isVisible, onClick, className }: UploadButtonProps): JSX.Element | null => {
  // If the button is not supposed to be visible, render nothing.
  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center bg-[#566FE91A] hover:bg-[#566FE9]/20 transition-colors ${className || ''}`}
      aria-label="Upload resources"
    >
      <UploadIcon className="w-6 h-6 text-[#566FE9]" />
    </button>
  );
};