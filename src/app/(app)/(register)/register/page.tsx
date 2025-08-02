"use client";

import Image from "next/image";
import Link from "next/link";
import { useSignUp, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, FormEvent, useEffect } from "react";
import ShodhAIHero from "@/components/(auth)/ShodhAIHero";
import Sphere from "@/components/Sphere";
import { Plus_Jakarta_Sans } from "next/font/google";

// Initialize the font
const jakarta = Plus_Jakarta_Sans({
    subsets: ["latin"],
    weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export default function Register() {
    const router = useRouter();
    const { isSignedIn } = useUser();
    const { signUp, isLoaded } = useSignUp();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [verificationStep, setVerificationStep] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [resendingCode, setResendingCode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    // State to manage the active toggle: 'learner' or 'expert'
    const [activeUserType, setActiveUserType] = useState<"learner" | "expert">(
        "learner"
    ); // Default to 'learner'

    // Redirect to session if already signed in
    useEffect(() => {
        if (isSignedIn) {
            router.push("/session");
        }
    }, [isSignedIn, router]);

    // Check if there's an existing sign-up in progress
    useEffect(() => {
        if (isLoaded && signUp && signUp.status) {
            if (signUp.status === 'missing_requirements' && 
                signUp.unverifiedFields?.includes('email_address')) {
                setEmail(signUp.emailAddress || '');
                setUsername(signUp.username || '');
                setVerificationStep(true);
            }
        }
    }, [isLoaded, signUp]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        
        setLoading(true);
        setError("");

        try {
            if (isSignedIn) {
                router.push("/session");
                return;
            }
            
            const result = await signUp.create({
                emailAddress: email,
                password,
                username,
            });
            
            if (result.status === "missing_requirements") {
                if (result.unverifiedFields?.includes('email_address')) {
                    await result.prepareEmailAddressVerification({ strategy: "email_code" });
                    setVerificationStep(true);
                } else {
                    setError('Registration incomplete. Please check all required fields.');
                }
            } else if (result.status === "complete") {
                console.log('Registration completed successfully, redirecting to confirmation page');
                // --- CHANGE 1: Redirect to confirmation page ---
                router.push("/confirm-register"); 
            } else {
                try {
                    await result.prepareEmailAddressVerification({ strategy: "email_code" });
                    setVerificationStep(true);
                } catch (verificationError: any) {
                    if (verificationError.message?.includes('No sign up attempt was found')) {
                        // This case might mean the user is already created and signed in during the flow
                        router.push("/session");
                    } else {
                        setError('Failed to send verification email. Please try again.');
                    }
                }
            }
        } catch (err: any) {
            if (err.message?.includes("You're already signed in")) {
                router.push("/session");
                return;
            } else if (err.message?.includes("already exists") || 
                       err.message?.includes("already taken") ||
                       err.errors?.[0]?.message?.includes("already exists") ||
                       err.errors?.[0]?.message?.includes("already taken")) {
                sessionStorage.setItem('loginMessage', 'Account already exists. Please sign in instead.');
                router.push("/login");
                return;
            }
            
            const errorMessage = err.errors?.[0]?.message || err.message || "An error occurred during registration";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleVerification = async (e: FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        
        setLoading(true);
        setError("");

        try {
            const result = await signUp.attemptEmailAddressVerification({
                code: verificationCode,
            });
            
            if (result.status === "complete") {
                console.log('Verification complete, redirecting to confirmation page');
                // --- CHANGE 2: Redirect to confirmation page after verification ---
                router.push("/confirm-register");
            } else {
                setError("Verification incomplete. Please try again.");
            }
        } catch (err: any) {
            if (err.message?.includes('already been verified')) {
                console.log('Verification already completed, redirecting to confirmation page');
                // Optional: You can also redirect here for consistency
                router.push("/confirm-register");
                return;
            }
            const errorMessage = err.errors?.[0]?.message || err.message || "Verification failed";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!isLoaded || !signUp) return;
        setResendingCode(true);
        setError("");
        try {
            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        } catch (err: any) {
            const errorMessage = err.errors?.[0]?.message || err.message || "Failed to resend code";
            setError(errorMessage);
        } finally {
            setResendingCode(false);
        }
    };

    const handleGoogleSignUp = async () => {
        if (!isLoaded) return;
        try {
            await signUp.authenticateWithRedirect({
                strategy: "oauth_google",
                redirectUrl: "/session",
                // --- CHANGE 3: Update final redirect for OAuth ---
                redirectUrlComplete: "/confirm-register" 
            });
        } catch (err: any) {
            setError(err.errors?.[0]?.message || "Google sign-up failed");
        }
    };

    const handleFacebookSignUp = async () => {
        if (!isLoaded) return;
        try {
            await signUp.authenticateWithRedirect({
                strategy: "oauth_facebook",
                redirectUrl: "/session",
                // --- CHANGE 4: Update final redirect for OAuth ---
                redirectUrlComplete: "/confirm-register"
            });
        } catch (err: any) {
            setError(err.errors?.[0]?.message || "Facebook sign-up failed");
        }
    };

    return (
        <div className={`${jakarta.className} flex min-h-full w-full items-center justify-center bg-transparent p-4`}>
            <Sphere />
            {/* The main container for the content, already centers its items */}
            <div className="w-full h-full overflow-hidden flex items-center justify-center flex-col p-4 sm:p-6 lg:p-8">
                <ShodhAIHero />

                {/* Main content wrapper, where the toggle group will be added */}
                <div className="w-full max-w-md overflow-auto max-h-full flex flex-col items-center">
                    {/* --- START OF INLINE TOGGLE GROUP --- */}
                    <div className="flex flex-col items-center gap-2 relative self-stretch w-full mt-6">
                        <div // This div acts as the ToggleGroup container
                            className="flex items-center p-1 relative self-stretch w-full bg-[#566fe91a] rounded-[100px]"
                        >
                            {/* Learner Toggle Button */}
                            <button
                                type="button" // Important: ensures it doesn't submit a form
                                onClick={() => setActiveUserType("learner")}
                                className={`
                                    flex h-10 items-center justify-center gap-2 px-10 py-3 relative flex-1 grow rounded-[40px] overflow-hidden
                                    ${activeUserType === "learner" ? "bg-[#566fe9]" : "bg-transparent"}
                                `}
                            >
                                <img
                                    className="relative w-5 h-5 mt-[-2.00px] mb-[-2.00px]"
                                    alt="Learner Icon" // Changed alt text for clarity
                                    // Dynamically set the image source based on activeUserType
                                    src={activeUserType === "learner" ? "/learneractive.svg" : "/learner.svg"}
                                />
                                <span className={`
                                    relative w-fit mt-[-3.50px] mb-[-1.50px] [font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-sm tracking-[0] leading-[21px] whitespace-nowrap
                                    ${activeUserType === "learner" ? "text-white" : "text-[#566fe9cc]"}
                                `}>
                                    Learner
                                </span>
                            </button>

                            {/* Expert Toggle Button */}
                            <button
                                type="button" // Important: ensures it doesn't submit a form
                                onClick={() => setActiveUserType("expert")}
                                className={`
                                    flex h-10 items-center justify-center gap-2 px-10 py-3 relative flex-1 grow rounded-[40px] overflow-hidden
                                    ${activeUserType === "expert" ? "bg-[#566fe9]" : "bg-transparent"}
                                `}
                            >
                                <img
                                    className="relative w-5 h-5 mt-[-2.00px] mb-[-2.00px]"
                                    alt="Expert Icon" // Changed alt text for clarity
                                    // Dynamically set the image source based on activeUserType
                                    src={activeUserType === "expert" ? "/expertactive.svg" : "/expert.svg"}
                                />
                                <span className={`
                                    relative w-fit mt-[-3.50px] mb-[-1.50px] [font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-sm tracking-[0] leading-[21px] whitespace-nowrap
                                    ${activeUserType === "expert" ? "text-white" : "text-[#566fe9cc]"}
                                `}>
                                    Expert
                                </span>
                            </button>
                        </div>
                    </div>
                    {/* --- END OF INLINE TOGGLE GROUP --- */}

                    {!verificationStep ? (
                        <>
                            <form
                                className="flex flex-col mt-6 md:mt-8 w-full"
                                onSubmit={handleSubmit}
                            >
                                <div className="flex flex-col gap-5 w-full pl-2 pr-2">
                                    <input
                                        type="text"
                                        placeholder="username"
                                        className="h-[48px] border border-[rgba(0,0,0,0.2)] rounded-2xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:[color:#717171] text-sm"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                    <input
                                        type="email"
                                        placeholder="email"
                                        className="h-[48px] border border-[rgba(0,0,0,0.2)] rounded-2xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:[color:#717171] text-sm"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                    <div className="relative w-full">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="password"
                                            className="w-full h-[48px] border border-[rgba(0,0,0,0.2)] rounded-2xl px-4 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:[color:#717171] text-sm"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-semibold text-[#566FE9] leading-normal"
                                        >
                                            {showPassword ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                    <button
                                        type="submit"
                                        className="bg-[#566FE9] text-white h-12 rounded-[58px] hover:bg-[#566FE9]/95 transition disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold"
                                        disabled={loading || !isLoaded}
                                    >
                                        {loading ? "Registering..." : "Sign Up"}
                                    </button>
                                    {error && (
                                        <div className="text-red-500 text-sm text-center pt-2">
                                            {error}
                                        </div>
                                    )}
                                </div>
                            </form>
                            
                            <div className="flex flex-col w-full items-center justify-center gap-3 my-4 md:my-6">
                            <hr className="w-full border-[#566FE9]/30" />
                                <div className="text-sm font-semibold">Sign up with</div>
                                <div className="flex w-full gap-3">
                                    <button
                                        type="button"
                                        onClick={handleGoogleSignUp}
                                        className="flex flex-1 items-center justify-center gap-2 bg-white rounded-full border border-[rgba(86,111,233,0.3)] cursor-pointer text-sm p-3 hover:bg-gray-50 transition-colors"
                                        disabled={!isLoaded}
                                    >
                                        <Image src="/Google.svg" alt="Google" height={20} width={20} className="h-5 w-5" />
                                        <span className="font-semibold">Google</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleFacebookSignUp}
                                        className="flex flex-1 items-center justify-center gap-2 bg-white rounded-full border border-[rgba(86,111,233,0.3)] cursor-pointer text-sm p-3 hover:bg-gray-50 transition-colors"
                                        disabled={!isLoaded}
                                    >
                                        <Image src="/Meta.svg" alt="Meta" height={20} width={20} className="h-5 w-5" />
                                        <span className="font-semibold">Meta</span>
                                    </button>
                                </div>
                            </div>

                            <div className="w-full text-center flex flex-col gap-4 mt-4 md:mt-6">
                                <Link href="/login" className="text-sm text-black hover:underline font-medium">
                                    Already have an account?{" "}
                                    <span className="text-[#566FE9]">Login</span>
                                </Link>
                            </div>
                        </>
                    ) : (
                        /* Verification Form */
                        <form
                            className="flex flex-col mt-6 md:mt-8 w-full"
                            onSubmit={handleVerification}
                        >
                            <div className="flex flex-col gap-5 w-full pl-2 pr-2">
                                <div className="text-center mb-4">
                                    <h3 className="text-lg font-medium mb-2">Check your email</h3>
                                    <p className="text-sm text-gray-600">
                                        We sent a verification code to {email}
                                    </p>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Enter verification code"
                                    className="h-[48px] border border-[rgba(0,0,0,0.2)] rounded-2xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:[color:#717171] text-sm text-center"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    required
                                />
                                <button
                                    type="submit"
                                    className="bg-[#566FE9] text-white h-12 rounded-[58px] hover:bg-[#566FE9]/95 transition disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                                    disabled={loading || !isLoaded}
                                >
                                    {loading ? "Verifying..." : "Verify Email"}
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    className="text-[#566FE9] text-sm hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                                    disabled={resendingCode || !isLoaded}
                                >
                                    {resendingCode ? "Resending..." : "Resend verification code"}
                                </button>
                                
                                {error && (
                                    <div className="text-red-500 text-sm text-center pt-2">
                                        {error}
                                    </div>
                                )}
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}