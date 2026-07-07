export type YouTubeVideo = {
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
};

export function createYouTubeService() {
  return {
    async searchVideos(query: string, maxResults = 7): Promise<YouTubeVideo[]> {
      const apiKey = process.env.YOUTUBE_API_KEY;

      if (!apiKey) {
        throw new Error("Missing YOUTUBE_API_KEY");
      }

      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("q", query);
      url.searchParams.set("type", "video");
      url.searchParams.set("maxResults", String(maxResults));
      url.searchParams.set("safeSearch", "strict");
      url.searchParams.set("key", apiKey);
      url.searchParams.set("relevanceLanguage", "ru");

      const res = await fetch(url.toString());

      if (!res.ok) {
        const details = await res.text().catch(() => "");
        throw new Error(`YouTube API error: ${res.status} ${details}`);
      }

      const data = (await res.json()) as {
        items?: Array<{
          id: { videoId: string };
          snippet: {
            title: string;
            channelTitle: string;
            publishedAt: string;
            description: string;
            thumbnails?: {
              medium?: { url: string };
              high?: { url: string };
            };
          };
        }>;
      };

      return (data.items ?? [])
        .filter((item) => item.id?.videoId)
        .map((item) => ({
          title: item.snippet.title,
          videoId: item.id.videoId,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          description: item.snippet.description,
          thumbnail:
            item.snippet.thumbnails?.medium?.url ??
            item.snippet.thumbnails?.high?.url ??
            "",
        }));
    },

    async getVideoDetails(
      videoIds: string[],
    ): Promise<YouTubeVideo[]> {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) throw new Error("Missing YOUTUBE_API_KEY");

      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "snippet,contentDetails,statistics");
      url.searchParams.set("id", videoIds.join(","));
      url.searchParams.set("key", apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) {
        const details = await res.text().catch(() => "");
        throw new Error(`YouTube API error: ${res.status} ${details}`);
      }

      const data = (await res.json()) as {
        items?: Array<{
          id: string;
          snippet: {
            title: string;
            channelTitle: string;
            publishedAt: string;
            description: string;
            thumbnails?: {
              medium?: { url: string };
              high?: { url: string };
            };
          };
          contentDetails?: {
            duration: string;
          };
          statistics?: {
            viewCount?: string;
            likeCount?: string;
          };
        }>;
      };

      return (data.items ?? [])
        .filter((item) => item.id)
        .map((item) => ({
          title: item.snippet.title,
          videoId: item.id,
          url: `https://www.youtube.com/watch?v=${item.id}`,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          description: item.snippet.description,
          thumbnail:
            item.snippet.thumbnails?.medium?.url ??
            item.snippet.thumbnails?.high?.url ??
            "",
          duration: item.contentDetails?.duration,
          viewCount: item.statistics?.viewCount,
          likeCount: item.statistics?.likeCount,
        }));
    },
  };
}

function parseISO8601Duration(duration: string): string {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return duration;

  const hours = (match[1] ?? "").replace("H", "");
  const minutes = (match[2] ?? "").replace("M", "");
  const seconds = (match[3] ?? "").replace("S", "");

  const parts: string[] = [];
  if (hours) parts.push(hours.padStart(2, "0"));
  parts.push((minutes || "0").padStart(2, "0"));
  parts.push((seconds || "0").padStart(2, "0"));

  return parts.join(":");
}

export function formatDuration(iso: string | undefined): string {
  if (!iso) return "—";
  return parseISO8601Duration(iso);
}

export function filterVideos(
  videos: YouTubeVideo[],
): YouTubeVideo[] {
  return videos.filter((v) => {
    const dur = v.duration ? parseISO8601Duration(v.duration) : "";
    const parts = dur.split(":").map(Number);
    const totalMinutes =
      parts.length === 3
        ? parts[0] * 60 + parts[1] + parts[2] / 60
        : parts.length === 2
          ? parts[0] + parts[1] / 60
          : 0;

    return totalMinutes >= 3;
  });
}