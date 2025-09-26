import { clerkMiddleware } from "@clerk/nextjs/server";

// Do not apply Clerk to API routes to keep /api/voice/* public and avoid auth redirects
export default clerkMiddleware();

export const config = {
  matcher: [
    // Run on all paths except static files and _next; exclude API entirely
    "/((?!.+\\..*|_next|api).*)",
    "/",
  ],
};
