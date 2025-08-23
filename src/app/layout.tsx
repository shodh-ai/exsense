import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./(app)/globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ShodhAI",
  description: "ShodhAI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/session"
      signUpFallbackRedirectUrl="/session"
    >
      <html lang="en">
        <body
          className={`${plusJakartaSans.variable} antialiased m-0 p-0`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}