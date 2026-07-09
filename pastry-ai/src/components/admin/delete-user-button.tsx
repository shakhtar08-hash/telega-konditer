"use client";

import { Trash2 } from "lucide-react";
import { deleteUser } from "@/app/admin/users/actions";

type DeleteUserButtonProps = {
  userId: string;
  telegramId: string;
};

export function DeleteUserButton({ userId, telegramId }: DeleteUserButtonProps) {
  return (
    <form action={deleteUser}>
      <input name="id" type="hidden" value={userId} />
      <button
        className="inline-flex items-center gap-1 rounded-md border border-[#7f1d1d] bg-[#2a1218] px-2 py-1 text-xs font-medium text-[#fecaca] transition hover:bg-[#3a1720]"
        onClick={(e) => {
          if (!confirm(`Удалить пользователя ${telegramId}?`)) {
            e.preventDefault();
          }
        }}
        type="submit"
      >
        <Trash2 className="size-3" />
      </button>
    </form>
  );
}