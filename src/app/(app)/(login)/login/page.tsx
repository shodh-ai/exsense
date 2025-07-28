"use client";

import Image from "next/image";
import Link from "next/link";
import { useSignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, FormEvent, useEffect } from "react";
import ShodhAIHero from "@/components/(auth)/ShodhAIHero";
import Sphere from "@/components/Sphere";

export default function Login() {

// File: exsense/src/app/(login)/login/page.tsx


    const router = useRouter();
    const { isSignedIn, user } = useUser();
    const { signIn, isLoaded } = useSignIn();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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
            const result = await signIn.create({
                identifier: email,
                password,
            });

            if (result.status === "complete") {
                router.push("/session");
            } else {
                setError("Login failed. Please check your credentials.");
            }
        } catch (err: any) {
            setError(err.errors?.[0]?.message || "An error occurred during login");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        if (!isLoaded) return;
        try {
            await signIn.authenticateWithRedirect({
                strategy: "oauth_google",
                redirectUrl: "/session",
                redirectUrlComplete: "/session"
            });
        } catch (err: any) {
            setError(err.errors?.[0]?.message || "Google sign-in failed");
        }
    };

    const handleFacebookSignIn = async () => {
        if (!isLoaded) return;
        try {
            await signIn.authenticateWithRedirect({
                strategy: "oauth_facebook",
                redirectUrl: "/session",
                redirectUrlComplete: "/session"
            });
        } catch (err: any) {
            setError(err.errors?.[0]?.message || "Facebook sign-in failed");
        }
    };

    return (
        <div className="w-full h-full overflow-hidden flex items-center justify-center flex-col p-4 sm:p-6 lg:p-8">
            <Sphere />
            <ShodhAIHero />

            {/* Scrollable inner content, just in case small screens */}
            <div className="w-full max-w-md overflow-auto max-h-full flex flex-col items-center">
                {/* Form */}
                <form
                    className="flex flex-col mt-6 md:mt-8 w-full"
                    onSubmit={handleSubmit}
                >
                    <div className="flex flex-col gap-5 w-full pl-2 pr-2">
                        <input
                            type="email"
                            placeholder="email"
                            className="h-12 border border-[rgba(0,0,0,0.2)] rounded-2xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder-[color:#717171] text-sm"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="password"
                            className="h-12 border border-[rgba(0,0,0,0.2)] rounded-2xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:[color:#717171] text-sm"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            className="bg-[#566FE9] text-white h-12 rounded-[58px] font-medium hover:bg-[#566FE9]/95 transition disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                            disabled={loading || !isLoaded}
                        >
                            {loading ? "Logging in..." : "Login"}
                        </button>
                        {error && (
                            <div className="text-red-500 text-sm text-center pt-2">
                                {error}
                            </div>
                        )}
                    </div>
                </form>

                {/* Social Login */}
                <div className="flex flex-col w-full items-center justify-center gap-3 my-4 md:my-6">
                    <div className="text-sm">Login with</div>
                    <div className="flex w-full gap-3">
                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
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
                            onClick={handleFacebookSignIn}
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

                {/* Footer Links */}
                <div className="w-full text-center flex flex-col gap-8 mt-4 md:mt-6">
                    <Link
                        href="/forgotpassword"
                        className="text-sm text-black hover:underline"
                    >
                        Forgot Password?
                    </Link>
                    <Link
                        href="/register"
                        className="text-sm text-black hover:underline"
                    >
                        Don't have an account?{" "}
                        <span className="text-[#566FE9] font-medium">Register</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
