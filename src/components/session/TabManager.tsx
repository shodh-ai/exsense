"use client";

import React, { useState } from 'react';
import { useSessionStore } from '@/lib/store';
import { Plus as PlusIcon, X as XIcon, ChevronLeft, ChevronRight, RefreshCw as RotateCwIcon } from 'lucide-react';

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


// The main TabManager component updated with the new UI
export const TabManager = ({ onSwitchTab, onOpenNewTab, onCloseTab }: { onSwitchTab: (id: string) => void, onOpenNewTab: (name: string, url: string) => void, onCloseTab: (id: string) => void }) => {
  const tabs = useSessionStore((s) => s.tabs);
  const activeTabId = useSessionStore((s) => s.activeTabId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenNewTab = (name: string, url: string) => {
    onOpenNewTab(name, url);
    setIsDialogOpen(false); // Close dialog after submitting
  };
  
  return (
    <>
      <nav className="flex w-full max-w-full items-center gap-1 pl-2 pr-1 py-1 bg-[#e9ebfd] rounded-lg">
        {/* Navigation Buttons */}
        <div className="relative flex-[0_0_auto] inline-flex items-center pr-[12px]">
          <button className="h-auto gap-2.5 p-2 flex-[0_0_auto] bg-[#e9ebfd] hover:bg-[#d9dbf0] rounded-[100px]">
            <ChevronLeft className="w-5 h-5 text-[#566fe9]" />
          </button>
          <button className="h-auto gap-2.5 p-2 flex-[0_0_auto] bg-[#e9ebfd] hover:bg-[#d9dbf0] rounded-[100px]">
            <ChevronRight className="w-5 h-5 text-[#566fe9]" />
          </button>
          <button className="h-auto gap-2.5 p-2 flex-[0_0_auto] bg-[#e9ebfd] hover:bg-[#d9dbf0] rounded-[100px]">
            <RotateCwIcon className="w-4 h-4 text-[#566fe9]" />
          </button>
        </div>

        {/* Tabs Container */}
        <div className="gap-1 relative flex items-center overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSwitchTab(tab.id)}
              className={`h-auto flex w-[210px] pl-3 pr-2 py-2 items-center gap-2 rounded-[100px] transition-colors flex-shrink-0 ${
                activeTabId === tab.id
                  ? "bg-[#566fe9] hover:bg-[#4a5fd0] text-white"
                  : "bg-white hover:bg-[#f5f6ff] text-[#566fe9]"
              }`}
            >
              <span className="flex-1 text-left text-sm truncate">
                {tab.name}
              </span>
              {/* Show close icon only if it's the active tab and there's more than one tab */}
              {tabs.length > 1 && (
                <div
                    onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
                    className="p-0.5 rounded-full cursor-pointer hover:bg-white/20 transition-colors"
                    role="button"
                    aria-label="Close tab"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onCloseTab(tab.id); } }}
                >
                    <XIcon className="w-4 h-4" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Add New Tab Button */}
        <button
          onClick={() => setIsDialogOpen(true)}
          className="h-auto inline-flex p-2 flex-[0_0_auto] bg-white hover:bg-[#f5f6ff] items-center gap-1 rounded-[100px]"
        >
          <PlusIcon className="w-4 h-4 text-[#566fe9]" />
        </button>
      </nav>

      {/* Dialog for new tab */}
      {isDialogOpen && (
        <NewTabDialog
          onClose={() => setIsDialogOpen(false)}
          onSubmit={handleOpenNewTab}
        />
      )}
    </>
  );
};