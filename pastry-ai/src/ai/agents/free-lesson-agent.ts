import type { PromptRecord } from "@/db/repositories/prompt-repository";
import type { AIService } from "../provider/ai-service";
import {
  createYouTubeService,
  filterVideos,
  formatDuration,
} from "@/features/youtube/youtube-service";

type PromptLoader = {
  load(feature: "free-lesson", slug: string): Promise<PromptRecord>;
};

export type FreeLessonAgentInput = {
  topic: string;
  promptSlug?: string;
};

const queryGeneratorPrompt = `Ты — кондитер-аналитик и эксперт по обучению. Твоя задача — сгенерировать поисковые запросы для YouTube.

Пользователь хочет найти бесплатные видеоуроки по теме, указанной ниже.

Сгенерируй от 3 до 6 поисковых запросов на русском и/или английском языке, которые помогут найти лучшие уроки.

Правила:
- Запросы должны быть разнообразными: общие, узкие, с акцентом на технологии, с упором на новичков.
- Часть запросов делай на русском, часть — на английском (если тема популярна в западной школе).
- Формат ответа: каждый запрос с новой строки, без нумерации.
- Не добавляй пояснений и лишнего текста, только запросы.`;

const youtube = createYouTubeService();

export function createFreeLessonAgent(dependencies: {
  promptLoader: PromptLoader;
  aiService: AIService;
}) {
  return {
    async execute(input: FreeLessonAgentInput): Promise<string> {
      const topic = input.topic;

      // Stage 1: Generate search queries via LLM
      const searchQueriesRaw = await dependencies.aiService.generateText({
        system: queryGeneratorPrompt,
        prompt: `Тема: ${topic}`,
        provider: "openrouter",
        model: "google/gemini-2.5-pro",
        temperature: 0.3,
      });

      const queries = searchQueriesRaw
        .split("\n")
        .map((q) => q.trim())
        .filter((q) => q.length > 3);

      if (queries.length === 0) {
        queries.push(topic);
      }

      // Stage 2: Search YouTube for each query, merge, deduplicate
      const seen = new Set<string>();
      const allVideos: Array<{ videoId: string }> = [];

      for (const query of queries.slice(0, 6)) {
        try {
          const results = await youtube.searchVideos(query, 5);
          for (const v of results) {
            if (!seen.has(v.videoId)) {
              seen.add(v.videoId);
              allVideos.push(v);
            }
          }
        } catch {
          // skip failed query
        }
      }

      if (allVideos.length === 0) {
        return "К сожалению, по вашему запросу не нашлось подходящих бесплатных видеоуроков. Попробуйте изменить формулировку запроса.";
      }

      // Stage 3: Get full details and filter
      const videoIds = allVideos.map((v) => v.videoId);
      let detailed: Array<{
        title: string;
        videoId: string;
        url: string;
        channelTitle: string;
        publishedAt: string;
        description: string;
        thumbnail: string;
        duration?: string;
        viewCount?: string;
        likeCount?: string;
      }>;

      try {
        detailed = await youtube.getVideoDetails(videoIds);
      } catch {
        detailed = allVideos as typeof detailed;
      }

      const filtered = filterVideos(detailed);

      if (filtered.length === 0) {
        return "По вашему запросу нашлись только короткие ролики. Попробуйте уточнить запрос — возможно, вы ищете что-то более конкретное.";
      }

      // Stage 4: LLM #2 analyzes and formats response
      const prompt = await dependencies.promptLoader.load(
        "free-lesson",
        input.promptSlug ?? "free-lesson-search",
      );

      const videosMarkdown = filtered
        .slice(0, 15)
        .map(
          (v, i) =>
            `${i + 1}. **${v.title}**\n   Канал: ${v.channelTitle}\n   Длительность: ${formatDuration(v.duration)}\n   Ссылка: ${v.url}\n   Описание: ${v.description.slice(0, 300)}`,
        )
        .join("\n\n");

      const renderedPrompt = prompt.userTemplate
        .replace("{{topic}}", topic)
        .replace("{{videos}}", videosMarkdown);

      return dependencies.aiService.generateText({
        system: prompt.systemPrompt,
        prompt: renderedPrompt,
        provider: prompt.provider,
        model: prompt.model,
        temperature: prompt.temperature,
      });
    },
  };
}