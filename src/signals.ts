import { type AiNewsItem } from "./collectors/aiNews.js";
import { type HackerNewsStory } from "./collectors/hackerNews.js";
import { type TwitterPost } from "./collectors/twitter.js";
import { scoreSignal, type SignalScore } from "./scoring.js";

export type SignalCategory = "ai" | "news" | "job" | "hackathon" | "trending_tool" | "top_signal";

export type Signal = {
  title: string;
  category: SignalCategory;
  source: string;
  url?: string;
  summary?: string;
  whyItMatters?: string;
  publishedAt?: Date;
  engagementScore?: number;
  metadata?: Record<string, string | number>;
};

export type RankedSignal = Signal & {
  relevance: SignalScore;
};

export function rankSignals(signals: ReadonlyArray<Signal>): RankedSignal[] {
  return signals
    .map((signal) => ({
      ...signal,
      relevance: scoreSignal({
        title: signal.title,
        text: [signal.summary, signal.whyItMatters].filter(Boolean).join(" "),
        source: signal.source,
        url: signal.url,
        publishedAt: signal.publishedAt,
        engagementScore: signal.engagementScore,
      }),
    }))
    .sort((a, b) => {
      const aTime = a.publishedAt?.getTime() ?? 0;
      const bTime = b.publishedAt?.getTime() ?? 0;
      const aEngagement = a.engagementScore ?? 0;
      const bEngagement = b.engagementScore ?? 0;

      return b.relevance.score - a.relevance.score || bTime - aTime || bEngagement - aEngagement;
    });
}

export function formatSignals(title: string, signals: ReadonlyArray<Signal>, limit: number): string {
  const rankedSignals = rankSignals(signals).slice(0, limit);

  if (rankedSignals.length === 0) {
    return `No ${title.toLowerCase()} found right now.`;
  }

  const lines = [title, ""];

  rankedSignals.forEach((signal, index) => {
    lines.push(`${index + 1}. ${signal.title}`);
    lines.push(`Source: ${signal.source}`);
    lines.push(`Relevance: ${signal.relevance.score}`);

    if (signal.relevance.reasons.length > 0) {
      lines.push(`Why ranked: ${signal.relevance.reasons.slice(0, 4).join(", ")}`);
    }

    if (signal.summary) {
      lines.push(`Summary: ${signal.summary}`);
    }

    if (signal.whyItMatters) {
      lines.push(`Why it matters: ${signal.whyItMatters}`);
    }

    if (signal.publishedAt) {
      lines.push(`Published: ${signal.publishedAt.toISOString().slice(0, 10)}`);
    }

    for (const [key, value] of Object.entries(signal.metadata ?? {})) {
      lines.push(`${key}: ${value}`);
    }

    if (signal.url) {
      lines.push(`Link: ${signal.url}`);
    }

    lines.push("");
  });

  return lines.join("\n").trim();
}

export function aiNewsToSignals(items: ReadonlyArray<AiNewsItem>): Signal[] {
  return items.map((item) => ({
    title: item.title,
    category: "ai",
    source: item.source,
    url: item.url,
    publishedAt: item.publishedAt,
  }));
}

export function hackerNewsToSignals(stories: ReadonlyArray<HackerNewsStory>): Signal[] {
  return stories.map((story) => ({
    title: story.title,
    category: "news",
    source: `Hacker News by ${story.author}`,
    url: story.url,
    engagementScore: story.score,
    metadata: {
      "HN score": story.score,
    },
  }));
}

export function twitterPostsToSignals(posts: ReadonlyArray<TwitterPost>): Signal[] {
  return posts.map((post) => ({
    title: post.text,
    category: "top_signal",
    source: `X/Twitter by @${post.authorHandle}`,
    url: post.url,
    publishedAt: post.createdAt,
    engagementScore: post.likeCount + post.repostCount * 2 + post.replyCount,
    metadata: {
      Likes: post.likeCount,
      Reposts: post.repostCount,
      Replies: post.replyCount,
    },
  }));
}
