import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { postInternalAdminTriggerAction } from "@/features/admin/triggers/internal-admin-client";
import { performDeleteTriggerRule } from "@/features/admin/triggers/service";
import {
  adminSessionCookieName,
  createAdminRedirectUrl,
  getAdminAuthConfig,
  isAdminSessionValid,
} from "@/lib/admin-auth";

function getSessionFromCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) {
    return undefined;
  }

  const prefix = `${adminSessionCookieName}=`;
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

async function requireAdminSession(request: Request) {
  const config = getAdminAuthConfig();
  const session = getSessionFromCookieHeader(request.headers.get("cookie"));
  const isValid =
    config !== null &&
    (await isAdminSessionValid(session, config.ADMIN_SESSION_SECRET));

  if (isValid) {
    return null;
  }

  return NextResponse.redirect(createAdminRedirectUrl("/login", request.url), 303);
}

export async function POST(request: Request) {
  const unauthorizedResponse = await requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const formData = await request.formData();
  const id = String(formData.get("id") ?? "").trim();

  if (id) {
    if (process.env.APP_ROLE === "ingress") {
      await postInternalAdminTriggerAction("deleteTriggerRule", formData);
    } else {
      await performDeleteTriggerRule(id);
    }
  }

  revalidatePath("/admin/triggers");
  return NextResponse.redirect(
    createAdminRedirectUrl("/admin/triggers", request.url),
    303,
  );
}
