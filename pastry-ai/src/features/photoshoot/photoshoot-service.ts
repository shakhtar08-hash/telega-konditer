import { z } from "zod";
import type { PhotoshootAgentInput } from "@/ai/agents/photoshoot-agent";
import type { PhotoshootOutput } from "@/ai/schemas/photoshoot";

const photoshootInputSchema = z.object({
  imageUrl: z.string().url(),
});

type PhotoshootAgent = {
  execute(input: PhotoshootAgentInput): Promise<PhotoshootOutput>;
};

type PhotoStyleRepository = {
  listActive(limit: number): Promise<PhotoshootAgentInput["styles"]>;
};

export function createPhotoshootService(dependencies: {
  photoshootAgent: PhotoshootAgent;
  photoStyleRepository: PhotoStyleRepository;
}) {
  return {
    async generateStyledDessertPhotos(input: {
      imageUrl: string;
    }): Promise<PhotoshootOutput> {
      const parsedInput = photoshootInputSchema.parse(input);
      const styles = await dependencies.photoStyleRepository.listActive(7);

      if (styles.length === 0) {
        throw new Error("No active photo styles are configured");
      }

      return dependencies.photoshootAgent.execute({
        ...parsedInput,
        styles,
      });
    },
  };
}
