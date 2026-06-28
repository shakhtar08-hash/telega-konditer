import { z } from "zod";
import type { CarouselAgentInput } from "@/ai/agents/carousel-agent";
import type { CarouselOutput } from "@/ai/schemas/carousel";

const carouselInputSchema = z.object({ topic: z.string().trim().min(1) });

type CarouselAgent = {
  execute(input: CarouselAgentInput): Promise<CarouselOutput>;
};

export function createCarouselService(dependencies: {
  carouselAgent: CarouselAgent;
}) {
  return {
    createInstagramCarousel(input: { topic: string }): Promise<CarouselOutput> {
      return dependencies.carouselAgent.execute(carouselInputSchema.parse(input));
    },
  };
}
