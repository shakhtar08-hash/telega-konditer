import {
  loadAdminDynamicGroupDetailPageData,
  loadAdminUserGroupDetailPageData,
} from "@/features/admin/groups/service";
import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";

type RouteContext = {
  params: Promise<{ groupId: string }> | { groupId: string };
};

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const env = loadEnv();

  if (
    !env.INTERNAL_API_SHARED_SECRET ||
    !isValidInternalServiceRequest(request, env.INTERNAL_API_SHARED_SECRET)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { groupId } = await context.params;
  const searchParams = new URL(request.url).searchParams;

  if (searchParams.get("kind") === "dynamic") {
    return Response.json(await loadAdminDynamicGroupDetailPageData(groupId));
  }

  return Response.json(
    await loadAdminUserGroupDetailPageData(groupId, searchParams.get("search")?.trim() ?? ""),
  );
}
