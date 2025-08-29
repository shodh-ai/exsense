"use client";

import React, { JSX } from 'react';
import CirriculumEditor from '@/components/CirriculumEditor';

/**
 * The main page for the curriculum editor route.
 * Its sole responsibility is to render the editor component.
 */
export default function EditorPage(): JSX.Element {
  return <CirriculumEditor />;
}