import type { TriggerUserState } from "@/features/triggers/trigger-rule-types";
import {
  buildDynamicGroupEvaluationContext,
  buildDynamicUserGroupPreview,
  loadDynamicGroupCandidateUser,
  loadDynamicUserGroupOptions,
  loadDynamicUserGroupRecord,
} from "./query";
import { matchesDynamicUserGroup } from "./evaluator";

export async function countDynamicUserGroupMatches(groupId: string) {
  const preview = await buildDynamicUserGroupPreview(groupId);
  return preview.total;
}

export async function listDynamicUserGroupPreviewUsers(groupId: string, page = 1) {
  return buildDynamicUserGroupPreview(groupId, {
    skip: Math.max(0, page - 1) * 25,
    take: 25,
  });
}

export async function listDynamicUserGroupOptions() {
  const groups = await loadDynamicUserGroupOptions();
  return groups.map((group) => ({
    value: group.id,
    label: group.status === "active" ? group.name : `${group.name} (выключена)`,
  }));
}

export async function matchesSavedDynamicUserGroup(groupId: string, state: TriggerUserState) {
  const group = await loadDynamicUserGroupRecord(groupId);

  if (!group || group.status !== "active") {
    return false;
  }

  const now = new Date();

  return matchesDynamicUserGroup(group.definition, {
    promoClaimed: state.promoClaimed,
    hasActiveTariff: state.hasActiveTariff,
    tariffExpired: state.tariffExpired,
    generationCount: state.generationCount,
    daysSinceLastActivity: state.lastActivityAt
      ? Math.max(0, Math.floor((now.getTime() - state.lastActivityAt.getTime()) / (24 * 60 * 60 * 1000)))
      : null,
    daysSinceSignup: Math.max(
      0,
      Math.floor((now.getTime() - state.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
    ),
    remainingTokens: state.remainingTokens,
  });
}

export async function listMatchingDynamicUserGroupsForUser(userId: string) {
  const [user, groups] = await Promise.all([
    loadDynamicGroupCandidateUser(userId),
    loadDynamicUserGroupOptions(),
  ]);

  if (!user) {
    return [];
  }

  const context = buildDynamicGroupEvaluationContext(user, new Date());
  const records = await Promise.all(
    groups
      .filter((group) => group.status === "active")
      .map(async (group) => ({
        id: group.id,
        name: group.name,
        record: await loadDynamicUserGroupRecord(group.id),
      })),
  );

  return records
    .filter(
      (entry) =>
        entry.record &&
        entry.record.status === "active" &&
        matchesDynamicUserGroup(entry.record.definition, context),
    )
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
    }));
}
