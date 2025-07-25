'use client';
import React, { JSX } from "react";
import { Button } from "@/components/button";
import { useRouter } from "next/navigation";

const NotFoundPage = (): JSX.Element => {
  const router = useRouter();
  return (
    <main className="w-full h-full bg-transparent overflow-hidden relative">
     

        

        {/* Main error content */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-12 w-full max-w-[443px]">
          <div className="flex flex-col items-center gap-3 w-full">
            <h1 className="font-semibold text-[#566fe9] text-[164px] leading-[164px] [font-'Plus_Jakarta_Sans']">
              404
            </h1>

            <div className="flex flex-col items-center gap-5 w-full">
              <h2 className="font-semibold text-black text-[28px] text-center [font-'Plus_Jakarta_Sans']">
                Lost in the AIverse?
              </h2>

              <p className="font-medium text-black text-lg text-center leading-[28.8px] [font-'Plus_Jakarta_Sans']">
                We couldn&apos;t find that page. Maybe it&apos;s still learning.
                Try heading back or explore something new!
              </p>
            </div>
          </div>

          <Button
            onClick={() => router.back()}
            className="w-[280px] h-12 bg-[#566fe9] rounded-[50px] text-white font-semibold [font-'Plus_Jakarta_Sans'] text-sm"
          >
            Go Back
          </Button>
        </div>
   
    </main>
  );
};

export default NotFoundPage;