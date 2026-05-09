import { XMLParser } from "fast-xml-parser";

export type AiNewsItem = {
  title: string;
  source: string;
  url: string;
  publishedAt?: Date;
};

type RssSource = {
  name: string;
  url: string;
};

type ParsedRssItem = {
  title?: unknown;
  link?: unknown;
  pubDate?: unknown;
  published?: unknown;
  updated?: unknown;
};

const aiSources: RssSource[] = [
  {
    name: "OpenAI News",
    url: "https://openai.com/news/rss.xml",
  },
  {
    name: "Google AI Blog",
    url: "https://blog.google/technology/ai/rss/",
  },
  {
    name: "Microsoft AI Blog",
    url: "https://blogs.microsoft.com/ai/feed/",
  },
  {
    name: "NVIDIA Deep Learning Blog",
    url: "https://blogs.nvidia.com/blog/category/deep-learning/feed/",
  },
  {
    name: "MIT Technology Review AI",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/",
  },
  {
    name: "Artificial Intelligence News",
    url: "https://www.artificialintelligence-news.com/feed/",
  },
];

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
