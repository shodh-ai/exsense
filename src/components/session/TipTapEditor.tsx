"use client";

import React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { Editor } from '@tiptap/core';

export interface TipTapEditorProps {
  className?: string;
  initialContent?: string;
  placeholder?: string;
  onUpdate?: (html: string) => void;
}

// Minimal TipTap editor with StarterKit
export default function TipTapEditor({ className, initialContent, placeholder = 'Start typing…', onUpdate }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: initialContent || '<p></p>',
    editorProps: {
      attributes: {
        class: [
          'prose prose-invert max-w-none',
          'focus:outline-none',
          'px-4 py-3',
          'min-h-[300px] h-full',
        ].join(' '),
        'data-placeholder': placeholder,
      },
    },
    // Avoid hydration mismatches when SSR is detected
    immediatelyRender: false,
    onUpdate: ({ editor }: { editor: Editor }) => {
      onUpdate?.(editor.getHTML());
    },
  });

  return (
    <div className={className}>
      <div className="border-b border-[#2A2F4A] px-3 py-2 text-xs text-white/60">
        Rich Text Editor (TipTap)
      </div>
      <EditorContent editor={editor} />
      <style jsx global>{`
        .ProseMirror {
          background: transparent;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          color: rgba(255, 255, 255, 0.4);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
