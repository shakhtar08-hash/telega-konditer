import {
  performCreateTriggerRule,
  performDeleteTriggerRule,
  performSendTriggerTest,
  performUpdateTriggerRule,
} from "@/features/admin/triggers/service";
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

  if (!contentType.includes("multipart/form-data")) {
    return new Response("Unsupported content type", { status: 400 });
  }

  const formData = await request.formData();
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
    case "sendTriggerTest":
      return Response.json(await performSendTriggerTest(formData));
    default:
      return new Response("Unsupported action", { status: 400 });
  }
}
