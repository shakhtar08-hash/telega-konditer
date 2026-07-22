export type AppRole = "ingress" | "app" | "cron";

const defaultRole: AppRole = "app";

export function resolveAppRole(role?: string): AppRole {
  if (role === "ingress" || role === "app" || role === "cron") {
    return role;
  }

  return defaultRole;
}

export function isAppRoleAllowed(
  role: string | undefined,
  allowedRoles: readonly AppRole[],
): boolean {
  return allowedRoles.includes(resolveAppRole(role));
}

export function rejectForAppRole(
  routePath: string,
  role: string | undefined,
  allowedRoles: readonly AppRole[],
): Response | null {
  const resolvedRole = resolveAppRole(role);

  if (allowedRoles.includes(resolvedRole)) {
    return null;
  }

  return Response.json(
    {
      error: `Route ${routePath} is not available on APP_ROLE=${resolvedRole}.`,
    },
    { status: 409 },
  );
}
