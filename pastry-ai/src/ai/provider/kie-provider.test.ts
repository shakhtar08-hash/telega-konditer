import { describe, expect, it, vi } from "vitest";
import { UserFacingError } from "@/lib/user-facing-error";
import { generateFluxKontextImage } from "./kie-provider";

vi.mock("@/lib/api-secrets", () => ({
  resolveManagedApiKey: async () => undefined,
}));

describe("generateFluxKontextImage", () => {
  it("throws a user-facing error when the KIE API key is missing", async () => {
    await expect(
      generateFluxKontextImage({
        imageUrl: "https://example.com/dessert.jpg",
        model: "gpt-image-2",
        prompt: "Create a premium dessert photo.",
      }),
    ).rejects.toEqual(
      new UserFacingError(
        'Сценарий "Создать фото" требует настроенный KIE_API_KEY. Добавьте ключ в /admin/settings.',
      ),
    );
  });
});
