function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUnavailableDynamicUserGroupDelegateError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    error.message.includes("Cannot read properties of undefined") &&
    error.message.includes("'findMany'")
  );
}

export function isMissingDynamicUserGroupTableError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";

  return (
    (code === "P2021" &&
      (message.includes("DynamicUserGroup") || message.includes("public.DynamicUserGroup"))) ||
    message.includes("The table `public.DynamicUserGroup` does not exist")
  );
}

export async function loadDynamicUserGroupsOrEmpty<T>(
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
    if (
      isMissingDynamicUserGroupTableError(error) ||
      isUnavailableDynamicUserGroupDelegateError(error)
    ) {
      return {
        groups: [],
        unavailable: true,
      };
    }

    throw error;
  }
}
