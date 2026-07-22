"use client";

import { useId, useState } from "react";

const MAX_BROWSER_UPLOAD_BYTES = 900 * 1024;
const MIN_IMAGE_DIMENSION = 480;
const OUTPUT_MIME_TYPE = "image/webp";

async function loadImage(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Image decode failed"));
      image.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function canvasToFile(
  canvas: HTMLCanvasElement,
  name: string,
  quality: number,
): Promise<File | null> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, OUTPUT_MIME_TYPE, quality);
  });

  if (!blob) {
    return null;
  }

  const baseName = name.replace(/\.[^.]+$/, "") || "image";

  return new File([blob], `${baseName}.webp`, {
    lastModified: Date.now(),
    type: OUTPUT_MIME_TYPE,
  });
}

async function compressImageForServerAction(file: File): Promise<File | null> {
  if (file.size <= MAX_BROWSER_UPLOAD_BYTES) {
    return file;
  }

  if (typeof document === "undefined") {
    return null;
  }

  if (file.type === "image/gif") {
    return null;
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  let width = image.naturalWidth || image.width;
  let height = image.naturalHeight || image.height;

  for (const quality of [0.88, 0.8, 0.72, 0.64, 0.56, 0.48]) {
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const compressedFile = await canvasToFile(canvas, file.name, quality);

    if (compressedFile && compressedFile.size <= MAX_BROWSER_UPLOAD_BYTES) {
      return compressedFile;
    }

    if (width <= MIN_IMAGE_DIMENSION || height <= MIN_IMAGE_DIMENSION) {
      continue;
    }

    width *= 0.85;
    height *= 0.85;
  }

  return null;
}

function formatKilobytes(bytes: number) {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const DEFAULT_MESSAGE =
  "Большие изображения будут автоматически уменьшены перед отправкой.";

export function AdminImageFileInput({
  accept = "image/*",
  name,
  onFileChange,
}: {
  accept?: string;
  name: string;
  onFileChange?: (file: File | null) => void;
}) {
  const messageId = useId();
  const [message, setMessage] = useState<string>(DEFAULT_MESSAGE);

  return (
    <div className="space-y-2">
      <input
        accept={accept}
        aria-describedby={messageId}
        className="w-full rounded-md border border-[#2a3a55] bg-[#0d1522] px-3 py-2 text-sm text-[#f4f7fb] outline-none transition placeholder:text-[#63718a] focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20"
        name={name}
        onChange={async (event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];

          if (!file) {
            setMessage(DEFAULT_MESSAGE);
            onFileChange?.(null);
            return;
          }

          if (file.size <= MAX_BROWSER_UPLOAD_BYTES) {
            setMessage(`Файл готов к отправке: ${formatKilobytes(file.size)}.`);
            onFileChange?.(file);
            return;
          }

          try {
            const compressedFile = await compressImageForServerAction(file);

            if (!compressedFile) {
              input.value = "";
              setMessage(
                "Не удалось безопасно уменьшить файл. Выберите изображение до 900 KB или сохраните его в JPG/WebP.",
              );
              onFileChange?.(null);
              return;
            }

            const transfer = new DataTransfer();
            transfer.items.add(compressedFile);
            input.files = transfer.files;
            setMessage(
              `Изображение уменьшено: ${formatKilobytes(file.size)} -> ${formatKilobytes(compressedFile.size)}.`,
            );
            onFileChange?.(compressedFile);
          } catch {
            input.value = "";
            setMessage(
              "Не удалось обработать изображение перед отправкой. Попробуйте другой файл.",
            );
            onFileChange?.(null);
          }
        }}
        type="file"
      />
      <span className="block text-xs text-[#7f8da3]" id={messageId}>
        {message}
      </span>
    </div>
  );
}
