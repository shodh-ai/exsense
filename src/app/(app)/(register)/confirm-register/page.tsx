"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import ShodhAIHero from "@/components/(auth)/ShodhAIHero";
import Sphere from "@/components/compositions/Sphere";
import { useUser } from "@clerk/nextjs";

export default function ConfirmRegister() {
    const router = useRouter();
    const { user, isSignedIn, isLoaded } = useUser();
    
    // State to manage redirection and prevent double-redirects
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Finalizing your account...");

    // useCallback ensures this function's identity is stable across re-renders
    const getDesiredRole = useCallback(() => {
        if (!user) return 'learner'; // Return default if user is not loaded
        
        const currentPublicRole = (user.publicMetadata as any)?.role as string | undefined;
        const unsafeRole = (user.unsafeMetadata as any)?.role as string | undefined;
        let pendingRole: string | undefined;
        try {
            pendingRole = window.localStorage.getItem('pendingRole') || undefined;
        } catch {}
        
        // Priority: pendingRole > unsafeMetadata > publicMetadata > fallback
        return pendingRole || unsafeRole || currentPublicRole || 'learner';
    }, [user]);

    // useCallback for the navigation logic
    const navigateToDashboard = useCallback(() => {
        if (isRedirecting) return;
        setIsRedirecting(true);

        const role = getDesiredRole();
        const destination = role.toLowerCase() === 'expert' ? '/teacher-dash' : '/student_dashboard';
        
        try {
            window.localStorage.removeItem('pendingRole');
        } catch {}

        router.push(destination);
    }, [isRedirecting, router, getDesiredRole]);

    // This single useEffect handles role promotion and redirection
    useEffect(() => {
        if (!isLoaded || !isSignedIn || !user) {
            return; // Wait until Clerk is ready
        }
        
        const desiredRole = getDesiredRole();
        const publicRole = (user.publicMetadata as any)?.role as string | undefined;

        if (publicRole === desiredRole) {
            setStatusMessage("Redirecting you to your dashboard...");
            const timer = setTimeout(navigateToDashboard, 2000);
            return () => clearTimeout(timer);
        }

        // Role needs to be promoted from unsafe/pending to public metadata
        fetch('/api/promote-role', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ role: desiredRole })
        })
        .catch((err) => {
            console.error("Failed to promote user role:", err);
            // Even on failure, we proceed, as the role might be in unsafeMetadata
        })
        .finally(() => {
            setStatusMessage("Redirecting you to your dashboard...");
            const timer = setTimeout(navigateToDashboard, 2000);
            return () => clearTimeout(timer);
        });

    }, [isLoaded, isSignedIn, user, getDesiredRole, navigateToDashboard]);


    return (
        <div className="flex min-h-full w-full items-center justify-center bg-transparent p-4">
            <Sphere />
            <div className="w-full h-full flex items-center justify-center flex-col p-4 md:p-6 gap-6 md:gap-8">
                <ShodhAIHero />
                <div className="flex flex-col gap-2 sm:gap-3 w-full max-w-md text-center">
                    <div className="font-semibold text-2xl sm:text-3xl md:text-4xl leading-[130%] tracking-tight text-[#566FE9]">
                        Account Created!
                    </div>
                    <div className="text-sm sm:text-base text-gray-700">
                        {statusMessage}
                    </div>
                </div>
                <button
                    onClick={navigateToDashboard}
                    className="w-full max-w-md h-10 sm:h-12 bg-[#566FE9] hover:bg-[#4a5fcf] transition-colors rounded-full text-white text-sm sm:text-base font-semibold"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}

