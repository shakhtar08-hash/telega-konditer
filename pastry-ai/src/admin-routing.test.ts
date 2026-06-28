import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin route guard convention", () => {
  it("keeps middleware.ts for the local Next dev server", () => {
    expect(existsSync(join(process.cwd(), "src", "middleware.ts"))).toBe(true);
  });
});
