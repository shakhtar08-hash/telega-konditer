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
  { value: "now", label: "Сразу" },
  { value: "minutes", label: "Минуты" },
  { value: "hours", label: "Часы" },
  { value: "days", label: "Дни" },
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

function getRussianCountWord(value: number, one: string, few: string, many: string) {
  const abs = Math.abs(value) % 100;
  const tail = abs % 10;

  if (abs > 10 && abs < 20) {
    return many;
  }

  if (tail === 1) {
    return one;
  }

  if (tail > 1 && tail < 5) {
    return few;
  }

  return many;
}

export function formatTriggerDelay(
  delayValue: number,
  delayUnit: TriggerRuleRecord["delayUnit"],
) {
  if (delayUnit === "now") {
    return "Отправится сразу";
  }

  const unitLabel =
    delayUnit === "minutes"
      ? getRussianCountWord(delayValue, "минуту", "минуты", "минут")
      : delayUnit === "hours"
        ? getRussianCountWord(delayValue, "час", "часа", "часов")
        : getRussianCountWord(delayValue, "день", "дня", "дней");

  return `Отправится через ${delayValue} ${unitLabel}`;
}

function getEventLabel(
  eventKey: string,
  eventOptions: readonly TriggerEventOption[],
) {
  return eventOptions.find((option) => option.key === eventKey)?.label ?? eventKey;
}

function getStatusLabel(status: TriggerRuleRecord["status"]) {
  switch (status) {
    case "active":
      return "Активен";
    case "disabled":
      return "Отключен";
    case "draft":
    default:
      return "Черновик";
  }
}

export function summarizeTriggerConditions(
  conditions: TriggerCondition[],
  userGroupOptions: readonly TriggerUserGroupOption[] = [],
) {
  if (conditions.length === 0) {
    return "Без условий. Триггер сработает для каждого пользователя на выбранном событии.";
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
    .join(" И ");
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
        aria-label={`Условие ${index + 1}: значение`}
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
      aria-label={`Условие ${index + 1}: значение`}
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
  const previewText = messageText.trim() || "Здесь появится предпросмотр сообщения Telegram.";
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
                Настройте событие, задержку, сообщение и условия аудитории для этого триггера.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={cancelHref}
                className="inline-flex rounded-md border border-[#2a3a55] bg-[#192334] px-3 py-2 text-sm font-medium text-[#dbe3ef] transition hover:bg-[#223047]"
              >
                Назад
              </Link>
              <AdminButton type="submit">{submitLabel}</AdminButton>
            </div>
          </div>

          {initial.id ? <input name="id" type="hidden" value={initial.id} /> : null}
          <input name="conditions" type="hidden" value={conditionsPayload} />

          <AdminField label="Название триггера">
            <AdminInput defaultValue={initial.name} name="name" required />
          </AdminField>

          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Событие">
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
              <AdminField label="Статус">
                <AdminSelect defaultValue={initial.status} name="status">
                  <option value="draft">{getStatusLabel("draft")}</option>
                  <option value="active">{getStatusLabel("active")}</option>
                  <option value="disabled">{getStatusLabel("disabled")}</option>
                </AdminSelect>
              </AdminField>
            ) : (
              <AdminField hint="Новый триггер сначала сохраняется как черновик." label="Статус">
                <AdminInput defaultValue={getStatusLabel("draft")} disabled />
              </AdminField>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <AdminField label="Задержка">
              <AdminInput
                min={0}
                name="delayValue"
                type="number"
                value={delayValue}
                onChange={(event) => setDelayValue(event.target.value)}
              />
            </AdminField>
            <AdminField label="Единица задержки">
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
                  <h3 className="font-semibold text-[#f4f7fb]">Условия</h3>
                  <p className="mt-1 text-sm text-[#97a4b8]">
                    Все условия ниже должны совпасть одновременно. Поддерживаются только заданные поля и операторы.
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
                  Добавить условие
                </AdminButton>
              </div>
            </div>

            {conditions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#2a3a55] bg-[#0d1522] px-4 py-4 text-sm text-[#97a4b8]">
                Пока нет условий. Триггер сработает для каждого пользователя, который дойдет до выбранного события.
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
                        <AdminField label="Поле">
                          <AdminSelect
                            aria-label={`Условие ${index + 1}: поле`}
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
                        <AdminField label="Оператор">
                          <AdminSelect
                            aria-label={`Условие ${index + 1}: оператор`}
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
                          Удалить
                        </AdminButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <AdminField label="Текст сообщения">
            <AdminTextarea
              className="min-h-40"
              name="messageText"
              required
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
            />
          </AdminField>

          <AdminField label="Ссылка на изображение или загрузка">
            <div className="space-y-3">
              <AdminInput
                name="imageUrl"
                placeholder="/uploads/admin/triggers/reminder.png"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
              />
              <div className="space-y-2">
                <span className="block text-xs text-[#7f8da3]">Или выберите файл изображения</span>
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
            <div className="rounded-xl border border-[#6b2430] bg-[#1b1116] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#fecaca]">Удаление триггера</h3>
                  <p className="mt-1 text-sm text-[#c7a9b1]">
                    Удаление уберет правило из автоматизаций и остановит будущие срабатывания.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={cancelHref}
                    className="inline-flex rounded-md border border-[#2a3a55] bg-[#192334] px-3 py-2 text-sm font-medium text-[#dbe3ef] transition hover:bg-[#223047]"
                  >
                    Отмена
                  </Link>
                  <button
                    className="rounded-md border border-[#7f1d1d] bg-[#2a1218] px-3 py-2 text-sm font-medium text-[#fecaca] transition hover:bg-[#3a1720]"
                    formAction={deleteAction}
                    type="submit"
                  >
                    Удалить триггер
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </AdminPanel>
      </form>

      <AdminPanel className="space-y-5">
        <div>
          <h3 className="font-semibold text-[#f4f7fb]">Предпросмотр триггера</h3>
          <p className="mt-1 text-sm text-[#97a4b8]">
            Проверьте событие, время отправки и сообщение Telegram перед сохранением.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-[#223047] bg-[#0d1522] p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#7f8da3]">Событие</p>
            <p className="mt-1 text-sm font-medium text-[#f4f7fb]">
              {getEventLabel(eventKey, eventOptions)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#7f8da3]">Отправка</p>
            <p className="mt-1 text-sm font-medium text-[#f4f7fb]">
              {formatTriggerDelay(previewDelayValue, delayUnit)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#7f8da3]">Условия</p>
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
