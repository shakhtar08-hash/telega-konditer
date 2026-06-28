import { z } from "zod";
import type { PhotoshootAgentInput } from "@/ai/agents/photoshoot-agent";
import type { PhotoshootOutput } from "@/ai/schemas/photoshoot";

const photoshootInputSchema = z.object({
  imageUrl: z.string().url(),
  style: z.string().trim().min(1),
});

type PhotoshootAgent = {
  execute(input: PhotoshootAgentInput): Promise<PhotoshootOutput>;
};

export function createPhotoshootService(dependencies: {
  photoshootAgent: PhotoshootAgent;
}) {
  return {
    generateProductPhoto(input: {
      imageUrl: string;
      style: string;
    }): Promise<PhotoshootOutput> {
      return dependencies.photoshootAgent.execute(
        photoshootInputSchema.parse(input),
      );
    },
  };
}
