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
  findById(id: string): Promise<PhotoshootAgentInput["styles"][number] | null>;
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

    async generateStyledDessertPhoto(input: {
      imageUrl: string;
      styleId: string;
    }): Promise<PhotoshootOutput> {
      const parsedInput = photoshootInputSchema.parse(input);
      const style = await dependencies.photoStyleRepository.findById(input.styleId);

      if (!style) {
        throw new Error(`Photo style with id "${input.styleId}" not found`);
      }

      return dependencies.photoshootAgent.execute({
        ...parsedInput,
        styles: [style],
      });
    },
  };
}
