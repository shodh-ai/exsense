import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    // MODIFICATION: Removed `focus-visible:ring-1` and `focus-visible:ring-ring`
                    "flex h-[50px] w-full rounded-md border border-0 bg-transparent px-3 py-1 text-base  md:text-sm focus:outline-none",
                    className,
                )}
                ref={ref}
                {...props}
            />
        );
    },
);
Input.displayName = "Input";

export { Input };