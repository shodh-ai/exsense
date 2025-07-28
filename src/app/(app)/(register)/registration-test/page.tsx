"use client";

import { RegistrationForm } from "@/components/Registrationform";
import Sphere from "@/components/Sphere";
export default function RegistrationTestPage() {

// File: exsense/src/app/(register)/registration-test/page.tsx


    // The return statement should wrap multi-line JSX in parentheses
    return (
        <div className="flex min-h-full w-full items-center justify-center bg-transparent p-4">
            <Sphere />
            <RegistrationForm />
        </div>
    );
}
