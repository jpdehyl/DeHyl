import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/portal(.*)", // Portal API (access code validated internally)
  "/api/webhook(.*)", // Webhooks
  "/api/daily-logs/webhook(.*)", // Robbie daily log webhook
  "/api/cron(.*)", // Vercel Cron jobs (auth via CRON_SECRET header)
]);

const clerkHandler = clerkMiddleware(async (auth, request) => {
  // Allow public routes
  if (isPublicRoute(request)) {
    return;
  }

  // Protect all other routes
  await auth.protect();
});

export default function middleware(request: NextRequest) {
  // Skip Clerk auth if keys are not configured
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return NextResponse.next();
  }

  return clerkHandler(request, {} as never);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
