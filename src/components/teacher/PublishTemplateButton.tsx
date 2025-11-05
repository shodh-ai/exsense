"use client";

import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useApiService } from '@/lib/api';

interface PublishTemplateButtonProps {
  courseId: string;
  variant?: 'default' | 'compact';
}

export const PublishTemplateButton: React.FC<PublishTemplateButtonProps> = ({ courseId, variant = 'default' }) => {
  const { user } = useUser();
  const api = useApiService();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePublish = async () => {
    if (!user || !courseId) {
      setError('User or Course ID is missing.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const sessionId = `session-${user.id}-${courseId}`;

    try {
      const response = await api.publishCourseTemplate(courseId, sessionId);
      setSuccess(response.message || 'Environment published as course template!');
    } catch (err: any) {
      const errorMessage = err?.data?.message || err?.message || 'An unknown error occurred.';
      setError(`Failed to publish template: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !courseId) return null;

  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={handlePublish}
          disabled={isLoading}
          className="h-8 px-3 rounded-full border border-[#C7CCF8] bg-white/60 hover:bg-white/80 text-[#566FE9] text-xs font-medium transition-colors disabled:opacity-60"
        >
          {isLoading ? 'Publishing…' : 'Publish Template'}
        </button>
        <span className="sr-only" aria-live="polite">
          {success ? 'Publish succeeded' : error ? 'Publish failed' : ''}
        </span>
      </>
    );
  }

  return (
    <div style={{ margin: '12px 0', padding: '12px', border: '1px solid #E5E7EB', borderRadius: 8 }}>
      <h4 style={{ margin: 0, marginBottom: 6 }}>Teacher Controls</h4>
      <p style={{ marginTop: 0, marginBottom: 12, color: '#4B5563' }}>
        Publish the current session state as the starting environment for all students in this course.
      </p>
      <button onClick={handlePublish} disabled={isLoading} style={{
        backgroundColor: '#566FE9', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', opacity: isLoading ? 0.7 : 1
      }}>
        {isLoading ? 'Publishing...' : 'Publish Environment as Course Template'}
      </button>
      {success && <p style={{ color: 'green', marginTop: 10 }}>{success}</p>}
      {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>}
    </div>
  );
};

