import { forwardRef, type ReactNode } from "react";
import { AdminImageFileInput } from "./admin-image-file-input";

export function AdminPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-[#223047] bg-[#121a27] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] ${className}`}
    >
      {children}
    </div>
  );
}

export function AdminSectionTitle({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold text-[#f4f7fb]">{title}</h3>
      {description ? (
        <p className="text-sm leading-6 text-[#97a4b8]">{description}</p>
      ) : null}
    </div>
  );
}

export function AdminField({
  children,
  hint,
  label,
}: {
  children: ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium text-[#dbe3ef]">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-[#7f8da3]">{hint}</span> : null}
    </label>
  );
}

const inputClassName =
  "w-full rounded-md border border-[#2a3a55] bg-[#0d1522] px-3 py-2 text-sm text-[#f4f7fb] outline-none transition placeholder:text-[#63718a] focus:border-[#6d5dfc] focus:ring-2 focus:ring-[#6d5dfc]/20";

export function AdminInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClassName} ${props.className ?? ""}`} />;
}

export const AdminTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function AdminTextarea(props, ref) {
  return (
    <textarea
      {...props}
      className={`${inputClassName} min-h-28 resize-y ${props.className ?? ""}`}
      ref={ref}
    />
  );
});

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClassName} ${props.className ?? ""}`} />;
}

export function AdminButton({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles = {
    danger:
      "border border-[#7f1d1d] bg-[#2a1218] text-[#fecaca] hover:bg-[#3a1720]",
    primary:
      "bg-[#6d5dfc] text-white shadow-[0_10px_30px_rgba(109,93,252,0.24)] hover:bg-[#7c6fff]",
    secondary:
      "border border-[#2a3a55] bg-[#192334] text-[#dbe3ef] hover:bg-[#223047]",
  };

  return (
    <button
      {...props}
      className={`rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function AdminToggle({
  children,
  defaultChecked,
  name,
}: {
  children: ReactNode;
  defaultChecked?: boolean;
  name: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-[#dbe3ef]">
      <input
        className="size-4 rounded border-[#2a3a55] bg-[#0d1522] accent-[#6d5dfc]"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
      />
      <span className="font-medium">{children}</span>
    </label>
  );
}

export function AdminImageField({
  defaultValue = "",
  fileLabel = "Или выберите файл",
  fileName,
  hint,
  label,
  placeholder,
  textName,
}: {
  defaultValue?: string;
  fileLabel?: string;
  fileName: string;
  hint?: string;
  label: string;
  placeholder?: string;
  textName: string;
}) {
  const previewable =
    defaultValue.startsWith("/") || defaultValue.startsWith("http");

  return (
    <AdminField hint={hint} label={label}>
      <div className="space-y-3">
        <AdminInput
          defaultValue={defaultValue}
          name={textName}
          placeholder={placeholder}
        />
        <div className="space-y-2">
          <span className="block text-xs text-[#7f8da3]">{fileLabel}</span>
          <AdminImageFileInput name={fileName} />
        </div>
        {previewable ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="h-24 w-24 rounded-md border border-[#2a3a55] object-cover"
            src={defaultValue}
          />
        ) : null}
      </div>
    </AdminField>
  );
}
