"use client";

import React from 'react';
import { Button } from '@/components/ui/button'; 
import { AlertTriangleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmButtonVariant?: 'primary' | 'destructive';
}

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmButtonVariant = 'primary',
}: ConfirmationModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    // Backdrop with click handler to close the modal
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose} // Close when clicking the background
    >
      
      {/* Modal Content Panel */}
      <div 
        className="bg-white w-full max-w-[508px] rounded-[32px] border border-gray-200 shadow-xl px-[48px] pt-[36px] pb-[48px] text-center flex flex-col items-center"
        onClick={(e) => e.stopPropagation()} // Prevents clicks inside the modal from closing it
      >
        
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-6">
          <AlertTriangleIcon className="w-6 h-6 text-red-500" />
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-12">{message}</p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-[200px] h-[50px] rounded-full text-base font-semibold border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            {cancelLabel}
          </Button>

          <Button
            onClick={onConfirm} // This now directly calls the handler from the parent
            className={cn(
              "w-full sm:w-[200px] h-[50px] rounded-full text-base font-semibold text-white",
              confirmButtonVariant === 'destructive' 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-[#566FE9] hover:bg-[#4a5fd1]'
            )}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;