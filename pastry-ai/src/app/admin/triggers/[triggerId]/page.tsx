import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/data-table";
import ChatBotSubNav from "@/components/admin/chat-bot-subnav";
import { prisma } from "@/db/prisma";
import { getTriggerEventOptions } from "@/features/triggers/trigger-template";
import type { TriggerCondition } from "@/features/triggers/trigger-rule-types";
import { deleteTriggerRule, updateTriggerRule } from "../actions";
import { TriggerForm } from "../trigger-form";

type TriggerRulePageProps = {
  params: Promise<{ triggerId: string }> | { triggerId: string };
};

export default async function TriggerRulePage({ params }: TriggerRulePageProps) {
  const resolvedParams = await params;
  const rule = await prisma.triggerRule.findUnique({
    where: { id: resolvedParams.triggerId },
    select: {
      conditions: true,
      delayUnit: true,
      delayValue: true,
      eventKey: true,
      id: true,
      imageUrl: true,
      messageText: true,
      name: true,
      status: true,
    },
  });

  if (!rule) {
    notFound();
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Update timing, conditions, and message content for an existing trigger rule."
        title="Edit trigger"
      />
      <ChatBotSubNav />
      <TriggerForm
        action={updateTriggerRule}
        cancelHref="/admin/triggers"
        deleteAction={deleteTriggerRule}
        eventOptions={getTriggerEventOptions()}
        initial={{
          conditions: Array.isArray(rule.conditions)
            ? (rule.conditions as TriggerCondition[])
            : [],
          delayUnit: rule.delayUnit as "now" | "minutes" | "hours" | "days",
          delayValue: rule.delayValue,
          eventKey: rule.eventKey,
          id: rule.id,
          imageUrl: rule.imageUrl,
          messageText: rule.messageText,
          name: rule.name,
          status: rule.status as "draft" | "active" | "disabled",
        }}
        submitLabel="Save changes"
        title="Edit trigger"
      />
    </section>
  );
}
