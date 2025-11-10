"use client";

import React from 'react';

interface StatusPillProps {
  message: string;
  type: 'ai' | 'notification';
}

// This helper function returns the correct <img> tag for the current state.
const getIconForState = (message: string, type: 'ai' | 'notification') => {
    const lowerCaseMessage = message.toLowerCase();
    // The icon itself should be 20x20px to fit inside the 40x40 container with 10px padding.
    const iconClasses = "w-5 h-5"; 

    // Condition 2: Any notification (e.g., "Screenshot sent", "Script saved")
    if (type === 'notification') {
        return (
            <img 
                src="/Correct.svg" 
                alt="Notification" 
                className={iconClasses} 
            />
        );
    }

    // Condition 1: The specific "Waiting for your input..." message
    if (lowerCaseMessage === 'waiting for your input...') {
        return (
            <img 
                src="/general.svg" 
                alt="Waiting for input" 
                className={iconClasses} 
            />
        );
    }

    // Condition 3: Rest all cases for the AI
    return (
        <img 
            src="/listen.svg" 
            alt="AI is Thinking" 
            className={`${iconClasses} animate-pulse`} 
        />
    );
};


export const StatusPill: React.FC<StatusPillProps> = ({ message, type }) => {
    if (!message) return null;

    // Positioning to align with the buttons on the same x-axis
    const pillPositionStyle: React.CSSProperties = {
        bottom: '48px', // aligned with button bottom position
        left: '50%',
        transform: 'translateX(-50%)'
    };


    return (
        <div 
            className="fixed z-50 pointer-events-none transition-opacity duration-300 animate-fade-in"
            style={pillPositionStyle}
        >
             {/* 
                - Using "inline-flex" ensures the container's width shrinks and grows
                  to perfectly fit the content inside it. This is the "hug" effect.
                - All other styles for height, color, padding, and gap remain.
             */}
             <div 
                className="inline-flex items-center h-[48px] bg-[#F6F6FE] border border-[#E9EBFD] rounded-full pl-1 pr-4 gap-[10px]"
            >
                {/* 
                    This is the container for the icon.
                */}
                <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full bg-[#566FE9]">
                    {getIconForState(message, type)}
                </div>

                {/* 
                    - "whitespace-nowrap" is crucial. It prevents the text from wrapping to a new
                      line, forcing the container to expand horizontally.
                */}
                <span className="font-semibold text-base leading-5 text-[#566FE9] whitespace-nowrap">
                    {message}
                </span>
            </div>
        </div>
    );
};