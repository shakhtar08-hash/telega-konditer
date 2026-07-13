import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getTriggerEventOptions, getTriggerTemplates } from "@/features/triggers/trigger-template";
import {
  createDefaultConditionDraft,
  summarizeTriggerConditions,
  TriggerForm,
} from "./trigger-form";

const eventOptions = getTriggerEventOptions();
const template = getTriggerTemplates()[0];
const userGroupOptions = [
  { value: "group_vip", label: "VIP клиенты" },
  { value: "group_school", label: "Ученики курса" },
] as const;

describe("TriggerForm", () => {
  it("renders the create form in Russian with structured conditions", () => {
    const html = renderToStaticMarkup(
      <TriggerForm
        action={async () => {}}
        cancelHref="/admin/triggers"
        eventOptions={eventOptions}
        initial={{
          conditions: template.conditions,
          delayUnit: template.delayUnit,
          delayValue: template.delayValue,
          eventKey: template.eventKey,
          id: null,
          imageUrl: null,
          messageText: "",
          name: template.name,
          status: "draft",
        }}
        submitLabel="Создать триггер"
        title="Новый триггер"
        userGroupOptions={userGroupOptions}
      />,
    );

    expect(html).toContain("Новый триггер");
    expect(html).toContain('name="name"');
    expect(html).toContain('value="After Start: no promo"');
    expect(html).toContain("Настройте событие, задержку, сообщение и условия аудитории для этого триггера.");
    expect(html).toContain("Условия");
    expect(html).toContain("Добавить условие");
    expect(html).toContain("Предпросмотр триггера");
    expect(html).not.toContain("Use JSON like");
  });

  it("renders an explicit Russian delete flow for existing triggers", () => {
    const html = renderToStaticMarkup(
      <TriggerForm
        action={async () => {}}
        cancelHref="/admin/triggers"
        deleteAction={async () => {}}
        eventOptions={eventOptions}
        initial={{
          conditions: [{ field: "userGroupId", operator: "isMember", value: "group_vip" }],
          delayUnit: "days",
          delayValue: 1,
          eventKey: "promo.expired",
          id: "rule_1",
          imageUrl: "/uploads/admin/triggers/existing.png",
          messageText: "Come back tomorrow.",
          name: "Promo expired",
          status: "active",
        }}
        submitLabel="Сохранить изменения"
        title="Редактирование триггера"
        userGroupOptions={userGroupOptions}
      />,
    );

    expect(html).toContain('name="id"');
    expect(html).toContain('value="rule_1"');
    expect(html).toContain("Сохранить изменения");
    expect(html).toContain("Удалить триггер");
    expect(html).toContain("Удаление уберет правило из автоматизаций и остановит будущие срабатывания.");
    expect(html).toContain("/uploads/admin/triggers/existing.png");
    expect(html).toContain("Состоит в группе VIP клиенты");
  });

  it("builds a readable preview summary for supported conditions", () => {
    expect(
      summarizeTriggerConditions(
        [
          { field: "promoClaimed", operator: "is", value: false },
          { field: "generationCount", operator: "gte", value: 3 },
        ],
        userGroupOptions,
      ),
    ).toBe("Промо получено: нет И Количество генераций не меньше 3");
  });

  it("renders real user groups in the condition builder", () => {
    const html = renderToStaticMarkup(
      <TriggerForm
        action={async () => {}}
        cancelHref="/admin/triggers"
        eventOptions={eventOptions}
        initial={{
          conditions: [{ field: "userGroupId", operator: "isMember", value: "group_school" }],
          delayUnit: "now",
          delayValue: 0,
          eventKey: template.eventKey,
          id: null,
          imageUrl: null,
          messageText: "",
          name: "Группа",
          status: "draft",
        }}
        submitLabel="Создать триггер"
        title="Новый триггер"
        userGroupOptions={userGroupOptions}
      />,
    );

    expect(html).toContain("Группа пользователей");
    expect(html).toContain("Состоит в группе");
    expect(html).toContain("VIP клиенты");
    expect(html).toContain("Ученики курса");
    expect(html).toContain("Выберите группу");
  });

  it("initializes user group drafts with the structured condition shape", () => {
    expect(createDefaultConditionDraft("userGroupId", userGroupOptions)).toEqual({
      field: "userGroupId",
      operator: "isMember",
      value: "",
    });
  });
});
