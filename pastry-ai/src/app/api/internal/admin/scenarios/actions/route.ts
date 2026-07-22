import {
  performCreateScenario,
  performDeleteScenario,
  performDeleteScenarioStep,
  performDuplicateScenario,
  performDuplicateScenarioStep,
  performUpdateScenario,
} from "@/features/admin/scenarios/service";
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
    case "createScenario":
      await performCreateScenario(formData);
      return Response.json({ ok: true });
    case "updateScenario":
      await performUpdateScenario(formData);
      return Response.json({ ok: true });
    case "deleteScenario":
      await performDeleteScenario(String(formData.get("id") ?? "").trim());
      return Response.json({ ok: true });
    case "duplicateScenario":
      return Response.json({
        id: await performDuplicateScenario(String(formData.get("id") ?? "").trim()),
      });
    case "duplicateScenarioStep":
      return Response.json({
        id: await performDuplicateScenarioStep(
          String(formData.get("stepId") ?? "").trim(),
        ),
      });
    case "deleteScenarioStep":
      await performDeleteScenarioStep(String(formData.get("stepId") ?? "").trim());
      return Response.json({ ok: true });
    default:
      return new Response("Unsupported action", { status: 400 });
  }
}
