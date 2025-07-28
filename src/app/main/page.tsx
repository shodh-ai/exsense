import { LinkedinIcon } from "lucide-react";
import React, { JSX } from "react";

import { Button } from "@/components/button";
import { Separator } from "@/components/separator";

export default function ShodhAiWebsite(): JSX.Element {
  // Footer links data
  const footerLinks = [
    { text: "All rights reserved by Shodh AI" },
    { text: "Privacy Policy" },
    { text: "Terms & Conditions" },
  ];

  // Social media data - Only LinkedIn is left
  const socialMedia = [
    { icon: <LinkedinIcon className="w-4 h-4 sm:w-5 sm:h-5" />, ariaLabel: "LinkedIn", href: "https://www.linkedin.com/company/shodh-ai" },
  ];

  return (
    <main className="bg-[#f7f9ff] min-h-full w-full overflow-x-hidden">
      <div className="relative min-h-screen w-full max-w-[1440px] mx-auto">
        {/* Background elements - responsive positioning */}
        {/* <img
          className="absolute w-[150px] h-[165px] sm:w-[200px] sm:h-[220px] lg:w-[271px] lg:h-[298px] top-0 left-0 object-cover opacity-80"
          alt="Element mash"
          src="/animation1.svg"
        /> */}
        <img
          className="absolute w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] lg:w-[734px] lg:h-[733px] top-[20px] sm:top-[30px] right-0 lg:left-[706px] object-cover opacity-80"
          alt="Element mash"
          src="/animation2.svg"
        />

        {/* Header - responsive */}
        <header className="relative z-10 w-full pt-6 sm:pt-8 lg:pt-[43px] px-4 sm:px-8 lg:px-10">
          <div className="flex justify-between items-center">
            <img
              className="w-[100px] h-auto sm:w-[150px] sm:h-[36px] lg:w-[190px] lg:h-[45px]"
              alt="Shodh AI Logo"
              src="/Frame1.svg"
            />
            {/* START: Modified section for same-dimension buttons */}
            <div className="flex items-center gap-x-2 sm:gap-x-3">
              {/* Login Button - uses fixed width and text-center for uniform size */}
              <Button
                className="bg-transparent text-[#000042] rounded-[40px] py-2 sm:py-3 lg:py-5 font-manrope font-medium text-sm sm:text-base text-center w-[85px] sm:w-[120px] lg:w-[150px] border-[#000042] border-[1px]"
                asChild
              >
                <a href="/register">
                  Register
                </a>
              </Button>
              <Button
                className="bg-[#000042] text-white rounded-[40px] py-2 sm:py-3 lg:py-5 font-medium text-sm sm:text-base text-center w-[85px] sm:w-[120px] lg:w-[150px]"
                asChild
              >
                <a href="/login">
                  Login
                </a>
              </Button>
            </div>
            {/* END: Modified section */}
          </div>
        </header>

        {/* Main content - responsive layout */}
        <section className="relative z-10 flex flex-col lg:flex-row items-center w-full mt-8 sm:mt-12 lg:mt-[105px] px-4 sm:px-8 lg:px-20 gap-8 md:gap-5 lg:gap-x-1">
          {/* 3D Model - responsive sizing and positioning */}
          {/* MODIFICATION: Adjusted sizing to better match the smoother text scaling */}
          <div className="order-2 lg:order-1 flex-shrink-0 lg:pl-[8%]">
            <img
              className="w-[280px] h-[350px] sm:w-[320px] sm:h-[400px] lg:w-[340px] lg:h-[425px] xl:w-[368px] xl:h-[460px] object-contain"
              alt="3D Model"
              src="/heart.svg"
            />
          </div>

          {/* Main heading - responsive typography */}
          {/* MODIFICATION: Removed `lg:flex-none` to allow this container to be flexible and shrink/grow as needed. */}
          <div className="order-1 lg:order-2 flex-1 lg:pr-[8%]">
            <h1
              // MODIFICATION: Smoothed out the font-size transition between md, lg, and xl breakpoints to prevent text from overflowing on screens ~1024px wide.
              className="font-extrabold text-[#000042] text-[32px] sm:text-[48px] md:text-[64px] lg:text-[72px] xl:text-[80px] 2xl:text-[130px] text-center lg:text-right leading-[1.1] sm:leading-[1.05] lg:leading-[0.95] font-['Manrope',Helvetica] max-w-full lg:max-w-[780px]"
            >
              BUILDING FUTURE OF EDUCATION
            </h1>
          </div>
        </section>

        {/* Footer - responsive */}
        <footer className="relative z-10 mt-12 sm:mt-16 lg:mt-auto lg:absolute lg:bottom-0 left-0 w-full px-4 sm:px-8 lg:px-20 pb-4 sm:pb-6 lg:pb-8">
          <Separator className="w-full max-w-[1280px] mx-auto mb-4" />

          <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-[1280px] mx-auto gap-4 sm:gap-0">
            {/* Footer logo */}
            <div className="order-2 sm:order-1">
              <img
                className="w-[120px] h-[28px] sm:w-[130px] sm:h-[31px] lg:w-[152.4px] lg:h-9"
                alt="Shodh AI Logo"
                src="/frame2.svg"
              />
            </div>

            {/* Footer links - responsive layout */}
            <div className="order-1 sm:order-2 flex flex-col sm:flex-row items-center gap-2 sm:gap-0">
              {footerLinks.map((link, index) => (
                <React.Fragment key={index}> {/* Or simply <> */}
                  {index > 0 && (
                    <div className="hidden sm:block w-1.5 h-1.5 bg-[#00004240] rounded-[3px] mx-2" />
                  )}
                  <Button
                    variant="ghost"
                    className="px-3 py-2 sm:px-4 sm:py-3 lg:px-7 lg:py-[22px]
                               font-semibold text-[#00004240] text-xs sm:text-sm lg:text-base
                               rounded-[100px] whitespace-nowrap
                               sm:pb-4 lg:pb-6"
                  >
                    {link.text}
                  </Button>
                </React.Fragment>
              ))}
            </div>

            {/* Social media icons - now only LinkedIn */}
            <div className="order-3 flex items-center gap-2 sm:gap-2.5">
              {socialMedia.map((social, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-[#566fe91a] rounded-2xl sm:rounded-3xl"
                  aria-label={social.ariaLabel}
                  asChild
                >
                  <a href={social.href} target="_blank" rel="noopener noreferrer">
                    {social.icon}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
};