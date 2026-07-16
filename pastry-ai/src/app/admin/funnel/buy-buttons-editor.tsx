"use client";

import { useCallback, useState } from "react";
import { AdminButton, AdminField, AdminInput, AdminPanel } from "@/components/admin/form";

type BuyButton = {
  text: string;
  url: string;
  active: boolean;
  sortOrder: number;
};

export function AdminBuyButtonsEditor({
  initialButtons,
}: {
  initialButtons: BuyButton[];
}) {
  const [buttons, setButtons] = useState<BuyButton[]>(initialButtons);

  const update = useCallback((next: BuyButton[]) => {
    setButtons(next);
  }, []);

  const add = useCallback(() => {
    update([
      ...buttons,
      { text: "", url: "", active: true, sortOrder: buttons.length },
    ]);
  }, [buttons, update]);

  const remove = useCallback(
    (index: number) => {
      const next = buttons.filter((_, i) => i !== index);
      update(next.map((button, nextIndex) => ({ ...button, sortOrder: nextIndex })));
    },
    [buttons, update],
  );

  const setField = useCallback(
    (index: number, field: keyof BuyButton, value: string | boolean) => {
      const next = buttons.map((button, buttonIndex) =>
        buttonIndex === index ? { ...button, [field]: value } : button,
      );
      update(next);
    },
    [buttons, update],
  );

  const moveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const next = [...buttons];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      update(next.map((button, nextIndex) => ({ ...button, sortOrder: nextIndex })));
    },
    [buttons, update],
  );

  const moveDown = useCallback(
    (index: number) => {
      if (index >= buttons.length - 1) return;
      const next = [...buttons];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      update(next.map((button, nextIndex) => ({ ...button, sortOrder: nextIndex })));
    },
    [buttons, update],
  );

  return (
    <AdminPanel className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[#f4f7fb]">
          Оплатные кнопки ({buttons.length})
        </h4>
        <AdminButton onClick={add} type="button" variant="secondary">
          + Добавить кнопку
        </AdminButton>
      </div>

      <input name="buyButtons" readOnly type="hidden" value={JSON.stringify(buttons)} />

      {buttons.length === 0 && (
        <p className="text-sm text-[#7f8da3]">
          Нет оплатных кнопок. Нажмите &quot;+ Добавить кнопку&quot;, чтобы создать.
        </p>
      )}

      <div className="space-y-3">
        {buttons.map((button, index) => (
          <div
            key={index}
            className="flex flex-wrap items-end gap-2 rounded border border-[#2a3a55] bg-[#0d1522] p-3"
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

            <AdminField label="Текст">
              <AdminInput
                className="min-w-32"
                name="buyButtonText[]"
                onChange={(event) => setField(index, "text", event.target.value)}
                placeholder="Купить"
                type="text"
                value={button.text}
              />
            </AdminField>
            <AdminField
              hint="{{baseUrl}}, {{telegramId}}"
              label="URL"
            >
              <AdminInput
                className="min-w-48"
                name="buyButtonUrl[]"
                onChange={(event) => setField(index, "url", event.target.value)}
                placeholder="https://..."
                type="text"
                value={button.url}
              />
            </AdminField>
            <label className="flex items-center gap-2 pb-2 text-sm text-[#dbe3ef]">
              <input
                checked={button.active}
                className="size-4 rounded border-[#2a3a55] bg-[#0d1522] accent-[#6d5dfc]"
                onChange={(event) => setField(index, "active", event.target.checked)}
                type="checkbox"
              />
              Активна
            </label>
            <div className="flex gap-1 pb-2">
              <AdminButton
                disabled={index === 0}
                onClick={() => moveUp(index)}
                type="button"
                variant="secondary"
              >
                ▲
              </AdminButton>
              <AdminButton
                disabled={index === buttons.length - 1}
                onClick={() => moveDown(index)}
                type="button"
                variant="secondary"
              >
                ▼
              </AdminButton>
              <AdminButton
                onClick={() => remove(index)}
                type="button"
                variant="danger"
              >
                ✕
              </AdminButton>
            </div>
          </div>
        ))}
      </div>
    </AdminPanel>
  );
}
