"use client";

import React, { JSX, useState } from "react";
import Button from "@/components/button2";
import { Card, CardContent } from "@/components/card";
import ShodhAIHero from "@/components/(auth)/ShodhAIHero";
import { Input } from "@/components/input";
import Sphere from "@/components/Sphere";

export default function PasswordReset(): JSX.Element {

// File: exsense/src/app/(login)/reset-password/page.tsx


    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");

    // Background decoration elements data
    const decorations = [
        {
            className:
                "absolute w-[753px] h-[753px] top-0 left-[1259px] bg-[#566fe9] rounded-[376.5px]",
        },
        {
            className:
                "absolute w-[353px] h-[353px] top-[931px] left-0 bg-[#336de6] rounded-[176.5px]",
        },
    ];

    // --- Password Validation Logic ---
    const validatePassword = (password: string): boolean => {
        // Regex to check for at least one letter
        const hasLetter = /[a-zA-Z]/;
        // Regex to check for at least one number
        const hasNumber = /\d/;
        // Regex to check for at least one special character
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/;

        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return false;
        }
        if (!hasLetter.test(password)) {
            setError("Password must contain at least one letter.");
            return false;
        }
        if (!hasNumber.test(password)) {
            setError("Password must contain at least one number.");
            return false;
        }
        if (!hasSpecialChar.test(password)) {
            setError("Password must contain at least one special character.");
            return false;
        }

        // If all checks pass
        return true;
    };

    const handleSavePassword = () => {
        setError(""); // Clear previous errors

        // 1. Check if fields are empty
        if (!newPassword || !confirmPassword) {
            setError("Both password fields are required.");
            return;
        }

        // 2. Validate the complexity of the new password
        if (!validatePassword(newPassword)) {
            // The validatePassword function already sets the specific error message.
            return;
        }

        // 3. Check if passwords match
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match. Please try again.");
            return;
        }

        // 4. If all checks pass, proceed with your logic
        console.log("Password is valid and passwords match! Saving new password...");
        alert("Password has been successfully updated!");

        setNewPassword("");
        setConfirmPassword("");
    };

    return (
        <div className="flex min-h-full w-full items-center justify-center bg-transparent p-4">
            <Sphere />
            <Card className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] border-none shadow-none bg-transparent">
                {/* 
        - Simplified structure for centering and consistent spacing.
        - `flex-col` stacks elements vertically.
        - `items-center` centers them horizontally.
        - `gap-6` provides equal 24px spacing between each direct child element.
      */}
                <CardContent className="flex flex-col items-center gap-6 p-4">
                    {/* Element 1: Logo */}
                    <ShodhAIHero />

                    {/* Element 2: Title */}
                    <h2 className="font-paragraph-large font-[number:var(--paragraph-large-font-weight)] text-black text-[length:var(--paragraph-large-font-size)] tracking-[var(--paragraph-large-letter-spacing)] leading-[var(--paragraph-large-line-height)] [font-style:var(--paragraph-large-font-style)]">
                        Set a New Password
                    </h2>

                    {/* Element 3: Input Group */}
                    <div className="flex w-full flex-col items-start gap-4">
                        <Input
                            type="password"
                            placeholder="new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="h-12 w-full px-5 py-3.5 rounded-2xl border border-solid border-[#00000033] bg-white text-[#717171] font-paragraph-large"
                        />
                        <Input
                            type="password"
                            placeholder="confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="h-12 w-full px-5 py-3.5 rounded-2xl border border-solid border-[#00000033] bg-white text-[#717171] font-paragraph-large"
                        />
                        {/* Error Message Display */}
                        {error && (
                            <p className="text-sm text-red-600 self-start">{error}</p>
                        )}
                    </div>

                    {/* Element 4: Button */}
                    <Button
                        onClick={handleSavePassword}
                        className="h-12 w-full px-[81px] py-3 bg-[#566fe9] rounded-[50px] text-white font-label-extra-large font-[number:var(--label-extra-large-font-weight)] text-[length:var(--label-extra-large-font-size)] tracking-[var(--label-extra-large-letter-spacing)] leading-[var(--label-extra-large-line-height)] [font-style:var(--label-extra-large-font-style)]"
                    >
                        Save Password
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
