"use client";

import React, { useEffect } from 'react';
import { useSessionStore } from '@/lib/store';

export const StatusPillProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const message = useSessionStore((s) => s.notificationMessage);
  const clear = useSessionStore((s) => s.clearNotification);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => clear(), 3000);
    return () => clearTimeout(t);
  }, [message, clear]);

  return (
    <>
      {children}
    </>
  );
};
