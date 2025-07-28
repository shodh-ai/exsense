
"use client";

import React, { JSX } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/button2";
import { Card, CardContent } from "@/components/card";
import ShodhAIHero from "@/components/(auth)/ShodhAIHero";
import Sphere from "@/components/Sphere";

// --- EDIT YOUR LOGIN PATH HERE ---
const LOGIN_ROUTE_PATH = "/login";
// ---------------------------------

const PasswordChanged = (): JSX.Element => {
    const router = useRouter();

    const handleRedirectToLogin = () => {
        router.push(LOGIN_ROUTE_PATH); // Use the constant for navigation
    };

    return (
        // This container is already responsive, centering content on all screen sizes.
        // `p-4` adds padding, which is good for preventing content from touching screen edges.
        <div className="flex min-h-full w-full items-center justify-center bg-transparent p-4">
            <Sphere />
            {/* 
        This card is set to `w-full` and `max-w-md`. 
        This is a great responsive pattern: it will be full-width on small screens 
        and stop growing at the 'medium' breakpoint, preventing it from becoming too wide.
      */}
            <Card className="w-full max-w-md border-none bg-transparent shadow-none">
                {/*
          RESPONSIVE CHANGE: Adjusted the gap to be smaller on small screens (`gap-6`) 
          and larger on screens `sm` and up (`sm:gap-9`).
        */}
                <CardContent className="flex flex-col items-center gap-6 p-0 sm:gap-9">
                    {/* Logo and tagline */}
                    <div className="flex flex-col items-center gap-3">
                        <ShodhAIHero />
                    </div>
                    {/* Commented out section retained as is */}
                    {/* <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <img
                className="h-[42px] w-auto"
                alt="Shodh AI Logo"
                src="/final-logo.png"
              />
              <h2 className="text-[32px] font-medium leading-tight tracking-[-0.64px] text-[#000042] whitespace-nowrap">
                Shodh AI
              </h2>
            </div>
            <p className="text-center text-black opacity-75 whitespace-nowrap text-sm font-medium">
              AI-Powered Insights for Smarter Learning.
            </p>
          </div> */}

                    {/* Password changed message */}
                    {/*
            RESPONSIVE CHANGE: Adjusted the gap to be smaller on small screens (`gap-6`)
            and larger on screens `sm` and up (`sm:gap-9`).
          */}
                    <div className="flex w-full flex-col items-center gap-6 sm:gap-9">
                        <div className="flex w-full flex-col items-center gap-5">
                            <div className="flex flex-col items-center gap-3">
                                {/* --- MODIFIED HEADING --- */}
                                {/* 
                  RESPONSIVE CHANGE: 
                  - Font size is now smaller on mobile (`text-2xl`, which is 24px) and scales up to `text-[32px]` on `sm` screens and larger.
                  - Removed `whitespace-nowrap` to allow the heading to wrap onto a new line if needed on very narrow screens.
                */}
                                <h1 className="text-center text-2xl font-semibold leading-[130%] tracking-[-0.02em] text-[#566fe9] sm:text-[32px]">
                                    Password Changed!
                                </h1>
                                {/* --- MODIFIED PARAGRAPH --- */}
                                {/*
                  RESPONSIVE CHANGE: 
                  - Removed the manual line break `<br />` to allow the text to flow naturally based on the screen width.
                  - This is more flexible and robust than forcing a line break at a specific point.
                */}
                                <p className="max-w-xs text-center text-sm font-medium text-black">
                                    Your password has been reset. Use your new password to log in.
                                </p>
                            </div>
                        </div>

                        {/* Continue button with onClick handler */}
                        <div className="flex w-full flex-col items-center gap-5">
                            {/* --- MODIFIED BUTTON --- */}
                            {/*
                RESPONSIVE CHANGE:
                - Adjusted horizontal padding (`px`). It's now smaller (`px-16`) by default for mobile
                  and scales up to the original `px-[81px]` on `sm` screens and larger.
                - This prevents the button from looking too wide or squished on small devices.
              */}
                            <Button
                                onClick={handleRedirectToLogin}
                                className="w-full min-w-[140px] cursor-pointer rounded-[50px] bg-[#566fe9] px-16 py-3 text-sm font-semibold text-white sm:px-[81px]"
                            >
                                Continue to Login
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PasswordChanged;