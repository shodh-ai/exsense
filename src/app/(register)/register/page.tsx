"use client";

import Image from "next/image";
import Link from "next/link";
import { useSignUp, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, FormEvent, useEffect } from "react";
import ShodhAIHero from "@/components/(auth)/ShodhAIHero";
import Sphere from "@/components/Sphere";

export default function Register() {

// File: exsense/src/app/(register)/register/page.tsx


    const router = useRouter();
    const { isSignedIn, user } = useUser();
    const { signUp, isLoaded } = useSignUp();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [verificationStep, setVerificationStep] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");

    // Redirect to session if already signed in
    useEffect(() => {
        if (isSignedIn) {
            router.push("/session");
        }
    }, [isSignedIn, router]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        
        setLoading(true);
        setError("");

        try {
            const result = await signUp.create({
                emailAddress: email,
                password,
            });

            // Send verification email
            await result.prepareEmailAddressVerification({ strategy: "email_code" });
            setVerificationStep(true);
        } catch (err: any) {
            setError(err.errors?.[0]?.message || "An error occurred during registration");
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
                router.push("/session");
            }
        } catch (err: any) {
            setError(err.errors?.[0]?.message || "Verification failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        if (!isLoaded) return;
        try {
            await signUp.authenticateWithRedirect({
                strategy: "oauth_google",
                redirectUrl: "/session",
                redirectUrlComplete: "/session"
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
                redirectUrlComplete: "/session"
            });
        } catch (err: any) {
            setError(err.errors?.[0]?.message || "Facebook sign-up failed");
        }
    };



    return (
        <div className="flex min-h-full w-full items-center justify-center bg-transparent p-4">
            <Sphere />
            <div className="w-full h-full overflow-hidden flex items-center justify-center flex-col p-4 sm:p-6 lg:p-8">
                <ShodhAIHero />

                <div className="w-full max-w-md overflow-auto max-h-full flex flex-col items-center">
                    {!verificationStep ? (
                        <>
                            {/* Registration Form */}
                            <form
                                className="flex flex-col mt-6 md:mt-8 w-full"
                                onSubmit={handleSubmit}
                            >
                                <div className="flex flex-col gap-5 w-full pl-2 pr-2">
                                    <input
                                        type="email"
                                        placeholder="email"
                                        className="h-[48px] border border-[rgba(0,0,0,0.2)] rounded-2xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder-[color:#717171] text-sm"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                    <input
                                        type="password"
                                        placeholder="password"
                                        className="h-[48px] border border-[rgba(0,0,0,0.2)] rounded-2xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder-[color:#717171] text-sm"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="submit"
                                        className="bg-[#566FE9] text-white h-12 rounded-[58px] font-[14px] hover:bg-[#566FE9]/95 transition disabled:opacity-60 disabled:cursor-not-allowed text-sm"
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

                            {/* Social Sign-Up */}
                            <div className="flex flex-col w-full items-center justify-center gap-3 my-4 md:my-6">
                                <div className="text-sm">Sign up with</div>
                                <div className="flex w-full gap-3">
                                    <button
                                        type="button"
                                        onClick={handleGoogleSignUp}
                                        className="flex flex-1 items-center justify-center gap-2 bg-white rounded-full border border-[rgba(86,111,233,0.3)] cursor-pointer text-sm p-3 hover:bg-gray-50 transition-colors"
                                        disabled={!isLoaded}
                                    >
                                        <Image
                                            src="/Google.svg"
                                            alt="Google"
                                            height={20}
                                            width={20}
                                            className="h-5 w-5"
                                        />
                                        Google
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleFacebookSignUp}
                                        className="flex flex-1 items-center justify-center gap-2 bg-white rounded-full border border-[rgba(86,111,233,0.3)] cursor-pointer text-sm p-3 hover:bg-gray-50 transition-colors"
                                        disabled={!isLoaded}
                                    >
                                        <Image
                                            src="/Meta.svg"
                                            alt="Meta"
                                            height={20}
                                            width={20}
                                            className="h-5 w-5"
                                        />
                                        Meta
                                    </button>
                                </div>
                            </div>

                            <hr className="w-full border-[#566FE9]/30" />

                            <div className="w-full text-center flex flex-col gap-4 mt-4 md:mt-6">
                                <Link href="/login" className="text-sm text-black hover:underline">
                                    Already have an account?{" "}
                                    <span className="text-[#566FE9] font-medium">Login</span>
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
                                    className="h-[48px] border border-[rgba(0,0,0,0.2)] rounded-2xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder-[color:#717171] text-sm text-center"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    required
                                />
                                <button
                                    type="submit"
                                    className="bg-[#566FE9] text-white h-12 rounded-[58px] font-[14px] hover:bg-[#566FE9]/95 transition disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                                    disabled={loading || !isLoaded}
                                >
                                    {loading ? "Verifying..." : "Verify Email"}
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
