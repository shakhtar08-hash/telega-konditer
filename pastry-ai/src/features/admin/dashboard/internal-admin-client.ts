import {
  fetchInternalAdminJson,
} from "@/features/admin/shared/internal-admin-client";
import type { AppPlan } from "@/features/subscriptions/plans";

export { shouldUseInternalAdminBridge } from "@/features/admin/shared/internal-admin-client";

type AdminDashboardPageData = {
  conversations: Array<{
    feature: string;
    id: string;
    messages: Array<{ content: string }>;
    user: {
      name: string | null;
      telegramId: string;
      username: string | null;
    };
  }>;
  conversion: number;
  distribution: {
    analysis: number;
    consulting: number;
    content: number;
    other: number;
    photo: number;
    recipes: number;
  };
  metricCards: Array<{
    accent: string;
    key?: string;
    label: string;
    value: string;
  }>;
  photoStyles: Array<{
    id: string;
    name: string;
    preview: string | null;
  }>;
  providerUsage: Array<{
    cost: number;
    count: number;
    provider: string;
  }>;
  users: Array<{
    createdAt: Date;
    credits: number;
    id: string;
    name: string | null;
    plan: AppPlan;
    telegramId: string;
    username: string | null;
  }>;
};

type AdminHistoryPageData = {
  conversations: Array<{
    createdAt: Date;
    feature: string;
    id: string;
    messages: Array<{
      content: string;
      createdAt: Date;
      model: string | null;
      role: string;
    }>;
    user: {
      telegramId: string;
      username: string | null;
    };
  }>;
};

type AdminUsagePageData = {
  usage: Array<{
    cost: string;
    createdAt: Date;
    errorMessage: string | null;
    feature: string;
    id: string;
    inputTokens: number;
    latency: number;
    model: string | null;
    outputTokens: number;
    provider: string;
    status: string;
    user: {
      telegramId: string;
      username: string | null;
    };
  }>;
};

export async function fetchInternalAdminDashboardPageData(): Promise<AdminDashboardPageData> {
  const data = await fetchInternalAdminJson<{
    conversations: Array<{
      feature: string;
      id: string;
      messages: Array<{ content: string }>;
      user: {
        name: string | null;
        telegramId: string;
        username: string | null;
      };
    }>;
    conversion: number;
    distribution: AdminDashboardPageData["distribution"];
    metricCards: AdminDashboardPageData["metricCards"];
    photoStyles: Array<{
      id: string;
      name: string;
      preview: string | null;
    }>;
    providerUsage: Array<{
      cost: number;
      count: number;
      provider: string;
    }>;
    users: Array<{
      createdAt: string;
      credits: number;
      id: string;
      name: string | null;
      plan: AppPlan;
      telegramId: string;
      username: string | null;
    }>;
  }>("/api/internal/admin/dashboard");

  return {
    ...data,
    users: data.users.map((user) => ({
      ...user,
      createdAt: new Date(user.createdAt),
    })),
  };
}

export async function fetchInternalAdminHistoryPageData(): Promise<AdminHistoryPageData> {
  const data = await fetchInternalAdminJson<{
    conversations: Array<{
      createdAt: string;
      feature: string;
      id: string;
      messages: Array<{
        content: string;
        createdAt: string;
        model: string | null;
        role: string;
      }>;
      user: {
        telegramId: string;
        username: string | null;
      };
    }>;
  }>("/api/internal/admin/dashboard?view=history");

  return {
    conversations: data.conversations.map((conversation) => ({
      ...conversation,
      createdAt: new Date(conversation.createdAt),
      messages: conversation.messages.map((message) => ({
        ...message,
        createdAt: new Date(message.createdAt),
      })),
    })),
  };
}

export async function fetchInternalAdminUsagePageData(): Promise<AdminUsagePageData> {
  const data = await fetchInternalAdminJson<{
    usage: Array<{
      cost: string;
      createdAt: string;
      errorMessage: string | null;
      feature: string;
      id: string;
      inputTokens: number;
      latency: number;
      model: string | null;
      outputTokens: number;
      provider: string;
      status: string;
      user: {
        telegramId: string;
        username: string | null;
      };
    }>;
  }>("/api/internal/admin/dashboard?view=usage");

  return {
    usage: data.usage.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
    })),
  };
}
