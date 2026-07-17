import {
  performClearApiSecret,
  performSaveApiSecret,
} from "@/features/admin/settings/service";
import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";

export async function POST(request: Request): Promise<Response> {
  const env = loadEnv();

  if (
    !env.INTERNAL_API_SHARED_SECRET ||
    !isValidInternalServiceRequest(request, env.INTERNAL_API_SHARED_SECRET)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return new Response("Unsupported content type", { status: 400 });
  }

  const body = (await request.json()) as {
    action?: string;
    payload?: {
      key?: string;
      value?: string;
    };
  };
  const key = String(body.payload?.key ?? "");

  switch (body.action) {
    case "saveApiSecret":
      await performSaveApiSecret(key, String(body.payload?.value ?? ""));
      break;
    case "clearApiSecret":
      await performClearApiSecret(key);
      break;
    default:
      return new Response("Unsupported action", { status: 400 });
  }

  return Response.json({ ok: true });
}
