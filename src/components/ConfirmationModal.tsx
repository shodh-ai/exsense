"use client";

import React from 'react';
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
      
      {/* Modal Content with precise padding from your design */}
      <div className="bg-white w-full max-w-[508px] rounded-[32px] border border-gray-200 shadow-xl px-[48px] pt-[36px] pb-[48px] text-center flex flex-col items-center">
        
        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-6">
          <AlertTriangleIcon className="w-6 h-6 text-red-500" />
        </div>

        {/* Text */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-12">{message}</p>

        {/* Button Container */}
        <div className="flex gap-4 w-full justify-center">

          {/* Cancel Button with EXACT dimensions */}
          <Button
            variant="outline"
            onClick={onClose}
            className="w-[200px] h-[50px] rounded-full text-base font-semibold border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </Button>

          {/* Delete Button with EXACT dimensions */}
          <Button
            onClick={onConfirm}
            className="w-[200px] h-[50px] rounded-full text-base font-semibold bg-[#566FE9] hover:bg-[#4a5fd1] text-white"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;