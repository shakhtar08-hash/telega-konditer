import { describe, expect, it, vi } from "vitest";
import { seedEditableCollection } from "../../../prisma/seed-editable-collection.mjs";

describe("seedEditableCollection", () => {
  it("creates baseline records only when the table is empty", async () => {
    const model = {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
    };

    await seedEditableCollection(model as never, [{ slug: "one" }, { slug: "two" }]);

    expect(model.create).toHaveBeenCalledTimes(2);
    expect(model.create).toHaveBeenNthCalledWith(1, { data: { slug: "one" } });
    expect(model.create).toHaveBeenNthCalledWith(2, { data: { slug: "two" } });
  });

  it("does not recreate or overwrite records after the table already has data", async () => {
    const model = {
      count: vi.fn().mockResolvedValue(3),
      create: vi.fn(),
    };

    await seedEditableCollection(model as never, [{ slug: "one" }]);

    expect(model.create).not.toHaveBeenCalled();
  });
});
