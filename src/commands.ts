import { sampleItems } from "./sampleItems.js";

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
    .sort((a, b) => a.hoursAgo - b.hoursAgo);

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
    .sort((a, b) => a.hoursAgo - b.hoursAgo);

  if (matchingItems.length === 0) {
    return `No ${command.label.toLowerCase()} found for the last ${hours} hours.`;
  }

  const lines = [`${command.label} for the last ${hours} hours`, ""];

  matchingItems.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.title}`);
    lines.push(`Source: ${item.source}`);
    lines.push(`Summary: ${item.summary}`);
    lines.push(`Why it matters: ${item.whyItMatters}`);

    if (item.url) {
      lines.push(`Link: ${item.url}`);
    }

    lines.push("");
  });

  return lines.join("\n").trim();
}

export function parseCommand(text: string): string {
  const normalized = text.trim().toLowerCase();

  if (normalized === "/start") {
    return [
      "Hi. I am your tech signal bot.",
      "",
      "Try:",
      "/today",
      "/last 6h",
      "/last 24h",
      "/jobs",
      "/hackathons",
      "/trending",
    ].join("\n");
  }

  if (normalized === "/today") {
    return buildBriefing(24);
  }

  const lastMatch = normalized.match(/^\/last\s+(\d+)h$/);
  if (lastMatch) {
    return buildBriefing(Number(lastMatch[1]));
  }

  const categoryCommand = categoryCommands[normalized];
  if (categoryCommand) {
    return buildCategoryBriefing(categoryCommand);
  }

  return "I understand /start, /today, /last 6h, /jobs, /hackathons, and /trending for now.";
}
