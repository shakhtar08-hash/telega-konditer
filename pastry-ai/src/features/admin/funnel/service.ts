import type { FunnelBuyButton } from "@/app/admin/funnel/buy-buttons-form";
import { prisma } from "@/db/prisma";

export type FunnelAdminStep = {
  active: boolean;
  buyButtons: FunnelBuyButton[];
  buyButtonText: string;
  buyButtonUrl: string | null;
  id: string;
  imagePath: string;
  nextAction: "next" | "activate_promo_and_next";
  nextButtonText: string;
  offerButtonText: string | null;
  slug: string;
  sortOrder: number;
  text: string;
  title: string;
};

export type FunnelMutationInput = {
  active: boolean;
  buyButtons: FunnelBuyButton[];
  firstBuyButton?: FunnelBuyButton;
  imagePath: string;
  nextAction: "next" | "activate_promo_and_next";
  nextButtonText: string;
  offerButtonText: string;
  slug?: string;
  sortOrder: number;
  text: string;
  title: string;
};

export async function loadAdminFunnelPageData(): Promise<{ steps: FunnelAdminStep[] }> {
  const steps = (await prisma.funnelStep.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      active: true,
      buyButtons: true,
      buyButtonText: true,
      buyButtonUrl: true,
      id: true,
      imagePath: true,
      nextButtonText: true,
      nextAction: true,
      offerButtonText: true,
      slug: true,
      sortOrder: true,
      text: true,
      title: true,
    },
  })) as FunnelAdminStep[];

  return {
    steps,
  };
}

export async function performCreateFunnelStep(input: FunnelMutationInput): Promise<void> {
  const slug = input.slug?.trim() ?? "";

  if (!slug) {
    return;
  }

  await prisma.funnelStep.create({
    data: {
      active: true,
      buyButtons: input.buyButtons,
      buyButtonText: input.firstBuyButton?.text ?? "",
      buyButtonUrl: input.firstBuyButton?.url || null,
      imagePath: input.imagePath,
      nextButtonText: input.nextButtonText,
      nextAction: input.nextAction,
      offerButtonText: input.offerButtonText || null,
      slug,
      sortOrder: input.sortOrder,
      text: input.text,
      title: input.title,
    },
  });
}

export async function performUpdateFunnelStep(
  input: FunnelMutationInput & { id: string },
): Promise<void> {
  if (!input.id) {
    return;
  }

  await prisma.funnelStep.update({
    where: { id: input.id },
    data: {
      active: input.active,
      buyButtons: input.buyButtons,
      buyButtonText: input.firstBuyButton?.text ?? "",
      buyButtonUrl: input.firstBuyButton?.url || null,
      imagePath: input.imagePath,
      nextButtonText: input.nextButtonText,
      nextAction: input.nextAction,
      offerButtonText: input.offerButtonText || null,
      sortOrder: input.sortOrder,
      text: input.text,
      title: input.title,
    },
  });
}
