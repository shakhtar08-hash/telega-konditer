"use client";

import { useState } from "react";
import { AdminButton, AdminField, AdminInput, AdminPanel } from "@/components/admin/form";

export type TriggerButtonDraft = {
  text: string;
  type: "url";
  value: string;
};

export function TriggerButtonsEditor({
  initialButtons,
}: {
  initialButtons: TriggerButtonDraft[];
}) {
  const [buttons, setButtons] = useState<TriggerButtonDraft[]>(initialButtons);

  function updateButton(index: number, patch: Partial<TriggerButtonDraft>) {
    setButtons((current) =>
      current.map((button, buttonIndex) =>
        buttonIndex === index ? { ...button, ...patch } : button,
      ),
    );
  }

  function addButton() {
    setButtons((current) => [...current, { text: "", type: "url", value: "" }]);
  }

  function removeButton(index: number) {
    setButtons((current) => current.filter((_, buttonIndex) => buttonIndex !== index));
  }

  return (
    <AdminPanel className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#f4f7fb]">Кнопки</h3>
          <p className="mt-1 text-sm text-[#97a4b8]">
            Добавьте кнопки со ссылками для оплаты, перехода на сайт или другой страницы.
          </p>
        </div>
        <AdminButton onClick={addButton} type="button" variant="secondary">
          Добавить кнопку
        </AdminButton>
      </div>

      <input name="buttons" readOnly type="hidden" value={JSON.stringify(buttons)} />

      {buttons.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#2a3a55] bg-[#0d1522] px-4 py-4 text-sm text-[#97a4b8]">
          Пока без кнопок. Если нужно, можно добавить одну или несколько ссылок под сообщением,
          например кнопку «Оплатить».
        </div>
      ) : (
        <div className="space-y-3">
          {buttons.map((button, index) => (
            <div
              className="rounded-lg border border-[#223047] bg-[#0d1522] p-4"
              key={`${index}-${button.text}-${button.value}`}
            >
              <div className="grid gap-3 md:grid-cols-[1fr_1.3fr_auto] md:items-end">
                <AdminField label="Текст кнопки">
                  <AdminInput
                    onChange={(event) => updateButton(index, { text: event.target.value })}
                    placeholder="Оплатить"
                    value={button.text}
                  />
                </AdminField>
                <AdminField hint="Например, ссылка на оплату или лендинг" label="Ссылка">
                  <AdminInput
                    onChange={(event) => updateButton(index, { value: event.target.value })}
                    placeholder="https://..."
                    value={button.value}
                  />
                </AdminField>
                <AdminButton onClick={() => removeButton(index)} type="button" variant="secondary">
                  Удалить
                </AdminButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPanel>
  );
}
