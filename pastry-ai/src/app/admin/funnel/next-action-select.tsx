"use client";

import { useState } from "react";
import { AdminSelect } from "@/components/admin/form";

type NextAction = "next" | "activate_promo_and_next";

export function AdminNextActionSelect({
  initialValue = "next",
  name = "nextAction",
}: {
  initialValue?: NextAction;
  name?: string;
}) {
  const [value, setValue] = useState<NextAction>(initialValue);

  return (
    <>
      <input name={name} readOnly type="hidden" value={value} />
      <AdminSelect
        onChange={(event) => setValue(event.target.value as NextAction)}
        value={value}
      >
        <option value="next">Обычный переход</option>
        <option value="activate_promo_and_next">
          Активировать promo + переход
        </option>
      </AdminSelect>
    </>
  );
}
