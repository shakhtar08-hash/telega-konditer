"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AdminButton,
  AdminField,
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

export type TriggerUserGroupOption = {
  value: string;
  label: string;
};

type TriggerFormProps = {
  action: (formData: FormData) => Promise<void>;
  cancelHref: string;
  deleteAction?: (formData: FormData) => Promise<void>;
  eventOptions: readonly TriggerEventOption[];
  initial: TriggerFormValues;
  submitLabel: string;
  title: string;
  userGroupOptions?: readonly TriggerUserGroupOption[];
};

const delayUnitOptions = [
  { value: "now", label: "Now" },
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
] as const;

type ConditionFieldKey =
  | "promoClaimed"
  | "hasActiveTariff"
  | "generationCount"
  | "userGroupId";

type TriggerConditionDraft = {
  field: ConditionFieldKey;
  operator: string;
  value: string;
};

function getConditionFieldOptions(
  userGroupOptions: readonly TriggerUserGroupOption[] = [],
) {
  return [
    {
      label: "Промо получено",
      operators: [{ label: "Равно", value: "is" }],
      type: "boolean",
      valueLabel: "Значение",
      valueOptions: [
        { label: "Да", value: "true" },
        { label: "Нет", value: "false" },
      ],
      valuePlaceholder: "",
      valueStep: undefined,
      valueType: "select",
      valueWidth: "md:max-w-[180px]",
      valueName: "promoClaimed",
    },
    {
      label: "Активный тариф",
      operators: [{ label: "Равно", value: "is" }],
      type: "boolean",
      valueLabel: "Значение",
      valueOptions: [
        { label: "Да", value: "true" },
        { label: "Нет", value: "false" },
      ],
      valuePlaceholder: "",
      valueStep: undefined,
      valueType: "select",
      valueWidth: "md:max-w-[180px]",
      valueName: "hasActiveTariff",
    },
    {
      label: "Количество генераций",
      operators: [
        { label: "Равно", value: "equals" },
        { label: "Не меньше", value: "gte" },
      ],
      type: "number",
      valueLabel: "Количество",
      valueOptions: [],
      valuePlaceholder: "0",
      valueStep: 1,
      valueType: "number",
      valueWidth: "md:max-w-[140px]",
      valueName: "generationCount",
    },
    {
      label: "Группа пользователей",
      operators: [{ label: "Состоит в группе", value: "isMember" }],
      type: "string",
      valueLabel: "Группа",
      valueOptions: userGroupOptions,
      valuePlaceholder: "",
      valueStep: undefined,
      valueType: "select",
      valueWidth: "md:max-w-[220px]",
      valueName: "userGroupId",
    },
  ] as const;
}

function getConditionFieldConfig(
  field: ConditionFieldKey,
  userGroupOptions: readonly TriggerUserGroupOption[] = [],
) {
  const options = getConditionFieldOptions(userGroupOptions);
  return options.find((option) => option.valueName === field) ?? options[0];
}

function getUserGroupLabel(
  value: string,
  userGroupOptions: readonly TriggerUserGroupOption[] = [],
) {
  return userGroupOptions.find((option) => option.value === value)?.label ?? value;
}

function toConditionDraft(condition: TriggerCondition): TriggerConditionDraft {
  switch (condition.field) {
    case "promoClaimed":
    case "hasActiveTariff":
    case "generationCount":
      return {
        field: condition.field,
        operator: condition.operator,
        value: String(condition.value),
      };
    case "userGroupId":
    case "groupId":
      return {
        field: "userGroupId",
        operator: "isMember",
        value: condition.value,
      };
  }
}

function toConditionValue(
  draft: TriggerConditionDraft,
  userGroupOptions: readonly TriggerUserGroupOption[] = [],
): TriggerCondition["value"] {
  const config = getConditionFieldConfig(draft.field, userGroupOptions);

  if (config.type === "boolean") {
    return draft.value === "true";
  }

  if (config.type === "number") {
    const parsed = Number(draft.value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return draft.value.trim();
}

function toTriggerCondition(
  draft: TriggerConditionDraft,
  userGroupOptions: readonly TriggerUserGroupOption[] = [],
): TriggerCondition {
  switch (draft.field) {
    case "promoClaimed":
      return {
        field: "promoClaimed",
        operator: "is",
        value: toConditionValue(draft, userGroupOptions) as boolean,
      };
    case "hasActiveTariff":
      return {
        field: "hasActiveTariff",
        operator: "is",
        value: toConditionValue(draft, userGroupOptions) as boolean,
      };
    case "generationCount":
      return {
        field: "generationCount",
        operator: draft.operator === "gte" ? "gte" : "equals",
        value: toConditionValue(draft, userGroupOptions) as number,
      };
    case "userGroupId":
      return {
        field: "userGroupId",
        operator: "isMember",
        value: toConditionValue(draft, userGroupOptions) as string,
      };
  }
}

export function createDefaultConditionDraft(
  field: ConditionFieldKey = "promoClaimed",
  userGroupOptions: readonly TriggerUserGroupOption[] = [],
): TriggerConditionDraft {
  const config = getConditionFieldConfig(field, userGroupOptions);
  const initialValue =
    field === "userGroupId"
      ? ""
      : config.valueType === "select"
        ? config.valueOptions[1]?.value ?? config.valueOptions[0]?.value ?? ""
        : config.valueType === "number"
          ? "0"
          : "";

  return {
    field,
    operator: config.operators[0]?.value ?? "is",
    value: initialValue,
  };
}

export function formatTriggerDelay(
  delayValue: number,
  delayUnit: TriggerRuleRecord["delayUnit"],
) {
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

export function summarizeTriggerConditions(
  conditions: TriggerCondition[],
  userGroupOptions: readonly TriggerUserGroupOption[] = [],
) {
  if (conditions.length === 0) {
    return "No conditions. This trigger runs for everyone on the selected event.";
  }

  return conditions
    .map((condition) => {
      switch (condition.field) {
        case "promoClaimed":
          return `Промо получено: ${condition.value ? "да" : "нет"}`;
        case "hasActiveTariff":
          return `Активный тариф: ${condition.value ? "да" : "нет"}`;
        case "generationCount":
          return condition.operator === "gte"
            ? `Количество генераций не меньше ${condition.value}`
            : `Количество генераций равно ${condition.value}`;
        case "userGroupId":
        case "groupId":
          return `Состоит в группе ${getUserGroupLabel(condition.value, userGroupOptions)}`;
      }
    })
    .join(" AND ");
}

function ConditionValueInput({
  draft,
  index,
  onChange,
  userGroupOptions = [],
}: {
  draft: TriggerConditionDraft;
  index: number;
  onChange: (value: string) => void;
  userGroupOptions?: readonly TriggerUserGroupOption[];
}) {
  const config = getConditionFieldConfig(draft.field, userGroupOptions);

  if (config.valueType === "select") {
    return (
      <AdminSelect
        aria-label={`Condition ${index + 1} value`}
        className={config.valueWidth}
        value={draft.value}
        onChange={(event) => onChange(event.target.value)}
      >
        {draft.field === "userGroupId" ? (
          <option value="">Выберите группу</option>
        ) : null}
        {config.valueOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </AdminSelect>
    );
  }

  return (
    <AdminInput
      aria-label={`Condition ${index + 1} value`}
      className={config.valueWidth}
      min={config.valueType === "number" ? 0 : undefined}
      placeholder={config.valuePlaceholder}
      step={config.valueStep}
      type={config.valueType}
      value={draft.value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function TriggerForm({
  action,
  cancelHref,
  deleteAction,
  eventOptions,
  initial,
  submitLabel,
  title,
  userGroupOptions = [],
}: TriggerFormProps) {
  const [eventKey, setEventKey] = useState(initial.eventKey);
  const [delayValue, setDelayValue] = useState(String(initial.delayValue));
  const [delayUnit, setDelayUnit] = useState<TriggerRuleRecord["delayUnit"]>(initial.delayUnit);
  const [messageText, setMessageText] = useState(initial.messageText);
  const [imageUrl, setImageUrl] = useState(initial.imageUrl ?? "");
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [conditions, setConditions] = useState<TriggerConditionDraft[]>(
    initial.conditions.length > 0
      ? initial.conditions.map((condition) => toConditionDraft(condition))
      : [],
  );

  useEffect(() => {
    return () => {
      if (uploadedPreviewUrl) {
        URL.revokeObjectURL(uploadedPreviewUrl);
      }
    };
  }, [uploadedPreviewUrl]);

  const normalizedDelayValue = Number(delayValue);
  const previewDelayValue = Number.isFinite(normalizedDelayValue) ? normalizedDelayValue : 0;
  const previewConditions = conditions.map((condition) =>
    toTriggerCondition(condition, userGroupOptions),
  );
  const conditionsPayload = JSON.stringify(previewConditions);
  const conditionsSummary = summarizeTriggerConditions(previewConditions, userGroupOptions);
  const previewText = messageText.trim() || "Your Telegram message preview appears here.";
  const previewImageUrl = uploadedPreviewUrl ?? imageUrl.trim();

  function updateCondition(index: number, patch: Partial<TriggerConditionDraft>) {
    setConditions((current) =>
      current.map((condition, conditionIndex) => {
        if (conditionIndex !== index) {
          return condition;
        }

        if (patch.field && patch.field !== condition.field) {
          return createDefaultConditionDraft(patch.field, userGroupOptions);
        }

        return { ...condition, ...patch };
      }),
    );
  }

  const fieldOptions = getConditionFieldOptions(userGroupOptions);

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
          <input name="conditions" type="hidden" value={conditionsPayload} />

          <AdminField label="Trigger name">
            <AdminInput defaultValue={initial.name} name="name" required />
          </AdminField>

          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Event">
              <AdminSelect
                name="eventKey"
                value={eventKey}
                onChange={(event) => setEventKey(event.target.value)}
              >
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
                min={0}
                name="delayValue"
                type="number"
                value={delayValue}
                onChange={(event) => setDelayValue(event.target.value)}
              />
            </AdminField>
            <AdminField label="Delay unit">
              <AdminSelect
                name="delayUnit"
                value={delayUnit}
                onChange={(event) =>
                  setDelayUnit(event.target.value as TriggerRuleRecord["delayUnit"])
                }
              >
                {delayUnitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#f4f7fb]">Conditions</h3>
                  <p className="mt-1 text-sm text-[#97a4b8]">
                    All conditions below must match (AND). Supported fields and operators only.
                  </p>
                </div>
                <AdminButton
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setConditions((current) => [
                      ...current,
                      createDefaultConditionDraft("promoClaimed", userGroupOptions),
                    ])
                  }
                >
                  Add condition
                </AdminButton>
              </div>
            </div>

            {conditions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#2a3a55] bg-[#0d1522] px-4 py-4 text-sm text-[#97a4b8]">
                No conditions yet. This trigger will run for every user who reaches the selected event.
              </div>
            ) : (
              <div className="space-y-3">
                {conditions.map((condition, index) => {
                  const fieldConfig = getConditionFieldConfig(condition.field, userGroupOptions);

                  return (
                    <div
                      className="rounded-lg border border-[#223047] bg-[#0d1522] p-4"
                      key={`${condition.field}-${index}`}
                    >
                      <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
                        <AdminField label="Field">
                          <AdminSelect
                            aria-label={`Condition ${index + 1} field`}
                            value={condition.field}
                            onChange={(event) =>
                              updateCondition(index, {
                                field: event.target.value as ConditionFieldKey,
                              })
                            }
                          >
                            {fieldOptions.map((option) => (
                              <option key={option.valueName} value={option.valueName}>
                                {option.label}
                              </option>
                            ))}
                          </AdminSelect>
                        </AdminField>
                        <AdminField label="Operator">
                          <AdminSelect
                            aria-label={`Condition ${index + 1} operator`}
                            value={condition.operator}
                            onChange={(event) =>
                              updateCondition(index, { operator: event.target.value })
                            }
                          >
                            {fieldConfig.operators.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </AdminSelect>
                        </AdminField>
                        <AdminField label={fieldConfig.valueLabel}>
                          <ConditionValueInput
                            draft={condition}
                            index={index}
                            onChange={(value) => updateCondition(index, { value })}
                            userGroupOptions={userGroupOptions}
                          />
                        </AdminField>
                        <AdminButton
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            setConditions((current) =>
                              current.filter((_, conditionIndex) => conditionIndex !== index),
                            )
                          }
                        >
                          Remove
                        </AdminButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <AdminField label="Message text">
            <AdminTextarea
              className="min-h-40"
              name="messageText"
              required
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
            />
          </AdminField>

          <AdminField label="Image URL or upload">
            <div className="space-y-3">
              <AdminInput
                name="imageUrl"
                placeholder="/uploads/admin/triggers/reminder.png"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
              />
              <div className="space-y-2">
                <span className="block text-xs text-[#7f8da3]">Or choose an image file</span>
                <AdminInput
                  accept="image/*"
                  name="imageFile"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    setUploadedPreviewUrl((current) => {
                      if (current) {
                        URL.revokeObjectURL(current);
                      }

                      return file ? URL.createObjectURL(file) : null;
                    });
                  }}
                />
              </div>
              {previewImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="h-24 w-24 rounded-md border border-[#2a3a55] object-cover"
                  src={previewImageUrl}
                />
              ) : null}
            </div>
          </AdminField>

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
              {getEventLabel(eventKey, eventOptions)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#7f8da3]">Schedule</p>
            <p className="mt-1 text-sm font-medium text-[#f4f7fb]">
              {formatTriggerDelay(previewDelayValue, delayUnit)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#7f8da3]">Conditions</p>
            <p className="mt-1 text-sm leading-6 text-[#dbe3ef]">{conditionsSummary}</p>
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
                {getEventLabel(eventKey, eventOptions)}
              </div>
              {previewImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="w-full rounded-2xl object-cover"
                  src={previewImageUrl}
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
