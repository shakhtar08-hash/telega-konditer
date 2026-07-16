import { NextResponse } from "next/server";
import {
  adminSessionCookieName,
  createAdminRedirectUrl,
  createAdminSession,
  getAdminAuthConfig,
  isValidAdminCredentials,
} from "@/lib/admin-auth";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW = 15 * 60 * 1000;

export async function POST(request: Request) {
  const rateKey = `admin-login:${getRateLimitKey(request)}`;
  const rateResult = checkRateLimit(rateKey, MAX_ATTEMPTS, LOCKOUT_WINDOW);

  if (!rateResult.allowed) {
    return NextResponse.redirect(
      createAdminRedirectUrl("/login?error=2", request.url),
      303,
    );
  }

  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const config = getAdminAuthConfig();

  if (
    config === null ||
    !isValidAdminCredentials({ password, username }, config)
  ) {
    const failKey = `admin-login-fail:${getRateLimitKey(request)}`;
    checkRateLimit(failKey, MAX_ATTEMPTS, LOCKOUT_WINDOW);

    return NextResponse.redirect(
      createAdminRedirectUrl("/login?error=1", request.url),
      303,
    );
  }

  const response = NextResponse.redirect(
    createAdminRedirectUrl("/admin", request.url),
    303,
  );
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
