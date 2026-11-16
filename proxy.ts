import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: send people without a session cookie to sign in.
// Every page and action still verifies the session itself (lib/auth.ts).
export function proxy(request: NextRequest) {
  // This endpoint verifies the full session and returns JSON 401 itself.
  if (["/api/lineup-version", "/api/notifications/run", "/sw.js"].includes(request.nextUrl.pathname)) return NextResponse.next();
  if (!request.cookies.has("gplc_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|_next/|icon|manifest|favicon|.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico|webmanifest)$).*)"],
};
