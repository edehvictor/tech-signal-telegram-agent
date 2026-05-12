import { buildSourcesSummary } from "./config.js";
import { fetchAiNews, type AiNewsItem } from "./collectors/aiNews.js";
import { fetchHackerNewsTopStories, type HackerNewsStory } from "./collectors/hackerNews.js";
import { fetchTwitterHandlePosts, fetchTwitterPosts, type TwitterPost } from "./collectors/twitter.js";
import { BrowserTwitterClient, XBrowserProfileLockedError, XLoginRequiredError } from "./collectors/twitterClient.js";
import { sampleItems } from "./sampleItems.js";
import {
  aiNewsToSignals,
  formatSignals,
  hackerNewsToSignals,
  rankSignals,
  twitterPostsToSignals,
  type Signal,
} from "./signals.js";

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
  fetchTwitterPosts?: (limit?: number) => Promise<ReadonlyArray<TwitterPost>>;
  fetchTwitterHandlePosts?: (handle: string, limit?: number) => Promise<ReadonlyArray<TwitterPost>>;
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

export function buildTwitterBriefing(posts: ReadonlyArray<TwitterPost>): string {
  if (posts.length === 0) {
    return "No X/Twitter posts found right now.";
  }

  return formatSignals("Latest X/Twitter tech signals", twitterPostsToSignals(posts), 8);
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
      "/x",
      "/x_login",
      "/x_status",
      "/x_close",
      "/handle openai",
      "/ai",
      "/hn",
      "/sources",
      "/jobs",
      "/hackathons",
    ].join("\n");
  }

  if (normalized === "/today") {
    return buildBriefing(24);
  }

  if (normalized === "/sources") {
    return buildSourcesSummary();
  }

  if (normalized === "/last") {
    return "Use /last with a time window, for example /last 6h or /last 24h.";
  }

  const lastMatch = normalized.match(/^\/last\s+(\d+)h$/);
  if (lastMatch) {
    return buildBriefing(Number(lastMatch[1]));
  }

  if (normalized === "/x_login" || normalized === "/x-login") {
    try {
      const client = new BrowserTwitterClient();
      await client.openLoginPage();

      return [
        "X browser session opened.",
        "",
        "If X asks you to log in, complete login in the opened browser window.",
        "After your X home feed loads, send /x_status or /x.",
      ].join("\n");
    } catch (error) {
      return formatXError(error);
    }
  }

  if (normalized === "/x_status" || normalized === "/x-status") {
    return BrowserTwitterClient.isSessionOpen()
      ? "X browser session is open. Send /x to read the feed."
      : "X browser session is not open. Send /x_login to open it.";
  }

  if (normalized === "/x_close" || normalized === "/x-close") {
    await BrowserTwitterClient.closeSession();
    return "X browser session closed.";
  }

  if (normalized === "/x") {
    try {
      const fetchPosts = dependencies.fetchTwitterPosts ?? fetchTwitterPosts;
      const posts = await fetchPosts(20);
      return buildTwitterBriefing(posts);
    } catch (error) {
      return formatXError(error);
    }
  }

  const handleMatch = normalized.match(/^\/(?:handle|x_handle)\s+(@?[a-z0-9_]{1,15}|https:\/\/x\.com\/[a-z0-9_]{1,15})$/i);
  if (handleMatch) {
    try {
      const fetchPosts = dependencies.fetchTwitterHandlePosts ?? fetchTwitterHandlePosts;
      const posts = await fetchPosts(handleMatch[1], 10);
      return buildTwitterBriefing(posts);
    } catch (error) {
      return formatXError(error);
    }
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

  if (normalized === "/hn" || normalized === "/news") {
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

  return "I understand /start, /today, /last 6h, /x, /x_login, /x_status, /x_close, /handle openai, /ai, /hn, /sources, /jobs, and /hackathons for now.";
}

function formatXError(error: unknown): string {
  if (error instanceof XLoginRequiredError) {
    return [
      "X login required.",
      "",
      "Send /x_login to open the bot browser session.",
      "Sign into X in the opened browser window.",
      "After your X home feed loads, send /x.",
    ].join("\n");
  }

  if (error instanceof XBrowserProfileLockedError) {
    return [
      "X browser profile is locked.",
      "",
      "Close all Edge windows, then stop hidden Edge background processes if they are still running.",
      "",
      "In PowerShell you can run:",
      "Get-Process msedge -ErrorAction SilentlyContinue | Stop-Process",
      "",
      "Then send /x_login again.",
    ].join("\n");
  }

  if (error instanceof Error) {
    return `I could not fetch X/Twitter posts right now: ${error.message}`;
  }

  return "I could not fetch X/Twitter posts right now. Please try again in a bit.";
}
