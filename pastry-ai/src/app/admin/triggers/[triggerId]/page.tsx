import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/data-table";
import ChatBotSubNav from "@/components/admin/chat-bot-subnav";
import { fetchInternalAdminTriggerEditorData } from "@/features/admin/triggers/internal-admin-client";
import { loadAdminTriggerEditorData } from "@/features/admin/triggers/service";
import { getTriggerEventOptions } from "@/features/triggers/trigger-template";
import type { TriggerCondition } from "@/features/triggers/trigger-rule-types";
import {
  deleteTriggerRule,
  sendTriggerTestMessage,
  updateTriggerRule,
} from "../actions";
import { parseTriggerButtons } from "../trigger-buttons-form";
import {
  TriggerForm,
  type TriggerDynamicUserGroupOption,
  type TriggerUserGroupOption,
} from "../trigger-form";

type TriggerRulePageProps = {
  params: Promise<{ triggerId: string }> | { triggerId: string };
};

const eventCopy: Record<
  string,
  {
    description: string;
    key: string;
    label: string;
  }
> = {
  "promo.expired": {
    description:
      "Р’РѕР·РІСЂР°С‰Р°РµС‚ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ, РєРѕРіРґР° РїСЂРѕРјРѕ-РґРѕСЃС‚СѓРї РёСЃС‚РµРєР°РµС‚.",
    key: "promo.expired",
    label: "РџСЂРѕРјРѕ-С‚Р°СЂРёС„ Р·Р°РєРѕРЅС‡РёР»СЃСЏ",
  },
  "promo.granted": {
    description:
      "РџРѕРјРѕРіР°РµС‚ РґРѕРіСЂРµС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РїРѕСЃР»Рµ РІС‹РґР°С‡Рё РїСЂРѕРјРѕ-РґРѕСЃС‚СѓРїР°.",
    key: "promo.granted",
    label: "Р’С‹РґР°РЅ РїСЂРѕРјРѕ-С‚Р°СЂРёС„",
  },
  "tariff.paid": {
    description:
      "РџРѕРґС‚Р°Р»РєРёРІР°РµС‚ РЅРѕРІРѕРіРѕ РїР»Р°С‚СЏС‰РµРіРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ Рє Р°РєС‚РёРІР°С†РёРё Рё РїРµСЂРІС‹Рј РґРµР№СЃС‚РІРёСЏРј.",
    key: "tariff.paid",
    label: "РћРїР»Р°С‡РµРЅ С‚Р°СЂРёС„",
  },
  "user.inactive_7d": {
    description:
      "Р’РѕР·РІСЂР°С‰Р°РµС‚ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ, РєРѕС‚РѕСЂС‹Р№ РїРµСЂРµСЃС‚Р°Р» РїРѕР»СЊР·РѕРІР°С‚СЊСЃСЏ РїСЂРѕРґСѓРєС‚РѕРј.",
    key: "user.inactive_7d",
    label: "РќРµР°РєС‚РёРІРµРЅ 7 РґРЅРµР№",
  },
  "user.started": {
    description:
      "Р—Р°РїСѓСЃРєР°РµС‚ follow-up РёР»Рё РІРѕР·РІСЂР°С‰Р°СЋС‰СѓСЋ С†РµРїРѕС‡РєСѓ РїРѕСЃР»Рµ РєРѕРјР°РЅРґС‹ /start.",
    key: "user.started",
    label: "РќР°Р¶Р°Р» Start",
  },
};

function getLocalizedEventOptions() {
  return getTriggerEventOptions().map((option) => eventCopy[option.key] ?? option);
}

export default async function TriggerRulePage({ params }: TriggerRulePageProps) {
  const resolvedParams = await params;
  const { dynamicGroups, rule, userGroups } =
    process.env.APP_ROLE === "ingress"
      ? await fetchInternalAdminTriggerEditorData(resolvedParams.triggerId)
      : await loadAdminTriggerEditorData(resolvedParams.triggerId);

  if (!rule) {
    notFound();
  }

  const userGroupOptions: TriggerUserGroupOption[] = userGroups.map((group) => ({
    label: group.name,
    value: group.id,
  }));
  const dynamicUserGroupOptions: TriggerDynamicUserGroupOption[] = dynamicGroups.map(
    (group) => ({
      label:
        group.status === "active"
          ? group.name
          : `${group.name} (РІС‹РєР»СЋС‡РµРЅР°)`,
      value: group.id,
    }),
  );

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="РћР±РЅРѕРІР»СЏР№С‚Рµ С‚Р°Р№РјРёРЅРі, СѓСЃР»РѕРІРёСЏ Рё С‚РµРєСЃС‚ СЃРѕРѕР±С‰РµРЅРёСЏ РґР»СЏ СЃСѓС‰РµСЃС‚РІСѓСЋС‰РµРіРѕ С‚СЂРёРіРіРµСЂР°."
        title="Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ С‚СЂРёРіРіРµСЂР°"
      />
      <ChatBotSubNav />
      <TriggerForm
        action={updateTriggerRule}
        cancelHref="/admin/triggers"
        deleteAction={deleteTriggerRule}
        dynamicUserGroupOptions={dynamicUserGroupOptions}
        eventOptions={getLocalizedEventOptions()}
        initial={{
          buttons: parseTriggerButtons(rule.buttons),
          conditions: Array.isArray(rule.conditions)
            ? (rule.conditions as TriggerCondition[])
            : [],
          delayUnit: rule.delayUnit as "now" | "minutes" | "hours" | "days",
          delayValue: rule.delayValue,
          eventKey: rule.eventKey,
          id: rule.id,
          imageUrl: rule.imageUrl,
          messageText: rule.messageText,
          name: rule.name,
          status: rule.status as "draft" | "active" | "disabled",
        }}
        submitLabel="РЎРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ"
        testSendAction={sendTriggerTestMessage}
        title="Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ С‚СЂРёРіРіРµСЂР°"
        userGroupOptions={userGroupOptions}
      />
    </section>
  );
}
