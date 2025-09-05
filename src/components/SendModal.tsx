"use client";

import React, { JSX } from 'react';
import { Button } from "@/components/button";

interface SendModalProps {
  isModalOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title?: string;
  description?: string;
}

export const SendModal = ({
  isModalOpen,
  onClose,
  onSubmit,
  title = "Submit and move forward?",
  description = "You're getting better every step!",
}: SendModalProps): JSX.Element | null => {
  if (!isModalOpen) {
    return null;
  }

  const handleConfirm = () => {
    onSubmit();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-transparent bg-opacity-40 backdrop-blur-sm animate-in fade-in-0"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* --- MODIFIED SECTION STARTS HERE --- */}
      <div
        // This is the actual modal panel, updated with your specific dimensions
        className="w-full max-w-[508px] transform animate-in fade-in-90 slide-in-from-bottom-10 bg-white rounded-[32px] border border-gray-200 shadow-xl px-[48px] pt-[36px] pb-[48px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex flex-col items-center text-center">
          {/* Green checkmark icon */}
          <div className="flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" strokeWidth="1.5">
                <circle cx="12" cy="12" r="11.25" stroke="#34D399" fill="#EBFBF4" />
                <path d="M8.5 12.3l2.5 2.5 4.5-4.5" stroke="#34D399" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </svg>
          </div>

          <h2 id="modal-title" className="text-xl font-bold text-gray-900 mt-4">
            {title}
          </h2>

          <p className="text-sm text-gray-500 mt-2">
            {description}
          </p>
        </div>

        {/* Modal Footer with Buttons */}
        {/* The gap is created by the margin-top here (mt-12 = 48px) */}
        <div className="flex flex-col sm:flex-row gap-4 mt-12 justify-center">
          <Button
            variant="outline"
            className="w-[200px] h-[50px] rounded-full text-base font-semibold border-gray-300 hover:bg-gray-50 text-gray-800"
            onClick={onClose}
          >
            Record Again
          </Button>
          <Button
            className="w-[200px] h-[50px] rounded-full text-base font-semibold bg-[#6366F1] hover:bg-[#4F46E5] text-white"
            onClick={handleConfirm}
          >
            Submit
          </Button>
        </div>
      </div>
      {/* --- MODIFIED SECTION ENDS HERE --- */}
    </div>
  );
};