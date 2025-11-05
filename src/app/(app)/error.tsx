'use client';
import React, { JSX } from "react";
import { useRouter } from "next/navigation";
import Sphere from "@/components/compositions/Sphere";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ErrorPage = ({ error, reset }: ErrorPageProps): JSX.Element => {
  const router = useRouter();
  
  return (
    <main className="w-full h-full flex items-center justify-center">
      <Sphere />
      {/* Main error content */}
      <div className="flex flex-col items-center gap-12 w-full max-w-[443px] px-4">
        <div className="flex flex-col items-center gap-3 w-full">
          <h1 className="font-semibold text-[#566fe9] text-[164px] leading-[164px]">
            Oops!
          </h1>

          <div className="flex flex-col items-center gap-5 w-full">
            <h2 className="font-semibold text-black text-[28px] text-center">
              Something went wrong!
            </h2>

            <p className="font-medium text-black text-lg text-center leading-[28.8px]">
              Something went wrong on our side. We&apos;re fixing it faster than you can say &apos;machine learning&apos;.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-[280px]">
          <button
            onClick={() => reset()}
            className="w-full h-12 bg-[#566fe9] rounded-[50px] text-white font-semibold text-sm flex items-center justify-center hover:bg-[#4558c7] transition-colors cursor-pointer"
          >
            Try Again
          </button>
          
          <button
            onClick={() => router.back()}
            className="w-full h-12 bg-transparent border-2 border-[#566fe9] rounded-[50px] text-[#566fe9] font-semibold text-sm flex items-center justify-center hover:bg-[#566fe9]/10 transition-colors cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    </main>
  );
};

export default ErrorPage;