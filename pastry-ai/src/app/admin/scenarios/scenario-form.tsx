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
import type { ScenarioRecord } from "@/features/scenarios/scenario-types";
import type { KnownBotCommandOption } from "./known-bot-commands";
import {
  createScenarioStepDraft,
  ScenarioStepEditor,
  type ScenarioStepDraft,
} from "./scenario-step-editor";

export type ScenarioFormValues = ScenarioRecord;

type ScenarioFormProps = {
  action: string | ((formData: FormData) => Promise<void>);
  cancelHref: string;
  deleteAction?: string | ((formData: FormData) => Promise<void>);
  duplicateAction?: string | ((formData: FormData) => Promise<void>);
  duplicateStepAction?: string | ((formData: FormData) => Promise<void>);
  initial: ScenarioFormValues;
  knownBotCommands: readonly KnownBotCommandOption[];
  submitLabel: string;
  title: string;
};

function getStatusLabel(status: ScenarioFormValues["status"]) {
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

function normalizeSteps(steps: ScenarioStepDraft[]): ScenarioStepDraft[] {
  return steps.map((step, index) => ({
    ...step,
    sortOrder: index,
    buttons: step.buttons.map((button, buttonIndex) => ({
      ...button,
      sortOrder: buttonIndex,
      stepId: step.id,
    })),
  }));
}

function cloneStep(step: ScenarioStepDraft, nextSortOrder: number): ScenarioStepDraft {
  const stepId = `step_${crypto.randomUUID()}`;

  return {
    ...step,
    buttons: step.buttons.map((button, index) => ({
      ...button,
      actionValue:
        button.actionType === "SCENARIO_STEP" && button.actionValue === step.id
          ? stepId
          : button.actionValue,
      id: `button_${crypto.randomUUID()}`,
      sortOrder: index,
      stepId,
    })),
    id: stepId,
    name: `${step.name} (copy)`,
    sortOrder: nextSortOrder,
  };
}

function buildStepsPayload(steps: ScenarioStepDraft[]) {
  return JSON.stringify(
    normalizeSteps(steps).map((step) => ({
      buttons: step.buttons.map((button) => ({
        actionType: button.actionType,
        actionValue: button.actionType === "MAIN_MENU" ? null : button.actionValue,
        id: button.id,
        sortOrder: button.sortOrder,
        text: button.text,
        transitionMode:
          button.actionType === "SCENARIO_STEP"
            ? button.transitionMode ?? "SEND_NEW"
            : null,
      })),
      id: step.id,
      imageUrl: step.imageUrl,
      messageText: step.messageText,
      name: step.name,
      sortOrder: step.sortOrder,
    })),
  );
}

export function ScenarioForm({
  action,
  cancelHref,
  deleteAction,
  duplicateAction,
  duplicateStepAction,
  initial,
  knownBotCommands,
  submitLabel,
  title,
}: ScenarioFormProps) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [status, setStatus] = useState<ScenarioFormValues["status"]>(initial.status);
  const [steps, setSteps] = useState<ScenarioStepDraft[]>(
    initial.steps.length > 0
      ? normalizeSteps(initial.steps as ScenarioStepDraft[])
      : [createScenarioStepDraft(initial.id ?? "new", 0)],
  );
  const [startStepId, setStartStepId] = useState(
    initial.startStepId ?? steps[0]?.id ?? "",
  );

  const normalizedSteps = normalizeSteps(steps);
  const stepOptions = normalizedSteps.map((step, index) => ({
    label: `${index + 1}. ${step.name || "Сообщение без названия"}`,
    value: step.id,
  }));
  const activeStartStepId =
    normalizedSteps.some((step) => step.id === startStepId) && startStepId
      ? startStepId
      : normalizedSteps[0]?.id ?? "";
  const previewStep =
    normalizedSteps.find((step) => step.id === activeStartStepId) ??
    normalizedSteps[0] ??
    null;
  const stepsPayload = buildStepsPayload(normalizedSteps);

  useEffect(() => {
    return () => {
      for (const step of steps) {
        if (step.imagePreviewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(step.imagePreviewUrl);
        }
      }
    };
  }, [steps]);

  function updateStep(index: number, patch: Partial<ScenarioStepDraft>) {
    setSteps((current) =>
      normalizeSteps(
        current.map((step, currentIndex) =>
          currentIndex === index ? { ...step, ...patch } : step,
        ),
      ),
    );
  }

  function removeStep(index: number) {
    setSteps((current) => {
      const next = normalizeSteps(current.filter((_, currentIndex) => currentIndex !== index));
      if (!next.some((step) => step.id === startStepId)) {
        setStartStepId(next[0]?.id ?? "");
      }
      return next;
    });
  }

  function duplicateStepLocal(index: number) {
    setSteps((current) => {
      const source = current[index];
      if (!source) {
        return current;
      }
      return normalizeSteps([
        ...current.slice(0, index + 1),
        cloneStep(source, index + 1),
        ...current.slice(index + 1),
      ]);
    });
  }

  function isStepReferenced(stepId: string) {
    return normalizedSteps.some((step) =>
      step.buttons.some(
        (button) =>
          button.actionType === "SCENARIO_STEP" && button.actionValue === stepId,
      ),
    );
  }

  return (
    <form action={action}>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <AdminPanel className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#f4f7fb]">{title}</h2>
              <p className="mt-1 text-sm text-[#97a4b8]">
                Настройте последовательность сообщений, кнопки и стартовую точку
                сценария без ручной работы с callback payload.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex rounded-md border border-[#2a3a55] bg-[#192334] px-3 py-2 text-sm font-medium text-[#dbe3ef] transition hover:bg-[#223047]"
                href={cancelHref}
              >
                Назад
              </Link>
              {duplicateAction && initial.id ? (
                <AdminButton formAction={duplicateAction} type="submit" variant="secondary">
                  Дублировать сценарий
                </AdminButton>
              ) : null}
              <AdminButton type="submit">{submitLabel}</AdminButton>
            </div>
          </div>

          {initial.id ? <input name="id" type="hidden" value={initial.id} /> : null}
          <input name="steps" type="hidden" value={stepsPayload} />

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <AdminField label="Название сценария">
              <AdminInput
                name="name"
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </AdminField>
            <AdminField label="Статус">
              <AdminSelect
                name="status"
                onChange={(event) =>
                  setStatus(event.target.value as ScenarioFormValues["status"])
                }
                value={status}
              >
                <option value="draft">{getStatusLabel("draft")}</option>
                <option value="active">{getStatusLabel("active")}</option>
                <option value="disabled">{getStatusLabel("disabled")}</option>
              </AdminSelect>
            </AdminField>
          </div>

          <AdminField label="Описание">
            <AdminTextarea
              name="description"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </AdminField>

          <AdminField
            hint="Этот шаг отправится первым, когда активный триггер запустит сценарий."
            label="Стартовое сообщение"
          >
            <AdminSelect
              name="startStepId"
              onChange={(event) => setStartStepId(event.target.value)}
              value={activeStartStepId}
            >
              {stepOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AdminSelect>
          </AdminField>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[#f4f7fb]">Сообщения сценария</h3>
                <p className="mt-1 text-sm text-[#97a4b8]">
                  Удаление заблокируется на сохранении, если на шаг ссылаются
                  кнопки других сообщений.
                </p>
              </div>
              <AdminButton
                onClick={() =>
                  setSteps((current) =>
                    normalizeSteps([
                      ...current,
                      createScenarioStepDraft(initial.id ?? "new", current.length),
                    ]),
                  )
                }
                type="button"
                variant="secondary"
              >
                Добавить сообщение
              </AdminButton>
            </div>

            {normalizedSteps.map((step, index) => (
              <ScenarioStepEditor
                duplicateStepAction={initial.id ? duplicateStepAction : undefined}
                index={index}
                key={step.id}
                knownBotCommands={knownBotCommands}
                onChange={(patch) => updateStep(index, patch)}
                onDuplicateLocal={() => duplicateStepLocal(index)}
                onRemove={() => removeStep(index)}
                removeDisabled={normalizedSteps.length <= 1 || isStepReferenced(step.id)}
                step={step}
                stepOptions={stepOptions}
              />
            ))}
          </div>

          {deleteAction && initial.id ? (
            <div className="rounded-xl border border-[#6b2430] bg-[#1b1116] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#fecaca]">Удаление сценария</h3>
                  <p className="mt-1 text-sm text-[#c7a9b1]">
                    Удаление заблокируется, если сценарий используется активными
                    триггерами. Старые URL-кнопки и обычные триггеры не меняются.
                  </p>
                </div>
                <AdminButton formAction={deleteAction} type="submit" variant="danger">
                  Удалить сценарий
                </AdminButton>
              </div>
            </div>
          ) : null}
        </AdminPanel>

        <AdminPanel className="space-y-5">
          <div>
            <h3 className="font-semibold text-[#f4f7fb]">Предпросмотр сценария</h3>
            <p className="mt-1 text-sm text-[#97a4b8]">
              Первый экран показывает стартовое сообщение и кнопки с понятными
              типами действий.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-[#223047] bg-[#0d1522] p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#7f8da3]">
                Сценарий
              </p>
              <p className="mt-1 text-sm font-medium text-[#f4f7fb]">
                {name || "Без названия"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#7f8da3]">
                Шагов
              </p>
              <p className="mt-1 text-sm font-medium text-[#f4f7fb]">
                {normalizedSteps.length}
              </p>
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
                {previewStep?.imagePreviewUrl ?? previewStep?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="w-full rounded-2xl object-cover"
                    src={previewStep.imagePreviewUrl ?? previewStep.imageUrl ?? ""}
                  />
                ) : null}
                <div className="max-w-[240px] rounded-xl bg-white px-3 py-3 text-sm leading-5 shadow-sm">
                  {previewStep?.messageText ||
                    "Здесь появится стартовое сообщение сценария."}
                </div>
                {previewStep?.buttons.length ? (
                  <div className="space-y-2">
                    {previewStep.buttons.map((button) => (
                      <div
                        className="rounded-lg bg-[#dff7c8] px-3 py-2 text-center text-xs font-medium text-[#16723c]"
                        key={button.id}
                      >
                        {button.text}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </AdminPanel>
      </div>
    </form>
  );
}
