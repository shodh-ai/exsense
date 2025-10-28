"use client";

import Image from "next/image"; // Already imported, which is great
import Link from "next/link";
import { useSignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, FormEvent, useEffect } from "react";
import ShodhAIHero from "@/components/(auth)/ShodhAIHero";
import Sphere from "@/components/compositions/Sphere";
import { Plus_Jakarta_Sans } from "next/font/google";

// Initialize the font
const jakarta = Plus_Jakarta_Sans({
    subsets: ["latin"],
    weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export default function Login() {
    const router = useRouter();
    const { isSignedIn, user } = useUser();
    const { signIn, isLoaded, setActive } = useSignIn();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [activeUserType, setActiveUserType] = useState<"learner" | "expert">(
        "learner"
    );

    useEffect(() => {
        if (isSignedIn && user) {
            const userRole = ((user.publicMetadata as any)?.role as string) || ((user.unsafeMetadata as any)?.role as string) || 'learner';
            console.log("User already signed in with role:", userRole);
            if (userRole === 'expert') {
                router.push("/teacher-dash");
            } else {
                router.push("/student_dashboard");
            }
        }
    }, [isSignedIn, user, router]);

    useEffect(() => {
        const loginMessage = sessionStorage.getItem('loginMessage');
        if (loginMessage) {
            setMessage(loginMessage);
            sessionStorage.removeItem('loginMessage');
        }
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        
        setLoading(true);
        setError("");

        try {
            if (isSignedIn) {
                const userRole = ((user?.publicMetadata as any)?.role as string) || ((user?.unsafeMetadata as any)?.role as string) || 'learner';
                if (userRole === 'expert') {
                    router.push("/teacher-dash");
                } else {
                    router.push("/student_dashboard");
                }
                return;
            }
            
            const result = await signIn.create({
                identifier: email,
                password,
            });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                return;
            } else {
                setError("Login failed. Please check your credentials.");
            }
        } catch (err: any) {
             if (err.message?.includes("You're already signed in")) {
                const userRole = ((user?.publicMetadata as any)?.role as string) || ((user?.unsafeMetadata as any)?.role as string) || 'learner';
                if (userRole === 'expert') {
                    router.push("/teacher-dash");
                } else {
                    router.push("/student_dashboard");
                }
                return;
            } else if (err.message?.includes("Invalid authentication credentials")) {
                setError("Invalid email or password. Please try again.");
            } else if (err.message?.includes("Too many requests")) {
                setError("Too many login attempts. Please wait a moment and try again.");
            } else {
                const errorMessage = err.errors?.[0]?.message || err.message || "An error occurred during login";
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        if (!isLoaded) return;
        try {
            try { window.localStorage.setItem('pendingRole', activeUserType); } catch {}
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
            try { window.localStorage.setItem('pendingRole', activeUserType); } catch {}
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
        <div className={`${jakarta.className} w-full h-[90%] overflow-hidden flex items-center justify-center flex-col p-4 sm:p-6 lg:p-8`}>
            <Sphere />
            <ShodhAIHero />
            <div className="w-full max-w-md overflow-auto max-h-full flex flex-col items-center custom-scrollbar pr-[2px]" >
                {/* --- LEARNER/EXPERT TOGGLE --- */} 
                <div className="flex flex-col items-center gap-2 relative self-stretch w-full mt-6">
                    <div className="flex items-center p-1 relative self-stretch w-full bg-[#566fe91a] rounded-[100px]">
                        <button
                            type="button"
                            onClick={() => setActiveUserType("learner")}
                            className={`flex h-10 items-center justify-center gap-2 px-10 py-3 relative flex-1 grow rounded-[40px] overflow-hidden transition-colors ${activeUserType === "learner" ? "bg-[#566fe9]" : "bg-transparent"}`}
                        >
                            {/* --- MODIFICATION START --- */}
                            <Image 
                                className="relative w-5 h-5" 
                                alt="Learner Icon" 
                                src={activeUserType === "learner" ? "/learnactive.svg" : "/learner.svg"} 
                                width={20}
                                height={20}
                            />
                            {/* --- MODIFICATION END --- */}
                            <span className={`relative font-semibold text-sm whitespace-nowrap ${activeUserType === "learner" ? "text-white" : "text-[#566fe9cc]"}`}>
                                Learner
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveUserType("expert")}
                            className={`flex h-10 items-center justify-center gap-2 px-10 py-3 relative flex-1 grow rounded-[40px] overflow-hidden transition-colors ${activeUserType === "expert" ? "bg-[#566fe9]" : "bg-transparent"}`}
                        >
                            {/* --- MODIFICATION START --- */}
                            <Image 
                                className="relative w-5 h-5" 
                                alt="Expert Icon" 
                                src={activeUserType === "expert" ? "/Expertactive.svg" : "/Expert.svg"} 
                                width={20}
                                height={20}
                            />
                            {/* --- MODIFICATION END --- */}
                            <span className={`relative font-semibold text-sm whitespace-nowrap ${activeUserType === "expert" ? "text-white" : "text-[#566fe9cc]"}`}>
                                Expert
                            </span>
                        </button>
                    </div>
                </div>

                {/* --- LOGIN FORM --- */}
                <form className="flex flex-col mt-6 md:mt-8 w-full" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-5 w-full pl-2 pr-2">
                        <input type="email" placeholder="email" className="h-12 border border-[rgba(0,0,0,0.2)] rounded-[100px] px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:[color:#717171] text-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <div className="relative w-full">
                             <input type={showPassword ? "text" : "password"} placeholder="password" className="w-full h-12 border border-[rgba(0,0,0,0.2)] rounded-[100px] px-4 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:[color:#717171] text-sm" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-semibold text-[#566FE9] leading-normal">
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                        <button type="submit" className="bg-[#566FE9] text-white h-12 rounded-[58px] font-semibold hover:bg-[#566FE9]/95 transition disabled:opacity-60 disabled:cursor-not-allowed text-sm" disabled={loading || !isLoaded}>
                            {loading ? "Logging in..." : "Login"}
                        </button>
                        {message && <div className="text-blue-600 text-sm text-center pt-2 bg-blue-50 p-3 rounded-lg">{message}</div>}
                        {error && <div className="text-red-500 text-sm text-center pt-2">{error}</div>}
                    </div>
                </form>

                {/* --- SOCIAL SIGN-IN --- */}
                <div className="flex flex-col w-full items-center justify-center gap-3 my-4 md:my-6">
                    <hr className="w-full border-[#566FE9]/30" />
                    <div className="text-sm font-semibold">Login with</div>
                    <div className="flex w-full gap-3">
                        <button type="button" onClick={handleGoogleSignIn} className="flex flex-1 items-center justify-center gap-2 bg-white rounded-full border border-[rgba(86,111,233,0.3)] cursor-pointer text-sm p-3 hover:bg-gray-50 transition-colors" disabled={!isLoaded}>
                            <Image src="/Google.svg" alt="Google" height={20} width={20} className="h-5 w-5" />
                            <span className="font-semibold">Google</span>
                        </button>
                        <button type="button" onClick={handleFacebookSignIn} className="flex flex-1 items-center justify-center gap-2 bg-white rounded-full border border-[rgba(86,111,233,0.3)] cursor-pointer text-sm p-3 hover:bg-gray-50 transition-colors" disabled={!isLoaded}>
                            <Image src="/Meta.svg" alt="Meta" height={20} width={20} className="h-5 w-5" />
                            <span className="font-semibold">Meta</span>
                        </button>
                    </div>
                </div>

                <div className="w-full text-center flex flex-col gap-8 mt-4 md:mt-6">
                    <Link href="/forgotpassword" className="text-sm text-black hover:underline font-medium">
                        Forgot Password?
                    </Link>
                    {/* <Link href="/register" className="text-sm text-black hover:underline font-medium">
                        Don't have an account? <span className="text-[#566FE9]">Register</span>
                    </Link> */}
                </div>
            </div>
        </div>
    );
}

