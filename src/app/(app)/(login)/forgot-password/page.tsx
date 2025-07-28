"use client";

import React, { JSX, useState } from "react";
import { useRouter } from "next/navigation";
import Button from '@/components/button2';
import { Card, CardContent } from "@/components/card";
import { Input } from "@/components/input";
import ShodhAIHero from "@/components/(auth)/ShodhAIHero";
import Sphere from "@/components/Sphere";

export default function ForgotPassword(): JSX.Element {
    // Data for the form
    const router = useRouter();
    const [emailOrPhone, setEmailOrPhone] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSendOtp = async () => {
        try {
            const response = await fetch("/api/auth/forgotpassword", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ emailOrPhone }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage("OTP sent successfully. Please check your email or phone.");
                setError("");
            } else {
                setError(data.message || "Something went wrong.");
                setMessage("");
            }
        } catch (error) {
            setError("An unexpected error occurred.");
            setMessage("");
        }
    };

    const formData = {

        instruction:
            "Type in the email or phone number associated with your account and we'll send you an OTP to reset password.",
        inputPlaceholder: "email or phone number",
        buttonText: "Send OTP",
        backText: "Back to sign in",
    };

    return (
        // A single container to correctly center the card on the screen
        <div className="flex min-h-full w-full items-center justify-center p-4 sm:p-6 lg:p-8">
            <Sphere />     {/* Main content card with responsive width */}
            <Card className="w-full max-w-[400px] bg-transparent border-none shadow-none">
                <CardContent className="flex flex-col items-center gap-12 p-0">
                    {/* Logo and tagline section. The imported ShodhAIHero is now used here. */}
                    <div className="flex flex-col items-center gap-3 text-center">
                        <ShodhAIHero />
                        <Sphere />
                        <p className="opacity-75 font-paragraph-large font-[number:var(--paragraph-large-font-weight)] text-black text-[14px] text-center tracking-[var(--paragraph-large-letter-spacing)] leading-[var(--paragraph-large-line-height)]">
                            {/* {formData.tagline} */}
                        </p>
                    </div>

                    {/* Form section */}
                    <div className="flex flex-col items-start gap-4 w-full">
                        <div className="flex flex-col items-start gap-4 w-full">
                            <p className="font-paragraph-large font-[number:var(--paragraph-large-font-weight)] text-black text-[14px] tracking-[var(--paragraph-large-letter-spacing)] leading-[var(--paragraph-large-line-height)]">
                                {formData.instruction}
                            </p>
                            <Input
                                className="h-12 px-5 py-3.5 bg-white rounded-2xl border border-solid border-[#00000033] text-[#717171] font-paragraph-large font-[number:var(--paragraph-large-font-weight)] text-[14px] tracking-[var(--paragraph-large-letter-spacing)] leading-[var(--paragraph-large-line-height)]"
                                placeholder={formData.inputPlaceholder}
                                value={emailOrPhone}
                                onChange={(e) => setEmailOrPhone(e.target.value)}
                            />
                            {message && <p className="text-green-500 text-sm">{message}</p>}
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                        </div>

                        <div className="flex flex-col items-center gap-5 w-full">
                            <Button
                                onClick={handleSendOtp}
                                className="w-full h-17 bg-[#566fe9] rounded-[60px] font-label-extra-large font-[number:var(--label-extra-large-font-weight)] text-white text-[14px] tracking-[var(--label-extra-large-letter-spacing)] leading-[var(--label-extra-large-line-height)]"
                            >
                                {formData.buttonText}
                            </Button>
                            <button
                                onClick={() => router.push("/login")}
                                className="font-paragraph-large font-[number:var(--paragraph-large-font-weight)] text-black text-[14px] text-center tracking-[var(--paragraph-large-letter-spacing)] leading-[var(--paragraph-large-line-height)] hover:underline"
                            >
                                {formData.backText}
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}