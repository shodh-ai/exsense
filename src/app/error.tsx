'use client';

import React from "react";
import ErrorPage from "./(app)/error";

export default function AppError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorPage {...props} />;
}
