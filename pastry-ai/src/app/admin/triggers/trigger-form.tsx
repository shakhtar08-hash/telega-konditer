import Link from "next/link";
import {
  AdminButton,
  AdminField,
  AdminImageField,
  AdminInput,
  AdminPanel,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/form";
import type { TriggerEventOption } from "@/features/triggers/trigger-template";
import type { TriggerCondition, TriggerRuleRecord } from "@/features/triggers/trigger-rule-types";

export type TriggerFormValues = {
  id: string | null;
  name: string;
  eventKey: string;
  status: TriggerRuleRecord["status"];
  delayValue: number;
  delayUnit: TriggerRuleRecord["delayUnit"];
  messageText: string;
  imageUrl: string | null;
  conditions: TriggerCondition[];
};

type TriggerFormProps = {
  action: (formData: FormData) => Promise<void>;
  cancelHref: string;
  deleteAction?: (formData: FormData) => Promise<void>;
  eventOptions: readonly TriggerEventOption[];
  initial: TriggerFormValues;
  submitLabel: string;
  title: string;
};

const delayUnitOptions = [
  { value: "now", label: "Now" },
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
] as const;

function formatDelay(delayValue: number, delayUnit: TriggerRuleRecord["delayUnit"]) {
  if (delayUnit === "now") {
    return "Send immediately";
  }

  const unitLabel = delayValue === 1 ? delayUnit.slice(0, -1) : delayUnit;
  return `Send in ${delayValue} ${unitLabel}`;
}

function getEventLabel(
  eventKey: string,
  eventOptions: readonly TriggerEventOption[],
) {
  return eventOptions.find((option) => option.key === eventKey)?.label ?? eventKey;
}

function toConditionsText(conditions: TriggerCondition[]) {
  return JSON.stringify(conditions, null, 2);
}

export function TriggerForm({
  action,
  cancelHref,
  deleteAction,
  eventOptions,
  initial,
  submitLabel,
  title,
}: TriggerFormProps) {
  const conditionsText = toConditionsText(initial.conditions);
  const previewText = initial.messageText.trim() || "Your Telegram message preview appears here.";

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <form action={action}>
        <AdminPanel className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#f4f7fb]">{title}</h2>
              <p className="mt-1 text-sm text-[#97a4b8]">
                Configure the event, delay, message, and audience conditions for this trigger.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={cancelHref}
                className="inline-flex rounded-md border border-[#2a3a55] bg-[#192334] px-3 py-2 text-sm font-medium text-[#dbe3ef] transition hover:bg-[#223047]"
              >
                Back
              </Link>
              <AdminButton type="submit">{submitLabel}</AdminButton>
            </div>
          </div>

          {initial.id ? <input name="id" type="hidden" value={initial.id} /> : null}

          <AdminField label="Trigger name">
            <AdminInput defaultValue={initial.name} name="name" required />
          </AdminField>

          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Event">
              <AdminSelect defaultValue={initial.eventKey} name="eventKey">
                {eventOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>

            {initial.id ? (
              <AdminField label="Status">
                <AdminSelect defaultValue={initial.status} name="status">
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </AdminSelect>
              </AdminField>
            ) : (
              <AdminField hint="New triggers are saved as draft first." label="Status">
                <AdminInput defaultValue="draft" disabled />
              </AdminField>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <AdminField label="Delay value">
              <AdminInput
                defaultValue={initial.delayValue}
                min={0}
                name="delayValue"
                type="number"
              />
            </AdminField>
            <AdminField label="Delay unit">
              <AdminSelect defaultValue={initial.delayUnit} name="delayUnit">
                {delayUnitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
          </div>

          <AdminField
            hint='Use JSON like [{"field":"promoClaimed","operator":"is","value":false}].'
            label="Conditions"
          >
            <AdminTextarea
              className="min-h-36 font-mono text-xs"
              defaultValue={conditionsText}
              name="conditions"
            />
          </AdminField>

          <AdminField label="Message text">
            <AdminTextarea
              className="min-h-40"
              defaultValue={initial.messageText}
              name="messageText"
              required
            />
          </AdminField>

          <AdminImageField
            defaultValue={initial.imageUrl ?? ""}
            fileName="imageFile"
            label="Image URL or upload"
            placeholder="/uploads/admin/triggers/reminder.png"
            textName="imageUrl"
          />

          {deleteAction && initial.id ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#223047] pt-4">
              <p className="text-sm text-[#97a4b8]">
                Deleting removes this rule from the automation inventory.
              </p>
              <div className="flex gap-2">
                <Link
                  href={cancelHref}
                  className="inline-flex rounded-md border border-[#2a3a55] bg-[#192334] px-3 py-2 text-sm font-medium text-[#dbe3ef] transition hover:bg-[#223047]"
                >
                  Cancel
                </Link>
                <button
                  className="rounded-md border border-[#7f1d1d] bg-[#2a1218] px-3 py-2 text-sm font-medium text-[#fecaca] transition hover:bg-[#3a1720]"
                  formAction={deleteAction}
                  type="submit"
                >
                  Delete trigger
                </button>
              </div>
            </div>
          ) : null}
        </AdminPanel>
      </form>

      <AdminPanel className="space-y-5">
        <div>
          <h3 className="font-semibold text-[#f4f7fb]">Trigger preview</h3>
          <p className="mt-1 text-sm text-[#97a4b8]">
            Review the event, send timing, and Telegram message before saving.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-[#223047] bg-[#0d1522] p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#7f8da3]">Event</p>
            <p className="mt-1 text-sm font-medium text-[#f4f7fb]">
              {getEventLabel(initial.eventKey, eventOptions)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#7f8da3]">Schedule</p>
            <p className="mt-1 text-sm font-medium text-[#f4f7fb]">
              {formatDelay(initial.delayValue, initial.delayUnit)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#7f8da3]">Conditions</p>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-[#dbe3ef]">
              {conditionsText}
            </pre>
          </div>
        </div>

        <div className="mx-auto max-w-[320px] rounded-[2rem] border border-[#2a3a55] bg-[#060a10] p-3 shadow-2xl">
          <div className="overflow-hidden rounded-[1.45rem] bg-[#f5eedf] text-[#172033]">
            <div className="flex items-center justify-between bg-white px-4 py-3 text-xs">
              <span className="font-semibold">9:41</span>
              <span>Pastry AI</span>
              <span>Telegram</span>
            </div>
            <div className="space-y-3 p-4">
              <div className="ml-auto w-fit rounded-xl bg-[#dff7c8] px-3 py-2 text-xs text-[#16723c]">
                {getEventLabel(initial.eventKey, eventOptions)}
              </div>
              {initial.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="w-full rounded-2xl object-cover"
                  src={initial.imageUrl}
                />
              ) : null}
              <div className="max-w-[240px] rounded-xl bg-white px-3 py-3 text-sm leading-5 shadow-sm">
                {previewText}
              </div>
            </div>
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}
