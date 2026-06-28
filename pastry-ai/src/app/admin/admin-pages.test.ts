import { describe, expect, it } from "vitest";
import { adminSections } from "./layout";

describe("adminSections", () => {
  it("contains the required admin pages", () => {
    expect(adminSections.map((section) => section.href)).toEqual([
      "/admin",
      "/admin/users",
      "/admin/prompts",
      "/admin/photo-styles",
      "/admin/carousel-templates",
      "/admin/history",
      "/admin/usage",
      "/admin/settings",
    ]);
  });
});
