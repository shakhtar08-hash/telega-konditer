"use client";

import { useRef, useState } from "react";
import {
  applyTelegramHtmlFormat,
  type TriggerMessageFormat,
} from "@/app/admin/triggers/trigger-message-format";
import { AdminButton, AdminTextarea } from "./form";

const triggerMessageFormatOptions: Array<{
  format: TriggerMessageFormat;
  label: string;
}> = [
  { format: "bold", label: "B" },
  { format: "italic", label: "I" },
  { format: "strikethrough", label: "S" },
  { format: "code", label: "</>" },
  { format: "pre", label: "{ }" },
  { format: "blockquote", label: "❝" },
  { format: "link", label: "Link" },
];

type AdminTelegramHtmlEditorProps = {
  className?: string;
  defaultValue?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value?: string;
};

export function AdminTelegramHtmlEditor({
  className,
  defaultValue = "",
  name,
  onValueChange,
  placeholder,
  required,
  value,
}: AdminTelegramHtmlEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : uncontrolledValue;

  function updateValue(nextValue: string) {
    if (!isControlled) {
      setUncontrolledValue(nextValue);
    }

    onValueChange?.(nextValue);
  }

  function applyFormat(format: TriggerMessageFormat) {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const result = applyTelegramHtmlFormat({
      format,
      selectionEnd: textarea.selectionEnd ?? currentValue.length,
      selectionStart: textarea.selectionStart ?? currentValue.length,
      text: currentValue,
    });

    updateValue(result.nextText);

    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(result.nextSelectionStart, result.nextSelectionEnd);
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7f8da3]">
          HTML-форматирование
        </p>
        <p className="text-xs text-[#7f8da3]">Telegram HTML</p>
        <div className="flex flex-wrap gap-2">
          {triggerMessageFormatOptions.map((option) => (
            <AdminButton
              data-format={option.format}
              key={option.format}
              onClick={() => applyFormat(option.format)}
              type="button"
              variant="secondary"
            >
              {option.label}
            </AdminButton>
          ))}
        </div>
      </div>
      <AdminTextarea
        className={className}
        defaultValue={isControlled ? undefined : defaultValue}
        name={name}
        onChange={(event) => updateValue(event.target.value)}
        placeholder={placeholder}
        ref={textareaRef}
        required={required}
        value={currentValue}
      />
    </div>
  );
}
