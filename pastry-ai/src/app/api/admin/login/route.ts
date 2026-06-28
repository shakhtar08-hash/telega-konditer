import { NextResponse } from "next/server";
import {
  adminSessionCookieName,
  createAdminSession,
  getAdminAuthConfig,
  isValidAdminCredentials,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const config = getAdminAuthConfig();

  if (
    config === null ||
    !isValidAdminCredentials({ password, username }, config)
  ) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  const session = await createAdminSession(
    username,
    config.ADMIN_SESSION_SECRET,
  );

  response.cookies.set(adminSessionCookieName, session, {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
