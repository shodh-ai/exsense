"use client";

import React from 'react';
// We are switching back to your Button component.
import { Button } from '@/components/button'; 
import { AlertTriangleIcon } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
}

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete Session",
}: ConfirmationModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    // Backdrop with dark color and blur effect
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      
      {/* Modal Content with correct proportions */}
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl p-8 text-center flex flex-col items-center">
        
        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-5">
          <AlertTriangleIcon className="w-6 h-6 text-red-500" />
        </div>

        {/* Text */}
        <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-8">{message}</p>

        {/* Buttons with fixed, identical widths */}
        <div className="flex gap-3 w-full justify-center">
          {/* Cancel Button */}
          <Button
            variant="outline"
            onClick={onClose}
            className="w-32 h-12 rounded-full text-base font-semibold border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </Button>

          {/* Delete Button */}
          <Button
            onClick={onConfirm}
            className="w-32 h-12 rounded-full text-base font-semibold bg-[#566FE9] hover:bg-[#4a5fd1] text-white"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;