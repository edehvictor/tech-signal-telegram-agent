import { fetchAiNews, type AiNewsItem } from "./collectors/aiNews.js";
import { fetchHackerNewsTopStories, type HackerNewsStory } from "./collectors/hackerNews.js";
import { sampleItems } from "./sampleItems.js";
import { aiNewsToSignals, formatSignals, hackerNewsToSignals, rankSignals, type Signal } from "./signals.js";

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
  const matchingItems = items.filter((item) => item.hoursAgo <= hours);

  if (matchingItems.length === 0) {
    return `No matching tech updates found for the last ${hours} hours.`;
  }

  const lines = [`Tech briefing for the last ${hours} hours`, ""];

  for (const category of Object.keys(categoryLabels) as BriefingItem["category"][]) {
    const categoryItems = rankSignals(
      matchingItems
        .filter((item) => item.category === category)
        .map(sampleItemToSignal),
    );

    if (categoryItems.length === 0) continue;

    lines.push(categoryLabels[category]);

    categoryItems.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.title}`);
      lines.push(`Source: ${item.source}`);
      lines.push(`Relevance: ${item.relevance.score}`);
      if (item.summary) lines.push(`Summary: ${item.summary}`);
      if (item.whyItMatters) lines.push(`Why it matters: ${item.whyItMatters}`);

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
  const matchingItems = rankSignals(
    items
    .filter((item) => item.category === command.category)
    .filter((item) => item.hoursAgo <= hours)
    .map(sampleItemToSignal),
  );

  if (matchingItems.length === 0) {
    return `No ${command.label.toLowerCase()} found for the last ${hours} hours.`;
  }

  const lines = [`${command.label} for the last ${hours} hours`, ""];

  matchingItems.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.title}`);
    lines.push(`Source: ${item.source}`);
    lines.push(`Relevance: ${item.relevance.score}`);
    if (item.summary) lines.push(`Summary: ${item.summary}`);
    if (item.whyItMatters) lines.push(`Why it matters: ${item.whyItMatters}`);

    if (item.url) {
      lines.push(`Link: ${item.url}`);
    }

    lines.push("");
  });

  return lines.join("\n").trim();
}

function sampleItemToSignal(item: BriefingItem): Signal {
  return {
    title: item.title,
    category: item.category,
    source: item.source,
    summary: item.summary,
    whyItMatters: item.whyItMatters,
    url: item.url,
  };
}

export function buildHackerNewsBriefing(stories: ReadonlyArray<HackerNewsStory>): string {
  if (stories.length === 0) {
    return "No Hacker News stories found right now.";
  }

  return formatSignals("Top Hacker News tech stories", hackerNewsToSignals(stories), 5);
}

export function buildAiNewsBriefing(items: ReadonlyArray<AiNewsItem>): string {
  if (items.length === 0) {
    return "No AI news found right now.";
  }

  return formatSignals("Latest AI news", aiNewsToSignals(items), 8);
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
      return buildAiNewsBriefing(items);
    } catch (error) {
      return "I could not fetch live AI news right now. Please try again in a bit.";
    }
  }

  if (normalized === "/news") {
    try {
      const fetchStories = dependencies.fetchHackerNewsTopStories ?? fetchHackerNewsTopStories;
      const stories = await fetchStories(20);
      return buildHackerNewsBriefing(stories);
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
