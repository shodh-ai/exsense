"use client";

import Image from "next/image";
import Link from "next/link";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import ShodhAIHero from "@/components/(auth)/ShodhAIHero";
import Sphere from "@/components/compositions/Sphere";
import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
    subsets: ["latin"],
    weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export default function Register() {
    const router = useRouter();
    const { isLoaded, signUp, setActive } = useSignUp();
    const [email, setEmail] = useState("");
    // --- ADDED: State for the new username field ---
    const [username, setUsername] = useState("");
    // --- END ADDED ---
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [activeUserType, setActiveUserType] = useState<"learner" | "expert">(
        "learner"
    );

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;

        setLoading(true);
        setError("");

        try {
            window.localStorage.setItem('pendingRole', activeUserType);
        } catch (err) {
            console.error("Failed to save pendingRole to localStorage", err);
        }

        try {
            // --- MODIFIED: Pass the username to the create method ---
            const result = await signUp.create({
                emailAddress: email,
                username: username, // Pass the new username
                password,
                unsafeMetadata: { role: activeUserType },
            });
            // --- END MODIFICATION ---

            // With all required fields provided, the status should be "complete"
            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                router.push("/confirm-register");
            } else {
                // This is a fallback in case something unexpected happens
                console.error("Sign-up status not complete:", result);
                setError("Could not complete registration. Please check your details.");
            }

        } catch (err: any) {
            const errorMessage = err.errors?.[0]?.longMessage || err.message || "An error occurred during registration.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };
    
    // Social sign-up handlers remain the same
    const handleSocialSignUp = async (strategy: "oauth_google" | "oauth_facebook") => {
        if (!isLoaded) return;
        try {
            window.localStorage.setItem('pendingRole', activeUserType);
        } catch {}
        try {
            await signUp.authenticateWithRedirect({
                strategy,
                redirectUrl: "/confirm-register",
                redirectUrlComplete: "/confirm-register",
            });
        } catch (err: any) {
            setError(err.errors?.[0]?.message || `Failed to sign up with ${strategy}.`);
        }
    };

    return (
        <div className={`${jakarta.className} w-full h-[90%] overflow-hidden flex items-center justify-center flex-col p-4 sm:p-6 lg:p-8`}>
            <Sphere />
            <ShodhAIHero />
            {/* Added pr-2 for a gap between the content and the scrollbar */}
            <div className="w-full max-w-md overflow-auto h-full flex flex-col items-center custom-scrollbar ">
                {/* --- LEARNER/EXPERT TOGGLE (No changes here) --- */}
                <div className="flex flex-col items-center gap-2 relative self-stretch w-full mt-6">
                    <div className="flex items-center p-1 relative self-stretch w-full bg-[#566fe91a] rounded-[100px]">
                        <button type="button" onClick={() => setActiveUserType("learner")} className={`flex h-10 items-center justify-center gap-2 px-10 py-3 relative flex-1 grow rounded-[40px] transition-colors ${activeUserType === "learner" ? "bg-[#566fe9]" : "bg-transparent"}`}>
                            <Image className="relative w-5 h-5" alt="Learner Icon" src={activeUserType === "learner" ? "/learnactive.svg" : "/learner.svg"} width={20} height={20} />
                            <span className={`relative font-semibold text-sm whitespace-nowrap ${activeUserType === "learner" ? "text-white" : "text-[#566fe9cc]"}`}>Learner</span>
                        </button>
                        <button type="button" onClick={() => setActiveUserType("expert")} className={`flex h-10 items-center justify-center gap-2 px-10 py-3 relative flex-1 grow rounded-[40px] transition-colors ${activeUserType === "expert" ? "bg-[#566fe9]" : "bg-transparent"}`}>
                            <Image className="relative w-5 h-5" alt="Expert Icon" src={activeUserType === "expert" ? "/Expertactive.svg" : "/Expert.svg"} width={20} height={20} />
                            <span className={`relative font-semibold text-sm whitespace-nowrap ${activeUserType === "expert" ? "text-white" : "text-[#566fe9cc]"}`}>Expert</span>
                        </button>
                    </div>
                </div>

                {/* --- REGISTRATION FORM --- */}
                <form className="flex flex-col mt-6 md:mt-8 w-full" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-5 w-full pl-2 pr-2">
                        <input type="email" placeholder="email" className="h-12 border border-[rgba(0,0,0,0.2)] rounded-[100px] px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:[color:#717171] text-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        
                        {/* --- ADDED: Username input field --- */}
                        <input type="text" placeholder="username" className="h-12 border border-[rgba(0,0,0,0.2)] rounded-[100px] px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:[color:#717171] text-sm" value={username} onChange={(e) => setUsername(e.target.value)} required />
                        {/* --- END ADDED --- */}

                        <div className="relative w-full">
                             <input type={showPassword ? "text" : "password"} placeholder="password" className="w-full h-12 border border-[rgba(0,0,0,0.2)] rounded-[100px] px-4 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:[color:#717171] text-sm" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-semibold text-[#566FE9] leading-normal">
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                        <button type="submit" className="bg-[#566FE9] text-white h-12 rounded-[58px] font-semibold hover:bg-[#566FE9]/95 transition disabled:opacity-60 disabled:cursor-not-allowed text-sm" disabled={loading || !isLoaded}>
                            {loading ? "Creating Account..." : "Register"}
                        </button>
                        {error && <div className="text-red-500 text-sm text-center pt-2">{error}</div>}
                    </div>
                </form>

                {/* --- SOCIAL SIGN-UP (No changes here) --- */}
                <div className="flex flex-col w-full items-center justify-center gap-3 my-4 md:my-6">
                    <hr className="w-full border-[#566FE9]/30" />
                    <div className="text-sm font-semibold">Register with</div>
                    <div className="flex w-full gap-3">
                        <button type="button" onClick={() => handleSocialSignUp('oauth_google')} className="flex flex-1 items-center justify-center gap-2 bg-white rounded-full border border-[rgba(86,111,233,0.3)] cursor-pointer text-sm p-3 hover:bg-gray-50 transition-colors" disabled={!isLoaded}>
                            <Image src="/Google.svg" alt="Google" height={20} width={20} className="h-5 w-5" />
                            <span className="font-semibold">Google</span>
                        </button>
                        <button type="button" onClick={() => handleSocialSignUp('oauth_facebook')} className="flex flex-1 items-center justify-center gap-2 bg-white rounded-full border border-[rgba(86,111,233,0.3)] cursor-pointer text-sm p-3 hover:bg-gray-50 transition-colors" disabled={!isLoaded}>
                            <Image src="/Meta.svg" alt="Meta" height={20} width={20} className="h-5 w-5" />
                            <span className="font-semibold">Meta</span>
                        </button>
                    </div>
                </div>

                <div className="w-full text-center mt-4 md:mt-6">
                    <Link href="/login" className="text-sm text-black hover:underline font-medium">
                        Already have an account? <span className="text-[#566FE9]">Login</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

