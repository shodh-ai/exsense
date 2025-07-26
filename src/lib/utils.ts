import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {

// File: exsense/src/lib/utils.ts


    return twMerge(clsx(inputs));
}
