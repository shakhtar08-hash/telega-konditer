import { prisma } from "@/db/prisma";

export type PhotoStyleMutationInput = {
  active: boolean;
  description: string;
  model: string;
  name: string;
  preview: string | null;
  prompt: string;
  provider: string;
  userPreview: string | null;
  userText: string | null;
};

export async function loadAdminPhotoStylesPageData() {
  return {
    styles: await prisma.photoStyle.findMany({
      orderBy: { createdAt: "desc" },
    }),
  };
}

export async function performCreatePhotoStyle(
  input: PhotoStyleMutationInput,
): Promise<void> {
  if (!input.name || !input.description || !input.prompt || !input.provider || !input.model) {
    return;
  }

  await prisma.photoStyle.create({
    data: input,
  });
}

export async function performUpdatePhotoStyle(
  input: PhotoStyleMutationInput & { id: string },
): Promise<void> {
  if (
    !input.id ||
    !input.name ||
    !input.description ||
    !input.prompt ||
    !input.provider ||
    !input.model
  ) {
    return;
  }

  await prisma.photoStyle.update({
    data: {
      active: input.active,
      description: input.description,
      model: input.model,
      name: input.name,
      preview: input.preview,
      prompt: input.prompt,
      provider: input.provider,
      userPreview: input.userPreview,
      userText: input.userText,
    },
    where: { id: input.id },
  });
}

export async function performDeletePhotoStyle(id: string): Promise<void> {
  if (!id) {
    return;
  }

  await prisma.photoStyle.delete({ where: { id } });
}
