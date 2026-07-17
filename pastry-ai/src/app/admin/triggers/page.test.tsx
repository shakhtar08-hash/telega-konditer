import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const {
  fetchInternalAdminTriggerEditorDataMock,
  fetchInternalAdminTriggersPageDataMock,
  loadAdminTriggerEditorDataMock,
  loadAdminTriggersPageDataMock,
} = vi.hoisted(() => ({
  fetchInternalAdminTriggerEditorDataMock: vi.fn(),
  fetchInternalAdminTriggersPageDataMock: vi.fn(),
  loadAdminTriggerEditorDataMock: vi.fn(),
  loadAdminTriggersPageDataMock: vi.fn(),
}));

vi.mock("@/components/admin/chat-bot-subnav", () => ({
  default: () => "<nav>subnav</nav>",
}));

vi.mock("@/features/admin/triggers/service", () => ({
  loadAdminTriggerEditorData: loadAdminTriggerEditorDataMock,
  loadAdminTriggersPageData: loadAdminTriggersPageDataMock,
}));

vi.mock("@/features/admin/triggers/internal-admin-client", () => ({
  fetchInternalAdminTriggerEditorData: fetchInternalAdminTriggerEditorDataMock,
  fetchInternalAdminTriggersPageData: fetchInternalAdminTriggersPageDataMock,
}));

vi.mock("./trigger-form", () => ({
  TriggerForm: ({
    deleteAction,
    dynamicUserGroupOptions = [],
    initial,
    submitLabel,
    title,
    userGroupOptions = [],
  }: {
    deleteAction?: unknown;
    dynamicUserGroupOptions?: Array<{ label: string; value: string }>;
    initial: { conditions: unknown[] };
    submitLabel: string;
    title: string;
    userGroupOptions?: Array<{ label: string; value: string }>;
  }) => (
    <div>
      {`trigger-form:${title}|${submitLabel}|delete:${String(Boolean(deleteAction))}|groups:${userGroupOptions
        .map((option) => `${option.label}:${option.value}`)
        .join(",")}|dynamic:${dynamicUserGroupOptions
        .map((option) => `${option.label}:${option.value}`)
        .join(",")}|conditions:${initial.conditions.length}`}
    </div>
  ),
}));

import AdminTriggersPage from "./page";
import NewTriggerPage from "./new/page";
import TriggerRulePage from "./[triggerId]/page";

describe("trigger admin pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.APP_ROLE;
    delete process.env.INTERNAL_API_BASE_URL;
    delete process.env.INTERNAL_API_SHARED_SECRET;
    loadAdminTriggersPageDataMock.mockResolvedValue({
      groups: [],
      rules: [],
      userGroupsUnavailable: false,
    });
    loadAdminTriggerEditorDataMock.mockResolvedValue({
      dynamicGroups: [],
      dynamicGroupsUnavailable: false,
      rule: null,
      userGroups: [],
    });
    fetchInternalAdminTriggersPageDataMock.mockResolvedValue({
      groups: [],
      rules: [],
      userGroupsUnavailable: false,
    });
    fetchInternalAdminTriggerEditorDataMock.mockResolvedValue({
      dynamicGroups: [],
      dynamicGroupsUnavailable: false,
      rule: null,
      userGroups: [],
    });
  });

  it("renders the triggers screen in Russian", async () => {
    loadAdminTriggersPageDataMock.mockResolvedValue({
      groups: [],
      rules: [
        {
          conditions: [],
          createdAt: new Date("2026-07-10T10:00:00.000Z"),
          delayUnit: "minutes",
          delayValue: 15,
          eventKey: "user.started",
          id: "rule_1",
          name: "After Start: no promo",
          status: "active",
          updatedAt: new Date("2026-07-10T10:00:00.000Z"),
        },
      ],
      userGroupsUnavailable: false,
    });

    const html = renderToStaticMarkup(await AdminTriggersPage({}));

    expect(html).toContain("Триггеры");
    expect(html).toContain("After Start: no promo");
    expect(html).toContain("Создать триггер");
  });

  it("shows filters and empty state", async () => {
    const html = renderToStaticMarkup(
      await AdminTriggersPage({
        searchParams: Promise.resolve({
          event: "tariff.paid",
          search: "missing",
          sort: "name-asc",
          status: "disabled",
        }),
      }),
    );

    expect(html).toContain("Применить");
    expect(html).toContain("Нет триггеров");
  });

  it("passes live user and dynamic groups into the new trigger page form", async () => {
    loadAdminTriggerEditorDataMock.mockResolvedValue({
      dynamicGroups: [
        { id: "dynamic_no_tariff", name: "Без активного тарифа", status: "active" },
      ],
      dynamicGroupsUnavailable: false,
      rule: null,
      userGroups: [
        { id: "group_vip", name: "VIP клиенты" },
        { id: "group_school", name: "Ученики курса" },
      ],
    });

    const html = renderToStaticMarkup(await NewTriggerPage({}));

    expect(html).toContain("Новый триггер");
    expect(html).toContain(
      "groups:VIP клиенты:group_vip,Ученики курса:group_school",
    );
    expect(html).toContain(
      "dynamic:Без активного тарифа:dynamic_no_tariff",
    );
  });

  it("passes live user groups and delete support into the edit trigger page form", async () => {
    loadAdminTriggerEditorDataMock.mockResolvedValue({
      dynamicGroups: [
        { id: "dynamic_no_tariff", name: "Без активного тарифа", status: "active" },
      ],
      dynamicGroupsUnavailable: false,
      rule: {
        buttons: [],
        conditions: [
          { field: "dynamicUserGroupId", operator: "matches", value: "dynamic_no_tariff" },
        ],
        delayUnit: "now",
        delayValue: 0,
        eventKey: "user.started",
        id: "rule_group",
        imageUrl: null,
        messageText: "Привет!",
        name: "VIP follow-up",
        status: "active",
      },
      userGroups: [{ id: "group_vip", name: "VIP клиенты" }],
    });

    const html = renderToStaticMarkup(
      await TriggerRulePage({
        params: Promise.resolve({ triggerId: "rule_group" }),
      }),
    );

    expect(html).toContain("Редактирование триггера");
    expect(html).toContain("delete:true");
    expect(html).toContain(
      "dynamic:Без активного тарифа:dynamic_no_tariff",
    );
  });

  it("loads trigger list from RU on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";

    await AdminTriggersPage({ searchParams: Promise.resolve({}) });

    expect(fetchInternalAdminTriggersPageDataMock).toHaveBeenCalled();
    expect(loadAdminTriggersPageDataMock).not.toHaveBeenCalled();
  });

  it("loads the new trigger editor from RU on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";

    await renderToStaticMarkup(await NewTriggerPage({}));

    expect(fetchInternalAdminTriggerEditorDataMock).toHaveBeenCalledWith();
    expect(loadAdminTriggerEditorDataMock).not.toHaveBeenCalled();
  });

  it("loads the edit trigger editor from RU on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
    fetchInternalAdminTriggerEditorDataMock.mockResolvedValue({
      dynamicGroups: [],
      dynamicGroupsUnavailable: false,
      rule: {
        buttons: [],
        conditions: [],
        delayUnit: "now",
        delayValue: 0,
        eventKey: "user.started",
        id: "rule_1",
        imageUrl: null,
        messageText: "Hi",
        name: "Trigger",
        status: "active",
      },
      userGroups: [],
    });

    await renderToStaticMarkup(
      await TriggerRulePage({
        params: Promise.resolve({ triggerId: "rule_1" }),
      }),
    );

    expect(fetchInternalAdminTriggerEditorDataMock).toHaveBeenCalledWith("rule_1");
    expect(loadAdminTriggerEditorDataMock).not.toHaveBeenCalled();
  });
});
