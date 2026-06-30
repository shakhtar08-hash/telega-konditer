import { NextResponse } from "next/server";
import { adminSessionCookieName, createAdminRedirectUrl } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(
    createAdminRedirectUrl("/login", request.url),
    303,
  );

  response.cookies.set(adminSessionCookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
