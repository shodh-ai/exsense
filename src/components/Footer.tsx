import React from 'react';
import { MicButton } from '@/components/MicButton';
// Commenting out InteractiveMessageButton if it's not ready yet
// import { InteractiveMessageButton } from '@/components/ui/message-button';

export default function Footer() {
    return (
        <footer className="absolute bottom-0 w-full h-[60px] flex items-center justify-center p-4 text-xs text-gray-400 ">
            {/* This can be adjusted as you build out the full footer UI */}
            <div className="flex items-center gap-[14vw] ">
                {/*
          The MicButton is now much simpler. It no longer needs any props like isVisible.
          It knows its own state by listening to the global Zustand store.
          We only need one instance of it for the user to interact with.
        */}
                <MicButton />
                {/* <InteractiveMessageButton ... /> */}
                <button className="bg-blue-500 text-white px-4 py-2 rounded-[50px]">Send</button>
            </div>
        </footer>
    );
}