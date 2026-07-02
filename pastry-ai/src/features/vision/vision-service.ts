import { z } from "zod";
import type { VisionAgentInput } from "@/ai/agents/vision-agent";

const visionInputSchema = z.object({ imageUrl: z.string().url() });

type VisionAgent = {
  execute(input: VisionAgentInput): Promise<string>;
};

export function createVisionService(dependencies: { visionAgent: VisionAgent }) {
  return {
    identifyDessert(input: { imageUrl: string }): Promise<string> {
      return dependencies.visionAgent.execute(visionInputSchema.parse(input));
    },
  };
}
