import {
  loadAdminDashboardPageData,
  loadAdminHistoryPageData,
  loadAdminUsagePageData,
} from "@/features/admin/dashboard/service";
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

  const view = new URL(request.url).searchParams.get("view");

  switch (view) {
    case "history":
      return Response.json(await loadAdminHistoryPageData());
    case "usage":
      return Response.json(await loadAdminUsagePageData());
    default:
      return Response.json(await loadAdminDashboardPageData());
  }
}
