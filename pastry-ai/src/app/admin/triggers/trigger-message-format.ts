export type TriggerMessageFormat =
  | "bold"
  | "italic"
  | "strikethrough"
  | "code"
  | "pre"
  | "blockquote"
  | "link";

const formatTagMap: Record<
  TriggerMessageFormat,
  { open: string; close: string }
> = {
  bold: { open: "<b>", close: "</b>" },
  italic: { open: "<i>", close: "</i>" },
  strikethrough: { open: "<s>", close: "</s>" },
  code: { open: "<code>", close: "</code>" },
  pre: { open: "<pre>", close: "</pre>" },
  blockquote: { open: "<blockquote>", close: "</blockquote>" },
  link: { open: '<a href="https://example.com">', close: "</a>" },
};

export function applyTelegramHtmlFormat(input: {
  format: TriggerMessageFormat;
  selectionEnd: number;
  selectionStart: number;
  text: string;
}): {
  nextSelectionEnd: number;
  nextSelectionStart: number;
  nextText: string;
} {
  const { close, open } = formatTagMap[input.format];
  const start = Math.max(0, input.selectionStart);
  const end = Math.max(start, input.selectionEnd);
  const selected = input.text.slice(start, end);
  const wrapped = `${open}${selected}${close}`;
  const nextText = `${input.text.slice(0, start)}${wrapped}${input.text.slice(end)}`;
  const nextSelectionStart = start + open.length;
  const nextSelectionEnd = nextSelectionStart + selected.length;

  return {
    nextSelectionEnd,
    nextSelectionStart,
    nextText,
  };
}
