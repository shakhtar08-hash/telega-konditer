import { AdminPageHeader } from "@/components/admin/data-table";
import ChatBotSubNav from "@/components/admin/chat-bot-subnav";
import {
  getTriggerEventOptions,
  getTriggerTemplates,
} from "@/features/triggers/trigger-template";
import { createTriggerRule } from "../actions";
import { TriggerForm, type TriggerFormValues } from "../trigger-form";

type NewTriggerPageProps = {
  searchParams?: Promise<{ template?: string }> | { template?: string };
};

function buildInitialValues(templateKey?: string): TriggerFormValues {
  const template = getTriggerTemplates().find((item) => item.key === templateKey);

  return {
    conditions: template?.conditions ?? [],
    delayUnit: template?.delayUnit ?? "now",
    delayValue: template?.delayValue ?? 0,
    eventKey: template?.eventKey ?? getTriggerEventOptions()[0]?.key ?? "user.started",
    id: null,
    imageUrl: null,
    messageText: "",
    name: template?.name ?? "",
    status: "draft",
  };
}

export default async function NewTriggerPage({ searchParams }: NewTriggerPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initial = buildInitialValues(resolvedSearchParams.template);

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Create a new event-driven automation rule for follow-ups and re-engagement."
        title="New trigger"
      />
      <ChatBotSubNav />
      <TriggerForm
        action={createTriggerRule}
        cancelHref="/admin/triggers"
        eventOptions={getTriggerEventOptions()}
        initial={initial}
        submitLabel="Create trigger"
        title="New trigger"
      />
    </section>
  );
}
