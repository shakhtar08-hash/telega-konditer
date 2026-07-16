import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AdminSettingsPage, { dynamic } from "./page";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    apiSecret: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("AdminSettingsPage", () => {
  it("shows transition runtime keys for internal RU/EU deployment", async () => {
    prismaMock.apiSecret.findMany.mockResolvedValue([]);
    prismaMock.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const text = renderToStaticMarkup(await AdminSettingsPage());

    expect(dynamic).toBe("force-dynamic");
    expect(text).toContain("INTERNAL_API_BASE_URL");
    expect(text).toContain("INTERNAL_AI_GATEWAY_URL");
    expect(text).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
