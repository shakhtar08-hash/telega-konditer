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
  it("prefills the form from a selected template with the structured conditions builder", () => {
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
        submitLabel="Create trigger"
        title="New trigger"
        userGroupOptions={userGroupOptions}
      />,
    );

    expect(html).toContain("New trigger");
    expect(html).toContain('name="name"');
    expect(html).toContain('value="After Start: no promo"');
    expect(html).toContain('name="eventKey"');
    expect(html).toContain('name="delayValue"');
    expect(html).toContain('name="delayUnit"');
    expect(html).toContain('name="conditions"');
    expect(html).toContain('type="hidden"');
    expect(html).toContain("All conditions below must match (AND).");
    expect(html).toContain("Промо получено");
    expect(html).not.toContain("Use JSON like");
    expect(html).toContain("Trigger preview");
  });

  it("renders edit controls for an existing trigger rule", () => {
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
        submitLabel="Save changes"
        title="Edit trigger"
        userGroupOptions={userGroupOptions}
      />,
    );

    expect(html).toContain('name="id"');
    expect(html).toContain('value="rule_1"');
    expect(html).toContain("Save changes");
    expect(html).toContain("Delete trigger");
    expect(html).toContain("/uploads/admin/triggers/existing.png");
    expect(html).toContain("Come back tomorrow.");
    expect(html).toContain("active");
    expect(html).toContain("Состоит в группе VIP клиенты");
  });

  it("builds a readable preview summary for supported conditions", () => {
    expect(
      summarizeTriggerConditions([
        { field: "promoClaimed", operator: "is", value: false },
        { field: "generationCount", operator: "gte", value: 3 },
      ], userGroupOptions),
    ).toBe("Промо получено: нет AND Количество генераций не меньше 3");
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
        submitLabel="Create trigger"
        title="New trigger"
        userGroupOptions={userGroupOptions}
      />,
    );

    expect(html).toContain("Группа пользователей");
    expect(html).toContain("Состоит в группе");
    expect(html).toContain("VIP клиенты");
    expect(html).toContain("Ученики курса");
  });

  it("initializes user group drafts with the structured condition shape", () => {
    expect(createDefaultConditionDraft("userGroupId", userGroupOptions)).toEqual({
      field: "userGroupId",
      operator: "isMember",
      value: "",
    });
  });
});
