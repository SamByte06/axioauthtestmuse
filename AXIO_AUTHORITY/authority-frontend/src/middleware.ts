import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Server-side route protection middleware for AxioVital Authority.
 *
 * SECURITY ARCHITECTURE NOTE:
 * This middleware functions strictly as a user experience (UX) guard. It redirects
 * unauthenticated navigation attempts to `/login` before protected control plane
 * pages render on the client.
 *
 * The AxioVital backend API remains the true, non-bypassable security boundary.
 * Every administrative operation and data access call requires an authenticated,
 * backend-issued session cookie and verifies cryptographic signatures and RBAC
 * permissions server-side.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets, login, and API route handlers are exempt from redirecting to /login HTML
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname === "/login" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // In demo mode (opt-in development fixture environment), do not block.
  // The demo backend uses in-memory mock state without real backend cookies.
  // Hardened against production: isDemo is false if NODE_ENV or NEXT_PUBLIC_VERCEL_ENV is "production".
  const isDemo =
    process.env.NEXT_PUBLIC_AUTHORITY_DEMO_MODE === "true" &&
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

  if (isDemo) {
    return NextResponse.next();
  }

  // Session cookie name is backend-defined; defaults to axio_authority_session
  const cookieName =
    process.env.AUTHORITY_SESSION_COOKIE_NAME || "axio_authority_session";
  const sessionCookie = request.cookies.get(cookieName);

  if (!sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and assets
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
