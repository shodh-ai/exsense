'use client';

import React, { ButtonHTMLAttributes } from 'react';

// File: exsense/src/components/button2.tsx



type ButtonVariant = 'primary' | 'secondary' | 'outline';
type ButtonSize = 'small' | 'medium' | 'large' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
    icon?: string;
    iconAlt?: string;
}

const Button: React.FC<ButtonProps> = ({
    children,
    onClick,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    type = 'button',
    className = '',
    icon,
    iconAlt = 'icon',
    ...props
}) => {
    // Applied the new dimensions, padding, border-radius, and gap here.
    // Added flex properties to center content and enable gap.
    const baseClasses =
        'font-medium transition-colors duration-200 focus:outline-none flex items-center justify-center w-[400px] h-[48px] min-w-[140px] rounded-[58px] pt-3 pb-3 pl-[81px] pr-[81px] gap-2';

    const variants: Record<ButtonVariant, string> = {
        primary: 'bg-[#566fe9] text-white hover:bg-[#4a5fd0] disabled:bg-gray-400',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100',
        outline: 'border border-[#566fe9] text-[#566fe9] hover:bg-[#566fe90f] disabled:border-gray-200 disabled:text-gray-400',
    };

    // Removed conflicting padding and dimension classes to allow baseClasses to take priority.
    const sizes: Record<ButtonSize, string> = {
        small: 'text-sm',
        medium: 'text-base',
        large: 'text-lg',
        icon: '', // Dimensions are now handled in baseClasses.
    };

    const buttonClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${disabled ? 'cursor-not-allowed' : ''} ${className}`;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={buttonClasses}
            {...props}
        >
            {icon ? (
                <img src={icon} alt={iconAlt} className="w-6 h-6" />
            ) : (
                children
            )}
        </button>
    );
};

export default Button;
