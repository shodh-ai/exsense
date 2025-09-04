"use client";

import React, { JSX } from 'react';
import { Button } from "@/components/button";

interface SendModalProps {
  /** Determines if the modal is visible. This is controlled by the parent. */
  isModalOpen: boolean;
  /** A callback function to execute when the modal should close (e.g., clicking the background or cancel button). */
  onClose: () => void;
  /** The function to call when the user confirms the submission. */
  onSubmit: () => void;
  /** Optional custom title for the modal. */
  title?: string;
  /** Optional custom description for the modal. */
  description?: string;
}

/**
 * A state-less modal component for confirmation. Its visibility is controlled
 * entirely by props, matching the structure of the PreviousButton example.
 */
export const SendModal = ({
  isModalOpen,
  onClose,
  onSubmit,
  title = "Submit and move forward?",
  description = "You're getting better every step!",
}: SendModalProps): JSX.Element | null => {
  // If the modal shouldn't be visible, render nothing.
  // This is the key structural similarity to `PreviousButton`.
  if (!isModalOpen) {
    return null;
  }

  // Function to handle the final confirmation
  const handleConfirm = () => {
    onSubmit();
    onClose(); // Tell the parent to close the modal after submitting
  };

  return (
    <div
      // This is the full-screen overlay/backdrop
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm animate-in fade-in-0"
      onClick={onClose} // Close modal if you click the backdrop
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        // This is the actual modal panel
        className="w-[90%] max-w-sm transform animate-in fade-in-90 slide-in-from-bottom-10 bg-white rounded-2xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the panel
      >
        {/* Modal Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Green checkmark icon */}
          <div className="flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" strokeWidth="1.5">
                <circle cx="12" cy="12" r="11.25" stroke="#34D399" fill="#EBFBF4" />
                <path d="M8.5 12.3l2.5 2.5 4.5-4.5" stroke="#34D399" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </svg>
          </div>

          <h2 id="modal-title" className="text-xl font-bold text-gray-900">
            {title}
          </h2>

          <p className="text-sm text-gray-500">
            {description}
          </p>
        </div>

        {/* Modal Footer with Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-8">
          <Button
            variant="outline"
            className="w-full rounded-lg py-2.5 font-medium border-gray-300 hover:bg-gray-50 text-gray-800"
            onClick={onClose} // Use the onClose prop
          >
            Record Again
          </Button>
          <Button
            className="w-full rounded-lg py-2.5 font-medium bg-[#6366F1] hover:bg-[#4F46E5] text-white"
            onClick={handleConfirm}
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
};