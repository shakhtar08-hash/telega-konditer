import {
  performAddUserToGroup,
  performCreateDynamicUserGroup,
  performCreateUserGroup,
  performDeleteDynamicUserGroup,
  performDeleteUserGroup,
  performRemoveUserFromGroup,
  performUpdateDynamicUserGroup,
  performUpdateUserGroup,
} from "@/features/admin/groups/service";
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
    case "createUserGroup":
      await performCreateUserGroup({
        description: String(formData.get("description") ?? "").trim(),
        name: String(formData.get("name") ?? "").trim(),
      });
      break;
    case "updateUserGroup":
      await performUpdateUserGroup({
        description: String(formData.get("description") ?? "").trim(),
        id: String(formData.get("id") ?? "").trim(),
        name: String(formData.get("name") ?? "").trim(),
      });
      break;
    case "deleteUserGroup":
      await performDeleteUserGroup(String(formData.get("id") ?? "").trim());
      break;
    case "addUserToGroup":
      await performAddUserToGroup(
        String(formData.get("userId") ?? "").trim(),
        String(formData.get("userGroupId") ?? "").trim(),
      );
      break;
    case "removeUserFromGroup":
      await performRemoveUserFromGroup(
        String(formData.get("userId") ?? "").trim(),
        String(formData.get("userGroupId") ?? "").trim(),
      );
      break;
    case "createDynamicUserGroup":
      await performCreateDynamicUserGroup(formData);
      break;
    case "updateDynamicUserGroup":
      await performUpdateDynamicUserGroup(formData);
      break;
    case "deleteDynamicUserGroup":
      await performDeleteDynamicUserGroup(String(formData.get("id") ?? "").trim());
      break;
    default:
      return new Response("Unsupported action", { status: 400 });
  }

  return Response.json({ ok: true });
}
