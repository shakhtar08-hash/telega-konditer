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
const dynamicUserGroupOptions = [
  { value: "dynamic_no_tariff", label: "Без активного тарифа" },
] as const;

describe("TriggerForm", () => {
  it("renders the create form in Russian with structured conditions", () => {
    const html = renderToStaticMarkup(
      <TriggerForm
        action="/api/admin/triggers/save"
        cancelHref="/admin/triggers"
        dynamicUserGroupOptions={dynamicUserGroupOptions}
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
          buttons: [],
          status: "draft",
        }}
        submitLabel="Создать триггер"
        title="Новый триггер"
        userGroupOptions={userGroupOptions}
      />,
    );

    expect(html).toContain("Новый триггер");
    expect(html).toContain('method="post"');
    expect(html).toContain('name="name"');
    expect(html).toContain("Условия");
    expect(html).toContain("Добавить условие");
    expect(html).toContain("Предпросмотр триггера");
    expect(html).toContain("Оплатить");
    expect(html).toContain('name="buttons"');
    expect(html).toContain("HTML-форматирование");
    expect(html).toContain('action="/api/admin/triggers/save"');
    expect(html).toContain('data-format="bold"');
    expect(html).toContain('data-format="italic"');
    expect(html).toContain('data-format="strikethrough"');
    expect(html).toContain('data-format="link"');
    expect(html).toContain("Отправить тестовое сообщение");
  });

  it("renders delete flow for existing triggers", () => {
    const html = renderToStaticMarkup(
      <TriggerForm
        action="/api/admin/triggers/save"
        cancelHref="/admin/triggers"
        deleteAction="/api/admin/triggers/delete"
        dynamicUserGroupOptions={dynamicUserGroupOptions}
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
          buttons: [{ text: "Оплатить", type: "url", value: "https://pay.example.com" }],
          status: "active",
        }}
        submitLabel="Сохранить изменения"
        title="Редактирование триггера"
        userGroupOptions={userGroupOptions}
      />,
    );

    expect(html).toContain('name="id"');
    expect(html).toContain("Сохранить изменения");
    expect(html).toContain("Удалить триггер");
    expect(html).toContain('formAction="/api/admin/triggers/delete"');
    expect(html).toContain("/uploads/admin/triggers/existing.png");
    expect(html).toContain("Telegram HTML");
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
        dynamicUserGroupOptions,
      ),
    ).toBe("Промо получено: нет И Количество генераций не меньше 3");
  });

  it("renders real user and dynamic groups in the condition builder", () => {
    const html = renderToStaticMarkup(
      <TriggerForm
        action="/api/admin/triggers/save"
        cancelHref="/admin/triggers"
        dynamicUserGroupOptions={dynamicUserGroupOptions}
        eventOptions={eventOptions}
        initial={{
          conditions: [{ field: "dynamicUserGroupId", operator: "matches", value: "dynamic_no_tariff" }],
          delayUnit: "now",
          delayValue: 0,
          eventKey: template.eventKey,
          id: null,
          imageUrl: null,
          messageText: "",
          name: "Группа",
          buttons: [],
          status: "draft",
        }}
        submitLabel="Создать триггер"
        title="Новый триггер"
        userGroupOptions={userGroupOptions}
      />,
    );

    expect(html).toContain("Группа пользователей");
    expect(html).toContain("Динамическая группа");
    expect(html).toContain("Без активного тарифа");
  });

  it("renders scenario delivery controls without requiring legacy message text", () => {
    const html = renderToStaticMarkup(
      <TriggerForm
        action="/api/admin/triggers/save"
        cancelHref="/admin/triggers"
        dynamicUserGroupOptions={dynamicUserGroupOptions}
        eventOptions={eventOptions}
        initial={{
          buttons: [],
          conditions: [],
          delayUnit: "now",
          delayValue: 0,
          deliveryType: "SCENARIO",
          eventKey: template.eventKey,
          id: null,
          imageUrl: null,
          messageText: "",
          name: "Сценарный триггер",
          scenarioId: "scenario_1",
          status: "draft",
        }}
        scenarioOptions={[{ id: "scenario_1", name: "Promo flow", status: "active" }]}
        submitLabel="Создать триггер"
        title="Новый триггер"
        userGroupOptions={userGroupOptions}
      />,
    );

    expect(html).toContain('name="deliveryType"');
    expect(html).toContain('value="SCENARIO" selected');
    expect(html).toContain('type="hidden" name="delayValue" value="0"');
    expect(html).toContain('name="scenarioId"');
    expect(html).toContain("Promo flow");
    expect(html).not.toContain('name="messageText"');
    expect(html).not.toContain('name="imageUrl"');
    expect(html).not.toContain('name="buttons"');
  });

  it("hides the numeric delay input when the trigger should send immediately", () => {
    const html = renderToStaticMarkup(
      <TriggerForm
        action="/api/admin/triggers/save"
        cancelHref="/admin/triggers"
        dynamicUserGroupOptions={dynamicUserGroupOptions}
        eventOptions={eventOptions}
        initial={{
          buttons: [],
          conditions: [],
          delayUnit: "now",
          delayValue: 12,
          eventKey: template.eventKey,
          id: null,
          imageUrl: null,
          messageText: "",
          name: "Immediate trigger",
          status: "draft",
        }}
        submitLabel="Create"
        title="Immediate trigger"
        userGroupOptions={userGroupOptions}
      />,
    );

    expect(html).toContain('type="hidden" name="delayValue" value="0"');
    expect(html).not.toContain('type="number" name="delayValue"');
  });

  it("shows the manual run button for an existing now-trigger", () => {
    const html = renderToStaticMarkup(
      <TriggerForm
        action="/api/admin/triggers/save"
        cancelHref="/admin/triggers"
        deleteAction="/api/admin/triggers/delete"
        eventOptions={eventOptions}
        initial={{
          buttons: [],
          conditions: [],
          delayUnit: "now",
          delayValue: 0,
          eventKey: template.eventKey,
          id: "rule_now",
          imageUrl: null,
          messageText: "Promo now",
          name: "Now trigger",
          status: "active",
        }}
        submitLabel="Save"
        title="Now trigger"
        userGroupOptions={userGroupOptions}
      />,
    );

    expect(html).toContain("Разослать сейчас");
  });

  it("initializes user and dynamic group drafts with the structured condition shape", () => {
    expect(createDefaultConditionDraft("userGroupId", userGroupOptions, dynamicUserGroupOptions)).toEqual({
      field: "userGroupId",
      operator: "isMember",
      value: "",
    });
    expect(createDefaultConditionDraft("dynamicUserGroupId", userGroupOptions, dynamicUserGroupOptions)).toEqual({
      field: "dynamicUserGroupId",
      operator: "matches",
      value: "",
    });
  });

  it("builds a readable summary for dynamic group conditions", () => {
    expect(
      summarizeTriggerConditions(
        [{ field: "dynamicUserGroupId", operator: "matches", value: "dynamic_no_tariff" }],
        userGroupOptions,
        dynamicUserGroupOptions,
      ),
    ).toContain("Пользователь входит в динамическую группу «Без активного тарифа»");
  });
});
