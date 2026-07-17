import { AdminPageHeader } from "@/components/admin/data-table";
import ChatBotSubNav from "@/components/admin/chat-bot-subnav";
import { fetchInternalAdminTriggerEditorData } from "@/features/admin/triggers/internal-admin-client";
import { loadAdminTriggerEditorData } from "@/features/admin/triggers/service";
import {
  getTriggerEventOptions,
  getTriggerTemplates,
} from "@/features/triggers/trigger-template";
import { createTriggerRule, sendTriggerTestMessage } from "../actions";
import {
  TriggerForm,
  type TriggerDynamicUserGroupOption,
  type TriggerFormValues,
  type TriggerUserGroupOption,
} from "../trigger-form";

type NewTriggerPageProps = {
  searchParams?: Promise<{ template?: string }> | { template?: string };
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

const templateNameCopy: Record<string, string> = {
  "after-start-did-not-begin-using":
    "РџРѕСЃР»Рµ СЃС‚Р°СЂС‚Р°: РЅРµ РЅР°С‡Р°Р» РїРѕР»СЊР·РѕРІР°С‚СЊСЃСЏ",
  "after-start-no-promo": "РџРѕСЃР»Рµ СЃС‚Р°СЂС‚Р°: РїСЂРѕРјРѕ РЅРµ РїРѕР»СѓС‡РµРЅРѕ",
  "inactive-for-7-days": "РќРµР°РєС‚РёРІРµРЅ 7 РґРЅРµР№",
  "paid-but-not-activated": "РћРїР»Р°С‚РёР», РЅРѕ РЅРµ Р°РєС‚РёРІРёСЂРѕРІР°Р»СЃСЏ",
  "promo-expired": "РџСЂРѕРјРѕ РёСЃС‚РµРєР»Рѕ",
  "promo-expired-after-active-usage":
    "РџСЂРѕРјРѕ РёСЃС‚РµРєР»Рѕ РїРѕСЃР»Рµ Р°РєС‚РёРІРЅРѕРіРѕ РёСЃРїРѕР»СЊР·РѕРІР°РЅРёСЏ",
  "promo-granted-but-unused": "РџСЂРѕРјРѕ РІС‹РґР°РЅРѕ, РЅРѕ РЅРµ РёСЃРїРѕР»СЊР·РѕРІР°РЅРѕ",
};

function getLocalizedEventOptions() {
  return getTriggerEventOptions().map((option) => eventCopy[option.key] ?? option);
}

function buildInitialValues(templateKey?: string): TriggerFormValues {
  const template = getTriggerTemplates().find((item) => item.key === templateKey);

  return {
    buttons: [],
    conditions: template?.conditions ?? [],
    delayUnit: template?.delayUnit ?? "now",
    delayValue: template?.delayValue ?? 0,
    eventKey: template?.eventKey ?? getLocalizedEventOptions()[0]?.key ?? "user.started",
    id: null,
    imageUrl: null,
    messageText: "",
    name: template ? (templateNameCopy[template.key] ?? template.name) : "",
    status: "draft",
  };
}

export default async function NewTriggerPage({ searchParams }: NewTriggerPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initial = buildInitialValues(resolvedSearchParams.template);
  const { dynamicGroups, userGroups } =
    process.env.APP_ROLE === "ingress"
      ? await fetchInternalAdminTriggerEditorData()
      : await loadAdminTriggerEditorData();
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
        description="РЎРѕР·РґР°Р№С‚Рµ РЅРѕРІРѕРµ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРѕРµ РїСЂР°РІРёР»Рѕ РїРѕ СЃРѕР±С‹С‚РёСЋ РґР»СЏ follow-up Рё СЂРµР°РєС‚РёРІР°С†РёРё."
        title="РќРѕРІС‹Р№ С‚СЂРёРіРіРµСЂ"
      />
      <ChatBotSubNav />
      <TriggerForm
        action={createTriggerRule}
        cancelHref="/admin/triggers"
        dynamicUserGroupOptions={dynamicUserGroupOptions}
        eventOptions={getLocalizedEventOptions()}
        initial={initial}
        submitLabel="РЎРѕР·РґР°С‚СЊ С‚СЂРёРіРіРµСЂ"
        testSendAction={sendTriggerTestMessage}
        title="РќРѕРІС‹Р№ С‚СЂРёРіРіРµСЂ"
        userGroupOptions={userGroupOptions}
      />
    </section>
  );
}
