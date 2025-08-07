import React, { useState, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils'; // Make sure you have this utility function

// --- You can place these icons in a separate file or keep them here ---
const SpinnerIcon = ({ className }: { className?: string }) => (
    <svg className={cn('animate-spin', className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);
const SuccessIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);
const ErrorIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

// --- CVA variants for styling (same as before) ---
const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    { variants: { variant: { default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90', destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90', outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground', secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80', ghost: 'hover:bg-accent hover:text-accent-foreground', link: 'text-primary underline-offset-4 hover:underline', }, size: { default: 'h-9 px-4 py-2', sm: 'h-8 rounded-md px-3 text-xs', lg: 'h-10 rounded-md px-8', icon: 'h-9 w-9', }, }, defaultVariants: { variant: 'default', size: 'default', }, }
);

// --- Simplified Props ---
// We removed `isSubmitting` and `submissionStatus` from the props.
export interface FooterSubmitButtonProps
    extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>,
    VariantProps<typeof buttonVariants> {
    successMessage?: string;
    errorMessage?: string;
    // An optional prop to decide if the simulated submission should fail
    shouldFail?: boolean;
    // An optional onClick if you need to run extra logic
    onClick?: () => void | Promise<void>;
}

/**
 * A self-contained button that manages its own submission state internally.
 * Perfect for simple actions like a newsletter signup in a footer.
 */
export const FooterSubmitButton = React.forwardRef<HTMLButtonElement, FooterSubmitButtonProps>(
    (
        {
            className,
            variant,
            size,
            successMessage = 'Subscribed!',
            errorMessage = 'Something went wrong.',
            shouldFail = false,
            children = 'Subscribe',
            onClick,
            ...props
        },
        ref
    ) => {
        // --- Internal State Management ---
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [submissionStatus, setSubmissionStatus] = useState<'success' | 'error' | null>(null);
        const [message, setMessage] = useState<string | null>(null);
        const [showStatus, setShowStatus] = useState(false);

        // Effect to show and hide the success/error message tooltip
        useEffect(() => {
            if (submissionStatus) {
                console.log(`Status changed to: ${submissionStatus}`);
                setShowStatus(true);
                const statusMessage = submissionStatus === 'success' ? successMessage : errorMessage;
                setMessage(statusMessage);

                const timer = setTimeout(() => {
                    setShowStatus(false);
                    setSubmissionStatus(null);
                    console.log('Status message hidden.');
                }, 3000); // Message disappears after 3 seconds

                return () => clearTimeout(timer);
            }
        }, [submissionStatus, successMessage, errorMessage]);

        // --- Internal Submission Handler ---
        const handleSubmit = async () => {
            if (isSubmitting || showStatus) return;

            setIsSubmitting(true);
            console.log('--- Submission Started ---');

            // Run any external onClick logic if provided
            if (onClick) await onClick();

            // Simulate a 2-second network request
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Set the result based on the `shouldFail` prop
            if (shouldFail) {
                setSubmissionStatus('error');
            } else {
                setSubmissionStatus('success');
            }

            setIsSubmitting(false);
            console.log('--- Submission Finished ---');
        };

        const renderButtonContent = () => {
            if (isSubmitting) return <><SpinnerIcon />Submitting...</>;
            if (showStatus) {
                if (submissionStatus === 'success') return <SuccessIcon />;
                if (submissionStatus === 'error') return <ErrorIcon />;
            }
            return children;
        };

        return (
            <div className="relative inline-flex items-center">
                <button
                    className={cn(buttonVariants({ variant, size, className }))}
                    ref={ref}
                    onClick={handleSubmit}
                    disabled={isSubmitting || showStatus}
                    {...props}
                >
                    {renderButtonContent()}
                </button>
                {showStatus && message && (
                    <div
                        className={`absolute bottom-full z-10 mb-2 w-max rounded-md px-3 py-1.5 text-sm font-medium text-white ${
                            submissionStatus === 'success' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                    >
                        {message}
                    </div>
                )}
            </div>
        );
    }
);

FooterSubmitButton.displayName = 'FooterSubmitButton';