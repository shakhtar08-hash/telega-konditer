import { z } from "zod";

export const carouselOutputSchema = z.object({
  cover: z.string(),
  slides: z.array(z.string()),
  captions: z.array(z.string()),
});

export type CarouselOutput = z.infer<typeof carouselOutputSchema>;
