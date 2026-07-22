"use client";

import { useCallback, useState } from "react";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminSelect,
} from "@/components/admin/form";
import { knownBotCommands } from "@/app/admin/scenarios/known-bot-commands";
import { TARIFF_PURCHASE_OPTIONS } from "@/features/payments/tariff-purchase";
import {
  FUNNEL_BUTTON_ACTION_OPTIONS,
  type FunnelBuyButton,
  type FunnelBuyButtonActionType,
} from "./buy-buttons-form";

function createEmptyButton(sortOrder: number): FunnelBuyButton {
  return {
    text: "",
    actionType: "NEXT",
    actionValue: null,
    active: true,
    sortOrder,
  };
}

function normalizeActionValue(
  actionType: FunnelBuyButtonActionType,
  currentValue: string | null,
): string | null {
  if (actionType === "NEXT" || actionType === "ACTIVATE_PROMO_AND_NEXT") {
    return null;
  }

  return currentValue ?? "";
}

export function AdminBuyButtonsEditor({
  initialButtons,
}: {
  initialButtons: FunnelBuyButton[];
}) {
  const [buttons, setButtons] = useState<FunnelBuyButton[]>(initialButtons);

  const update = useCallback((next: FunnelBuyButton[]) => {
    setButtons(next.map((button, index) => ({ ...button, sortOrder: index })));
  }, []);

  const add = useCallback(() => {
    update([...buttons, createEmptyButton(buttons.length)]);
  }, [buttons, update]);

  const remove = useCallback(
    (index: number) => {
      update(buttons.filter((_, buttonIndex) => buttonIndex !== index));
    },
    [buttons, update],
  );

  const setField = useCallback(
    <K extends keyof FunnelBuyButton>(
      index: number,
      field: K,
      value: FunnelBuyButton[K],
    ) => {
      update(
        buttons.map((button, buttonIndex) =>
          buttonIndex === index ? { ...button, [field]: value } : button,
        ),
      );
    },
    [buttons, update],
  );

  const setActionType = useCallback(
    (index: number, actionType: FunnelBuyButtonActionType) => {
      update(
        buttons.map((button, buttonIndex) =>
          buttonIndex === index
            ? {
                ...button,
                actionType,
                actionValue: normalizeActionValue(actionType, null),
              }
            : button,
        ),
      );
    },
    [buttons, update],
  );

  const move = useCallback(
    (index: number, direction: -1 | 1) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= buttons.length) {
        return;
      }

      const next = [...buttons];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      update(next);
    },
    [buttons, update],
  );

  return (
    <AdminPanel className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-[#f4f7fb]">
            Кнопки шага ({buttons.length})
          </h4>
          <p className="mt-1 text-sm text-[#97a4b8]">
            Тип задаёт поведение кнопки в воронке и в Telegram.
          </p>
        </div>
        <AdminButton onClick={add} type="button" variant="secondary">
          Добавить кнопку
        </AdminButton>
      </div>

      <input name="buyButtons" readOnly type="hidden" value={JSON.stringify(buttons)} />

      {buttons.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#2a3a55] px-4 py-4 text-sm text-[#97a4b8]">
          У этого шага пока нет кнопок.
        </div>
      ) : null}

      <div className="space-y-3">
        {buttons.map((button, index) => (
          <div
            key={index}
            className="rounded-lg border border-[#223047] bg-[#101827] p-3"
          >
            <input
              name="buyButtonSortOrder[]"
              readOnly
              type="hidden"
              value={button.sortOrder}
            />
            <input
              name="buyButtonActive[]"
              readOnly
              type="hidden"
              value={button.active ? "1" : "0"}
            />
            <input
              name="buyButtonActionValue[]"
              readOnly
              type="hidden"
              value={button.actionValue ?? ""}
            />

            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr_auto] lg:items-end">
              <AdminField label="Текст кнопки">
                <AdminInput
                  name="buyButtonText[]"
                  onChange={(event) => setField(index, "text", event.target.value)}
                  value={button.text}
                />
              </AdminField>

              <AdminField label="Тип действия">
                <AdminSelect
                  name="buyButtonActionType[]"
                  onChange={(event) =>
                    setActionType(index, event.target.value as FunnelBuyButtonActionType)
                  }
                  value={button.actionType}
                >
                  <option value="URL">Ссылка</option>
                  {FUNNEL_BUTTON_ACTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>

              {button.actionType === "TARIFF_PURCHASE" ? (
                <AdminField label="Тариф">
                  <AdminSelect
                    onChange={(event) =>
                      setField(index, "actionValue", event.target.value || null)
                    }
                    value={button.actionValue ?? ""}
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

              {button.actionType === "BOT_COMMAND" ? (
                <AdminField label="Команда бота">
                  <AdminSelect
                    onChange={(event) =>
                      setField(index, "actionValue", event.target.value || null)
                    }
                    value={button.actionValue ?? ""}
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

              {button.actionType === "URL" ? (
                <AdminField hint="{{baseUrl}}, {{telegramId}}" label="Ссылка">
                  <AdminInput
                    name="buyButtonUrl[]"
                    onChange={(event) =>
                      setField(index, "actionValue", event.target.value || "")
                    }
                    placeholder="https://..."
                    value={button.actionValue ?? ""}
                  />
                </AdminField>
              ) : (
                <input name="buyButtonUrl[]" readOnly type="hidden" value="" />
              )}

              {button.actionType === "NEXT" ? (
                <div className="rounded-md border border-[#2a3a55] bg-[#0d1522] px-3 py-2 text-sm text-[#97a4b8]">
                  Откроет следующий шаг воронки.
                </div>
              ) : null}

              {button.actionType === "ACTIVATE_PROMO_AND_NEXT" ? (
                <div className="rounded-md border border-[#2a3a55] bg-[#0d1522] px-3 py-2 text-sm text-[#97a4b8]">
                  Активирует промо и затем переведёт пользователя дальше.
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 lg:col-start-4">
                <label className="flex items-center gap-2 text-sm text-[#dbe3ef]">
                  <input
                    checked={button.active}
                    className="size-4 rounded border-[#2a3a55] bg-[#0d1522] accent-[#6d5dfc]"
                    onChange={(event) => setField(index, "active", event.target.checked)}
                    type="checkbox"
                  />
                  Активна
                </label>

                <div className="flex gap-1">
                  <AdminButton
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    type="button"
                    variant="secondary"
                  >
                    ↑
                  </AdminButton>
                  <AdminButton
                    disabled={index === buttons.length - 1}
                    onClick={() => move(index, 1)}
                    type="button"
                    variant="secondary"
                  >
                    ↓
                  </AdminButton>
                  <AdminButton onClick={() => remove(index)} type="button" variant="danger">
                    Удалить
                  </AdminButton>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminPanel>
  );
}
