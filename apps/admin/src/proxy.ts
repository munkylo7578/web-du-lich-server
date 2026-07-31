import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ADMIN_PATH, AUTH_SESSION_COOKIE, LOGIN_PATH } from "./lib/auth/constants";

export function proxy(request: NextRequest) {
  const hasSessionCookie = Boolean(request.cookies.get(AUTH_SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(ADMIN_PATH) && !hasSessionCookie) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  if (pathname === LOGIN_PATH && hasSessionCookie) {
    return NextResponse.redirect(new URL(ADMIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
