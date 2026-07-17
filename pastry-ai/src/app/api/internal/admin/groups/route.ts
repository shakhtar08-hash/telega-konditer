import {
  loadAdminDynamicGroupsPageData,
  loadAdminUserGroupsPageData,
} from "@/features/admin/groups/service";
import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";

export async function GET(request: Request): Promise<Response> {
  const env = loadEnv();

  if (
    !env.INTERNAL_API_SHARED_SECRET ||
    !isValidInternalServiceRequest(request, env.INTERNAL_API_SHARED_SECRET)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const kind = new URL(request.url).searchParams.get("kind");

  if (kind === "dynamic") {
    return Response.json(await loadAdminDynamicGroupsPageData());
  }

  return Response.json(await loadAdminUserGroupsPageData());
}
