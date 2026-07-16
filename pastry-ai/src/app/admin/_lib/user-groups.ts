function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isMissingUserGroupTableError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";

  return (
    code === "P2021" &&
      (message.includes("UserGroup") || message.includes("public.UserGroup")) ||
    message.includes("The table `public.UserGroup` does not exist")
  );
}

export async function loadUserGroupsOrEmpty<T>(
  loader: () => Promise<T[]>,
): Promise<{
  groups: T[];
  unavailable: boolean;
}> {
  try {
    return {
      groups: await loader(),
      unavailable: false,
    };
  } catch (error) {
    if (isMissingUserGroupTableError(error)) {
      return {
        groups: [],
        unavailable: true,
      };
    }

    throw error;
  }
}
