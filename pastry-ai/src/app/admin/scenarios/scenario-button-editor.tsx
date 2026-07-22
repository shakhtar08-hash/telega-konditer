"use client";

import { AdminButton, AdminField, AdminInput, AdminSelect } from "@/components/admin/form";
import { TARIFF_PURCHASE_OPTIONS } from "@/features/payments/tariff-purchase";
import type {
  ScenarioButtonActionType,
  ScenarioTransitionMode,
} from "@/features/scenarios/scenario-types";
import type { KnownBotCommandOption } from "./known-bot-commands";

export type ScenarioButtonDraft = {
  id: string;
  stepId: string;
  text: string;
  sortOrder: number;
  actionType: ScenarioButtonActionType;
  actionValue: string | null;
  transitionMode: ScenarioTransitionMode | null;
};

type ScenarioButtonEditorProps = {
  button: ScenarioButtonDraft;
  index: number;
  knownBotCommands: readonly KnownBotCommandOption[];
  onChange: (patch: Partial<ScenarioButtonDraft>) => void;
  onRemove: () => void;
  stepOptions: readonly { value: string; label: string }[];
};

export function createScenarioButtonDraft(stepId: string): ScenarioButtonDraft {
  return {
    actionType: "URL",
    actionValue: "",
    id: `button_${crypto.randomUUID()}`,
    sortOrder: 0,
    stepId,
    text: "Кнопка",
    transitionMode: null,
  };
}

export function ScenarioButtonEditor({
  button,
  index,
  knownBotCommands,
  onChange,
  onRemove,
  stepOptions,
}: ScenarioButtonEditorProps) {
  const actionValue = button.actionValue ?? "";

  return (
    <div className="rounded-lg border border-[#223047] bg-[#101827] p-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr_auto] lg:items-end">
        <AdminField label="Текст кнопки">
          <AdminInput
            aria-label={`Кнопка ${index + 1}: текст`}
            onChange={(event) => onChange({ text: event.target.value })}
            value={button.text}
          />
        </AdminField>

        <AdminField label="Тип действия">
          <AdminSelect
            aria-label={`Кнопка ${index + 1}: тип действия`}
            onChange={(event) =>
              onChange({
                actionType: event.target.value as ScenarioButtonActionType,
                actionValue: "",
                transitionMode:
                  event.target.value === "SCENARIO_STEP" ? "SEND_NEW" : null,
              })
            }
            value={button.actionType}
          >
            <option value="URL">Ссылка</option>
            <option value="SCENARIO_STEP">Перейти к сообщению</option>
            <option value="BOT_COMMAND">Команда бота</option>
            <option value="TARIFF_PURCHASE">Оплата тарифа</option>
            <option value="MAIN_MENU">Главное меню</option>
          </AdminSelect>
        </AdminField>

        {button.actionType === "URL" ? (
          <AdminField label="Ссылка">
            <AdminInput
              aria-label={`Кнопка ${index + 1}: ссылка`}
              onChange={(event) => onChange({ actionValue: event.target.value })}
              placeholder="https://example.com"
              value={actionValue}
            />
          </AdminField>
        ) : null}

        {button.actionType === "SCENARIO_STEP" ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
            <AdminField label="Целевое сообщение">
              <AdminSelect
                aria-label={`Кнопка ${index + 1}: целевое сообщение`}
                onChange={(event) => onChange({ actionValue: event.target.value })}
                value={actionValue}
              >
                <option value="">Выберите шаг</option>
                {stepOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Режим перехода">
              <AdminSelect
                aria-label={`Кнопка ${index + 1}: режим перехода`}
                onChange={(event) =>
                  onChange({
                    transitionMode: event.target.value as ScenarioTransitionMode,
                  })
                }
                value={button.transitionMode ?? "SEND_NEW"}
              >
                <option value="SEND_NEW">Отправить новое сообщение</option>
                <option value="REPLACE_CURRENT">Заменить текущее сообщение</option>
              </AdminSelect>
            </AdminField>
          </div>
        ) : null}

        {button.actionType === "BOT_COMMAND" ? (
          <AdminField label="Команда бота">
            <AdminSelect
              aria-label={`Кнопка ${index + 1}: команда бота`}
              onChange={(event) => onChange({ actionValue: event.target.value })}
              value={actionValue}
            >
              <option value="">Выберите команду</option>
              {knownBotCommands.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
        ) : null}

        {button.actionType === "TARIFF_PURCHASE" ? (
          <AdminField label="Тариф">
            <AdminSelect
              aria-label={`Кнопка ${index + 1}: тариф`}
              onChange={(event) => onChange({ actionValue: event.target.value })}
              value={actionValue}
            >
              <option value="">Выберите тариф</option>
              {TARIFF_PURCHASE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
        ) : null}

        {button.actionType === "MAIN_MENU" ? (
          <div className="rounded-md border border-[#2a3a55] bg-[#0d1522] px-3 py-2 text-sm text-[#97a4b8]">
            Откроет главное меню без дополнительного значения.
          </div>
        ) : null}

        <AdminButton onClick={onRemove} type="button" variant="secondary">
          Удалить
        </AdminButton>
      </div>
    </div>
  );
}
