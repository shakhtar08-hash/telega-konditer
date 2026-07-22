"use client";

import { AdminImageFileInput } from "@/components/admin/admin-image-file-input";
import { AdminButton, AdminField, AdminInput, AdminTextarea } from "@/components/admin/form";
import type { ScenarioStepRecord } from "@/features/scenarios/scenario-types";
import type { KnownBotCommandOption } from "./known-bot-commands";
import {
  createScenarioButtonDraft,
  ScenarioButtonEditor,
  type ScenarioButtonDraft,
} from "./scenario-button-editor";

export type ScenarioStepDraft = Omit<ScenarioStepRecord, "buttons"> & {
  buttons: ScenarioButtonDraft[];
  imagePreviewUrl?: string | null;
};

type ScenarioStepEditorProps = {
  duplicateStepAction?: string | ((formData: FormData) => Promise<void>);
  index: number;
  knownBotCommands: readonly KnownBotCommandOption[];
  onChange: (patch: Partial<ScenarioStepDraft>) => void;
  onDuplicateLocal: () => void;
  onRemove: () => void;
  removeDisabled?: boolean;
  step: ScenarioStepDraft;
  stepOptions: readonly { value: string; label: string }[];
};

export function createScenarioStepDraft(
  scenarioId: string,
  sortOrder: number,
): ScenarioStepDraft {
  const id = `step_${crypto.randomUUID()}`;

  return {
    buttons: [],
    id,
    imageUrl: null,
    imagePreviewUrl: null,
    messageText: "",
    name: `Сообщение ${sortOrder + 1}`,
    scenarioId,
    sortOrder,
  };
}

function normalizeButtons(
  buttons: ScenarioButtonDraft[],
  stepId: string,
): ScenarioButtonDraft[] {
  return buttons.map((button, buttonIndex) => ({
    ...button,
    sortOrder: buttonIndex,
    stepId,
  }));
}

export function ScenarioStepEditor({
  duplicateStepAction,
  index,
  knownBotCommands,
  onChange,
  onDuplicateLocal,
  onRemove,
  removeDisabled = false,
  step,
  stepOptions,
}: ScenarioStepEditorProps) {
  const previewImageUrl = step.imagePreviewUrl ?? step.imageUrl;

  function updateButton(buttonIndex: number, patch: Partial<ScenarioButtonDraft>) {
    onChange({
      buttons: normalizeButtons(
        step.buttons.map((button, currentIndex) =>
          currentIndex === buttonIndex ? { ...button, ...patch } : button,
        ),
        step.id,
      ),
    });
  }

  return (
    <div className="rounded-xl border border-[#223047] bg-[#0d1522] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#7f8da3]">
            Шаг {index + 1}
          </p>
          <h3 className="mt-1 font-semibold text-[#f4f7fb]">{step.name}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {duplicateStepAction ? (
            <AdminButton
              formAction={duplicateStepAction}
              name="stepId"
              type="submit"
              value={step.id}
              variant="secondary"
            >
              Дублировать шаг
            </AdminButton>
          ) : (
            <AdminButton onClick={onDuplicateLocal} type="button" variant="secondary">
              Дублировать шаг
            </AdminButton>
          )}
          <AdminButton
            disabled={removeDisabled}
            onClick={onRemove}
            type="button"
            variant="secondary"
          >
            Удалить шаг
          </AdminButton>
        </div>
      </div>
      {removeDisabled ? (
        <p className="mt-3 rounded-lg border border-[#6b4d1f] bg-[#22180d] px-3 py-2 text-sm text-[#f6d7a7]">
          Сначала уберите кнопки, которые переходят к этому сообщению.
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <AdminField label="Название сообщения">
          <AdminInput
            onChange={(event) => onChange({ name: event.target.value })}
            required
            value={step.name}
          />
        </AdminField>
        <AdminField label="Ссылка на изображение">
          <AdminInput
            onChange={(event) => onChange({ imageUrl: event.target.value })}
            placeholder="/uploads/admin/scenarios/message.png"
            value={step.imageUrl ?? ""}
          />
        </AdminField>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <AdminField
          hint="Если заполнены и ссылка, и файл, будет использован файл."
          label="Или выберите файл изображения"
        >
          <AdminImageFileInput
            name={`stepImageFile:${step.id}`}
            onFileChange={(file) => {
              if (step.imagePreviewUrl?.startsWith("blob:")) {
                URL.revokeObjectURL(step.imagePreviewUrl);
              }

              onChange({
                imagePreviewUrl: file ? URL.createObjectURL(file) : null,
              });
            }}
          />
        </AdminField>

        {previewImageUrl ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#dbe3ef]">Превью изображения</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              className="max-h-48 w-full rounded-xl border border-[#223047] object-cover"
              src={previewImageUrl}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <AdminField label="Текст сообщения">
          <AdminTextarea
            className="min-h-36"
            onChange={(event) => onChange({ messageText: event.target.value })}
            required
            value={step.messageText}
          />
        </AdminField>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-[#f4f7fb]">Кнопки шага</h4>
            <p className="mt-1 text-sm text-[#97a4b8]">
              URL-кнопки сохраняются как раньше, а переходы проверяются по базе перед
              выполнением.
            </p>
          </div>
          <AdminButton
            onClick={() =>
              onChange({
                buttons: normalizeButtons(
                  [...step.buttons, createScenarioButtonDraft(step.id)],
                  step.id,
                ),
              })
            }
            type="button"
            variant="secondary"
          >
            Добавить кнопку
          </AdminButton>
        </div>

        {step.buttons.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#2a3a55] px-4 py-4 text-sm text-[#97a4b8]">
            У этого сообщения пока нет кнопок.
          </div>
        ) : (
          <div className="space-y-3">
            {step.buttons.map((button, buttonIndex) => (
              <ScenarioButtonEditor
                button={button}
                index={buttonIndex}
                key={button.id}
                knownBotCommands={knownBotCommands}
                onChange={(patch) => updateButton(buttonIndex, patch)}
                onRemove={() =>
                  onChange({
                    buttons: normalizeButtons(
                      step.buttons.filter((_, currentIndex) => currentIndex !== buttonIndex),
                      step.id,
                    ),
                  })
                }
                stepOptions={stepOptions}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
