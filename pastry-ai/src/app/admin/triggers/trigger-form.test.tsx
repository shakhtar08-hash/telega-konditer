import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getTriggerEventOptions, getTriggerTemplates } from "@/features/triggers/trigger-template";
import { TriggerForm } from "./trigger-form";

const eventOptions = getTriggerEventOptions();
const template = getTriggerTemplates()[0];

describe("TriggerForm", () => {
  it("prefills the form from a selected template", () => {
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
      />,
    );

    expect(html).toContain("New trigger");
    expect(html).toContain('name="name"');
    expect(html).toContain('value="After Start: no promo"');
    expect(html).toContain('name="eventKey"');
    expect(html).toContain('name="delayValue"');
    expect(html).toContain('name="delayUnit"');
    expect(html).toContain('name="conditions"');
    expect(html).toContain("promoClaimed");
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
          conditions: [{ field: "hasActiveTariff", operator: "is", value: false }],
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
      />,
    );

    expect(html).toContain('name="id"');
    expect(html).toContain('value="rule_1"');
    expect(html).toContain("Save changes");
    expect(html).toContain("Delete trigger");
    expect(html).toContain("/uploads/admin/triggers/existing.png");
    expect(html).toContain("Come back tomorrow.");
    expect(html).toContain("active");
  });
});
