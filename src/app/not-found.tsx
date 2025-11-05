import React, { JSX } from "react";
import Link from "next/link";

const NotFoundPage = (): JSX.Element => {
    return (
        <main className="w-full min-h-screen bg-transparent overflow-hidden relative flex items-center justify-center">
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

                <Link
                    href="/"
                    className="w-[280px] h-12 bg-[#566fe9] rounded-[50px] text-white font-semibold text-sm flex items-center justify-center hover:bg-[#4558c7] transition-colors"
                >
                    Go Home
                </Link>
            </div>
        </main>
    );
};

export default NotFoundPage;
