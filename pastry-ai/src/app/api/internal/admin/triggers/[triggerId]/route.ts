import { loadAdminTriggerEditorData } from "@/features/admin/triggers/service";
import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";

export async function GET(
  request: Request,
  context: { params: Promise<{ triggerId: string }> },
): Promise<Response> {
  const env = loadEnv();

  if (
    !env.INTERNAL_API_SHARED_SECRET ||
    !isValidInternalServiceRequest(request, env.INTERNAL_API_SHARED_SECRET)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { triggerId } = await context.params;
  return Response.json(
    await loadAdminTriggerEditorData(triggerId === "new" ? undefined : triggerId),
  );
}
