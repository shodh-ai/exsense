'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface EndSessionButtonProps {
  deleteSessionNow: () => Promise<void>;
  className?: string;
}

/**
 * EndSessionButton - Explicitly ends the user's session
 * 
 * This button calls deleteSessionNow() which sends DELETE with force=true,
 * bypassing the grace period for immediate pod cleanup.
 * 
 * Use this when the user intentionally wants to leave (not just refresh).
 */
export function EndSessionButton({ deleteSessionNow, className }: EndSessionButtonProps) {
  const [isEnding, setIsEnding] = useState(false);
  const router = useRouter();

  const handleEndSession = async () => {
    if (isEnding) return;

    const confirmed = window.confirm(
      'Are you sure you want to end your session? This will close your workspace and you will need to start a new session.'
    );

    if (!confirmed) return;

    try {
      setIsEnding(true);
      console.log('[EndSession] User initiated session end');

      // Call the force delete function (bypasses grace period)
      await deleteSessionNow();

      console.log('[EndSession] Session deletion successful');

      // Optional: Navigate user to a safe landing page
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);

    } catch (error) {
      console.error('[EndSession] Failed to end session:', error);
      alert('Failed to end session. Please try again.');
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <button
      onClick={handleEndSession}
      disabled={isEnding}
      className={className || "px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"}
      aria-label="End Session"
    >
      {isEnding ? 'Ending Session...' : 'End Session'}
    </button>
  );
}