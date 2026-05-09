import { fetchAiNews, type AiNewsItem } from "./collectors/aiNews.js";
import { fetchHackerNewsTopStories, type HackerNewsStory } from "./collectors/hackerNews.js";
import { sampleItems } from "./sampleItems.js";
import { scoreSignal } from "./scoring.js";

type BriefingItem = {
  title: string;
  category: "top_signal" | "job" | "hackathon" | "trending_tool";
  source: string;
  summary: string;
  whyItMatters: string;
  hoursAgo: number;
  url?: string;
};

type CategoryCommand = {
  category: BriefingItem["category"];
  label: string;
};

type CommandDependencies = {
  fetchAiNews?: (limit?: number) => Promise<ReadonlyArray<AiNewsItem>>;
  fetchHackerNewsTopStories?: (limit?: number) => Promise<ReadonlyArray<HackerNewsStory>>;
};

const categoryLabels: Record<BriefingItem["category"], string> = {
  top_signal: "Top signals",
  job: "Jobs",
  hackathon: "Hackathons",
  trending_tool: "Trending tools",
};

const categoryCommands: Record<string, CategoryCommand> = {
  "/jobs": {
    category: "job",
    label: "Jobs",
  },
  "/hackathons": {
    category: "hackathon",
    label: "Hackathons",
  },
  "/trending": {
    category: "trending_tool",
    label: "Trending tools",
  },
};

export function buildBriefing(hours: number, items: ReadonlyArray<BriefingItem> = sampleItems): string {
  const matchingItems = items
    .filter((item) => item.hoursAgo <= hours)
    .sort((a, b) => {
      const aScore = scoreSignal({ title: a.title, text: `${a.summary} ${a.whyItMatters}`, source: a.source, url: a.url }).score;
      const bScore = scoreSignal({ title: b.title, text: `${b.summary} ${b.whyItMatters}`, source: b.source, url: b.url }).score;
      return bScore - aScore || a.hoursAgo - b.hoursAgo;
    });

  if (matchingItems.length === 0) {
    return `No matching tech updates found for the last ${hours} hours.`;
  }

  const lines = [`Tech briefing for the last ${hours} hours`, ""];

  for (const category of Object.keys(categoryLabels) as BriefingItem["category"][]) {
    const categoryItems = matchingItems.filter((item) => item.category === category);
    if (categoryItems.length === 0) continue;

    lines.push(categoryLabels[category]);

    categoryItems.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.title}`);
      lines.push(`Source: ${item.source}`);
      lines.push(`Relevance: ${scoreSignal({ title: item.title, text: `${item.summary} ${item.whyItMatters}`, source: item.source, url: item.url }).score}`);
      lines.push(`Summary: ${item.summary}`);
      lines.push(`Why it matters: ${item.whyItMatters}`);

      if (item.url) {
        lines.push(`Link: ${item.url}`);
      }

      lines.push("");
    });
  }

  return lines.join("\n").trim();
}

export function buildCategoryBriefing(
  command: CategoryCommand,
  hours = 24,
  items: ReadonlyArray<BriefingItem> = sampleItems,
): string {
  const matchingItems = items
    .filter((item) => item.category === command.category)
    .filter((item) => item.hoursAgo <= hours)
    .sort((a, b) => {
      const aScore = scoreSignal({ title: a.title, text: `${a.summary} ${a.whyItMatters}`, source: a.source, url: a.url }).score;
      const bScore = scoreSignal({ title: b.title, text: `${b.summary} ${b.whyItMatters}`, source: b.source, url: b.url }).score;
      return bScore - aScore || a.hoursAgo - b.hoursAgo;
    });

  if (matchingItems.length === 0) {
    return `No ${command.label.toLowerCase()} found for the last ${hours} hours.`;
  }

  const lines = [`${command.label} for the last ${hours} hours`, ""];

  matchingItems.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.title}`);
    lines.push(`Source: ${item.source}`);
    lines.push(`Relevance: ${scoreSignal({ title: item.title, text: `${item.summary} ${item.whyItMatters}`, source: item.source, url: item.url }).score}`);
    lines.push(`Summary: ${item.summary}`);
    lines.push(`Why it matters: ${item.whyItMatters}`);

    if (item.url) {
      lines.push(`Link: ${item.url}`);
    }

    lines.push("");
  });

  return lines.join("\n").trim();
}

export function buildHackerNewsBriefing(stories: ReadonlyArray<HackerNewsStory>): string {
  if (stories.length === 0) {
    return "No Hacker News stories found right now.";
  }

  const lines = ["Top Hacker News tech stories", ""];
  const rankedStories = [...stories].sort((a, b) => {
    const aScore = scoreSignal({ title: a.title, source: "Hacker News", url: a.url, engagementScore: a.score }).score;
    const bScore = scoreSignal({ title: b.title, source: "Hacker News", url: b.url, engagementScore: b.score }).score;
    return bScore - aScore || b.score - a.score;
  });

  rankedStories.forEach((story, index) => {
    const signalScore = scoreSignal({
      title: story.title,
      source: "Hacker News",
      url: story.url,
      engagementScore: story.score,
    });

    lines.push(`${index + 1}. ${story.title}`);
    lines.push(`Source: Hacker News by ${story.author}`);
    lines.push(`Relevance: ${signalScore.score}`);
    lines.push(`HN score: ${story.score}`);
    if (signalScore.reasons.length > 0) {
      lines.push(`Why ranked: ${signalScore.reasons.join(", ")}`);
    }
    lines.push(`Link: ${story.url}`);
    lines.push("");
  });

  return lines.join("\n").trim();
}

export function buildAiNewsBriefing(items: ReadonlyArray<AiNewsItem>): string {
  if (items.length === 0) {
    return "No AI news found right now.";
  }

  const lines = ["Latest AI news", ""];
  const rankedItems = [...items].sort((a, b) => {
    const aScore = scoreSignal({ title: a.title, source: a.source, url: a.url, publishedAt: a.publishedAt }).score;
    const bScore = scoreSignal({ title: b.title, source: b.source, url: b.url, publishedAt: b.publishedAt }).score;
    const aTime = a.publishedAt?.getTime() ?? 0;
    const bTime = b.publishedAt?.getTime() ?? 0;
    return bScore - aScore || bTime - aTime;
  });

  rankedItems.forEach((item, index) => {
    const signalScore = scoreSignal({
      title: item.title,
      source: item.source,
      url: item.url,
      publishedAt: item.publishedAt,
    });

    lines.push(`${index + 1}. ${item.title}`);
    lines.push(`Source: ${item.source}`);
    lines.push(`Relevance: ${signalScore.score}`);
    if (signalScore.reasons.length > 0) {
      lines.push(`Why ranked: ${signalScore.reasons.join(", ")}`);
    }

    if (item.publishedAt) {
      lines.push(`Published: ${item.publishedAt.toISOString().slice(0, 10)}`);
    }

    lines.push(`Link: ${item.url}`);
    lines.push("");
  });

  return lines.join("\n").trim();
}

export async function parseCommand(text: string, dependencies: CommandDependencies = {}): Promise<string> {
  const normalized = text.trim().toLowerCase();

  if (normalized === "/start") {
    return [
      "Hi. I am your tech signal bot.",
      "",
      "Try:",
      "/today",
      "/last 6h",
      "/last 24h",
      "/ai",
      "/news",
      "/jobs",
      "/hackathons",
      "/trending",
    ].join("\n");
  }

  if (normalized === "/today") {
    return buildBriefing(24);
  }

  if (normalized === "/last") {
    return "Use /last with a time window, for example /last 6h or /last 24h.";
  }

  const lastMatch = normalized.match(/^\/last\s+(\d+)h$/);
  if (lastMatch) {
    return buildBriefing(Number(lastMatch[1]));
  }

  if (normalized === "/ai") {
    try {
      const fetchNews = dependencies.fetchAiNews ?? fetchAiNews;
      const items = await fetchNews(20);
      return buildAiNewsBriefing(items).split("\n\n").slice(0, 9).join("\n\n");
    } catch (error) {
      return "I could not fetch live AI news right now. Please try again in a bit.";
    }
  }

  if (normalized === "/news") {
    try {
      const fetchStories = dependencies.fetchHackerNewsTopStories ?? fetchHackerNewsTopStories;
      const stories = await fetchStories(20);
      return buildHackerNewsBriefing(stories).split("\n\n").slice(0, 6).join("\n\n");
    } catch (error) {
      return "I could not fetch live Hacker News stories right now. Please try again in a bit.";
    }
  }

  const categoryCommand = categoryCommands[normalized];
  if (categoryCommand) {
    return buildCategoryBriefing(categoryCommand);
  }

  return "I understand /start, /today, /last 6h, /ai, /news, /jobs, /hackathons, and /trending for now.";
}
