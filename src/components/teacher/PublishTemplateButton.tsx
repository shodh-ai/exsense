"use client";

import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useApiService } from '@/lib/api';
import { Room } from 'livekit-client';

interface PublishTemplateButtonProps {
  courseId: string;
  variant?: 'default' | 'compact';
  room?: Room | null;
}

export const PublishTemplateButton: React.FC<PublishTemplateButtonProps> = ({ courseId, variant = 'default', room }) => {
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
      // Step 1: Save current session state to GCS (if room is available)
      if (room && room.localParticipant) {
        setSuccess('Saving session state...');

        try {
          // Set up promise to listen for save_state response
          const saveResponsePromise = new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Save state operation timed out after 10 seconds'));
            }, 10000);

            const handleSaveResponse = (payload: Uint8Array) => {
              try {
                const decoder = new TextDecoder();
                const text = decoder.decode(payload);
                const data = JSON.parse(text);

                console.log('[PublishTemplate] Received response from browser pod:', data);

                // Check if this is a save_state response
                if (data.success && (data.state_saved !== undefined || data.workspace_saved !== undefined)) {
                  clearTimeout(timeout);
                  room.off('dataReceived', handleSaveResponse);

                  if (data.success) {
                    console.log('[PublishTemplate] Save state completed successfully');
                    // Add extra delay to ensure backend has been notified
                    setTimeout(() => resolve(), 1000);
                  } else {
                    reject(new Error(data.error || 'Save state failed'));
                  }
                }
              } catch (e) {
                console.error('[PublishTemplate] Error parsing response:', e);
              }
            };

            room.on('dataReceived', handleSaveResponse);
          });

          // Send save_state command to jup-session browser pod
          const saveCommand = { action: "save_state" };
          const payload = JSON.stringify(saveCommand);
          const bytes = new TextEncoder().encode(payload);

          await room.localParticipant.publishData(bytes, { reliable: true } as any);
          console.log('[PublishTemplate] save_state command sent to browser pod');

          // Wait for save to complete or timeout
          await saveResponsePromise;
          console.log('[PublishTemplate] Save state confirmed');

        } catch (saveError: any) {
          console.error('[PublishTemplate] Failed to save session state:', saveError);
          throw new Error(`Failed to save session state: ${saveError.message || 'Unknown error'}`);
        }
      } else {
        console.warn('[PublishTemplate] Room not available - skipping save_state. This may fail if session state was not previously saved.');
      }

      // Step 2: Publish template
      setSuccess('Publishing template...');
      console.log('[PublishTemplate] Calling publishCourseTemplate API', { courseId, sessionId });
      const response = await api.publishCourseTemplate(courseId, sessionId);
      console.log('[PublishTemplate] Publish successful:', response);
      setSuccess(response.message || 'Environment published as course template!');
    } catch (err: any) {
      const errorMessage = err?.data?.message || err?.message || 'An unknown error occurred.';
      console.error('[PublishTemplate] Error:', err);
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

