import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define which routes are public (no auth required)
const isPublicRoute = createRouteMatcher([
  "/",                 // landing
  "/login",            // custom login page
  "/forgotpassword",   // password reset
  "/confirm-register", // registration confirmation
]);

// Apply Clerk to all app routes and require auth for any that are not public
export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return; // allow unauthenticated access on public routes
  }

  const { userId, sessionId } = await auth();

  // If there is no active user/session, redirect to sign-in
  if (!userId || !sessionId) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    // Run on all paths except static files and _next; exclude API entirely
    "/((?!.+\\..*|_next|api).*)",
    "/",
  ],
};
