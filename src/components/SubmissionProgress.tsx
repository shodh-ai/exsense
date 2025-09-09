import React from 'react';

interface SubmissionProgressProps {
  progress: number; // Progress from 0 to 100
  message: string;  // Message like "Analysing your teachings" or "Uploading files"
}

export const SubmissionProgress: React.FC<SubmissionProgressProps> = ({ progress, message }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-8 w-96 max-w-sm flex flex-col items-center">
        <h3 className="text-xl font-semibold text-[#566FE9] mb-4">{message}</h3>
        <p className="text-gray-700 mb-4">{progress}% complete...</p>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-[#566FE9] h-2.5 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};