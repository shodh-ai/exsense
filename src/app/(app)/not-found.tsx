'use client';
import React, { JSX } from "react";
import { useRouter } from "next/navigation";
import Sphere from "@/components/compositions/Sphere";

const NotFoundPage = (): JSX.Element => {
    const router = useRouter();
    
    return (
        <main className="w-full h-full flex items-center justify-center">
            <Sphere />
            {/* Main error content */}
            <div className="flex flex-col items-center gap-12 w-full max-w-[443px] px-4">
                <div className="flex flex-col items-center gap-3 w-full">
                    <h1 className="font-semibold text-[#566fe9] text-[164px] leading-[164px]">
                        404
                    </h1>

                    <div className="flex flex-col items-center gap-5 w-full">
                        <h2 className="font-semibold text-black text-[28px] text-center">
                            Page not found
                        </h2>

                        <p className="font-medium text-black text-lg text-center leading-[28.8px]">
                            We couldn&apos;t find that page. Maybe it&apos;s still learning.
                            Try heading back or explore something new!
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => router.back()}
                    className="w-[280px] h-12 bg-[#566fe9] rounded-[50px] text-white font-semibold text-sm flex items-center justify-center hover:bg-[#4558c7] transition-colors cursor-pointer"
                >
                    Go Back
                </button>
            </div>
        </main>
    );
};

export default NotFoundPage;
