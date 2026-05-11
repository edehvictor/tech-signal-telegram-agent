import fs from "node:fs";

export type SourceCategory = "ai" | "news" | "job" | "hackathon" | "trending_tool" | "top_signal";

export type TrackedTopic = {
  name: string;
  category: SourceCategory;
  priority: number;
  description: string;
};

export type XAccount = {
  handle: string;
  name: string;
  category: SourceCategory;
  priority: number;
  whyTrack: string;
};

export type Keyword = {
  term: string;
  category: SourceCategory;
  priority: number;
};

export type RssSource = {
  name: string;
  url: string;
  category: SourceCategory;
  enabled: boolean;
};

export type SourcesConfig = {
  trackedTopics: TrackedTopic[];
  xAccounts: XAccount[];
  keywords: Keyword[];
  rssSources: RssSource[];
};

const emptyConfig: SourcesConfig = {
  trackedTopics: [],
  xAccounts: [],
  keywords: [],
  rssSources: [],
};

function isSourceCategory(value: unknown): value is SourceCategory {
  return (
    value === "ai" ||
    value === "news" ||
    value === "job" ||
    value === "hackathon" ||
    value === "trending_tool" ||
    value === "top_signal"
  );
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isTrackedTopic(value: unknown): value is TrackedTopic {
  if (!value || typeof value !== "object") return false;
  const topic = value as Partial<TrackedTopic>;

  return (
    typeof topic.name === "string" &&
    isSourceCategory(topic.category) &&
    isNumber(topic.priority) &&
    typeof topic.description === "string"
  );
}

function isXAccount(value: unknown): value is XAccount {
  if (!value || typeof value !== "object") return false;
  const account = value as Partial<XAccount>;

  return (
    typeof account.handle === "string" &&
    typeof account.name === "string" &&
    isSourceCategory(account.category) &&
    isNumber(account.priority) &&
    typeof account.whyTrack === "string"
  );
}

function isKeyword(value: unknown): value is Keyword {
  if (!value || typeof value !== "object") return false;
  const keyword = value as Partial<Keyword>;

  return typeof keyword.term === "string" && isSourceCategory(keyword.category) && isNumber(keyword.priority);
}

function isRssSource(value: unknown): value is RssSource {
  if (!value || typeof value !== "object") return false;
  const source = value as Partial<RssSource>;

  return (
    typeof source.name === "string" &&
    typeof source.url === "string" &&
    isSourceCategory(source.category) &&
    typeof source.enabled === "boolean"
  );
}

export function loadSourcesConfig(path = "config/sources.json"): SourcesConfig {
  try {
    const content = fs.readFileSync(path, "utf8");
    const parsed = JSON.parse(content) as Partial<Record<keyof SourcesConfig, unknown>>;

    return {
      trackedTopics: Array.isArray(parsed.trackedTopics) ? parsed.trackedTopics.filter(isTrackedTopic) : [],
      xAccounts: Array.isArray(parsed.xAccounts) ? parsed.xAccounts.filter(isXAccount) : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.filter(isKeyword) : [],
      rssSources: Array.isArray(parsed.rssSources) ? parsed.rssSources.filter(isRssSource) : [],
    };
  } catch {
    return emptyConfig;
  }
}

export function buildSourcesSummary(config = loadSourcesConfig()): string {
  const lines = ["Tracked sources and interests", ""];

  lines.push("Topics");
  for (const topic of config.trackedTopics.slice(0, 8)) {
    lines.push(`- ${topic.name} (${topic.category}, priority ${topic.priority})`);
  }

  lines.push("", "X/Twitter accounts");
  for (const account of config.xAccounts.slice(0, 10)) {
    lines.push(`- @${account.handle} (${account.name}, priority ${account.priority})`);
  }

  lines.push("", "Keywords");
  for (const keyword of config.keywords.slice(0, 12)) {
    lines.push(`- ${keyword.term} (${keyword.category}, priority ${keyword.priority})`);
  }

  lines.push("", "RSS sources");
  for (const source of config.rssSources.filter((source) => source.enabled).slice(0, 8)) {
    lines.push(`- ${source.name}`);
  }

  return lines.join("\n");
}
