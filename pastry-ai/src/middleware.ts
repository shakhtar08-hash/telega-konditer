import { NextRequest, NextResponse } from "next/server";
import {
  adminSessionCookieName,
  getAdminAuthConfig,
  isAdminSessionValid,
} from "@/lib/admin-auth";

export async function middleware(request: NextRequest) {
  const config = getAdminAuthConfig();
  const session = request.cookies.get(adminSessionCookieName)?.value;
  const isValid =
    config !== null &&
    (await isAdminSessionValid(session, config.ADMIN_SESSION_SECRET));

  if (isValid) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
