"use client";

import React, { useState } from 'react';
import { useSessionStore } from '@/lib/store';
import { Plus as PlusIcon, X as XIcon } from 'lucide-react';

// A simple dialog for getting the new tab info
const NewTabDialog = ({ onClose, onSubmit }: { onClose: () => void, onSubmit: (name: string, url: string) => void }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = () => {
    if (name.trim() && url.trim()) {
      // Basic URL validation
      let finalUrl = url.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
      onSubmit(name, finalUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white p-5 rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Open a New Tab</h3>
        <input
          type="text"
          placeholder="Tab Name (e.g., Salesforce)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-3 text-sm"
        />
        <input
          type="text"
          placeholder="URL (e.g., google.com)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-4 text-sm"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded text-sm font-semibold hover:bg-gray-100">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-[#566FE9] text-white rounded text-sm font-semibold hover:bg-[#4a5fd0]">Open</button>
        </div>
      </div>
    </div>
  );
};

// The main TabManager component
export const TabManager = ({ onSwitchTab, onOpenNewTab, onCloseTab }: { onSwitchTab: (id: string) => void, onOpenNewTab: (name: string, url: string) => void, onCloseTab: (id: string) => void }) => {
  const tabs = useSessionStore((s) => s.tabs);
  const activeTabId = useSessionStore((s) => s.activeTabId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center bg-gray-200/80 px-2 py-1 flex-shrink-0 border-b border-gray-300">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => onSwitchTab(tab.id)}
            className={`flex items-center gap-2 cursor-pointer px-4 py-1.5 text-sm rounded-t-md border-b-2 ${
              activeTabId === tab.id
                ? 'bg-white font-semibold border-[#566FE9]'
                : 'bg-gray-100/50 hover:bg-gray-100 border-transparent'
            }`}
          >
            <span>{tab.name}</span>
            {/* Add a close button if needed */}
            {tabs.length > 1 && (
              <button onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }} className="p-0.5 rounded-full hover:bg-red-100 text-red-500">
                <XIcon size={14} />
              </button>
            )}
          </div>
        ))}
        <button onClick={() => setIsDialogOpen(true)} className="ml-2 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-300" aria-label="Open new tab">
          <PlusIcon size={18} />
        </button>
      </div>
      {isDialogOpen && (
        <NewTabDialog
          onClose={() => setIsDialogOpen(false)}
          onSubmit={onOpenNewTab}
        />
      )}
    </>
  );
};
