"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/form";
import type { DynamicGroupCondition, DynamicUserGroupDefinition } from "@/features/dynamic-user-groups/rule-types";

type ConditionFieldKey = DynamicGroupCondition["field"];

type ConditionDraft = {
  field: ConditionFieldKey;
  operator: string;
  value: string;
};

export type DynamicGroupFormValues = {
  id: string | null;
  name: string;
  description: string;
  status: "active" | "disabled";
  definition: DynamicUserGroupDefinition;
};

type DynamicGroupFormProps = {
  action: (formData: FormData) => Promise<void>;
  cancelHref: string;
  deleteAction?: (formData: FormData) => Promise<void>;
  initial: DynamicGroupFormValues;
  submitLabel: string;
  title: string;
};

const fieldOptions = [
  {
    value: "hasActiveTariff",
    label: "Активный тариф",
    operators: [
      { value: "is", label: "Равно" },
      { value: "isNot", label: "Не равно" },
    ],
    input: "select",
    valueOptions: [
      { value: "true", label: "Да" },
      { value: "false", label: "Нет" },
    ],
  },
  {
    value: "promoClaimed",
    label: "Промо получено",
    operators: [
      { value: "is", label: "Равно" },
      { value: "isNot", label: "Не равно" },
    ],
    input: "select",
    valueOptions: [
      { value: "true", label: "Да" },
      { value: "false", label: "Нет" },
    ],
  },
  {
    value: "generationCount",
    label: "Количество генераций",
    operators: [
      { value: "equals", label: "Равно" },
      { value: "gte", label: "Не меньше" },
      { value: "lte", label: "Не больше" },
    ],
    input: "number",
    valueOptions: [],
  },
  {
    value: "daysSinceLastActivity",
    label: "Дней с последней активности",
    operators: [
      { value: "equals", label: "Равно" },
      { value: "gte", label: "Не меньше" },
      { value: "lte", label: "Не больше" },
    ],
    input: "number",
    valueOptions: [],
  },
  {
    value: "daysSinceSignup",
    label: "Дней с регистрации",
    operators: [
      { value: "equals", label: "Равно" },
      { value: "gte", label: "Не меньше" },
      { value: "lte", label: "Не больше" },
    ],
    input: "number",
    valueOptions: [],
  },
  {
    value: "remainingTokens",
    label: "Остаток токенов",
    operators: [
      { value: "equals", label: "Равно" },
      { value: "gte", label: "Не меньше" },
      { value: "lte", label: "Не больше" },
    ],
    input: "number",
    valueOptions: [],
  },
  {
    value: "tariffExpired",
    label: "Тариф истёк",
    operators: [
      { value: "is", label: "Равно" },
      { value: "isNot", label: "Не равно" },
    ],
    input: "select",
    valueOptions: [
      { value: "true", label: "Да" },
      { value: "false", label: "Нет" },
    ],
  },
] as const;

function getFieldConfig(field: ConditionFieldKey) {
  return fieldOptions.find((option) => option.value === field) ?? fieldOptions[0];
}

function toDraft(condition: DynamicGroupCondition): ConditionDraft {
  return {
    field: condition.field,
    operator: condition.operator,
    value: String(condition.value),
  };
}

function toCondition(draft: ConditionDraft): DynamicGroupCondition | null {
  switch (draft.field) {
    case "promoClaimed":
    case "hasActiveTariff":
    case "tariffExpired":
      return draft.operator === "is" || draft.operator === "isNot"
        ? {
            field: draft.field,
            operator: draft.operator,
            value: draft.value === "true",
          }
        : null;
    case "generationCount":
    case "daysSinceLastActivity":
    case "daysSinceSignup":
    case "remainingTokens": {
      if (
        draft.operator !== "equals" &&
        draft.operator !== "gte" &&
        draft.operator !== "lte"
      ) {
        return null;
      }

      const parsed = Number(draft.value);

      return Number.isFinite(parsed)
        ? {
            field: draft.field,
            operator: draft.operator,
            value: parsed,
          }
        : null;
    }
  }
}

export function createDefaultDynamicConditionDraft(
  field: ConditionFieldKey = "hasActiveTariff",
): ConditionDraft {
  const config = getFieldConfig(field);

  return {
    field,
    operator: config.operators[0]?.value ?? "is",
    value: config.input === "number" ? "0" : "true",
  };
}

export function summarizeDynamicUserGroup(definition: DynamicUserGroupDefinition) {
  if (definition.conditions.length === 0) {
    return "Нет условий";
  }

  const joiner = definition.logicOperator === "AND" ? " И " : " ИЛИ ";

  return definition.conditions
    .map((condition) => {
      const config = getFieldConfig(condition.field);
      const operator =
        config.operators.find((option) => option.value === condition.operator)?.label ??
        condition.operator;
      const value =
        typeof condition.value === "boolean"
          ? condition.value
            ? "да"
            : "нет"
          : String(condition.value);

      return `${config.label}: ${operator.toLowerCase()} ${value}`;
    })
    .join(joiner);
}

export function DynamicGroupForm({
  action,
  cancelHref,
  deleteAction,
  initial,
  submitLabel,
  title,
}: DynamicGroupFormProps) {
  const [logicOperator, setLogicOperator] = useState<DynamicUserGroupDefinition["logicOperator"]>(
    initial.definition.logicOperator,
  );
  const [conditions, setConditions] = useState<ConditionDraft[]>(
    initial.definition.conditions.map((condition) => toDraft(condition)),
  );

  const normalizedConditions = conditions
    .map((condition) => toCondition(condition))
    .filter((condition): condition is DynamicGroupCondition => condition !== null);
  const definition: DynamicUserGroupDefinition = {
    logicOperator,
    conditions: normalizedConditions,
  };

  function updateCondition(index: number, patch: Partial<ConditionDraft>) {
    setConditions((current) =>
      current.map((condition, currentIndex) => {
        if (currentIndex !== index) {
          return condition;
        }

        if (patch.field) {
          const config = getFieldConfig(patch.field);
          return {
            field: patch.field,
            operator: config.operators[0]?.value ?? "is",
            value: config.input === "number" ? "0" : "true",
          };
        }

        return { ...condition, ...patch };
      }),
    );
  }

  return (
    <AdminPanel className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-[#f4f7fb]">{title}</h3>
          <p className="text-sm text-[#97a4b8]">
            Сохранённое правило с живым пересчётом пользователей без ручных списков.
          </p>
        </div>
        <Link
          className="text-sm font-medium text-[#b9abff] transition hover:text-[#d8d2ff]"
          href={cancelHref}
        >
          Назад
        </Link>
      </div>

      <form action={action} className="space-y-4">
        {initial.id ? <input name="id" type="hidden" value={initial.id} /> : null}
        <input name="definition" type="hidden" value={JSON.stringify(definition)} />

        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Название группы">
            <AdminInput defaultValue={initial.name} name="name" required />
          </AdminField>

          <AdminField label="Статус">
            <AdminSelect defaultValue={initial.status} name="status">
              <option value="active">Активна</option>
              <option value="disabled">Выключена</option>
            </AdminSelect>
          </AdminField>
        </div>

        <AdminField label="Описание">
          <AdminTextarea defaultValue={initial.description} name="description" />
        </AdminField>

        <AdminField label="Логика совпадения">
          <AdminSelect
            name="logicOperator"
            onChange={(event) => setLogicOperator(event.target.value === "OR" ? "OR" : "AND")}
            value={logicOperator}
          >
            <option value="AND">Совпадают все условия</option>
            <option value="OR">Совпадает хотя бы одно условие</option>
          </AdminSelect>
        </AdminField>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-[#f4f7fb]">Условия</h4>
              <p className="mt-1 text-xs text-[#97a4b8]">
                Плоский конструктор без вложенных групп.
              </p>
            </div>
            <AdminButton
              onClick={() =>
                setConditions((current) => [...current, createDefaultDynamicConditionDraft()])
              }
              type="button"
              variant="secondary"
            >
              Добавить условие
            </AdminButton>
          </div>

          {conditions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#2a3a55] px-3 py-4 text-sm text-[#97a4b8]">
              Добавьте хотя бы одно условие.
            </p>
          ) : (
            <div className="space-y-3">
              {conditions.map((condition, index) => {
                const config = getFieldConfig(condition.field);

                return (
                  <div
                    className="grid gap-3 rounded-lg border border-[#223047] bg-[#0d1522] p-3 md:grid-cols-[1.2fr_1fr_1fr_auto]"
                    key={`${condition.field}-${index}`}
                  >
                    <AdminSelect
                      onChange={(event) =>
                        updateCondition(index, { field: event.target.value as ConditionFieldKey })
                      }
                      value={condition.field}
                    >
                      {fieldOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </AdminSelect>

                    <AdminSelect
                      onChange={(event) => updateCondition(index, { operator: event.target.value })}
                      value={condition.operator}
                    >
                      {config.operators.map((operator) => (
                        <option key={operator.value} value={operator.value}>
                          {operator.label}
                        </option>
                      ))}
                    </AdminSelect>

                    {config.input === "number" ? (
                      <AdminInput
                        min="0"
                        onChange={(event) => updateCondition(index, { value: event.target.value })}
                        type="number"
                        value={condition.value}
                      />
                    ) : (
                      <AdminSelect
                        onChange={(event) => updateCondition(index, { value: event.target.value })}
                        value={condition.value}
                      >
                        {config.valueOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </AdminSelect>
                    )}

                    <AdminButton
                      onClick={() =>
                        setConditions((current) =>
                          current.filter((_, currentIndex) => currentIndex !== index),
                        )
                      }
                      type="button"
                      variant="danger"
                    >
                      Удалить
                    </AdminButton>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-[#223047] bg-[#0d1522] p-4">
          <h4 className="text-sm font-semibold text-[#f4f7fb]">Предпросмотр правила</h4>
          <p className="mt-2 text-sm leading-6 text-[#dbe3ef]">
            {summarizeDynamicUserGroup(definition)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AdminButton type="submit">{submitLabel}</AdminButton>
          {deleteAction && initial.id ? (
            <div>
              <button
                className="rounded-md border border-[#7f1d1d] bg-[#2a1218] px-3 py-2 text-sm font-medium text-[#fecaca] transition hover:bg-[#3a1720]"
                formAction={deleteAction}
                type="submit"
              >
                Удалить группу
              </button>
            </div>
          ) : null}
        </div>
      </form>
    </AdminPanel>
  );
}
