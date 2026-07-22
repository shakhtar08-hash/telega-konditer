import {
  performCreateTriggerRule,
  performDeleteTriggerRule,
  performRunTriggerNow,
  performSendTriggerTest,
  performUpdateTriggerRule,
} from "@/features/admin/triggers/service";
import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";

async function readActionFormData(request: Request): Promise<FormData | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    return request.formData();
  }

  if (contentType.includes("application/json")) {
    const payload = (await request.json()) as Record<string, unknown>;
    const formData = new FormData();

    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === "string") {
        formData.set(key, value);
      }
    }

    return formData;
  }

  return null;
}

export async function POST(request: Request): Promise<Response> {
  const env = loadEnv();

  if (
    !env.INTERNAL_API_SHARED_SECRET ||
    !isValidInternalServiceRequest(request, env.INTERNAL_API_SHARED_SECRET)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await readActionFormData(request);

  if (!formData) {
    return new Response("Unsupported content type", { status: 400 });
  }
  const action = String(formData.get("action") ?? "").trim();

  switch (action) {
    case "createTriggerRule":
      await performCreateTriggerRule(formData);
      return Response.json({ ok: true });
    case "updateTriggerRule":
      await performUpdateTriggerRule(formData);
      return Response.json({ ok: true });
    case "deleteTriggerRule":
      await performDeleteTriggerRule(String(formData.get("id") ?? "").trim());
      return Response.json({ ok: true });
    case "runTriggerNow":
      return Response.json(await performRunTriggerNow(formData));
    case "sendTriggerTest":
      return Response.json(await performSendTriggerTest(formData));
    default:
      return new Response("Unsupported action", { status: 400 });
  }
}
