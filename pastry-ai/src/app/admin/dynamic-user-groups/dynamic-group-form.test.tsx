import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createDefaultDynamicConditionDraft,
  DynamicGroupForm,
  summarizeDynamicUserGroup,
} from "./dynamic-group-form";

describe("DynamicGroupForm", () => {
  it("renders the builder in Russian", () => {
    const html = renderToStaticMarkup(
      <DynamicGroupForm
        action={async () => {}}
        cancelHref="/admin/dynamic-user-groups"
        initial={{
          id: null,
          name: "Без активного тарифа",
          description: "Сегмент для возврата",
          status: "active",
          definition: {
            logicOperator: "AND",
            conditions: [{ field: "hasActiveTariff", operator: "is", value: false }],
          },
        }}
        submitLabel="Создать группу"
        title="Новая динамическая группа"
      />,
    );

    expect(html).toContain("Новая динамическая группа");
    expect(html).toContain("Добавить условие");
    expect(html).toContain('name="definition"');
  });

  it("creates a default structured draft", () => {
    expect(createDefaultDynamicConditionDraft("remainingTokens")).toEqual({
      field: "remainingTokens",
      operator: "equals",
      value: "0",
    });
  });

  it("builds a readable preview summary", () => {
    expect(
      summarizeDynamicUserGroup({
        logicOperator: "AND",
        conditions: [
          { field: "promoClaimed", operator: "is", value: false },
          { field: "generationCount", operator: "gte", value: 3 },
        ],
      }),
    ).toBe("Промо получено: равно нет И Количество генераций: не меньше 3");
  });
});
