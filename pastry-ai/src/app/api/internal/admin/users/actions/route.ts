import {
  performAddUserToGroup,
  performDeleteUser,
  performRemoveUserFromGroup,
  performUpdateUserTariff,
} from "@/features/admin/users/service";
import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";

type ActionPayload = {
  action: "addUserToGroup" | "deleteUser" | "removeUserFromGroup" | "updateUserTariff";
  payload: Record<string, string>;
};

export async function POST(request: Request): Promise<Response> {
  const env = loadEnv();

  if (
    !env.INTERNAL_API_SHARED_SECRET ||
    !isValidInternalServiceRequest(request, env.INTERNAL_API_SHARED_SECRET)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as ActionPayload;

  switch (body.action) {
    case "addUserToGroup":
      await performAddUserToGroup(body.payload.userId ?? "", body.payload.userGroupId ?? "");
      break;
    case "removeUserFromGroup":
      await performRemoveUserFromGroup(body.payload.userId ?? "", body.payload.userGroupId ?? "");
      break;
    case "updateUserTariff":
      await performUpdateUserTariff({
        expiresAtValue: body.payload.expiresAt ?? "",
        tariffPlanId: body.payload.tariffPlanId ?? "",
        tokensValue: body.payload.tokens ?? "",
        userId: body.payload.id ?? "",
      });
      break;
    case "deleteUser":
      await performDeleteUser(body.payload.id ?? "");
      break;
    default:
      return new Response("Unsupported action", { status: 400 });
  }

  return Response.json({ ok: true });
}
