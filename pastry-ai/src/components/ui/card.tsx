import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[#223047] bg-[#121a27] p-5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
