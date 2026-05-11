import { XMLParser } from "fast-xml-parser";
import { loadSourcesConfig, type RssSource } from "../config.js";

export type AiNewsItem = {
  title: string;
  source: string;
  url: string;
  publishedAt?: Date;
};

type ParsedRssItem = {
  title?: unknown;
  link?: unknown;
  pubDate?: unknown;
  published?: unknown;
  updated?: unknown;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function asText(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return undefined;
}

function getItemUrl(link: unknown): string | undefined {
  if (typeof link === "string") return link.trim();

  if (link && typeof link === "object" && "href" in link) {
    return asText(link.href);
  }

  return undefined;
}

function parseDate(value: unknown): Date | undefined {
  const text = asText(value);
  if (!text) return undefined;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "tech-signal-telegram-agent/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchSource(source: RssSource): Promise<AiNewsItem[]> {
  const xml = await fetchText(source.url);
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: ParsedRssItem | ParsedRssItem[] } };
    feed?: { entry?: ParsedRssItem | ParsedRssItem[] };
  };

  const rssItems = asArray(parsed.rss?.channel?.item);
  const atomItems = asArray(parsed.feed?.entry);
  const items = rssItems.length > 0 ? rssItems : atomItems;

  return items
    .map((item) => {
      const title = asText(item.title);
      const url = getItemUrl(item.link);
      const publishedAt = parseDate(item.pubDate) ?? parseDate(item.published) ?? parseDate(item.updated);

      if (!title || !url) return undefined;

      return {
        title,
        source: source.name,
        url,
        ...(publishedAt ? { publishedAt } : {}),
      };
    })
    .filter((item): item is AiNewsItem => Boolean(item));
}

export async function fetchAiNews(limit = 8): Promise<AiNewsItem[]> {
  const aiSources = loadSourcesConfig().rssSources.filter((source) => source.enabled && source.category === "ai");
  const sourceResults = await Promise.allSettled(aiSources.map((source) => fetchSource(source)));
  const items = sourceResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const seen = new Set<string>();

  return items
    .filter((item) => {
      const key = item.url || item.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const aTime = a.publishedAt?.getTime() ?? 0;
      const bTime = b.publishedAt?.getTime() ?? 0;
      return bTime - aTime;
    })
    .slice(0, limit);
}
