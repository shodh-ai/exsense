"use client";

import React, { useState } from 'react';

interface SeedInputProps {
  onSubmit: (content: string) => Promise<void> | void;
}

export default function SeedInput({ onSubmit }: SeedInputProps) {
  const [content, setContent] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const text = content.trim();
    if (!text) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(text);
      setContent("");
    } catch (e: any) {
      setError(e?.message || "Failed to process curriculum");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-start gap-4 p-6 text-white">
      <h2 className="text-2xl font-semibold">Provide your syllabus or curriculum outline</h2>
      <textarea
        className="w-full max-w-3xl h-80 p-4 rounded-md bg-[#0F1226]/60 border border-[#2A2F4A] focus:outline-none"
        placeholder="Paste your course outline here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50`}
        >
          {isSubmitting ? 'Processing...' : 'Process Curriculum'}
        </button>
        {error && <div className="text-red-400 text-sm">{error}</div>}
      </div>
    </div>
  );
}
