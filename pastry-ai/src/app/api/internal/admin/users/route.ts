import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";
import { loadAdminUsersPageData } from "@/features/admin/users/service";

export async function GET(request: Request): Promise<Response> {
  const env = loadEnv();

  if (
    !env.INTERNAL_API_SHARED_SECRET ||
    !isValidInternalServiceRequest(request, env.INTERNAL_API_SHARED_SECRET)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const dynamicGroupId = new URL(request.url).searchParams.get("dynamicGroupId") ?? "";
  return Response.json(await loadAdminUsersPageData(dynamicGroupId));
}
