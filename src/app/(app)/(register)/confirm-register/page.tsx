"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ShodhAIHero from "@/components/(auth)/ShodhAIHero";
import Sphere from "@/components/Sphere";
import { useUser } from "@clerk/nextjs";

export default function ConfirmRegister() {

// File: exsense/src/app/(register)/confirm-register/page.tsx


    const router = useRouter();
    const { user, isSignedIn, isLoaded } = useUser();

    // Promote role to publicMetadata if needed (after email or OAuth sign-up)
    useEffect(() => {
        if (!isLoaded || !isSignedIn || !user) return;
        const currentPublicRole = ((user.publicMetadata as any)?.role as string) || undefined;
        const unsafeRole = ((user.unsafeMetadata as any)?.role as string) || undefined;
        let pendingRole: string | undefined;
        try { pendingRole = window.localStorage.getItem('pendingRole') || undefined; } catch {}
        const desired = pendingRole || currentPublicRole || unsafeRole;
        if (!desired || currentPublicRole === desired) {
            try { window.localStorage.removeItem('pendingRole'); } catch {}
            return;
        }
        // Use server-side API to promote to publicMetadata
        fetch('/api/promote-role', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ role: desired })
        })
            .then(() => { try { window.localStorage.removeItem('pendingRole'); } catch {} })
            .catch(() => {});
    }, [isLoaded, isSignedIn, user]);

    useEffect(() => {
        const timer = setTimeout(() => {
            router.push("/registration-test");
        }, 5000);

        return () => clearTimeout(timer);
    }, [router]);

    const handleContinue = () => {
        router.push("/registration-test");
    };

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
                        You will be redirected to your registration test in a few seconds.
                    </div>
                </div>
                <button
                    onClick={handleContinue}
                    className="w-full max-w-md h-10 sm:h-12 bg-[#566FE9] hover:bg-[#4a5fcf] transition-colors rounded-full text-white text-sm sm:text-base font-semibold"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
